import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminRtdb } from "@/lib/firebase-admin";
import { Booking, PlatformUser } from "@/lib/types";

type GenerateSetRequest = {
  requestedMinutes?: number;
};

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

function clampTrainingMinutes(input?: number): number {
  const fallback = 40;
  if (!Number.isFinite(input)) {
    return fallback;
  }

  const parsed = Math.round(Number(input));
  return Math.max(15, Math.min(60, parsed));
}

function summarizeBookingHistory(bookings: Booking[]) {
  const totalSessions = bookings.length;
  const attended = bookings.filter((item) => item.attendanceStatus === "present").length;
  const pendingPayments = bookings.filter((item) => item.status === "pending").length;

  const programCounts = new Map<string, number>();
  bookings.forEach((item) => {
    programCounts.set(item.program, (programCounts.get(item.program) ?? 0) + 1);
  });

  const topPrograms = Array.from(programCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([program]) => program);

  return {
    totalSessions,
    attended,
    pendingPayments,
    topPrograms,
  };
}

async function fetchWorkoutFromLlm(input: {
  requestedMinutes: number;
  profile: PlatformUser | null;
  history: ReturnType<typeof summarizeBookingHistory>;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const swimmerProfile = input.profile?.swimmerProfile;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an elite, supportive swimming coach. Return only JSON with warm_up, main_set, treading_drills, and cool_down. The full session must fit within the provided requested_minutes and must never exceed 60 minutes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            requested_minutes: input.requestedMinutes,
            swimmer_profile: swimmerProfile ?? null,
            booking_history: input.history,
          }),
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "LLM request failed");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("LLM response was not valid JSON");
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = getAdminAuth();
    const adminRtdb = getAdminRtdb();

    if (!adminAuth || !adminRtdb) {
      return NextResponse.json({ error: "Server auth/database not configured" }, { status: 500 });
    }

    const token = parseBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email?.trim().toLowerCase() ?? "";

    const body = (await request.json().catch(() => ({}))) as GenerateSetRequest;
    const requestedMinutes = clampTrainingMinutes(body.requestedMinutes);

    const profileSnapshot = await adminRtdb.ref(`users/${uid}`).get();
    const profile = profileSnapshot.exists() ? (profileSnapshot.val() as PlatformUser) : null;

    const bookingsSnapshot = await adminRtdb.ref("bookings").get();
    const bookingData = bookingsSnapshot.exists()
      ? (bookingsSnapshot.val() as Record<string, Omit<Booking, "id">>)
      : {};

    const bookings = Object.entries(bookingData)
      .map(([id, item]) => ({ id, ...item }))
      .filter((item) => {
        const uidMatch = item.userId === uid;
        const emailMatch = Boolean(email) && item.email?.trim().toLowerCase() === email;
        return uidMatch || emailMatch;
      });

    const history = summarizeBookingHistory(bookings);

    const workout = await fetchWorkoutFromLlm({
      requestedMinutes,
      profile,
      history,
    });

    return NextResponse.json({
      requestedMinutes,
      cappedAtMinutes: 60,
      workout,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not generate swim set",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminRtdb } from "@/lib/firebase-admin";
import { Booking, PlatformUser } from "@/lib/types";

type GenerateSetRequest = {
  requestedMinutes?: number;
};

type WorkoutCardItem = {
  description: string;
  distance?: string;
  duration?: string;
  reps?: number;
};

type GeneratedWorkout = {
  workout_title: string;
  focus: string;
  warm_up: WorkoutCardItem[];
  main_set: WorkoutCardItem[];
  treading_drills: WorkoutCardItem[];
  cool_down: WorkoutCardItem[];
  requestedMinutes: number;
  estimatedMinutes: number;
};

const WORKOUT_JSON_SCHEMA = {
  name: "ai_swimming_set",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["workout_title", "focus", "warm_up", "main_set", "treading_drills", "cool_down"],
    properties: {
      workout_title: { type: "string" },
      focus: { type: "string" },
      warm_up: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "distance", "reps"],
          properties: {
            description: { type: "string" },
            distance: { type: "string" },
            reps: { type: "number" },
          },
        },
      },
      main_set: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "distance", "reps"],
          properties: {
            description: { type: "string" },
            distance: { type: "string" },
            reps: { type: "number" },
          },
        },
      },
      treading_drills: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "duration"],
          properties: {
            description: { type: "string" },
            duration: { type: "string" },
          },
        },
      },
      cool_down: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "distance", "reps"],
          properties: {
            description: { type: "string" },
            distance: { type: "string" },
            reps: { type: "number" },
          },
        },
      },
    },
  },
} as const;

const COACH_SYSTEM_PROMPT = [
  "You are an elite, supportive swimming coach for Aura Swimming Hub.",
  "Generate a precise daily set tailored to the swimmer's level, confidence, training history, water treading ability, and current goals.",
  "Respect the requested session duration and keep the total session within the requested minutes and never above 60 minutes.",
  "Make the structure balanced and realistic for the time available.",
  "Factor in water treading / survival work when fear of deep water or low treading ability is present.",
  "Return strictly valid JSON only. No markdown, no code fences, no commentary.",
  "Use the provided JSON schema exactly. Do not add extra keys.",
].join(" ");

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

function estimateTotalTimeMinutes(workout: Record<string, unknown>) {
  const sections = ["warm_up", "main_set", "treading_drills", "cool_down"] as const;
  const rawTotal = sections.reduce((sum, section) => {
    const items = Array.isArray(workout[section]) ? workout[section] : [];

    return (
      sum +
      items.reduce((sectionSum, item) => {
        if (section === "treading_drills") {
          const duration = typeof item === "object" && item !== null ? String((item as { duration?: unknown }).duration ?? "") : "";
          const minutes = Number.parseInt(duration, 10);
          return sectionSum + (Number.isFinite(minutes) ? minutes : 0);
        }

        const reps = typeof item === "object" && item !== null ? Number((item as { reps?: unknown }).reps ?? 0) : 0;
        const distance = typeof item === "object" && item !== null ? String((item as { distance?: unknown }).distance ?? "") : "";
        const distanceValue = Number.parseFloat(distance);
        const distanceMinutes = Number.isFinite(distanceValue) ? Math.max(1, Math.round(distanceValue / 25)) : 1;
        return sectionSum + Math.max(1, reps) * distanceMinutes;
      }, 0)
    );
  }, 0);

  return rawTotal;
}

function normalizeWorkout(workout: Record<string, unknown>, requestedMinutes: number) {
  const sections = {
    warm_up: Array.isArray(workout.warm_up) ? workout.warm_up : [],
    main_set: Array.isArray(workout.main_set) ? workout.main_set : [],
    treading_drills: Array.isArray(workout.treading_drills) ? workout.treading_drills : [],
    cool_down: Array.isArray(workout.cool_down) ? workout.cool_down : [],
  };

  return {
    workout_title: String(workout.workout_title ?? "Aura Daily Set"),
    focus: String(workout.focus ?? "Technique and confidence"),
    warm_up: sections.warm_up,
    main_set: sections.main_set,
    treading_drills: sections.treading_drills,
    cool_down: sections.cool_down,
    requestedMinutes,
    estimatedMinutes: estimateTotalTimeMinutes(sections as unknown as Record<string, unknown>),
  } satisfies GeneratedWorkout;
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
}): Promise<GeneratedWorkout> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

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
      response_format: {
        type: "json_schema",
        json_schema: {
          name: WORKOUT_JSON_SCHEMA.name,
          strict: true,
          schema: WORKOUT_JSON_SCHEMA.schema,
        },
      },
      messages: [
        {
          role: "system",
          content: COACH_SYSTEM_PROMPT,
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
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const normalized = normalizeWorkout(parsed, input.requestedMinutes);

    if (normalized.estimatedMinutes > 60) {
      throw new Error("Generated workout exceeds the 60 minute session cap");
    }

    return normalized;
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

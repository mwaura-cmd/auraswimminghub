import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { getAdminAuth, getAdminRtdb } from "@/lib/firebase-admin";
import { Booking, PlatformUser, SwimmerProfile } from "@/lib/types";

type GenerateSetRequest = {
  requestedMinutes?: number;
  swimmerProfile?: Partial<SwimmerProfile>;
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
    type: SchemaType.OBJECT,
    required: ["workout_title", "focus", "warm_up", "main_set", "treading_drills", "cool_down"],
    properties: {
      workout_title: { type: SchemaType.STRING },
      focus: { type: SchemaType.STRING },
      warm_up: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          required: ["description", "distance", "reps"],
          properties: {
            description: { type: SchemaType.STRING },
            distance: { type: SchemaType.STRING },
            reps: { type: SchemaType.NUMBER },
          },
        },
      },
      main_set: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          required: ["description", "distance", "reps"],
          properties: {
            description: { type: SchemaType.STRING },
            distance: { type: SchemaType.STRING },
            reps: { type: SchemaType.NUMBER },
          },
        },
      },
      treading_drills: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          required: ["description", "duration"],
          properties: {
            description: { type: SchemaType.STRING },
            duration: { type: SchemaType.STRING },
          },
        },
      },
      cool_down: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          required: ["description", "distance", "reps"],
          properties: {
            description: { type: SchemaType.STRING },
            distance: { type: SchemaType.STRING },
            reps: { type: SchemaType.NUMBER },
          },
        },
      },
    },
  },
};

const COACH_SYSTEM_PROMPT = [
  "You are an elite, supportive swimming coach for Aura Swimming Hub.",
  "Generate a precise daily set tailored to the swimmer's level, confidence, training history, water treading ability, and current goals.",
  "Respect the requested session duration and keep the total session within the requested minutes and never above 60 minutes.",
  "Make the structure balanced and realistic for the time available.",
  "Factor in water treading / survival work when fear of deep water or low treading ability is present.",
  "Return strictly valid JSON only. No markdown, no code fences, no commentary.",
  "Use the provided JSON schema exactly. Do not add extra keys.",
].join(" ");

const OPENAI_TIMEOUT_MS = 25000;

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

function normalizeSwimmerProfile(input?: Partial<SwimmerProfile>): SwimmerProfile | null {
  if (!input) {
    return null;
  }

  const level = typeof input.level === "string" && input.level.trim() ? input.level.trim() : "";
  const waterTreadingCapabilitySeconds = Number(input.waterTreadingCapabilitySeconds);
  const fearOfDeepWater = typeof input.fearOfDeepWater === "boolean" ? input.fearOfDeepWater : null;
  const fitnessGoals = Array.isArray(input.fitnessGoals)
    ? input.fitnessGoals.map((goal) => String(goal).trim()).filter(Boolean)
    : [];
  const preferredStrokes = Array.isArray(input.preferredStrokes)
    ? input.preferredStrokes.map((stroke) => String(stroke).trim()).filter(Boolean)
    : [];
  const sessionTimeLimitMinutes = Number(input.sessionTimeLimitMinutes);
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (
    !level ||
    !Number.isFinite(waterTreadingCapabilitySeconds) ||
    fearOfDeepWater === null ||
    fitnessGoals.length === 0 ||
    preferredStrokes.length === 0 ||
    !Number.isFinite(sessionTimeLimitMinutes)
  ) {
    return null;
  }

  return {
    level: level as SwimmerProfile["level"],
    waterTreadingCapabilitySeconds: Math.max(0, Math.round(waterTreadingCapabilitySeconds)),
    fearOfDeepWater,
    fitnessGoals,
    preferredStrokes,
    sessionTimeLimitMinutes: Math.max(15, Math.min(60, Math.round(sessionTimeLimitMinutes))),
    ...(notes ? { notes } : {}),
  };
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
  swimmerProfile: SwimmerProfile | null;
  history: ReturnType<typeof summarizeBookingHistory>;
}): Promise<GeneratedWorkout> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const modelName = process.env.OPENAI_MODEL?.trim() || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: COACH_SYSTEM_PROMPT + "\n\n" + JSON.stringify({
            requested_minutes: input.requestedMinutes,
            swimmer_profile: input.swimmerProfile ?? null,
            booking_history: input.history,
          })
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseSchema: WORKOUT_JSON_SCHEMA.schema as Schema,
      },
    }, { timeout: OPENAI_TIMEOUT_MS });

    const content = result.response.text();
    if (!content) {
      throw new Error("LLM returned empty content");
    }

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const normalized = normalizeWorkout(parsed, input.requestedMinutes);

      if (normalized.estimatedMinutes > 60) {
        // Log this internally in production, clamped for now
      }

      return normalized;
    } catch(err) {
      console.error(err);
      throw new Error("LLM response was not valid JSON");
    }
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("timeout"))) {
      throw new Error("AI generation timed out. Please try again.");
    }
    throw error;
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
    const manualProfile = normalizeSwimmerProfile(body.swimmerProfile);
    const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? process.env.OPENAI_API_KEY?.trim() ?? "";

    const resolvedSwimmerProfile = manualProfile ?? null;
    const history = summarizeBookingHistory([]);

    if (!geminiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY missing",
        },
        { status: 500 },
      );
    }

    if (!manualProfile) {
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

      const liveHistory = summarizeBookingHistory(bookings);
      const workout = await fetchWorkoutFromLlm({
        requestedMinutes,
        swimmerProfile: profile?.swimmerProfile ?? null,
        history: liveHistory,
      });

      return NextResponse.json({
        requestedMinutes,
        cappedAtMinutes: 60,
        workout,
      });
    }

    const workout = await fetchWorkoutFromLlm({
      requestedMinutes,
      swimmerProfile: resolvedSwimmerProfile,
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

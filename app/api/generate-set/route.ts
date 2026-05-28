import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

const COACH_SYSTEM_PROMPT = [
  "You are an elite, supportive swimming coach for Aura Swimming Hub.",
  "Generate a precise daily set tailored to the swimmer's level, confidence, training history, water treading ability, and current goals.",
  "For beginner or fearful swimmers, cap continuous distances at 25m and avoid 50m/100m continuous repeats; use short repeats with rest.",
  "Never assign 100m continuous swims for beginners; keep drills simple, low volume, and confidence-building.",
  "Respect the requested session duration and keep the total session within the requested minutes and never above 60 minutes.",
  "Use conservative volume to ensure the set fits the requested time. Shorten the main set first if needed.",
  "Make the structure balanced and realistic for the time available.",
  "Factor in water treading / survival work when fear of deep water or low treading ability is present.",
  "Keep every string value on a single line with no line breaks.",
  "Return ONLY a valid JSON object. No markdown, no code fences, no commentary.",
  "Use keys: workout_title, focus, warm_up, main_set, treading_drills, cool_down.",
  "Each warm_up/main_set/cool_down item: description (string), distance (string), reps (number).",
  "Each treading_drills item: description (string), duration (string).",
  "Do not add extra keys.",
].join(" ");

const OPENAI_TIMEOUT_MS = 25000;

function extractJsonPayload(text: string): string {
  const stripped = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (stripped.startsWith("{") && stripped.endsWith("}")) {
    return stripped;
  }

  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return stripped.slice(firstBrace, lastBrace + 1);
  }

  return stripped;
}

function parseJsonPayload(payload: string): Record<string, unknown> {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    const cleaned = sanitizeJsonString(payload).trim();
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      const withoutTrailingCommas = cleaned.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(withoutTrailingCommas) as Record<string, unknown>;
    }
  }
}

type GeminiTextResponse = {
  text?: () => string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function getGeminiResponseText(response: GeminiTextResponse): string {
  const candidateText = response.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (candidateText) {
    return candidateText;
  }

  return typeof response.text === "function" ? response.text() : "";
}

function sanitizeJsonString(payload: string): string {
  let output = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < payload.length; i += 1) {
    const ch = payload[i];
    const code = ch.charCodeAt(0);

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        output += ch;
        continue;
      }

      if (ch === "\\") {
        isEscaped = true;
        output += ch;
        continue;
      }

      if (ch === '"') {
        inString = false;
        output += ch;
        continue;
      }

      if (code < 32) {
        if (ch === "\n" || ch === "\r") {
          output += "\\n";
        } else if (ch === "\t") {
          output += "\\t";
        } else {
          output += " ";
        }
        continue;
      }

      output += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
      output += ch;
      continue;
    }

    if (code < 32) {
      continue;
    }

    output += ch;
  }

  return output;
}

function isRetryableGeminiError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand");
}

async function generateWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  request: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0],
): Promise<Awaited<ReturnType<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>>> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await model.generateContent(request, { timeout: OPENAI_TIMEOUT_MS });
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === 2) {
        throw error;
      }

      const delayMs = 1000 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

function trimWorkoutToMinutes(
  workout: GeneratedWorkout,
  targetMinutes: number,
  preferKeepTreading: boolean,
): GeneratedWorkout {
  const limit = Math.max(15, Math.min(60, targetMinutes));
  const sections = {
    warm_up: [...workout.warm_up],
    main_set: [...workout.main_set],
    treading_drills: [...workout.treading_drills],
    cool_down: [...workout.cool_down],
  };

  type SectionKey = keyof typeof sections;

  const minKeep: Record<SectionKey, number> = {
    warm_up: sections.warm_up.length > 0 ? 1 : 0,
    main_set: sections.main_set.length > 0 ? 1 : 0,
    treading_drills: preferKeepTreading && sections.treading_drills.length > 0 ? 1 : 0,
    cool_down: sections.cool_down.length > 0 ? 1 : 0,
  };

  const trimOrder: SectionKey[] = preferKeepTreading
    ? ["main_set", "warm_up", "cool_down", "treading_drills"]
    : ["main_set", "treading_drills", "warm_up", "cool_down"];

  let estimated = estimateTotalTimeMinutes(sections as unknown as Record<string, unknown>);
  while (estimated > limit) {
    let removed = false;
    for (const section of trimOrder) {
      if (sections[section].length > minKeep[section]) {
        sections[section].pop();
        removed = true;
        break;
      }
    }
    if (!removed) {
      break;
    }
    estimated = estimateTotalTimeMinutes(sections as unknown as Record<string, unknown>);
  }

  return {
    ...workout,
    ...sections,
    estimatedMinutes: estimated,
  };
}

function buildFallbackWorkout(
  input: {
    requestedMinutes: number;
    swimmerProfile: SwimmerProfile | null;
  },
  preferKeepTreading: boolean,
): GeneratedWorkout {
  const level = input.swimmerProfile?.level ?? "beginner";
  const stroke = input.swimmerProfile?.preferredStrokes?.[0] ?? "freestyle";
  const goals = input.swimmerProfile?.fitnessGoals ?? [];
  const goalText = goals.length > 0 ? goals.join(", ") : "endurance";

  const levelLabelMap: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    competitive: "Competitive",
  };

  const levelLabel = levelLabelMap[level] ?? "Beginner";

  const levelConfig = {
    beginner: { warm: "25m", main: "25m", mainReps: 4, drillReps: 4, cool: "25m" },
    intermediate: { warm: "200m", main: "100m", mainReps: 4, drillReps: 4, cool: "150m" },
    advanced: { warm: "300m", main: "100m", mainReps: 6, drillReps: 6, cool: "200m" },
    competitive: { warm: "400m", main: "100m", mainReps: 8, drillReps: 6, cool: "300m" },
  } as const;

  const config = levelConfig[level] ?? levelConfig.beginner;
  const isBeginner = level === "beginner";
  const kickDistance = isBeginner ? "25m" : "50m";
  const buildDistance = isBeginner ? "25m" : "50m";
  const gentleDistance = isBeginner ? "25m" : "50m";

  const draft: Record<string, unknown> = {
    workout_title: `${levelLabel} ${stroke} session`,
    focus: `${levelLabel} focus on ${goalText} using ${stroke}`,
    warm_up: [
      { description: `Easy ${stroke} swim`, distance: config.warm, reps: 1 },
      { description: `${stroke} kick with board, relaxed pace`, distance: kickDistance, reps: 2 },
      { description: `${stroke} technique drill (focus on form)`, distance: "25m", reps: 4 },
    ],
    main_set: [
      { description: `${stroke} steady pace`, distance: config.main, reps: config.mainReps },
      { description: `${stroke} build pace each 25m`, distance: buildDistance, reps: config.drillReps },
      { description: `${stroke} smooth rhythm, controlled breathing`, distance: config.main, reps: Math.max(2, Math.floor(config.mainReps / 2)) },
    ],
    treading_drills: preferKeepTreading
      ? [
          { description: "Eggbeater kick, hands out of water", duration: "1 minute" },
          { description: "Sculling for balance and control", duration: "1 minute" },
        ]
      : [
          { description: "Light treading, focus on posture", duration: "1 minute" },
        ],
    cool_down: [
      { description: `Easy ${stroke} swim`, distance: config.cool, reps: 1 },
      { description: "Gentle choice stroke", distance: gentleDistance, reps: 1 },
    ],
  };

  const normalized = applyBeginnerDistanceCap(normalizeWorkout(draft, input.requestedMinutes), input.swimmerProfile);
  if (normalized.estimatedMinutes > input.requestedMinutes) {
    return trimWorkoutToMinutes(normalized, input.requestedMinutes, preferKeepTreading);
  }

  return normalized;
}

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

function shouldCapBeginnerDistances(profile: SwimmerProfile | null): boolean {
  if (!profile) {
    return false;
  }

  if (profile.level === "beginner") {
    return true;
  }

  if (profile.fearOfDeepWater) {
    return true;
  }

  return (profile.waterTreadingCapabilitySeconds ?? 0) < 30;
}

function clampDistanceString(distance: string, maxMeters: number): string {
  const match = distance.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return distance;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= maxMeters) {
    return distance;
  }

  const index = match.index ?? 0;
  const suffix = distance.slice(index + match[1].length);
  return `${maxMeters}${suffix}`;
}

function applyBeginnerDistanceCap(workout: GeneratedWorkout, profile: SwimmerProfile | null): GeneratedWorkout {
  if (!shouldCapBeginnerDistances(profile)) {
    return workout;
  }

  const maxMeters = 25;
  const capItem = (item: WorkoutCardItem): WorkoutCardItem => {
    if (!item.distance) {
      return item;
    }
    const capped = clampDistanceString(item.distance, maxMeters);
    return capped === item.distance ? item : { ...item, distance: capped };
  };

  const sections = {
    warm_up: workout.warm_up.map(capItem),
    main_set: workout.main_set.map(capItem),
    treading_drills: workout.treading_drills,
    cool_down: workout.cool_down.map(capItem),
  };

  return {
    ...workout,
    ...sections,
    estimatedMinutes: estimateTotalTimeMinutes(sections as unknown as Record<string, unknown>),
  };
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

  const maxMinutes = Math.min(60, input.requestedMinutes);
  const preferKeepTreading = Boolean(input.swimmerProfile?.fearOfDeepWater) ||
    (input.swimmerProfile?.waterTreadingCapabilitySeconds ?? 0) < 60;

  try {
    let lastEstimate: number | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const retryNote = attempt === 0
        ? ""
        : `Your previous response was estimated at ${lastEstimate ?? "over"} minutes. ` +
          `Reduce the volume to <= ${maxMinutes} minutes by shortening the main set first.`;

      const result = await generateWithRetry(model, {
        contents: [{
          role: "user",
          parts: [{
            text: COACH_SYSTEM_PROMPT +
              (retryNote ? `\n\n${retryNote}` : "") +
              "\n\n" +
              JSON.stringify({
                requested_minutes: input.requestedMinutes,
                swimmer_profile: input.swimmerProfile ?? null,
                booking_history: input.history,
              }),
          }],
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      });

      const content = getGeminiResponseText(result.response as GeminiTextResponse);
      if (!content) {
        if (attempt === 0) {
          continue;
        }
        console.warn("LLM returned empty content; using fallback workout.");
        return buildFallbackWorkout(input, preferKeepTreading);
      }

      try {
        const jsonPayload = extractJsonPayload(content);
        const parsed = parseJsonPayload(jsonPayload);
        let normalized = normalizeWorkout(parsed, input.requestedMinutes);
        normalized = applyBeginnerDistanceCap(normalized, input.swimmerProfile);

        if (normalized.estimatedMinutes > maxMinutes) {
          lastEstimate = normalized.estimatedMinutes;
          if (attempt === 0) {
            continue;
          }

          return trimWorkoutToMinutes(normalized, maxMinutes, preferKeepTreading);
        }

        return normalized;
      } catch (err) {
        console.error(err);
        console.error("LLM raw response length:", content.length);
        console.error("LLM raw response tail:", JSON.stringify(content.slice(-120)));
        console.error("LLM raw response:", content);
        if (attempt === 0) {
          continue;
        }
        console.warn("LLM JSON invalid after retry; using fallback workout.");
        return buildFallbackWorkout(input, preferKeepTreading);
      }
    }

    console.warn("Falling back to deterministic workout due to invalid JSON response.");
    return buildFallbackWorkout(input, preferKeepTreading);
  } catch (error) {
    if (isRetryableGeminiError(error)) {
      console.warn("Falling back to deterministic workout due to LLM availability.");
      return buildFallbackWorkout(input, preferKeepTreading);
    }
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

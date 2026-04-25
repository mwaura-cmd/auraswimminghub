"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Trophy, CalendarDays, ReceiptText, Clock3, Sparkles } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useAuth } from "@/components/providers/auth-provider";
import { formatSessionDate, formatSessionTime, getSessionDate, isUpcomingBooking } from "@/lib/booking-utils";
import { BILLING_CYCLES, BILLING_CYCLE_LABEL, formatKes } from "@/lib/pricing";
import { subscribeBookings, subscribeUserProfile } from "@/lib/realtimedb";
import { auth } from "@/lib/firebase";
import { AttendanceStatus, Booking, GeneratedWorkout, PlatformUser, SwimLevel, SwimmerProfile } from "@/lib/types";

function toAttendanceStatus(status?: AttendanceStatus): AttendanceStatus {
  return status ?? "pending";
}

function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Starting soon";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function LearnerDashboard() {
  const { firebaseUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<PlatformUser | null>(null);
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [manualLevel, setManualLevel] = useState<SwimLevel | "">("");
  const [manualWaterTreadingSeconds, setManualWaterTreadingSeconds] = useState("");
  const [manualDeepWaterConfidence, setManualDeepWaterConfidence] = useState<"" | "true" | "false">("");
  const [manualFitnessGoals, setManualFitnessGoals] = useState("");
  const [manualPreferredStrokes, setManualPreferredStrokes] = useState("");
  const [manualSessionMinutes, setManualSessionMinutes] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [workoutBusy, setWorkoutBusy] = useState(false);
  const [workoutError, setWorkoutError] = useState("");
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [bookingError, setBookingError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [clockTick, setClockTick] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = subscribeBookings(
      (items) => {
        const uid = firebaseUser?.uid;
        const email = firebaseUser?.email?.trim().toLowerCase();

        const ownedBookings = items.filter((booking) => {
          const uidMatch = Boolean(uid && booking.userId === uid);
          const emailMatch = Boolean(email && booking.email.trim().toLowerCase() === email);
          return uidMatch || emailMatch;
        });

        setBookingError("");
        setBookings(ownedBookings);
      },
      (error) => setBookingError(error.message),
    );

    return () => {
      unsubscribe();
    };
  }, [firebaseUser?.email, firebaseUser?.uid]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const uid = firebaseUser?.uid;

    if (!uid) {
      setProfile(null);
      return;
    }

    const unsubscribe = subscribeUserProfile(
      uid,
      (loadedProfile) => {
        setProfileError("");
        setProfile(loadedProfile);
      },
      (error) => {
        setProfileError(error.message);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [firebaseUser?.uid]);

  const nextSession = useMemo(() => {
    const now = new Date(clockTick);

    return bookings
      .filter((booking) => isUpcomingBooking(booking, now))
      .sort((a, b) => {
        const first = getSessionDate(a)?.getTime() ?? 0;
        const second = getSessionDate(b)?.getTime() ?? 0;
        return first - second;
      })[0];
  }, [bookings, clockTick]);

  const upcomingSessions = useMemo(() => {
    const now = new Date(clockTick);

    return bookings
      .filter((booking) => isUpcomingBooking(booking, now))
      .sort((a, b) => {
        const first = getSessionDate(a)?.getTime() ?? 0;
        const second = getSessionDate(b)?.getTime() ?? 0;
        return first - second;
      })
      .slice(0, 3);
  }, [bookings, clockTick]);

  const billingMix = useMemo(
    () =>
      BILLING_CYCLES.map((cycle) => ({
        cycle: BILLING_CYCLE_LABEL[cycle],
        total: bookings.filter((booking) => booking.billingCycle === cycle).length,
      })),
    [bookings],
  );

  const totalAmountKes = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.amountKes || 0), 0),
    [bookings],
  );

  const pendingPayments = useMemo(
    () => bookings.filter((booking) => booking.status === "pending").length,
    [bookings],
  );

  const attendedSessionsCount = useMemo(
    () => bookings.filter((booking) => toAttendanceStatus(booking.attendanceStatus) === "present").length,
    [bookings],
  );

  const markedSessionsCount = useMemo(
    () =>
      bookings.filter((booking) => {
        const status = toAttendanceStatus(booking.attendanceStatus);
        return status === "present" || status === "absent";
      }).length,
    [bookings],
  );

  const currentAttendanceStreak = useMemo(() => {
    const nowTime = clockTick;

    const completedSessions = bookings
      .map((booking) => ({ booking, sessionDate: getSessionDate(booking) }))
      .filter((item) => Boolean(item.sessionDate) && (item.sessionDate?.getTime() ?? 0) <= nowTime)
      .sort((a, b) => (b.sessionDate?.getTime() ?? 0) - (a.sessionDate?.getTime() ?? 0));

    let streak = 0;
    for (const item of completedSessions) {
      const status = toAttendanceStatus(item.booking.attendanceStatus);

      if (status === "present") {
        streak += 1;
        continue;
      }

      if (status === "absent") {
        break;
      }
    }

    return streak;
  }, [bookings, clockTick]);

  const attendanceRate = useMemo(() => {
    if (markedSessionsCount === 0) {
      return 0;
    }

    return Math.round((attendedSessionsCount / markedSessionsCount) * 100);
  }, [attendedSessionsCount, markedSessionsCount]);

  const nextSessionCountdown = useMemo(() => {
    const nextSessionDate = nextSession ? getSessionDate(nextSession) : null;
    if (!nextSessionDate) {
      return "No upcoming session";
    }

    return formatCountdown(nextSessionDate.getTime() - clockTick);
  }, [nextSession, clockTick]);

  const achievements = useMemo(() => {
    const items: string[] = [];

    if (bookings.length >= 1) {
      items.push("First booking unlocked");
    }
    if (currentAttendanceStreak >= 1) {
      items.push(`Attendance streak x${currentAttendanceStreak}`);
    }
    if (attendedSessionsCount >= 3) {
      items.push("Consistency badge - 3+ present sessions");
    }
    if (attendedSessionsCount >= 6) {
      items.push("Momentum badge - 6+ present sessions");
    }
    if (attendanceRate >= 80 && markedSessionsCount >= 3) {
      items.push(`Attendance rate ${attendanceRate}%`);
    }
    if (pendingPayments === 0 && bookings.length > 0) {
      items.push("Payments up to date");
    }

    return items.length > 0 ? items : ["Book your first session to unlock badges"];
  }, [attendanceRate, attendedSessionsCount, bookings.length, currentAttendanceStreak, markedSessionsCount, pendingPayments]);

  const learnerLevel = useMemo(() => {
    const profileLevel = profile?.swimmerProfile?.level;
    if (profileLevel) {
      return profileLevel.charAt(0).toUpperCase() + profileLevel.slice(1);
    }

    if (bookings.length >= 8) {
      return "Level 4 - Advanced";
    }
    if (bookings.length >= 4) {
      return "Level 3 - Intermediate";
    }
    if (bookings.length >= 1) {
      return "Level 2 - Active";
    }
    return "Level 1 - New";
  }, [bookings.length, profile?.swimmerProfile?.level]);

  const manualSwimmerProfile = useMemo<SwimmerProfile | null>(() => {
    const level = manualLevel;
    const waterTreadingCapabilitySeconds = Number.parseInt(manualWaterTreadingSeconds, 10);
    const fearOfDeepWater =
      manualDeepWaterConfidence === "true" ? true : manualDeepWaterConfidence === "false" ? false : null;
    const fitnessGoals = manualFitnessGoals
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const preferredStrokes = manualPreferredStrokes
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const sessionTimeLimitMinutes = Number.parseInt(manualSessionMinutes, 10);
    const notes = manualNotes.trim();

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
      level,
      waterTreadingCapabilitySeconds: Math.max(0, waterTreadingCapabilitySeconds),
      fearOfDeepWater,
      fitnessGoals,
      preferredStrokes,
      sessionTimeLimitMinutes: Math.max(15, Math.min(60, sessionTimeLimitMinutes)),
      ...(notes ? { notes } : {}),
    };
  }, [manualDeepWaterConfidence, manualFitnessGoals, manualLevel, manualNotes, manualPreferredStrokes, manualSessionMinutes, manualWaterTreadingSeconds]);

  const canGenerateWorkout = Boolean(manualSwimmerProfile);

  useEffect(() => {
    setWorkout(null);
    setCompletedItems({});
  }, [manualSwimmerProfile]);

  const workoutCompletion = useMemo(() => {
    if (!workout) {
      return 0;
    }

    const items = [
      ...workout.warm_up,
      ...workout.main_set,
      ...workout.treading_drills,
      ...workout.cool_down,
    ];

    if (items.length === 0) {
      return 0;
    }

    const completed = items.filter((item) => completedItems[item.description]).length;
    return Math.round((completed / items.length) * 100);
  }, [completedItems, workout]);

  const handleGenerateWorkout = async () => {
    setWorkoutBusy(true);
    setWorkoutError("");
    let timeoutHandle: number | undefined;

    try {
      const currentAuth = auth;
      const currentUser = currentAuth?.currentUser;

      if (!currentAuth || !currentUser) {
        throw new Error("You must be signed in to generate a set.");
      }

      const token = await currentUser.getIdToken();
      const controller = new AbortController();
      timeoutHandle = window.setTimeout(() => {
        controller.abort();
      }, 30000);

      const response = await fetch("/api/generate-set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          requestedMinutes: manualSwimmerProfile?.sessionTimeLimitMinutes ?? 40,
          swimmerProfile: manualSwimmerProfile,
        }),
      });

      const data = (await response.json()) as {
        workout?: GeneratedWorkout;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate today's set.");
      }

      setWorkout(data.workout ?? null);
      setCompletedItems({});
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setWorkoutError("Generation took too long. Please try again.");
      } else {
        setWorkoutError(error instanceof Error ? error.message : "Could not generate today's set.");
      }
    } finally {
      if (typeof timeoutHandle === "number") {
        window.clearTimeout(timeoutHandle);
      }
      setWorkoutBusy(false);
    }
  };

  const toggleWorkoutItem = (itemKey: string) => {
    setCompletedItems((current) => ({
      ...current,
      [itemKey]: !current[itemKey],
    }));
  };

  const renderWorkoutSection = (title: string, items: { description: string; distance?: string; duration?: string; reps?: number }[], tone: string) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="rounded-2xl border border-teal-500/20 bg-black/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm uppercase tracking-[0.24em] text-teal-100/75">{title}</h3>
          <span className={`rounded-full px-3 py-1 text-xs ${tone}`}>{items.length} sets</span>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item, index) => {
            const itemKey = `${title}-${item.description}-${index}`;
            const isChecked = Boolean(completedItems[itemKey]);

            return (
              <label
                key={itemKey}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  isChecked ? "border-emerald-500/30 bg-emerald-500/10" : "border-teal-500/20 bg-black/40 hover:border-teal-400/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleWorkoutItem(itemKey)}
                  className="mt-1 h-4 w-4 rounded border-teal-500/40 bg-transparent text-teal-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-teal-50">{item.description}</p>
                    {isChecked && <Check className="h-4 w-4 text-emerald-300" />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-teal-100/70">
                    {item.distance && <span className="rounded-full bg-white/5 px-2 py-1">{item.distance}</span>}
                    {item.duration && <span className="rounded-full bg-white/5 px-2 py-1">{item.duration}</span>}
                    {typeof item.reps === "number" && <span className="rounded-full bg-white/5 px-2 py-1">{item.reps} reps</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="section-shell grid gap-4 pb-20 lg:grid-cols-3">
      <article className="glass-card rounded-2xl p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl">Learner Portal</h1>
          <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs text-teal-100">{learnerLevel}</span>
        </div>

        {bookingError && (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{bookingError}</p>
        )}

        {profileError && (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{profileError}</p>
        )}

        <div className="mt-4 rounded-xl border border-teal-500/30 bg-black/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Swimmer Intake</p>
          <p className="mt-2 text-sm text-teal-50/75">
            Type the details manually before generating the set. The AI will use what you enter here.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-teal-50">
              <span className="block text-teal-100/70">Swimming Level</span>
              <select
                value={manualLevel}
                onChange={(event) => setManualLevel(event.target.value as SwimLevel | "")}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition focus:border-teal-300"
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="competitive">Competitive</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-teal-50">
              <span className="block text-teal-100/70">Water Treading Capability (seconds)</span>
              <input
                type="number"
                min={0}
                placeholder="e.g. 30"
                value={manualWaterTreadingSeconds}
                onChange={(event) => setManualWaterTreadingSeconds(event.target.value)}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition placeholder:text-teal-100/35 focus:border-teal-300"
              />
            </label>
            <label className="space-y-2 text-sm text-teal-50">
              <span className="block text-teal-100/70">Deep Water Confidence</span>
              <select
                value={manualDeepWaterConfidence}
                onChange={(event) => setManualDeepWaterConfidence(event.target.value as "" | "true" | "false")}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition focus:border-teal-300"
              >
                <option value="">Select confidence</option>
                <option value="false">Confident</option>
                <option value="true">Needs support</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-teal-50">
              <span className="block text-teal-100/70">Session Time Limit (minutes)</span>
              <input
                type="number"
                min={15}
                max={60}
                placeholder="e.g. 40"
                value={manualSessionMinutes}
                onChange={(event) => setManualSessionMinutes(event.target.value)}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition placeholder:text-teal-100/35 focus:border-teal-300"
              />
            </label>
            <label className="space-y-2 text-sm text-teal-50 md:col-span-2">
              <span className="block text-teal-100/70">Fitness Goals</span>
              <input
                type="text"
                placeholder="e.g. build-water-confidence, improve-freestyle"
                value={manualFitnessGoals}
                onChange={(event) => setManualFitnessGoals(event.target.value)}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition placeholder:text-teal-100/35 focus:border-teal-300"
              />
            </label>
            <label className="space-y-2 text-sm text-teal-50 md:col-span-2">
              <span className="block text-teal-100/70">Preferred Strokes</span>
              <input
                type="text"
                placeholder="e.g. freestyle, backstroke"
                value={manualPreferredStrokes}
                onChange={(event) => setManualPreferredStrokes(event.target.value)}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition placeholder:text-teal-100/35 focus:border-teal-300"
              />
            </label>
            <label className="space-y-2 text-sm text-teal-50 md:col-span-2">
              <span className="block text-teal-100/70">Coach Notes</span>
              <textarea
                rows={3}
                placeholder="Anything the coach should know before generating the set"
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                className="w-full rounded-xl border border-teal-500/30 bg-black/70 px-3 py-3 text-teal-50 outline-none transition placeholder:text-teal-100/35 focus:border-teal-300"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-teal-500/25 bg-[linear-gradient(180deg,rgba(8,47,73,0.65),rgba(0,0,0,0.45))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-teal-300">AI Training Set</p>
              <h2 className="mt-1 text-2xl">Generate Today&apos;s Set</h2>
              <p className="mt-2 max-w-2xl text-sm text-teal-50/75">
                The generator will only run after you fill the swimmer intake fields above.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/20 bg-black/30 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Session Length</p>
              <p className="mt-1 text-sm text-teal-50/75">The session length comes from the intake form.</p>
            </div>
            <div className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm text-teal-50">
              {manualSwimmerProfile ? `${manualSwimmerProfile.sessionTimeLimitMinutes} min ready` : "Fill intake fields first"}
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateWorkout()}
              disabled={workoutBusy || !canGenerateWorkout}
              className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workoutBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {workoutBusy ? "Generating..." : "Generate Set"}
            </button>
          </div>

          {workoutError && (
            <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{workoutError}</p>
          )}

          {workout && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-teal-500/20 bg-black/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Workout Title</p>
                    <h3 className="mt-1 text-xl text-teal-50">{workout.workout_title}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Focus</p>
                    <p className="mt-1 text-sm text-teal-50/85">{workout.focus}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${Math.min(workoutCompletion, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-teal-100/70">{workoutCompletion}% completed</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {renderWorkoutSection("Warm-up", workout.warm_up, "bg-cyan-500/15 text-cyan-100")}
                {renderWorkoutSection("Main Set", workout.main_set, "bg-teal-500/15 text-teal-100")}
                {renderWorkoutSection("Water Treading / Survival", workout.treading_drills, "bg-sky-500/15 text-sky-100")}
                {renderWorkoutSection("Cool-down", workout.cool_down, "bg-slate-500/15 text-slate-100")}
              </div>

              <div className="rounded-2xl border border-teal-500/20 bg-black/40 p-4 text-sm text-teal-50/80">
                Estimated duration: <span className="font-semibold text-teal-50">{workout.estimatedMinutes ?? manualSwimmerProfile?.sessionTimeLimitMinutes ?? 40} min</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Total Sessions</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{bookings.length}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Total Payable</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{formatKes(totalAmountKes)}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Pending Payments</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{pendingPayments}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Attendance Streak</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{currentAttendanceStreak}</p>
            <p className="mt-1 text-xs text-teal-100/70">Present marks: {attendedSessionsCount}</p>
          </div>
        </div>

        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={billingMix}>
              <XAxis dataKey="cycle" stroke="#8ee4da" />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#14b8a6" fill="rgba(20,184,166,0.25)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6">
        <h2 className="text-lg">Next Class Countdown</h2>
        <div className="mt-4 rounded-2xl border border-teal-500/30 bg-black/60 p-4 text-center">
          <Clock3 className="mx-auto text-teal-200" />
          <p className="mt-2 text-3xl font-bold">{nextSessionCountdown}</p>
          <p className="text-xs text-teal-100/70">
            {nextSession
              ? `${formatSessionDate(nextSession)} at ${formatSessionTime(nextSession)}`
              : "Book a session to start your countdown"}
          </p>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg">Achievements</h2>
        <div className="space-y-3 text-sm">
          {achievements.map((achievement) => (
            <div key={achievement} className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
              <Trophy className="mb-2 text-teal-300" size={18} />
              {achievement}
            </div>
          ))}
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg">Upcoming Sessions</h2>
        <div className="space-y-3 text-sm">
          {upcomingSessions.length === 0 && (
            <p className="rounded-xl border border-teal-500/30 bg-black/60 p-3 text-teal-100/75">No upcoming sessions yet.</p>
          )}

          {upcomingSessions.map((item) => (
            <div key={item.id} className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
              <p className="font-medium text-teal-100">{formatSessionDate(item)}</p>
              <p className="text-teal-50/80">{formatSessionTime(item)}</p>
              <p className="text-xs text-teal-50/65">{item.program}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg">Parent Mode</h2>
        <div className="space-y-3 text-sm">
          <Link href="/book" className="block w-full rounded-xl border border-teal-500/30 bg-black/60 p-3 text-left">
            Book Session
          </Link>
          <Link href="/book" className="block w-full rounded-xl border border-teal-500/30 bg-black/60 p-3 text-left">
            Pay Fees
          </Link>
          <button className="w-full rounded-xl border border-teal-500/30 bg-black/60 p-3 text-left">Switch Child Profile</button>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6 lg:col-span-3">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <CalendarDays className="text-teal-300" />
            <h3 className="mt-3 text-sm">Resources Library</h3>
            <p className="mt-2 text-xs text-teal-50/70">Technique videos, dryland guides, warmup routines.</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <ReceiptText className="text-teal-300" />
            <h3 className="mt-3 text-sm">Payments & Receipts</h3>
            <p className="mt-2 text-xs text-teal-50/70">Download invoices, reconcile dues, confirm transactions.</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <Trophy className="text-teal-300" />
            <h3 className="mt-3 text-sm">Progress Reports</h3>
            <p className="mt-2 text-xs text-teal-50/70">Weekly coach feedback and skill radar updates.</p>
          </div>
        </div>
      </article>
    </div>
  );
}

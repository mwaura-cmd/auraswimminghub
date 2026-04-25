"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trophy, CalendarDays, ReceiptText, Clock3 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useAuth } from "@/components/providers/auth-provider";
import { formatSessionDate, formatSessionTime, getSessionDate, isUpcomingBooking } from "@/lib/booking-utils";
import { BILLING_CYCLES, BILLING_CYCLE_LABEL, formatKes } from "@/lib/pricing";
import { subscribeBookings, subscribeUserProfile } from "@/lib/realtimedb";
import { AttendanceStatus, Booking, PlatformUser } from "@/lib/types";

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
          <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Swimmer Profile Context</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-teal-100/70">Current Level</p>
              <p className="mt-1 font-semibold text-teal-50">{profile?.swimmerProfile?.level ?? "beginner"}</p>
            </div>
            <div>
              <p className="text-teal-100/70">Water Treading</p>
              <p className="mt-1 font-semibold text-teal-50">
                {profile?.swimmerProfile?.waterTreadingCapabilitySeconds ?? 30}s
              </p>
            </div>
            <div>
              <p className="text-teal-100/70">Deep Water Confidence</p>
              <p className="mt-1 font-semibold text-teal-50">
                {profile?.swimmerProfile?.fearOfDeepWater ? "Needs support" : "Confident"}
              </p>
            </div>
            <div>
              <p className="text-teal-100/70">Daily Time Limit</p>
              <p className="mt-1 font-semibold text-teal-50">
                {profile?.swimmerProfile?.sessionTimeLimitMinutes ?? 40} min
              </p>
            </div>
          </div>
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

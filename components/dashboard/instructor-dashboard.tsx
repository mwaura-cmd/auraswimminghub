"use client";

import { useEffect, useMemo, useState } from "react";
import { formatSessionDate, formatSessionTime, getLocalDateKey, getSessionDate } from "@/lib/booking-utils";
import { formatKes } from "@/lib/pricing";
import { markBookingAttendance, subscribeBookings } from "@/lib/realtimedb";
import { AttendanceStatus, Booking } from "@/lib/types";

function toAttendanceStatus(status?: AttendanceStatus): AttendanceStatus {
  return status ?? "pending";
}

export function InstructorDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingError, setBookingError] = useState("");
  const [attendanceBusyId, setAttendanceBusyId] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceNotice, setAttendanceNotice] = useState("");
  const [score, setScore] = useState(3);

  useEffect(() => {
    const unsubscribe = subscribeBookings(
      (items) => {
        setBookingError("");
        setBookings(items);
      },
      (error) => setBookingError(error.message),
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const todayKey = getLocalDateKey();

  const classesToday = useMemo(() => {
    const grouped = new Map<
      string,
      {
        time: string;
        program: string;
        learners: number;
        projectedRevenueKes: number;
      }
    >();

    bookings
      .filter((booking) => booking.date === todayKey)
      .forEach((booking) => {
        const key = `${booking.time}|${booking.program}`;
        const current = grouped.get(key);

        if (current) {
          current.learners += 1;
          current.projectedRevenueKes += booking.amountKes || 0;
          return;
        }

        grouped.set(key, {
          time: booking.time,
          program: booking.program,
          learners: 1,
          projectedRevenueKes: booking.amountKes || 0,
        });
      });

    return Array.from(grouped.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [bookings, todayKey]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    return bookings
      .filter((booking) => {
        const sessionDate = getSessionDate(booking);
        if (!sessionDate) {
          return false;
        }

        return sessionDate.getTime() >= now.getTime() && sessionDate.getTime() <= weekAhead.getTime();
      })
      .sort((a, b) => {
        const first = getSessionDate(a)?.getTime() ?? 0;
        const second = getSessionDate(b)?.getTime() ?? 0;
        return first - second;
      })
      .slice(0, 6);
  }, [bookings]);

  const learnerDirectory = useMemo(() => {
    const learners = new Map<
      string,
      {
        name: string;
        phone: string;
        program: string;
        sessions: number;
        latestSessionTime: number;
        latestSessionLabel: string;
      }
    >();

    bookings.forEach((booking) => {
      const key = `${booking.learnerName.trim().toLowerCase()}|${booking.phone.trim()}`;
      const sessionStamp = getSessionDate(booking)?.getTime() ?? 0;
      const sessionLabel = `${formatSessionDate(booking)} ${formatSessionTime(booking)}`;
      const current = learners.get(key);

      if (!current) {
        learners.set(key, {
          name: booking.learnerName,
          phone: booking.phone,
          program: booking.program,
          sessions: 1,
          latestSessionTime: sessionStamp,
          latestSessionLabel: sessionLabel,
        });
        return;
      }

      current.sessions += 1;
      if (sessionStamp >= current.latestSessionTime) {
        current.latestSessionTime = sessionStamp;
        current.latestSessionLabel = sessionLabel;
        current.program = booking.program;
      }
    });

    return Array.from(learners.values())
      .sort((a, b) => b.sessions - a.sessions || b.latestSessionTime - a.latestSessionTime)
      .slice(0, 10);
  }, [bookings]);

  const projectedRevenueToday = useMemo(
    () => classesToday.reduce((sum, classItem) => sum + classItem.projectedRevenueKes, 0),
    [classesToday],
  );

  const attendanceQueue = useMemo(
    () =>
      bookings
        .map((booking) => ({ booking, sessionDate: getSessionDate(booking) }))
        .filter((item) => Boolean(item.sessionDate))
        .sort((a, b) => (b.sessionDate?.getTime() ?? 0) - (a.sessionDate?.getTime() ?? 0))
        .slice(0, 14),
    [bookings],
  );

  const attendanceStreakLeaders = useMemo(() => {
    const leaders = new Map<string, { name: string; presentCount: number }>();

    bookings.forEach((booking) => {
      if (toAttendanceStatus(booking.attendanceStatus) !== "present") {
        return;
      }

      const key = `${booking.learnerName.trim().toLowerCase()}|${booking.phone.trim()}`;
      const current = leaders.get(key);
      if (current) {
        current.presentCount += 1;
        return;
      }

      leaders.set(key, {
        name: booking.learnerName,
        presentCount: 1,
      });
    });

    return Array.from(leaders.values())
      .sort((a, b) => b.presentCount - a.presentCount)
      .slice(0, 3);
  }, [bookings]);

  const handleMarkAttendance = async (bookingId: string, status: AttendanceStatus) => {
    setAttendanceError("");
    setAttendanceNotice("");
    setAttendanceBusyId(bookingId);

    try {
      await markBookingAttendance(bookingId, status);
      setAttendanceNotice(`Attendance marked as ${status}.`);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Could not mark attendance.");
    } finally {
      setAttendanceBusyId(null);
    }
  };

  return (
    <div className="section-shell grid gap-4 pb-20 lg:grid-cols-3">
      <article className="glass-card rounded-2xl p-6 lg:col-span-2">
        <h1 className="text-2xl">Instructor Command</h1>
        <p className="mt-2 text-sm text-teal-50/75">Live classes, learner load, and this week&apos;s booking queue.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Classes Today</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{classesToday.length}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Learners Today</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">
              {classesToday.reduce((sum, item) => sum + item.learners, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Projected Today</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{formatKes(projectedRevenueToday)}</p>
          </div>
        </div>

        {bookingError && (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{bookingError}</p>
        )}

        <div className="mt-6 space-y-3">
          {classesToday.length === 0 && (
            <p className="rounded-xl border border-teal-500/30 bg-black/60 p-4 text-sm text-teal-100/75">
              No classes booked for today yet.
            </p>
          )}

          {classesToday.map((item) => (
            <div key={item.time + item.program} className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-teal-100">{item.program}</p>
                <p className="text-xs text-teal-50/70">{item.time}</p>
              </div>
              <p className="mt-1 text-xs text-teal-50/70">{item.learners} learners • {formatKes(item.projectedRevenueKes)}</p>
              <p className="mt-2 text-xs text-teal-100/70">Use Attendance Queue below to mark each learner present.</p>
            </div>
          ))}

          {upcomingSessions.length > 0 && (
            <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
              <p className="text-sm font-semibold text-teal-50">Upcoming this week</p>
              <div className="mt-3 space-y-2 text-xs text-teal-100/80">
                {upcomingSessions.map((item) => (
                  <p key={item.id}>
                    {formatSessionDate(item)} {formatSessionTime(item)} • {item.program} • {item.learnerName}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6">
        <h2 className="text-lg">Assessment Form</h2>
        <form className="mt-4 space-y-3">
          <input placeholder="Student Name" className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
          <input placeholder="Session" className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
          <textarea placeholder="Coach notes" className="min-h-24 w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />

          <label className="text-xs text-teal-100">Skill Rating: {score}/5</label>
          <input
            type="range"
            min={1}
            max={5}
            value={score}
            onChange={(event) => setScore(Number(event.target.value))}
            className="w-full"
          />

          <button className="btn-primary w-full" type="button">
            Submit Assessment
          </button>
        </form>
      </article>

      <article className="glass-card rounded-2xl p-6 lg:col-span-3">
        <h2 className="text-lg">Student Directory</h2>
        <div className="mt-4 space-y-3 md:hidden">
          {learnerDirectory.length === 0 && (
            <div className="rounded-xl border border-teal-500/25 bg-black/55 p-4 text-sm text-teal-50/75">No learners found yet.</div>
          )}

          {learnerDirectory.map((row) => (
            <div key={`${row.name}-${row.phone}`} className="rounded-xl border border-teal-500/25 bg-black/55 p-4 text-sm">
              <p className="font-semibold text-teal-50">{row.name}</p>
              <p className="mt-1 text-teal-100/80">{row.program}</p>
              <p className="mt-1 text-teal-100/75">{row.phone}</p>
              <p className="mt-2 text-xs text-teal-100/70">Sessions booked: {row.sessions}</p>
              <p className="mt-1 text-xs text-teal-100/70">Latest: {row.latestSessionLabel}</p>
              <button className="btn-secondary mt-3 w-full text-xs">Open profile</button>
            </div>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-teal-200/80">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Program</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Sessions Booked</th>
                <th className="py-2">Latest Session</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {learnerDirectory.length === 0 && (
                <tr className="border-t border-teal-500/20 text-teal-50/75">
                  <td className="py-4" colSpan={6}>
                    No learners found yet.
                  </td>
                </tr>
              )}

              {learnerDirectory.map((row) => (
                <tr key={`${row.name}-${row.phone}`} className="border-t border-teal-500/20 text-teal-50/85">
                  <td className="py-3">{row.name}</td>
                  <td className="py-3">{row.program}</td>
                  <td className="py-3">{row.phone}</td>
                  <td className="py-3">{row.sessions}</td>
                  <td className="py-3">{row.latestSessionLabel}</td>
                  <td className="py-3">
                    <button className="btn-secondary text-xs">Open profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article id="attendance-queue" className="glass-card rounded-2xl p-6 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Attendance Queue</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Mark Presence Per Scheduled Class</span>
        </div>

        {attendanceNotice && (
          <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-900/20 p-3 text-sm text-emerald-200">
            {attendanceNotice}
          </p>
        )}
        {attendanceError && (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">
            {attendanceError}
          </p>
        )}

        <div className="mt-4 space-y-3 md:hidden">
          {attendanceQueue.length === 0 && (
            <div className="rounded-xl border border-teal-500/25 bg-black/55 p-4 text-sm text-teal-50/75">
              No scheduled classes in queue.
            </div>
          )}

          {attendanceQueue.map((item) => {
            const sessionTime = item.sessionDate?.getTime() ?? 0;
            const canMarkNow = sessionTime <= Date.now();
            const attendanceStatus = toAttendanceStatus(item.booking.attendanceStatus);
            const statusTone =
              attendanceStatus === "present"
                ? "bg-emerald-500/20 text-emerald-200"
                : attendanceStatus === "absent"
                  ? "bg-rose-500/20 text-rose-200"
                  : "bg-amber-500/20 text-amber-200";

            return (
              <div key={item.booking.id} className="rounded-xl border border-teal-500/25 bg-black/55 p-4 text-sm">
                <p className="font-semibold text-teal-50">{item.booking.learnerName}</p>
                <p className="mt-1 text-teal-100/80">{item.booking.program}</p>
                <p className="mt-1 text-teal-100/75">{formatSessionDate(item.booking)} {formatSessionTime(item.booking)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs capitalize text-teal-100/70">{item.booking.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs uppercase ${statusTone}`}>{attendanceStatus}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={attendanceBusyId === item.booking.id || !canMarkNow || attendanceStatus === "present"}
                    onClick={() => void handleMarkAttendance(item.booking.id, "present")}
                  >
                    {attendanceBusyId === item.booking.id ? "Saving..." : "Present"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={attendanceBusyId === item.booking.id || !canMarkNow || attendanceStatus === "absent"}
                    onClick={() => void handleMarkAttendance(item.booking.id, "absent")}
                  >
                    Absent
                  </button>
                </div>
                {!canMarkNow && <p className="mt-2 text-xs text-teal-100/65">Available after scheduled session time.</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-teal-200/80">
              <tr>
                <th className="py-2">Learner</th>
                <th className="py-2">Program</th>
                <th className="py-2">Session</th>
                <th className="py-2">Payment</th>
                <th className="py-2">Attendance</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendanceQueue.length === 0 && (
                <tr className="border-t border-teal-500/20 text-teal-50/75">
                  <td className="py-4" colSpan={6}>
                    No scheduled classes in queue.
                  </td>
                </tr>
              )}

              {attendanceQueue.map((item) => {
                const sessionTime = item.sessionDate?.getTime() ?? 0;
                const canMarkNow = sessionTime <= Date.now();
                const attendanceStatus = toAttendanceStatus(item.booking.attendanceStatus);
                const statusTone =
                  attendanceStatus === "present"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : attendanceStatus === "absent"
                      ? "bg-rose-500/20 text-rose-200"
                      : "bg-amber-500/20 text-amber-200";

                return (
                  <tr key={item.booking.id} className="border-t border-teal-500/20 text-teal-50/85">
                    <td className="py-3">{item.booking.learnerName}</td>
                    <td className="py-3">{item.booking.program}</td>
                    <td className="py-3">
                      {formatSessionDate(item.booking)} {formatSessionTime(item.booking)}
                    </td>
                    <td className="py-3 capitalize">{item.booking.status}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-3 py-1 text-xs uppercase ${statusTone}`}>{attendanceStatus}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={attendanceBusyId === item.booking.id || !canMarkNow || attendanceStatus === "present"}
                          onClick={() => void handleMarkAttendance(item.booking.id, "present")}
                        >
                          {attendanceBusyId === item.booking.id ? "Saving..." : "Mark Present"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={attendanceBusyId === item.booking.id || !canMarkNow || attendanceStatus === "absent"}
                          onClick={() => void handleMarkAttendance(item.booking.id, "absent")}
                        >
                          Mark Absent
                        </button>
                      </div>
                      {!canMarkNow && <p className="mt-1 text-xs text-teal-100/65">Available after scheduled session time.</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {attendanceStreakLeaders.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {attendanceStreakLeaders.map((leader) => (
              <div key={leader.name} className="rounded-xl border border-teal-500/30 bg-black/60 p-3 text-sm">
                <p className="font-semibold text-teal-50">{leader.name}</p>
                <p className="mt-1 text-teal-100/75">Present marks: {leader.presentCount}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

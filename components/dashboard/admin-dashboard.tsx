"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSessionDate } from "@/lib/booking-utils";
import { formatKes } from "@/lib/pricing";
import { subscribeBookings, subscribeGalleryItems } from "@/lib/realtimedb";
import { Booking, GalleryItem } from "@/lib/types";

export function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [bookingError, setBookingError] = useState("");

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

  useEffect(() => {
    const unsubscribe = subscribeGalleryItems((items) => {
      setGalleryItems(items.slice(0, 6));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const totalRevenueKes = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.amountKes || 0), 0),
    [bookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "pending").length,
    [bookings],
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "paid" || booking.status === "confirmed").length,
    [bookings],
  );

  const uniqueLearners = useMemo(() => {
    const keys = new Set(
      bookings.map((booking) => `${booking.learnerName.trim().toLowerCase()}|${booking.phone.trim()}`),
    );
    return keys.size;
  }, [bookings]);

  const revenueTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        month: date.toLocaleDateString("en-KE", { month: "short" }),
        amount: 0,
      };
    });

    const byKey = new Map(months.map((item) => [item.key, item]));

    bookings.forEach((booking) => {
      const createdAt = new Date(booking.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = byKey.get(key);
      if (!bucket) {
        return;
      }

      bucket.amount += booking.amountKes || 0;
    });

    return months;
  }, [bookings]);

  const topPrograms = useMemo(() => {
    const counter = new Map<string, number>();

    bookings.forEach((booking) => {
      counter.set(booking.program, (counter.get(booking.program) ?? 0) + 1);
    });

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [bookings]);

  return (
    <div className="section-shell grid gap-4 pb-20 lg:grid-cols-4">
      <article className="glass-card rounded-2xl p-6 lg:col-span-3">
        <h1 className="text-2xl">Mission Control</h1>
        <p className="mt-2 text-sm text-teal-50/70">Live booking analytics and academy operations.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Total Bookings</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{bookings.length}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Projected Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{formatKes(totalRevenueKes)}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Pending Payments</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{pendingBookings}</p>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Active Learners</p>
            <p className="mt-2 text-2xl font-semibold text-teal-50">{uniqueLearners}</p>
          </div>
        </div>

        <div className="mt-5 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTrend}>
              <CartesianGrid stroke="rgba(56, 189, 248, 0.15)" vertical={false} />
              <XAxis dataKey="month" stroke="#8ee4da" />
              <YAxis stroke="#8ee4da" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value) => formatKes(Number(value))} />
              <Bar dataKey="amount" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6">
        <h2 className="text-lg">Operations Pulse</h2>
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3 text-sm text-teal-100">
            Confirmed sessions: <span className="font-semibold text-teal-50">{confirmedBookings}</span>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-black/60 p-3 text-sm text-teal-100">
            Pending sessions: <span className="font-semibold text-teal-50">{pendingBookings}</span>
          </div>
          <Link href="/book" className="btn-secondary block w-full text-center text-sm">
            Open Booking Form
          </Link>
          <Link href="/gallery" className="btn-secondary block w-full text-center text-sm">
            Open Gallery Manager
          </Link>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6 lg:col-span-2">
        <h2 className="text-lg">Program Demand</h2>
        {topPrograms.length === 0 ? (
          <p className="mt-3 text-sm text-teal-50/70">No bookings yet.</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            {topPrograms.map(([program, count]) => (
              <div key={program} className="rounded-xl border border-teal-500/30 bg-black/60 p-3">
                <p className="font-medium text-teal-50">{program}</p>
                <p className="mt-1 text-teal-100/75">{count} bookings</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="glass-card rounded-2xl p-6 lg:col-span-2">
        <h2 className="text-lg">Quick Actions</h2>
        <div className="mt-4 space-y-3 text-sm">
          <button className="btn-secondary w-full text-sm">Generate Certificate</button>
          <button className="btn-secondary w-full text-sm">Assign Instructor</button>
          <button className="btn-secondary w-full text-sm">Broadcast Parent Update</button>
          <button className="btn-primary w-full text-sm">Export Booking Report</button>
        </div>
      </article>

      <article className="glass-card rounded-2xl p-6 lg:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Latest Bookings</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-teal-100/70">Live from Realtime DB</span>
        </div>

        {bookingError ? (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200">{bookingError}</p>
        ) : bookings.length === 0 ? (
          <p className="mt-4 text-sm text-teal-50/70">No bookings yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-teal-200/85">
                <tr>
                  <th className="pb-2 pr-4">Learner</th>
                  <th className="pb-2 pr-4">Program</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Session</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 8).map((booking) => (
                  <tr key={booking.id} className="border-t border-teal-500/20 text-teal-50/85">
                    <td className="py-2 pr-4">{booking.learnerName}</td>
                    <td className="py-2 pr-4">{booking.program}</td>
                    <td className="py-2 pr-4 capitalize">{booking.billingCycle}</td>
                    <td className="py-2 pr-4">{formatKes(booking.amountKes || 0)}</td>
                    <td className="py-2 pr-4">{formatSessionDate(booking)} {booking.time}</td>
                    <td className="py-2 capitalize">{booking.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="glass-card rounded-2xl p-6 lg:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Gallery Content Manager</h2>
          <Link href="/gallery" className="btn-secondary text-xs">
            Open Gallery Manager
          </Link>
        </div>

        {galleryItems.length === 0 ? (
          <p className="mt-4 text-sm text-teal-50/70">No gallery items yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-teal-200/85">
                <tr>
                  <th className="pb-2 pr-4">Caption</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Uploader</th>
                  <th className="pb-2 pr-4">Pinned</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {galleryItems.map((item) => (
                  <tr key={item.id} className="border-t border-teal-500/20 text-teal-50/85">
                    <td className="py-2 pr-4">{item.caption || "No caption"}</td>
                    <td className="py-2 pr-4 capitalize">{item.mediaType}</td>
                    <td className="py-2 pr-4 capitalize">{item.uploaderRole}</td>
                    <td className="py-2 pr-4">{item.pinned ? "Yes" : "No"}</td>
                    <td className="py-2">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}

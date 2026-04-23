import { Booking } from "@/lib/types";

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSessionDate(booking: Pick<Booking, "date" | "time">): Date | null {
  if (!booking.date) {
    return null;
  }

  const time = booking.time && booking.time.length > 0 ? booking.time : "00:00";
  const sessionDate = new Date(`${booking.date}T${time}:00`);

  if (Number.isNaN(sessionDate.getTime())) {
    return null;
  }

  return sessionDate;
}

export function isUpcomingBooking(booking: Pick<Booking, "date" | "time">, now = new Date()): boolean {
  const sessionDate = getSessionDate(booking);
  if (!sessionDate) {
    return false;
  }

  return sessionDate.getTime() >= now.getTime();
}

export function formatSessionDate(booking: Pick<Booking, "date" | "time">): string {
  const sessionDate = getSessionDate(booking);
  if (!sessionDate) {
    return "Date pending";
  }

  return sessionDate.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatSessionTime(booking: Pick<Booking, "date" | "time">): string {
  const sessionDate = getSessionDate(booking);
  if (!sessionDate) {
    return booking.time || "Time pending";
  }

  return sessionDate.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

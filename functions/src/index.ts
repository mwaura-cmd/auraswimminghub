import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/firestore";
import { onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

type BookingRecord = {
  status?: string;
  email?: string;
  fullName?: string;
  learnerName?: string;
  program?: string;
  date?: string;
  time?: string;
  billingCycle?: string;
  amountKes?: number;
  paystackReference?: string;
  userId?: string | null;
};

function isPaidStatus(status?: string) {
  return status === "paid" || status === "confirmed";
}

function formatKes(amount?: number) {
  if (!Number.isFinite(amount)) {
    return "KES 0";
  }

  return `KES ${new Intl.NumberFormat("en-KE").format(amount ?? 0)}`;
}

function buildLearnerEmail(booking: BookingRecord, bookingId: string) {
  const name = booking.fullName ?? "there";
  const learner = booking.learnerName ?? "your learner";
  const program = booking.program ?? "your session";
  const date = booking.date ?? "TBD";
  const time = booking.time ?? "TBD";
  const amount = formatKes(booking.amountKes);
  const reference = booking.paystackReference ?? bookingId;

  const subject = "Your booking is confirmed";
  const text =
    `Hi ${name},\n\n` +
    `Your booking is confirmed for ${learner}.\n` +
    `Program: ${program}\n` +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Amount: ${amount}\n` +
    `Reference: ${reference}\n\n` +
    `We look forward to seeing you in the pool.\n` +
    `Aura Swimming Hub`;

  const html =
    `<p>Hi ${name},</p>` +
    `<p>Your booking is confirmed for <strong>${learner}</strong>.</p>` +
    `<p><strong>Program:</strong> ${program}<br/>` +
    `<strong>Date:</strong> ${date}<br/>` +
    `<strong>Time:</strong> ${time}<br/>` +
    `<strong>Amount:</strong> ${amount}<br/>` +
    `<strong>Reference:</strong> ${reference}</p>` +
    `<p>We look forward to seeing you in the pool.<br/>Aura Swimming Hub</p>`;

  return { subject, text, html };
}

function buildAdminEmail(booking: BookingRecord, bookingId: string) {
  const learner = booking.learnerName ?? "(unknown learner)";
  const name = booking.fullName ?? "(unknown guardian)";
  const email = booking.email ?? "(no email)";
  const program = booking.program ?? "(no program)";
  const date = booking.date ?? "TBD";
  const time = booking.time ?? "TBD";
  const amount = formatKes(booking.amountKes);
  const reference = booking.paystackReference ?? bookingId;

  const subject = "New booking confirmed";
  const text =
    `New booking confirmed.\n` +
    `Learner: ${learner}\n` +
    `Guardian: ${name}\n` +
    `Email: ${email}\n` +
    `Program: ${program}\n` +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Amount: ${amount}\n` +
    `Reference: ${reference}`;

  const html =
    `<p><strong>New booking confirmed</strong></p>` +
    `<p><strong>Learner:</strong> ${learner}<br/>` +
    `<strong>Guardian:</strong> ${name}<br/>` +
    `<strong>Email:</strong> ${email}<br/>` +
    `<strong>Program:</strong> ${program}<br/>` +
    `<strong>Date:</strong> ${date}<br/>` +
    `<strong>Time:</strong> ${time}<br/>` +
    `<strong>Amount:</strong> ${amount}<br/>` +
    `<strong>Reference:</strong> ${reference}</p>`;

  return { subject, text, html };
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL;

  if (!apiKey || !from) {
    logger.warn("Email config missing; set RESEND_API_KEY and BOOKING_FROM_EMAIL.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Resend email failed", { status: response.status, errorText });
  }
}

async function sendBookingEmails(booking: BookingRecord, bookingId: string) {
  const learnerEmail = booking.email;
  if (learnerEmail) {
    const message = buildLearnerEmail(booking, bookingId);
    await sendResendEmail({ to: learnerEmail, ...message });
  }

  const adminEmail = process.env.BOOKING_ADMIN_EMAIL;
  if (adminEmail) {
    const message = buildAdminEmail(booking, bookingId);
    await sendResendEmail({ to: adminEmail, ...message });
  }
}

export const bookingConfirmation = onDocumentCreated("bookings/{bookingId}", async (event) => {
  const booking = event.data?.data();
  if (!booking) {
    return;
  }

  await db.collection("notifications").add({
    userId: booking.userId ?? null,
    type: "booking_confirmation",
    message: `Booking for ${booking.program} has been received and is pending payment confirmation.`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const bookingPaidEmail = onValueWritten("/bookings/{bookingId}", async (event) => {
  const before = event.data.before.val() as BookingRecord | null;
  const after = event.data.after.val() as BookingRecord | null;

  if (!after) {
    return;
  }

  const wasPaid = isPaidStatus(before?.status);
  const isPaid = isPaidStatus(after.status);

  if (!isPaid || wasPaid) {
    return;
  }

  await sendBookingEmails(after, event.params.bookingId);
});

export const inviteAfterTwoBookings = onDocumentCreated("bookings/{bookingId}", async (event) => {
  const booking = event.data?.data();
  const userId = booking?.userId;

  if (!userId) {
    return;
  }

  const bookings = await db.collection("bookings").where("userId", "==", userId).get();
  if (bookings.size === 2) {
    await db.collection("notifications").add({
      userId,
      type: "portal_invite",
      title: "Create your learner portal",
      message: "You have completed 2 bookings. Activate your learner dashboard now.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

export const assessmentReminder = onSchedule("every day 19:00", async () => {
  const classes = await db.collection("sessions").where("date", "==", new Date().toISOString().slice(0, 10)).get();

  const jobs = classes.docs.map((item) =>
    db.collection("notifications").add({
      userId: item.data().instructorId,
      type: "assessment_reminder",
      message: "Submit class assessments before end of day.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  );

  await Promise.all(jobs);
  logger.info("assessment reminders queued", { count: jobs.length });
});

export const certificateGeneration = onDocumentUpdated("assessments/{assessmentId}", async (event) => {
  const after = event.data?.after.data();
  if (!after || after.level !== "Pro") {
    return;
  }

  await db.collection("certificates").add({
    studentId: after.studentId,
    assessmentId: event.params.assessmentId,
    title: "Aura Swimming Excellence Certificate",
    status: "generated",
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const paymentReminders = onSchedule("every monday 08:00", async () => {
  const unpaid = await db.collection("payments").where("status", "==", "due").get();

  const jobs = unpaid.docs.map((item) =>
    db.collection("notifications").add({
      userId: item.data().userId,
      type: "payment_reminder",
      message: "Your session payment is due. Secure your next class slot.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  );

  await Promise.all(jobs);
  logger.info("payment reminders queued", { count: jobs.length });
});

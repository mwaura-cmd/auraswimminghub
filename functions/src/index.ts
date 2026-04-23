import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

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

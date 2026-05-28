"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentReminders = exports.certificateGeneration = exports.assessmentReminder = exports.inviteAfterTwoBookings = exports.bookingPaidEmail = exports.bookingCreatedEmail = exports.bookingConfirmation = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/firestore");
const database_1 = require("firebase-functions/v2/database");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
function isPaidStatus(status) {
    return status === "paid" || status === "confirmed";
}
function formatKes(amount) {
    if (!Number.isFinite(amount)) {
        return "KES 0";
    }
    return `KES ${new Intl.NumberFormat("en-KE").format(amount ?? 0)}`;
}
function buildLearnerConfirmedEmail(booking, bookingId) {
    const name = booking.fullName ?? "there";
    const learner = booking.learnerName ?? "your learner";
    const program = booking.program ?? "your session";
    const date = booking.date ?? "TBD";
    const time = booking.time ?? "TBD";
    const amount = formatKes(booking.amountKes);
    const reference = booking.paystackReference ?? bookingId;
    const subject = "Your booking is confirmed";
    const text = `Hi ${name},\n\n` +
        `Your booking is confirmed for ${learner}.\n` +
        `Program: ${program}\n` +
        `Date: ${date}\n` +
        `Time: ${time}\n` +
        `Amount: ${amount}\n` +
        `Reference: ${reference}\n\n` +
        `We look forward to seeing you in the pool.\n` +
        `Aura Swimming Hub`;
    const html = `<p>Hi ${name},</p>` +
        `<p>Your booking is confirmed for <strong>${learner}</strong>.</p>` +
        `<p><strong>Program:</strong> ${program}<br/>` +
        `<strong>Date:</strong> ${date}<br/>` +
        `<strong>Time:</strong> ${time}<br/>` +
        `<strong>Amount:</strong> ${amount}<br/>` +
        `<strong>Reference:</strong> ${reference}</p>` +
        `<p>We look forward to seeing you in the pool.<br/>Aura Swimming Hub</p>`;
    return { subject, text, html };
}
function buildAdminConfirmedEmail(booking, bookingId) {
    const learner = booking.learnerName ?? "(unknown learner)";
    const name = booking.fullName ?? "(unknown guardian)";
    const email = booking.email ?? "(no email)";
    const program = booking.program ?? "(no program)";
    const date = booking.date ?? "TBD";
    const time = booking.time ?? "TBD";
    const amount = formatKes(booking.amountKes);
    const reference = booking.paystackReference ?? bookingId;
    const subject = "New booking confirmed";
    const text = `New booking confirmed.\n` +
        `Learner: ${learner}\n` +
        `Guardian: ${name}\n` +
        `Email: ${email}\n` +
        `Program: ${program}\n` +
        `Date: ${date}\n` +
        `Time: ${time}\n` +
        `Amount: ${amount}\n` +
        `Reference: ${reference}`;
    const html = `<p><strong>New booking confirmed</strong></p>` +
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
function buildLearnerPendingEmail(booking, bookingId) {
    const name = booking.fullName ?? "there";
    const learner = booking.learnerName ?? "your learner";
    const program = booking.program ?? "your session";
    const date = booking.date ?? "TBD";
    const time = booking.time ?? "TBD";
    const amount = formatKes(booking.amountKes);
    const reference = booking.paystackReference ?? bookingId;
    const subject = "Booking received - pending payment";
    const text = `Hi ${name},\n\n` +
        `We received your booking for ${learner}.\n` +
        `Program: ${program}\n` +
        `Date: ${date}\n` +
        `Time: ${time}\n` +
        `Amount: ${amount}\n` +
        `Reference: ${reference}\n\n` +
        `Complete payment to confirm your session.\n` +
        `Aura Swimming Hub`;
    const html = `<p>Hi ${name},</p>` +
        `<p>We received your booking for <strong>${learner}</strong>.</p>` +
        `<p><strong>Program:</strong> ${program}<br/>` +
        `<strong>Date:</strong> ${date}<br/>` +
        `<strong>Time:</strong> ${time}<br/>` +
        `<strong>Amount:</strong> ${amount}<br/>` +
        `<strong>Reference:</strong> ${reference}</p>` +
        `<p>Complete payment to confirm your session.<br/>Aura Swimming Hub</p>`;
    return { subject, text, html };
}
function buildAdminPendingEmail(booking, bookingId) {
    const learner = booking.learnerName ?? "(unknown learner)";
    const name = booking.fullName ?? "(unknown guardian)";
    const email = booking.email ?? "(no email)";
    const program = booking.program ?? "(no program)";
    const date = booking.date ?? "TBD";
    const time = booking.time ?? "TBD";
    const amount = formatKes(booking.amountKes);
    const reference = booking.paystackReference ?? bookingId;
    const subject = "New booking received";
    const text = `New booking received (pending payment).\n` +
        `Learner: ${learner}\n` +
        `Guardian: ${name}\n` +
        `Email: ${email}\n` +
        `Program: ${program}\n` +
        `Date: ${date}\n` +
        `Time: ${time}\n` +
        `Amount: ${amount}\n` +
        `Reference: ${reference}`;
    const html = `<p><strong>New booking received (pending payment)</strong></p>` +
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
async function sendResendEmail(params) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.BOOKING_FROM_EMAIL;
    if (!apiKey || !from) {
        firebase_functions_1.logger.warn("Email config missing; set RESEND_API_KEY and BOOKING_FROM_EMAIL.");
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
        firebase_functions_1.logger.error("Resend email failed", { status: response.status, errorText });
    }
}
async function sendBookingConfirmedEmails(booking, bookingId) {
    const learnerEmail = booking.email;
    if (learnerEmail) {
        const message = buildLearnerConfirmedEmail(booking, bookingId);
        await sendResendEmail({ to: learnerEmail, ...message });
    }
    const adminEmail = process.env.BOOKING_ADMIN_EMAIL;
    if (adminEmail) {
        const message = buildAdminConfirmedEmail(booking, bookingId);
        await sendResendEmail({ to: adminEmail, ...message });
    }
}
async function sendBookingPendingEmails(booking, bookingId) {
    const learnerEmail = booking.email;
    if (learnerEmail) {
        const message = buildLearnerPendingEmail(booking, bookingId);
        await sendResendEmail({ to: learnerEmail, ...message });
    }
    const adminEmail = process.env.BOOKING_ADMIN_EMAIL;
    if (adminEmail) {
        const message = buildAdminPendingEmail(booking, bookingId);
        await sendResendEmail({ to: adminEmail, ...message });
    }
}
exports.bookingConfirmation = (0, firestore_1.onDocumentCreated)("bookings/{bookingId}", async (event) => {
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
exports.bookingCreatedEmail = (0, database_1.onValueWritten)("/bookings/{bookingId}", async (event) => {
    const beforeExists = event.data.before.exists();
    const after = event.data.after.val();
    if (beforeExists || !after) {
        return;
    }
    await sendBookingPendingEmails(after, event.params.bookingId);
});
exports.bookingPaidEmail = (0, database_1.onValueWritten)("/bookings/{bookingId}", async (event) => {
    const before = event.data.before.val();
    const after = event.data.after.val();
    if (!after) {
        return;
    }
    const wasPaid = isPaidStatus(before?.status);
    const isPaid = isPaidStatus(after.status);
    if (!isPaid || wasPaid) {
        return;
    }
    await sendBookingConfirmedEmails(after, event.params.bookingId);
});
exports.inviteAfterTwoBookings = (0, firestore_1.onDocumentCreated)("bookings/{bookingId}", async (event) => {
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
exports.assessmentReminder = (0, scheduler_1.onSchedule)("every day 19:00", async () => {
    const classes = await db.collection("sessions").where("date", "==", new Date().toISOString().slice(0, 10)).get();
    const jobs = classes.docs.map((item) => db.collection("notifications").add({
        userId: item.data().instructorId,
        type: "assessment_reminder",
        message: "Submit class assessments before end of day.",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }));
    await Promise.all(jobs);
    firebase_functions_1.logger.info("assessment reminders queued", { count: jobs.length });
});
exports.certificateGeneration = (0, firestore_1.onDocumentUpdated)("assessments/{assessmentId}", async (event) => {
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
exports.paymentReminders = (0, scheduler_1.onSchedule)("every monday 08:00", async () => {
    const unpaid = await db.collection("payments").where("status", "==", "due").get();
    const jobs = unpaid.docs.map((item) => db.collection("notifications").add({
        userId: item.data().userId,
        type: "payment_reminder",
        message: "Your session payment is due. Secure your next class slot.",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }));
    await Promise.all(jobs);
    firebase_functions_1.logger.info("payment reminders queued", { count: jobs.length });
});
//# sourceMappingURL=index.js.map
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
exports.paymentReminders = exports.certificateGeneration = exports.assessmentReminder = exports.inviteAfterTwoBookings = exports.bookingConfirmation = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
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
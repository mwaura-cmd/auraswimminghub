import { NextRequest, NextResponse } from "next/server";
import { getAdminRtdb } from "@/lib/firebase-admin";

const VERIFY_URL = "https://api.paystack.co/transaction/verify";

type VerifyRequestBody = {
  reference?: string;
  bookingId?: string;
};

type PaystackVerifyPayload = {
  status: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    metadata?: {
      bookingId?: string;
    };
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyRequestBody;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!body.reference) {
      return NextResponse.json({ error: "reference is required" }, { status: 400 });
    }

    if (!secretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });
    }

    const response = await fetch(`${VERIFY_URL}/${body.reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const payload = (await response.json()) as PaystackVerifyPayload;

    if (!response.ok) {
      return NextResponse.json({ error: payload.message ?? "Could not verify payment" }, { status: response.status });
    }

    let bookingUpdated = false;
    let bookingUpdateError: string | undefined;

    const verifiedBookingId = body.bookingId ?? payload.data?.metadata?.bookingId;
    if (payload.status && payload.data?.status === "success" && verifiedBookingId) {
      const adminRtdb = getAdminRtdb();

      if (!adminRtdb) {
        bookingUpdateError = "Firebase Admin credentials missing; payment verified but booking status not updated.";
      } else {
        try {
          await adminRtdb.ref(`bookings/${verifiedBookingId}`).update({
            status: "paid",
            paystackReference: payload.data.reference ?? body.reference,
            paidAt: new Date().toISOString(),
          });
          bookingUpdated = true;
        } catch {
          bookingUpdateError = "Payment verified but booking update failed.";
        }
      }
    }

    return NextResponse.json({
      ...payload,
      bookingUpdated,
      bookingUpdateError,
    });
  } catch {
    return NextResponse.json({ error: "Could not verify payment" }, { status: 500 });
  }
}

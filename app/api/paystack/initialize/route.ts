import { NextRequest, NextResponse } from "next/server";

const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      amount: number;
      email: string;
      bookingId: string;
      name: string;
      program?: string;
      learnerGroup?: string;
      billingCycle?: string;
    };

    if (!body.email || !body.bookingId || !body.name || !Number.isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/book?success=1&booking=${body.bookingId}`;

    const response = await fetch(PAYSTACK_INIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        amount: Math.round(body.amount * 100),
        callback_url: callbackUrl,
        metadata: {
          bookingId: body.bookingId,
          customerName: body.name,
          program: body.program,
          learnerGroup: body.learnerGroup,
          billingCycle: body.billingCycle,
          amountKes: body.amount,
        },
      }),
    });

    const payload = (await response.json()) as {
      status: boolean;
      data?: { authorization_url: string; reference: string };
      message?: string;
    };

    if (!payload.status || !payload.data) {
      return NextResponse.json({ error: payload.message ?? "Initialization failed" }, { status: 400 });
    }

    return NextResponse.json(payload.data);
  } catch {
    return NextResponse.json({ error: "Could not initialize payment" }, { status: 500 });
  }
}

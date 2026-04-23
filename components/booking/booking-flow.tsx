"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PROGRAMS } from "@/lib/constants";
import { BILLING_CYCLE_LABEL, BILLING_CYCLE_MULTIPLIER, DAILY_RATE_KES, computeAmountKes, formatKes } from "@/lib/pricing";
import { createBooking } from "@/lib/realtimedb";
import { BookingInput } from "@/lib/types";

const PROGRAM_OPTIONS = [
  "Toddlers & Kids",
  "Teens",
  "Adults",
  "Competitive Training",
  "Water Treading Skills",
] as const;

const LEARNER_GROUP_OPTIONS = ["Toddlers", "Kids", "Teens", "Adults"] as const;

const BILLING_CYCLE_OPTIONS = ["daily", "weekly", "monthly"] as const;

const bookingSchema = z.object({
  program: z.enum(PROGRAM_OPTIONS),
  learnerGroup: z.enum(LEARNER_GROUP_OPTIONS),
  billingCycle: z.enum(BILLING_CYCLE_OPTIONS),
  date: z.string().min(1),
  time: z.string().min(1),
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(7),
  learnerName: z.string().min(2),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const initialValues: BookingFormValues = {
  program: "Toddlers & Kids",
  learnerGroup: "Kids",
  billingCycle: "daily",
  date: "",
  time: "",
  fullName: "",
  email: "",
  phone: "",
  learnerName: "",
  notes: "",
};

export function BookingFlow() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [confirmationRef, setConfirmationRef] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [verifyWarning, setVerifyWarning] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference") ?? searchParams.get("trxref");
    const success = searchParams.get("success");
    const bookingId = searchParams.get("booking");

    if (!reference || success !== "1") {
      return;
    }

    const verify = async () => {
      try {
        const verifyResponse = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, bookingId }),
        });

        const payload = (await verifyResponse.json()) as {
          data?: { status?: string; reference?: string };
          bookingUpdateError?: string;
        };

        if (payload.data?.status === "success") {
          setConfirmationRef(bookingId || payload.data.reference || reference);
          setStatus("confirmed");
          setStep(4);

          if (payload.bookingUpdateError) {
            setVerifyWarning(payload.bookingUpdateError);
          }
        }
      } catch {
        // keep the form available for retry
      }
    };

    void verify();
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: initialValues,
  });

  const form = watch();

  const payableAmountKes = useMemo(
    () => computeAmountKes(form.learnerGroup, form.billingCycle),
    [form.billingCycle, form.learnerGroup],
  );

  const summary = useMemo(
    () => `${form.program} (${form.learnerGroup}) - ${BILLING_CYCLE_LABEL[form.billingCycle]} plan on ${form.date || "-"} at ${form.time || "-"}`,
    [form.billingCycle, form.date, form.learnerGroup, form.program, form.time],
  );

  const submitBooking = handleSubmit(async (values) => {
    try {
      setStatus("submitting");
      setPaymentError("");

      const amountKes = computeAmountKes(values.learnerGroup, values.billingCycle);
      const bookingPayload: BookingInput = {
        ...values,
        amountKes,
      };

      const bookingId = await createBooking(bookingPayload);

      const paymentResponse = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountKes,
          email: values.email,
          bookingId,
          name: values.fullName,
          program: values.program,
          learnerGroup: values.learnerGroup,
          billingCycle: values.billingCycle,
        }),
      });

      const paymentPayload = (await paymentResponse.json()) as {
        authorization_url?: string;
        error?: string;
      };

      if (!paymentResponse.ok || !paymentPayload.authorization_url) {
        throw new Error(paymentPayload.error ?? "Unable to initialize payment.");
      }

      window.location.href = paymentPayload.authorization_url;
    } catch (error) {
      setStatus("idle");
      setPaymentError(error instanceof Error ? error.message : "Unable to complete booking. Please retry.");
    }
  });

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8">
      <div className="mb-6 grid grid-cols-4 gap-2 text-xs uppercase tracking-[0.18em]">
        {["Program & Pricing", "Date & Time", "Details", "Pay"].map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={index + 1 > step}
            className={`rounded-full px-3 py-2 text-left ${
              step >= index + 1 ? "bg-teal-500/30 text-teal-50" : "bg-black/70 text-teal-200/45"
            }`}
            onClick={() => setStep(index + 1)}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submitBooking} className="space-y-5">
        {step === 1 && (
          <div>
            <label className="mb-2 block text-sm text-teal-100">Choose Program</label>
            <select {...register("program")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3 outline-none focus:ring-2 focus:ring-teal-500/50">
              {PROGRAMS.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-teal-100">Learner Group</label>
                <select {...register("learnerGroup")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3 outline-none focus:ring-2 focus:ring-teal-500/50">
                  {LEARNER_GROUP_OPTIONS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-teal-100">Billing Plan</label>
                <select {...register("billingCycle")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3 outline-none focus:ring-2 focus:ring-teal-500/50">
                  {BILLING_CYCLE_OPTIONS.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {BILLING_CYCLE_LABEL[cycle]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="glass-card mt-4 rounded-xl p-3 text-sm">
              <p className="text-teal-100/80">Daily rate: {formatKes(DAILY_RATE_KES[form.learnerGroup])}</p>
              <p className="mt-1 text-teal-100/80">
                {BILLING_CYCLE_LABEL[form.billingCycle]} multiplier: x{BILLING_CYCLE_MULTIPLIER[form.billingCycle]}
              </p>
              <p className="mt-2 font-semibold text-teal-50">Charge now: {formatKes(payableAmountKes)}</p>
            </div>

            <button type="button" className="btn-primary mt-5" onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-teal-100">Preferred Date</label>
              <input type="date" {...register("date")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
              {errors.date && <p className="mt-2 text-xs text-rose-300">Date is required.</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm text-teal-100">Preferred Time</label>
              <input type="time" {...register("time")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
              {errors.time && <p className="mt-2 text-xs text-rose-300">Time is required.</p>}
            </div>
            <button type="button" className="btn-primary md:col-span-2" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-teal-100">Full Name</label>
              <input {...register("fullName")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-teal-100">Email</label>
              <input type="email" {...register("email")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-teal-100">Phone</label>
              <input {...register("phone")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-teal-100">Learner Name</label>
              <input {...register("learnerName")} className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-teal-100">Notes</label>
              <textarea {...register("notes")} className="min-h-20 w-full rounded-xl border border-teal-500/30 bg-black/70 p-3" />
            </div>

            <div className="glass-card rounded-xl p-3 text-sm md:col-span-2">
              <p>Summary: {summary}</p>
              <p className="mt-1 font-semibold text-teal-50">Amount: {formatKes(payableAmountKes)}</p>
            </div>

            {paymentError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-900/20 p-3 text-sm text-rose-200 md:col-span-2">
                {paymentError}
              </p>
            )}

            <button disabled={status === "submitting"} type="submit" className="btn-primary md:col-span-2">
              {status === "submitting" ? "Processing payment..." : `Pay ${formatKes(payableAmountKes)} via Paystack`}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-2xl border border-teal-400/35 bg-teal-500/10 p-6 text-center">
            <h3 className="text-2xl">Payment Confirmed</h3>
            <p className="mt-2 text-teal-100/80">Reference: {confirmationRef}</p>
            <p className="mt-2 text-sm text-teal-100/70">Your lesson slot is reserved. A confirmation message will follow shortly.</p>
            {verifyWarning && <p className="mt-3 text-xs text-amber-200">{verifyWarning}</p>}
          </div>
        )}
      </form>
    </div>
  );
}

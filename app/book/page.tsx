import { BookingFlow } from "@/components/booking/booking-flow";
import { Suspense } from "react";

export default function BookPage() {
  return (
    <div className="section-shell pb-20">
      <div className="mb-8">
        <h1 className="text-4xl">Book Your Session</h1>
        <p className="mt-3 max-w-2xl text-teal-50/75">
          Choose your program, lock your preferred time, and complete payment through a secure Paystack flow.
        </p>
      </div>
      <Suspense fallback={<div className="glass-card rounded-3xl p-8 text-center">Preparing booking flow...</div>}>
        <BookingFlow />
      </Suspense>
    </div>
  );
}

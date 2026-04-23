import { BillingCycle, LearnerGroup } from "@/lib/types";

export const LEARNER_GROUPS: LearnerGroup[] = ["Toddlers", "Kids", "Teens", "Adults"];

export const BILLING_CYCLES: BillingCycle[] = ["daily", "weekly", "monthly"];

export const DAILY_RATE_KES: Record<LearnerGroup, number> = {
  Toddlers: 200,
  Kids: 150,
  Teens: 150,
  Adults: 200,
};

export const BILLING_CYCLE_MULTIPLIER: Record<BillingCycle, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function computeAmountKes(learnerGroup: LearnerGroup, billingCycle: BillingCycle): number {
  return DAILY_RATE_KES[learnerGroup] * BILLING_CYCLE_MULTIPLIER[billingCycle];
}

export function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

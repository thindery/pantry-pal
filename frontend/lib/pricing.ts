/**
 * PP-243: list prices for the plans sold on /pricing, in cents.
 * These mirror the live Stripe prices (Pro $4.99/mo or $39.99/yr, Family $7.99/mo
 * or $59.99/yr). Display only: Checkout always charges the Stripe price id, so a
 * mismatch here can never change what a customer pays.
 */
export const PLAN_PRICES_CENTS = {
  pro: { month: 499, year: 3999 },
  family: { month: 799, year: 5999 },
} as const;

export type PaidPlan = keyof typeof PLAN_PRICES_CENTS;

/** "$4.99", "$40", "$0". */
export function formatUsd(cents: number): string {
  const value = cents / 100;
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/** Cents saved per year by paying yearly instead of 12 monthly payments. */
export function yearlySavingsCents(plan: PaidPlan): number {
  const p = PLAN_PRICES_CENTS[plan];
  return Math.max(0, p.month * 12 - p.year);
}

/** Whole-percent saving of yearly vs 12 x monthly, rounded down so it is never overstated. */
export function yearlySavingsPercent(plan: PaidPlan): number {
  const p = PLAN_PRICES_CENTS[plan];
  return Math.floor((yearlySavingsCents(plan) / (p.month * 12)) * 100);
}

/** Effective monthly cost of the yearly plan, rounded down to the cent ("$3.33"). */
export function yearlyPerMonthCents(plan: PaidPlan): number {
  return Math.floor(PLAN_PRICES_CENTS[plan].year / 12);
}

/** Largest yearly saving across paid plans, for the toggle badge. */
export function maxYearlySavingsPercent(): number {
  return Math.max(...(Object.keys(PLAN_PRICES_CENTS) as PaidPlan[]).map(yearlySavingsPercent));
}

/**
 * Subscription (langganan) helpers. Kept pure so the schedule math and
 * discount pricing are trivially unit-testable.
 *
 * A subscription is due when it is ACTIVE and its nextRunAt has arrived.
 * Fulfilling it advances the schedule by `frequencyDays` (anchored to the
 * scheduled date, so a late fulfilment does not drift the cadence forward).
 * Pricing follows the same integer-cent discipline as sales.
 */

import { toCents, fromCents } from "./sale";

const DAY_MS = 86_400_000;

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED";

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function isDue(
  nextRunAt: Date,
  status: SubscriptionStatus,
  now: Date = new Date()
): boolean {
  return status === "ACTIVE" && nextRunAt.getTime() <= now.getTime();
}

export function clampPct(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

/** Discounted unit price in integer cents (clamped to 0–100%). */
export function discountedUnitPriceCents(
  price: number,
  discountPct: number
): number {
  return Math.round((toCents(price) * (100 - clampPct(discountPct))) / 100);
}

/** Discounted unit price in rupiah (rounded to 2 decimals). */
export function discountedUnitPrice(
  price: number,
  discountPct: number
): number {
  return fromCents(discountedUnitPriceCents(price, discountPct));
}

/** Line total for a subscription fulfilment: discounted price × quantity. */
export function subscriptionTotalCents(
  price: number,
  discountPct: number,
  quantity: number
): number {
  return discountedUnitPriceCents(price, discountPct) * quantity;
}

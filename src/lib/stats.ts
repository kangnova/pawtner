/**
 * Dashboard stats helpers. Kept pure (no Prisma, no session) so the date
 * bucketing, revenue aggregation and top-product ranking are unit-testable
 * and never drift from the page that renders them.
 *
 * Money follows the same integer-cent discipline as sales: totals are
 * converted to cents with `toCents`, summed as integers, and converted back
 * to rupiah once.
 */

import { toCents, fromCents } from "./sale";

const DAY_MS = 86_400_000;

/** Local-midnight start of a given day. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** The last `n` local-midnight dates, oldest first, ending at today. */
export function lastNDays(n: number, now: Date = new Date()): Date[] {
  const today = startOfDay(now);
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

/** Local `YYYY-MM-DD` key for bucketing by calendar day. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type SalePoint = { createdAt: Date; total: number };

export type DayBucket = { date: Date; revenue: number; orders: number };

/**
 * Bucket sales into the last `days` calendar days (oldest first, ending
 * today). Empty days are zero-filled so the chart has no gaps. Sales older
 * than the window are ignored.
 */
export function dailyRevenue(
  sales: SalePoint[],
  days: number,
  now: Date = new Date()
): DayBucket[] {
  const buckets = lastNDays(days, now);
  const byKey = new Map<string, { revenueCents: number; orders: number }>();
  for (const d of buckets) byKey.set(dayKey(d), { revenueCents: 0, orders: 0 });

  for (const s of sales) {
    const b = byKey.get(dayKey(s.createdAt));
    if (b) {
      b.revenueCents += toCents(s.total);
      b.orders += 1;
    }
  }

  return buckets.map((d) => {
    const b = byKey.get(dayKey(d))!;
    return { date: d, revenue: fromCents(b.revenueCents), orders: b.orders };
  });
}

/** Sum of sale totals (rupiah, rounded to 2 decimals). */
export function sumTotals(totals: number[]): number {
  return fromCents(totals.reduce((s, t) => s + toCents(t), 0));
}

export type SoldItem = { productId: string; quantity: number };

/**
 * Aggregate quantity sold by product, sorted descending, truncated to
 * `limit`. Ties keep first-seen order (stable for deterministic tests).
 */
export function topProducts(
  items: SoldItem[],
  limit = 5
): { productId: string; quantity: number }[] {
  const byProduct = new Map<string, number>();
  for (const it of items) {
    byProduct.set(it.productId, (byProduct.get(it.productId) ?? 0) + it.quantity);
  }
  return [...byProduct.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

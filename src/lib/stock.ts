import type { Batch } from "@prisma/client";

export const EXPIRY_SOON_DAYS = 30;
const DAY_MS = 86_400_000;

export type StockStatus = "ok" | "low" | "out";

export type BatchLike = Pick<Batch, "id" | "quantity" | "expiryDate">;

export function isExpired(
  b: { expiryDate: Date | null },
  now: Date = new Date()
): boolean {
  return !!b.expiryDate && b.expiryDate.getTime() < now.getTime();
}

export function isExpiringSoon(
  b: { expiryDate: Date | null },
  now: Date = new Date(),
  days: number = EXPIRY_SOON_DAYS
): boolean {
  if (!b.expiryDate) return false;
  const t = b.expiryDate.getTime();
  return t >= now.getTime() && t <= now.getTime() + days * DAY_MS;
}

export function totalStock(
  batches: Pick<Batch, "quantity">[]
): number {
  return batches.reduce((s, b) => s + b.quantity, 0);
}

export function sellableStock(
  batches: Pick<Batch, "quantity" | "expiryDate">[],
  now: Date = new Date()
): number {
  return batches
    .filter((b) => !isExpired(b, now))
    .reduce((s, b) => s + b.quantity, 0);
}

export function expiredStock(
  batches: Pick<Batch, "quantity" | "expiryDate">[],
  now: Date = new Date()
): number {
  return batches
    .filter((b) => isExpired(b, now))
    .reduce((s, b) => s + b.quantity, 0);
}

export function expiringSoonStock(
  batches: Pick<Batch, "quantity" | "expiryDate">[],
  now: Date = new Date(),
  days: number = EXPIRY_SOON_DAYS
): number {
  return batches
    .filter((b) => isExpiringSoon(b, now, days))
    .reduce((s, b) => s + b.quantity, 0);
}

/**
 * FIFO consumption: consume `qty` from the soonest-expiring sellable batch
 * first (expired batches are never sold; batches without an expiry date go
 * last). Returns an array of decrements, or `null` when sellable stock is
 * insufficient.
 */
export function fifoConsume(
  batches: BatchLike[],
  qty: number,
  now: Date = new Date()
): { batchId: string; quantity: number }[] | null {
  if (qty <= 0) return [];
  const sellable = batches
    .filter((b) => !isExpired(b, now))
    .sort((a, b) => {
      const aT = a.expiryDate?.getTime() ?? Infinity;
      const bT = b.expiryDate?.getTime() ?? Infinity;
      return aT - bT;
    });

  let remaining = qty;
  const decrements: { batchId: string; quantity: number }[] = [];
  for (const b of sellable) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    decrements.push({ batchId: b.id, quantity: take });
    remaining -= take;
  }
  return remaining > 0 ? null : decrements;
}

export type StockInfo = {
  total: number;
  sellable: number;
  expired: number;
  expiringSoon: number;
  status: StockStatus;
};

/**
 * Summarise a product's stock across its batches. `status` is judged on
 * *sellable* stock (expired units can't be sold), while `expired` and
 * `expiringSoon` are surfaced separately for write-off / discount action.
 */
export function stockInfo(
  batches: Pick<Batch, "quantity" | "expiryDate">[],
  minStockThreshold: number,
  now: Date = new Date()
): StockInfo {
  const total = totalStock(batches);
  const sellable = sellableStock(batches, now);
  const expired = expiredStock(batches, now);
  const expiringSoon = expiringSoonStock(batches, now);
  const status: StockStatus =
    sellable <= 0 ? "out" : sellable < minStockThreshold ? "low" : "ok";
  return { total, sellable, expired, expiringSoon, status };
}

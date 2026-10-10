import { describe, it, expect } from "vitest";
import {
  addDays,
  isDue,
  clampPct,
  discountedUnitPrice,
  discountedUnitPriceCents,
  subscriptionTotalCents,
} from "./subscription";

describe("addDays", () => {
  it("advances by whole days", () => {
    const d = new Date(2026, 9, 10, 12, 0, 0);
    expect(addDays(d, 7).getTime()).toBe(
      new Date(2026, 9, 17, 12, 0, 0).getTime()
    );
  });
});

describe("isDue", () => {
  const now = new Date(2026, 9, 10, 12, 0, 0);
  it("is due when active and nextRunAt has passed", () => {
    expect(isDue(new Date(2026, 9, 9), "ACTIVE", now)).toBe(true);
    expect(isDue(new Date(2026, 9, 10, 12, 0, 0), "ACTIVE", now)).toBe(true);
  });
  it("is not due when nextRunAt is in the future", () => {
    expect(isDue(new Date(2026, 9, 11), "ACTIVE", now)).toBe(false);
  });
  it("is never due when paused or cancelled", () => {
    expect(isDue(new Date(2026, 9, 1), "PAUSED", now)).toBe(false);
    expect(isDue(new Date(2026, 9, 1), "CANCELLED", now)).toBe(false);
  });
});

describe("discount pricing", () => {
  it("applies a percentage discount in exact cents", () => {
    expect(discountedUnitPriceCents(25000, 10)).toBe(2250000); // Rp 22.500
    expect(discountedUnitPrice(25000, 10)).toBe(22500);
  });
  it("handles zero and full discount", () => {
    expect(discountedUnitPrice(25000, 0)).toBe(25000);
    expect(discountedUnitPrice(25000, 100)).toBe(0);
  });
  it("clamps out-of-range percentages", () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(150)).toBe(100);
    expect(discountedUnitPrice(25000, 150)).toBe(0);
    expect(discountedUnitPrice(25000, -5)).toBe(25000);
  });
  it("computes fulfilment totals", () => {
    expect(subscriptionTotalCents(25000, 10, 2)).toBe(4500000); // 2 × 22.500
  });
});

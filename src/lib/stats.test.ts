import { describe, it, expect } from "vitest";
import {
  startOfDay,
  lastNDays,
  dayKey,
  dailyRevenue,
  sumTotals,
  topProducts,
} from "./stats";

describe("startOfDay", () => {
  it("zeroes the time part", () => {
    const d = startOfDay(new Date(2026, 9, 10, 15, 30, 45));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getDate()).toBe(10);
  });
});

describe("lastNDays", () => {
  it("returns n days, oldest first, ending today", () => {
    const now = new Date(2026, 9, 10, 12, 0);
    const days = lastNDays(3, now);
    expect(days).toHaveLength(3);
    expect(dayKey(days[0])).toBe("2026-10-08");
    expect(dayKey(days[2])).toBe("2026-10-10");
  });
});

describe("dailyRevenue", () => {
  const now = new Date(2026, 9, 10, 15, 0);

  it("buckets revenue and order counts by day, zero-filling gaps", () => {
    const sales = [
      { createdAt: new Date(2026, 9, 10, 9, 0), total: 50000 },
      { createdAt: new Date(2026, 9, 10, 10, 0), total: 25000 },
      { createdAt: new Date(2026, 9, 8, 12, 0), total: 100000 },
    ];
    const buckets = dailyRevenue(sales, 7, now);
    expect(buckets).toHaveLength(7);
    // today (last) = 50k + 25k, 2 orders
    expect(buckets[6].revenue).toBe(75000);
    expect(buckets[6].orders).toBe(2);
    // two days ago
    expect(buckets[4].revenue).toBe(100000);
    expect(buckets[4].orders).toBe(1);
    // gap days are zero
    expect(buckets[5].revenue).toBe(0);
    expect(buckets[5].orders).toBe(0);
  });

  it("ignores sales outside the window", () => {
    const sales = [
      { createdAt: new Date(2026, 9, 1, 9, 0), total: 999999 },
      { createdAt: new Date(2026, 9, 10, 9, 0), total: 1000 },
    ];
    const buckets = dailyRevenue(sales, 3, now);
    const total = buckets.reduce((s, b) => s + b.revenue, 0);
    expect(total).toBe(1000);
  });

  it("keeps integer cents exact across many rows", () => {
    const sales = [
      { createdAt: new Date(2026, 9, 10, 9, 0), total: 0.1 },
      { createdAt: new Date(2026, 9, 10, 9, 1), total: 0.2 },
    ];
    const buckets = dailyRevenue(sales, 1, now);
    expect(buckets[0].revenue).toBe(0.3);
  });
});

describe("sumTotals", () => {
  it("sums in integer cents then rounds once", () => {
    expect(sumTotals([0.1, 0.2])).toBe(0.3);
    expect(sumTotals([50000, 25000])).toBe(75000);
    expect(sumTotals([])).toBe(0);
  });
});

describe("topProducts", () => {
  it("aggregates quantity, sorts desc, and limits", () => {
    const items = [
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 5 },
      { productId: "a", quantity: 3 },
      { productId: "c", quantity: 1 },
    ];
    expect(topProducts(items, 2)).toEqual([
      { productId: "a", quantity: 5 },
      { productId: "b", quantity: 5 },
    ]);
  });

  it("returns empty for no items", () => {
    expect(topProducts([])).toEqual([]);
  });
});

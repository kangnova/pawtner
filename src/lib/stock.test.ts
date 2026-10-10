import { describe, it, expect } from "vitest";
import {
  totalStock,
  sellableStock,
  expiredStock,
  expiringSoonStock,
  fifoConsume,
  stockInfo,
  isExpired,
  isExpiringSoon,
} from "./stock";

const d = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000);

const batch = (
  id: string,
  quantity: number,
  expiryDate: Date | null = null
) => ({ id, quantity, expiryDate });

describe("totalStock", () => {
  it("sums all batches including expired", () => {
    expect(totalStock([batch("a", 5), batch("b", 3)])).toBe(8);
  });
});

describe("isExpired / isExpiringSoon", () => {
  it("flags past expiry as expired", () => {
    expect(isExpired(batch("a", 1, d(-1)))).toBe(true);
    expect(isExpired(batch("a", 1, d(1)))).toBe(false);
    expect(isExpired(batch("a", 1, null))).toBe(false);
  });
  it("flags only the next N days as expiring soon", () => {
    expect(isExpiringSoon(batch("a", 1, d(10)))).toBe(true);
    expect(isExpiringSoon(batch("a", 1, d(31)))).toBe(false);
    expect(isExpiringSoon(batch("a", 1, null))).toBe(false);
    expect(isExpiringSoon(batch("a", 1, d(-1)))).toBe(false);
  });
});

describe("stock partitioning", () => {
  const batches = [
    batch("expired", 3, d(-5)),
    batch("soon", 10, d(10)),
    batch("none", 4, null),
  ];
  it("sellable excludes expired", () => {
    expect(sellableStock(batches)).toBe(14);
  });
  it("expired counts only expired", () => {
    expect(expiredStock(batches)).toBe(3);
  });
  it("expiringSoon counts soon-expiring sellable units", () => {
    expect(expiringSoonStock(batches)).toBe(10);
  });
});

describe("fifoConsume", () => {
  it("consumes soonest-expiry first, then no-expiry last", () => {
    const batches = [
      batch("none", 4, null),
      batch("soon", 10, d(10)),
      batch("later", 5, d(40)),
    ];
    expect(fifoConsume(batches, 12)).toEqual([
      { batchId: "soon", quantity: 10 },
      { batchId: "later", quantity: 2 },
    ]);
  });
  it("skips expired batches entirely", () => {
    const batches = [batch("expired", 100, d(-1)), batch("good", 2, null)];
    expect(fifoConsume(batches, 2)).toEqual([{ batchId: "good", quantity: 2 }]);
  });
  it("returns null when sellable stock is insufficient", () => {
    const batches = [batch("expired", 100, d(-1)), batch("good", 2, null)];
    expect(fifoConsume(batches, 3)).toBeNull();
  });
  it("returns empty array for zero quantity", () => {
    expect(fifoConsume([batch("a", 5)], 0)).toEqual([]);
  });
});

describe("stockInfo", () => {
  it("reports out/low/ok on sellable stock", () => {
    expect(stockInfo([batch("a", 2, null)], 5).status).toBe("low");
    expect(stockInfo([batch("a", 0, null)], 5).status).toBe("out");
    expect(stockInfo([batch("a", 6, null)], 5).status).toBe("ok");
    // expired stock must not keep a product "in stock"
    expect(stockInfo([batch("a", 10, d(-1))], 5).status).toBe("out");
  });
  it("reports expired and expiringSoon quantities", () => {
    const info = stockInfo(
      [batch("x", 3, d(-2)), batch("y", 10, d(5)), batch("z", 4, null)],
      5
    );
    expect(info.total).toBe(17);
    expect(info.sellable).toBe(14);
    expect(info.expired).toBe(3);
    expect(info.expiringSoon).toBe(10);
  });
});

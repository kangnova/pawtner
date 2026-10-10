import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  lineSubtotalCents,
  saleTotalCents,
  roundMoney,
  formatInvoiceNumber,
} from "./sale";

describe("money helpers", () => {
  it("converts rupiah to cents exactly", () => {
    expect(toCents(12.34)).toBe(1234);
    expect(toCents(25000)).toBe(2500000);
    expect(fromCents(1234)).toBe(12.34);
  });

  it("computes line subtotals in exact cents", () => {
    expect(lineSubtotalCents(25000, 3)).toBe(7500000); // Rp 75.000
    expect(lineSubtotalCents(12.5, 2)).toBe(2500); // Rp 25
  });

  it("sums a sale total once, avoiding float drift", () => {
    // 0.1 x 3 = 0.3; naive float summing yields 0.30000000000000004
    const total = saleTotalCents([
      { unitPrice: 0.1, quantity: 1 },
      { unitPrice: 0.1, quantity: 1 },
      { unitPrice: 0.1, quantity: 1 },
    ]);
    expect(total).toBe(30);
    expect(roundMoney(total / 100)).toBe(0.3);
  });

  it("rounds money to 2 decimals", () => {
    expect(roundMoney(19.999)).toBe(20);
    expect(roundMoney(0.1)).toBe(0.1);
  });
});

describe("formatInvoiceNumber", () => {
  it("pads date and sequence", () => {
    expect(formatInvoiceNumber(new Date(2026, 9, 10), 7)).toBe(
      "INV-20261010-0007"
    );
  });

  it("never emits a zero or negative sequence", () => {
    expect(formatInvoiceNumber(new Date(2026, 0, 1), 0)).toBe(
      "INV-20260101-0001"
    );
    expect(formatInvoiceNumber(new Date(2026, 0, 1), -3)).toBe(
      "INV-20260101-0001"
    );
  });
});

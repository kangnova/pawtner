/**
 * Sales (POS) helpers. Kept pure so the money math and invoice numbering
 * are trivially unit-testable and never drift from the UI.
 *
 * Money is handled in integer cents: unit prices are converted with
 * `toCents`, multiplied by an integer quantity (exact), and the sale total
 * is the sum of those integer-cents line subtotals — full precision, then
 * converted back to rupiah only once.
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function lineSubtotalCents(unitPrice: number, quantity: number): number {
  return toCents(unitPrice) * quantity;
}

export function saleTotalCents(
  items: { unitPrice: number; quantity: number }[]
): number {
  return items.reduce(
    (sum, it) => sum + lineSubtotalCents(it.unitPrice, it.quantity),
    0
  );
}

export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

/** "INV-YYYYMMDD-0001" — daily sequence, human-readable on a paper receipt. */
export function formatInvoiceNumber(date: Date, seq: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const s = String(Math.max(1, Math.trunc(seq))).padStart(4, "0");
  return `INV-${y}${m}${d}-${s}`;
}

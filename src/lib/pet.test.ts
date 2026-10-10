import { describe, it, expect } from "vitest";
import { petAgeLabel, monthDiff } from "./pet";

const d = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000);

describe("petAgeLabel", () => {
  it("handles missing and future birth dates", () => {
    expect(petAgeLabel(null)).toBe("—");
    expect(petAgeLabel(d(1))).toBe("—");
  });

  it("reports days for newborns", () => {
    expect(petAgeLabel(d(-3))).toBe("3d");
  });

  it("reports weeks from 7 to 29 days", () => {
    expect(petAgeLabel(d(-7))).toBe("1w");
    expect(petAgeLabel(d(-20))).toBe("2w");
  });

  it("reports months under a year", () => {
    const now = new Date(2026, 9, 10); // 10 Oct 2026
    expect(petAgeLabel(new Date(2026, 7, 10), now)).toBe("2mo");
    expect(petAgeLabel(new Date(2025, 9, 11), now)).toBe("11mo");
  });

  it("reports years with remainder", () => {
    const now = new Date(2026, 9, 10);
    expect(petAgeLabel(new Date(2025, 9, 10), now)).toBe("1y");
    expect(petAgeLabel(new Date(2024, 7, 10), now)).toBe("2y 2mo");
  });
});

describe("monthDiff", () => {
  it("is calendar-aware around month ends", () => {
    const from = new Date(2026, 0, 31); // 31 Jan
    const to = new Date(2026, 1, 28); // 28 Feb
    expect(monthDiff(from, to)).toBe(0);
  });
});

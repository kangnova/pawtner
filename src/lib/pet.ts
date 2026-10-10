/**
 * Pet helpers. Kept pure so they are trivially unit-testable — the pet's age
 * is derived from `birthDate` and used to surface feeding/reorder reminders
 * later (step 4), so the label logic must not drift.
 */

const DAY_MS = 86_400_000;

/** Calendar-aware whole-month difference (from's day > to's day → one less). */
export function monthDiff(from: Date, to: Date): number {
  let m =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

/**
 * Human-readable age: "3d", "2w", "5mo", "1y", "2y 3mo".
 * Returns "—" for missing or future birth dates.
 */
export function petAgeLabel(
  birthDate: Date | null,
  now: Date = new Date()
): string {
  if (!birthDate) return "—";
  const ms = now.getTime() - birthDate.getTime();
  if (ms < 0) return "—";
  const days = Math.floor(ms / DAY_MS);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  const months = monthDiff(birthDate, now);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}y` : `${years}y ${rem}mo`;
}

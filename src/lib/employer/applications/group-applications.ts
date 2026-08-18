import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";

const OPEN_STATUSES = new Set(["submitted", "reviewing", "shortlisted"]);

export type GroupedEmployerApplications = {
  needsReview: EmployerApplicationListRow[];
  open: EmployerApplicationListRow[];
  decided: EmployerApplicationListRow[];
};

/**
 * Splits the applicant inventory along two independent axes and returns
 * both: `needsReview` (unseen, `employer_seen_at === null`) is an attention
 * signal orthogonal to `current_status`, and `open`/`decided` is an
 * exhaustive, mutually-exclusive partition on `current_status`
 * (submitted/reviewing/shortlisted vs. accepted/rejected). A row can
 * therefore appear in both `needsReview` and one of `open`/`decided` —
 * these are not four exclusive buckets. Never re-sorts; each returned
 * array preserves the input row order.
 */
export function groupEmployerApplications(
  rows: EmployerApplicationListRow[],
): GroupedEmployerApplications {
  const needsReview = rows.filter((row) => row.employer_seen_at === null);
  const open = rows.filter((row) => OPEN_STATUSES.has(row.current_status));
  const decided = rows.filter((row) => !OPEN_STATUSES.has(row.current_status));
  return { needsReview, open, decided };
}

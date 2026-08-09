/** Map server readiness missing identifiers to employer-facing checklist copy. */

export const READINESS_ITEM_LABELS: Record<string, string> = {
  title: "Title",
  job_category: "Job category",
  public_locality: "Berlin public locality",
  description: "Description",
  salary: "Salary (EUR gross)",
  languages: "Language requirements",
  company: "Organisation company link",
  employer_completion: "Completed employer profile",
  publication_state: "Draft publication state",
  // D-M5-19: employer_vacancy_draft_readiness now checks every field
  // publish_employer_vacancy requires (except expiry, see CHECKLIST_ORDER's
  // own comment) — the two functions can no longer disagree.
  verification: "Employer verification",
  workplace_type: "Workplace type",
  work_frequency: "Work frequency",
  cv_required: "CV requirement declaration",
  interview_english_ok: "English-interview declaration",
  employment_types: "Employment types",
  shift_requirements: "Shift requirements",
  expiry: "Valid publication expiry (up to 90 days)",
};

export type ReadinessChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
};

// D-M5-19: matches employer_vacancy_draft_readiness's own field set exactly
// — every field publish_employer_vacancy requires, so this checklist and
// the publish gate can never disagree again. Deliberately excludes
// "expiry": expires_at is genuinely null pre-publish and is always
// defaulted by publish_employer_vacancy before its own gate runs, so
// surfacing it here would be a permanent false negative, not a real
// blocker — see the migration's own comment for the full reasoning.
const CHECKLIST_ORDER = [
  "employer_completion",
  "verification",
  "title",
  "job_category",
  "public_locality",
  "description",
  "workplace_type",
  "work_frequency",
  "employment_types",
  "shift_requirements",
  "salary",
  "languages",
  "cv_required",
  "interview_english_ok",
  "company",
] as const;

/**
 * Build a stable checklist from readiness `missing` identifiers.
 * Unknown future identifiers are shown with a safe fallback label.
 */
export function mapReadinessChecklist(
  missing: readonly string[],
): ReadinessChecklistItem[] {
  const missingSet = new Set(missing);
  const ordered = new Set<string>([
    ...CHECKLIST_ORDER,
    ...missing.filter((id) => !CHECKLIST_ORDER.includes(id as never)),
  ]);

  return [...ordered].map((id) => ({
    id,
    label: READINESS_ITEM_LABELS[id] ?? `Additional requirement (${id})`,
    complete: !missingSet.has(id),
  }));
}

export function readinessHeadline(ready: boolean): string {
  return ready
    ? "Ready for a future publication step"
    : "Not ready for publication yet";
}

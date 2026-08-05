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
  // Returned by publish_employer_vacancy / resume_employer_vacancy
  // (`incomplete` status, PR 5.2) rather than employer_vacancy_draft_readiness
  // (PR 4.3, pre-verification) — that older RPC does not check these.
  verification: "Employer verification",
  workplace_type: "Workplace type",
  work_frequency: "Work frequency",
  cv_required: "CV requirement declaration",
  interview_english_ok: "English-interview declaration",
  expiry: "Valid publication expiry (up to 90 days)",
};

export type ReadinessChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
};

const CHECKLIST_ORDER = [
  "employer_completion",
  "title",
  "job_category",
  "public_locality",
  "description",
  "salary",
  "languages",
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

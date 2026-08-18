import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";

export type AttentionVacancy = {
  vacancyId: string;
  title: string;
  reason: "draft_incomplete";
};

/**
 * Vacancies that need employer action, for the employer-home "Needs your
 * action" side card. Founder Ruling #7: only the draft-with-missing-fields
 * reason ships in P3 — no per-vacancy application-count query is added, so
 * a "paused with N open applications" reason cannot be built truthfully
 * yet (tracked in the plan's Section 11, not stubbed here).
 */
export function selectAttentionVacancies(
  drafts: EmployerDraftListItem[],
): AttentionVacancy[] {
  return drafts
    .filter((d) => d.publicationState === "draft" && d.ready === false)
    .map((d) => ({
      vacancyId: d.id,
      title: d.title,
      reason: "draft_incomplete" as const,
    }));
}

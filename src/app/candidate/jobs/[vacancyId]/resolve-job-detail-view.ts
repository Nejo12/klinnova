import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { LoadCurrentCandidateVacancyDetailResult } from "@/lib/matching/resolve-current-candidate-vacancy-detail";
import type { MissingRequirementCode } from "@/lib/matching/missing-requirement-codes";
import type {
  PublicVacancy,
  PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";

export type JobDetailPageView =
  | { kind: "redirect"; href: string }
  | {
      kind: "ready";
      eligible: boolean;
      missingRequirements: MissingRequirementCode[];
      vacancy: PublicVacancy;
      languages: PublicVacancyLanguage[];
      application: OwnedApplicationSummary | null;
    }
  | { kind: "unavailable" }
  | { kind: "failure" };

/**
 * Pure routing/view resolution for `/candidate/jobs/[vacancyId]`.
 * Keeps Server Component redirect rules testable without Supabase.
 * `incomplete` is a status the canonical match RPC itself reports (PR 5.5c)
 * — not a direct `candidate_profiles` read — so the onboarding redirect is
 * preserved here. `ready` now covers both eligible and ineligible
 * candidates; there is no separate `not_matching` view — an ineligible
 * candidate still sees the vacancy plus its missing requirements.
 */
export function resolveJobDetailPageView(
  vacancyId: string,
  result: LoadCurrentCandidateVacancyDetailResult,
): JobDetailPageView {
  switch (result.status) {
    case "unauthenticated":
      return {
        kind: "redirect",
        href: `/login?next=${encodeURIComponent(`/candidate/jobs/${vacancyId}`)}`,
      };
    case "incomplete":
      return { kind: "redirect", href: "/candidate/onboarding" };
    case "unavailable":
      return { kind: "unavailable" };
    case "ready":
      return {
        kind: "ready",
        eligible: result.eligible,
        missingRequirements: result.missingRequirements,
        vacancy: result.vacancy,
        languages: result.languages,
        application: result.application,
      };
    case "failure":
      return { kind: "failure" };
  }
}

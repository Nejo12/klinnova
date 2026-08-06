import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { LoadCurrentCandidateMatchesPageResult } from "@/lib/matching/load-current-candidate-matches-page";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

export type MatchesPageView =
  | { kind: "redirect"; href: string }
  | {
      kind: "success";
      vacancies: PublicVacancy[];
      applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
    }
  | { kind: "failure" };

/**
 * Pure routing/view resolution for `/candidate/matches`. The existing
 * profile-completion redirect guards are preserved exactly: an incomplete
 * or missing-profile candidate is redirected before the canonical list RPC
 * is ever called, so an empty RPC result can only mean "zero current
 * eligible matches" for a genuinely complete candidate.
 */
export function resolveMatchesPageView(
  result: LoadCurrentCandidateMatchesPageResult,
): MatchesPageView {
  switch (result.status) {
    case "unauthenticated":
      return { kind: "redirect", href: "/login?next=/candidate/matches" };
    case "profile_missing":
      return { kind: "redirect", href: "/auth/error?reason=profile" };
    case "incomplete":
      return { kind: "redirect", href: "/candidate/onboarding" };
    case "success":
      return {
        kind: "success",
        vacancies: result.vacancies,
        applicationsByVacancyId: result.applicationsByVacancyId,
      };
    case "failure":
      return { kind: "failure" };
  }
}

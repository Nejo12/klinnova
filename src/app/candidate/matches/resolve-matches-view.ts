import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type {
  CandidateMatch,
  LoadCandidateMatchesResult,
} from "@/lib/matching/types";

export type MatchesPageView =
  | { kind: "redirect"; href: string }
  | {
      kind: "success";
      matches: CandidateMatch[];
      applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
    }
  | { kind: "failure" };

/**
 * Pure routing/view resolution for `/candidate/matches`.
 * Keeps Server Component redirect rules testable without Supabase.
 */
export function resolveMatchesPageView(
  result: LoadCandidateMatchesResult,
): MatchesPageView {
  switch (result.status) {
    case "unauthenticated":
      return { kind: "redirect", href: "/login?next=/candidate/matches" };
    case "profile_missing":
      return { kind: "redirect", href: "/auth/error?reason=profile" };
    case "onboarding_incomplete":
      return { kind: "redirect", href: "/candidate/onboarding" };
    case "success":
      return {
        kind: "success",
        matches: result.matches,
        applicationsByVacancyId: result.applicationsByVacancyId,
      };
    case "failure":
      return { kind: "failure" };
  }
}

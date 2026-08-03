import type { ApplicationPreview } from "@/lib/applications/application-preview";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { CandidateVacancyDetail } from "@/lib/matching/candidate-vacancy-detail";
import type { LoadCandidateVacancyDetailResult } from "@/lib/matching/load-candidate-vacancy-detail";

export type JobDetailPageView =
  | { kind: "redirect"; href: string }
  | {
      kind: "ready";
      detail: CandidateVacancyDetail;
      preview: ApplicationPreview;
      application: OwnedApplicationSummary | null;
    }
  | { kind: "unavailable"; reason: "unavailable" | "not_matching" }
  | { kind: "failure" };

/**
 * Pure routing/view resolution for `/candidate/jobs/[vacancyId]`.
 * Keeps Server Component redirect rules testable without Supabase.
 */
export function resolveJobDetailPageView(
  vacancyId: string,
  result: LoadCandidateVacancyDetailResult,
): JobDetailPageView {
  switch (result.status) {
    case "unauthenticated":
      return {
        kind: "redirect",
        href: `/login?next=${encodeURIComponent(`/candidate/jobs/${vacancyId}`)}`,
      };
    case "profile_missing":
      return { kind: "redirect", href: "/auth/error?reason=profile" };
    case "incomplete":
      return { kind: "redirect", href: "/candidate/onboarding" };
    case "unavailable":
      return { kind: "unavailable", reason: "unavailable" };
    case "not_matching":
      return { kind: "unavailable", reason: "not_matching" };
    case "ready":
      return {
        kind: "ready",
        detail: result.detail,
        preview: result.preview,
        application: result.application,
      };
    case "failure":
      return { kind: "failure" };
  }
}

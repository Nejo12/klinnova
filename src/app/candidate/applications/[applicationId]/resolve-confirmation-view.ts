import type { ApplicationConfirmation } from "@/lib/applications/application-confirmation";
import type { LoadCandidateApplicationConfirmationResult } from "@/lib/applications/load-candidate-application-confirmation";

export type ConfirmationPageView =
  | { kind: "redirect"; href: string }
  | { kind: "ready"; confirmation: ApplicationConfirmation }
  | { kind: "unavailable" }
  | { kind: "failure" };

export function resolveConfirmationPageView(
  applicationId: string,
  result: LoadCandidateApplicationConfirmationResult,
): ConfirmationPageView {
  switch (result.status) {
    case "unauthenticated":
      return {
        kind: "redirect",
        href: `/login?next=${encodeURIComponent(`/candidate/applications/${applicationId}`)}`,
      };
    case "unavailable":
      return { kind: "unavailable" };
    case "ready":
      return { kind: "ready", confirmation: result.confirmation };
    case "failure":
      return { kind: "failure" };
  }
}

import type { LoadCandidateApplicationInventoryResult } from "@/lib/applications/load-candidate-application-inventory";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";

export type InventoryPageView =
  | { kind: "redirect"; href: string }
  | { kind: "success"; applications: ApplicationInventoryRow[] }
  | { kind: "failure" };

/**
 * Pure routing/view resolution for `/candidate/applications`, mirroring
 * `resolveMatchesPageView`'s guard-redirect convention exactly.
 */
export function resolveInventoryPageView(
  result: LoadCandidateApplicationInventoryResult,
): InventoryPageView {
  switch (result.status) {
    case "unauthenticated":
      return {
        kind: "redirect",
        href: "/login?next=/candidate/applications",
      };
    case "profile_missing":
      return { kind: "redirect", href: "/auth/error?reason=profile" };
    case "incomplete":
      return { kind: "redirect", href: "/candidate/onboarding" };
    case "ready":
      return { kind: "success", applications: result.applications };
    case "failure":
      return { kind: "failure" };
  }
}

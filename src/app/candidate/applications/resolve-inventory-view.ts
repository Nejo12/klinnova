import type { LoadCandidateApplicationInventoryResult } from "@/lib/applications/load-candidate-application-inventory";
import type { ApplicationInventoryRow } from "@/lib/applications/snapshot-schemas";
import type { ApplicationStatus } from "@/lib/applications/status";

export type InventoryPageView =
  | { kind: "redirect"; href: string }
  | {
      kind: "success";
      applications: ApplicationInventoryRow[];
      active: ApplicationInventoryRow[];
      closed: ApplicationInventoryRow[];
    }
  | { kind: "failure" };

const ACTIVE_STATUSES = new Set<ApplicationStatus>([
  "submitted",
  "reviewing",
  "shortlisted",
]);

/**
 * Pure derivation of the active/closed split from the loader's already
 * ordered `submitted_at desc, id asc` array. `active` = submitted, reviewing,
 * shortlisted; `closed` = accepted, rejected. No new queries — both groups
 * are computed from the same in-memory array the loader already returned,
 * preserving input order within each group.
 */
function splitActiveClosed(applications: ApplicationInventoryRow[]) {
  const active = applications.filter((a) => ACTIVE_STATUSES.has(a.status));
  const closed = applications.filter((a) => !ACTIVE_STATUSES.has(a.status));
  return { active, closed };
}

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
    case "ready": {
      const { active, closed } = splitActiveClosed(result.applications);
      return {
        kind: "success",
        applications: result.applications,
        active,
        closed,
      };
    }
    case "failure":
      return { kind: "failure" };
  }
}

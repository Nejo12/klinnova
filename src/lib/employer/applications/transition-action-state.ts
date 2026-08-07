import type { ApplicationStatus } from "@/lib/employer/applications/status";

/**
 * Typed Server Action result for `transitionEmployerApplicationAction`.
 * `already_in_state` and `invalid_transition` are distinct, non-error
 * outcomes — the caller's view was stale, not their request malformed —
 * and must never be presented as a generic failure.
 */
export type TransitionApplicationActionState =
  | { kind: "idle" }
  | { kind: "updated"; currentStatus: ApplicationStatus }
  | { kind: "already_in_state"; currentStatus: ApplicationStatus }
  | { kind: "invalid_transition" }
  | { kind: "unavailable" }
  | { kind: "employer_unavailable" }
  | { kind: "failure" };

export const initialTransitionActionState: TransitionApplicationActionState = {
  kind: "idle",
};

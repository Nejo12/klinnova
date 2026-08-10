import type { OutcomeType } from "@/lib/applications/outcome-type";

/**
 * Typed Server Action result for `recordApplicationOutcomeAction`.
 * `already_hired` and `invalid_occurred_at` are distinct, non-error
 * outcomes — mirrors `TransitionApplicationActionState`'s
 * `already_in_state`/`invalid_transition` precedent. `unavailable` is the
 * one bounded response for every case
 * `record_application_outcome` itself collapses (unauthenticated,
 * incomplete/suspended/deleted employer, unowned application, deleted
 * candidate) — never split into a more specific client-side branch the RPC
 * does not report.
 */
export type RecordOutcomeActionState =
  | { kind: "idle" }
  | { kind: "recorded"; outcomeType: OutcomeType; occurredAt: string }
  | { kind: "already_hired" }
  | { kind: "invalid_occurred_at" }
  | { kind: "unavailable" }
  | { kind: "failure" };

export const initialRecordOutcomeActionState: RecordOutcomeActionState = {
  kind: "idle",
};

/**
 * Typed Server Action result for `voidApplicationOutcomeAction`. Same
 * `unavailable` bounding as above — `void_application_outcome` collapses
 * the identical set of cases plus "outcome event not found/not owned".
 */
export type VoidOutcomeActionState =
  | { kind: "idle" }
  | { kind: "voided" }
  | { kind: "already_voided" }
  | { kind: "unavailable" }
  | { kind: "failure" };

export const initialVoidOutcomeActionState: VoidOutcomeActionState = {
  kind: "idle",
};

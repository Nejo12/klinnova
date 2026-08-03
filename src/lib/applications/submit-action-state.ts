export type SubmitCandidateApplicationState =
  | { status: "idle" }
  | { status: "validation_error" }
  | { status: "unavailable" }
  | { status: "not_matching" }
  | { status: "submitted"; applicationId: string }
  | { status: "already_applied"; applicationId: string }
  | { status: "failure" };

/** Client-safe initial state (must not live in a `"use server"` module). */
export const initialSubmitCandidateApplicationState: SubmitCandidateApplicationState =
  { status: "idle" };

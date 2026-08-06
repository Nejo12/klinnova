import type { MissingRequirementCode } from "@/lib/matching/missing-requirement-codes";

export type SubmitCandidateApplicationState =
  | { status: "idle" }
  | { status: "validation_error" }
  | { status: "unavailable" }
  | { status: "ineligible"; missingRequirements: MissingRequirementCode[] }
  | { status: "submitted"; applicationId: string }
  | { status: "already_applied"; applicationId: string }
  | { status: "failure" };

/** Client-safe initial state (must not live in a `"use server"` module). */
export const initialSubmitCandidateApplicationState: SubmitCandidateApplicationState =
  { status: "idle" };

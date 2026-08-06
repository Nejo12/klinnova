import { z } from "zod";

import { missingRequirementCodeSchema } from "@/lib/matching/missing-requirement-codes";
import { publicVacancyRowSchema } from "@/lib/public-jobs/schemas";

/**
 * Runtime schema for one row of `list_current_candidate_vacancy_matches()`.
 * Extends the exact PR 5.5a public projection schema (same runtime
 * nullability already established by public discovery — not retyped) with
 * the two candidate-specific columns. The RPC contract guarantees
 * eligible-only rows (D-068's list inclusion decision); `eligible` and
 * `missing_requirements` are validated as literal `true` / empty here so a
 * contract violation fails parsing rather than silently rendering an
 * ineligible row as a match.
 */
export const candidateVacancyMatchRowSchema = publicVacancyRowSchema.extend({
  eligible: z.literal(true),
  missing_requirements: z.array(missingRequirementCodeSchema).length(0),
});

export type CandidateVacancyMatchRow = z.infer<
  typeof candidateVacancyMatchRowSchema
>;

/**
 * Whole-array validation: if any row fails (including the eligible/
 * missing_requirements contract check), the entire parse fails. Candidate
 * eligibility data does not get row-level "drop the bad one" treatment the
 * way anonymous public listings do — malformed authenticated eligibility
 * data must not silently become a shorter, plausible-looking list.
 */
export const candidateVacancyMatchListSchema = z.array(
  candidateVacancyMatchRowSchema,
);

import "server-only";

import { z } from "zod";

import { outcomeTypeSchema } from "@/lib/applications/outcome-type";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const applicationIdSchema = z.string().uuid();

const outcomeEntrySchema = z.object({
  outcome_type: outcomeTypeSchema,
  occurred_at: z.string().min(1),
});

const outcomesSchema = z.array(outcomeEntrySchema);

export type CandidateApplicationOutcomeEntry = z.infer<
  typeof outcomeEntrySchema
>;

export type LoadCandidateApplicationOutcomesResult =
  { ok: true; outcomes: CandidateApplicationOutcomeEntry[] } | { ok: false };

/**
 * Candidate-safe outcome read via `candidate_application_outcomes` only
 * (M5.1 Unit E, D-M5-22) — never a direct `application_outcome_events`
 * read. Mirrors `loadCandidateApplicationHistory` exactly: the RPC scopes
 * to `applications.candidate_id = auth.uid()` internally and returns zero
 * rows (not an error) for an unknown/unowned application id or one with no
 * active outcome events yet, so this is safe to call for any UUID.
 * `{ ok: false }` is a fail-soft signal — callers omit the outcomes section
 * entirely rather than failing the whole confirmation page over a
 * secondary, often-empty read.
 */
export async function loadCandidateApplicationOutcomes(
  applicationId: string,
): Promise<LoadCandidateApplicationOutcomesResult> {
  const parsedId = applicationIdSchema.safeParse(applicationId);
  if (!parsedId.success) {
    return { ok: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("candidate_application_outcomes", {
    p_application_id: parsedId.data,
  });

  if (error !== null || data === null) {
    return { ok: false };
  }

  const parsed = outcomesSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false };
  }

  return { ok: true, outcomes: parsed.data };
}

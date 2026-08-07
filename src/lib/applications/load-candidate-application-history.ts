import "server-only";

import { z } from "zod";

import { applicationStatusSchema } from "@/lib/applications/status";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const applicationIdSchema = z.string().uuid();

const historyEntrySchema = z.object({
  to_status: applicationStatusSchema,
  occurred_at: z.string().min(1),
});

const historySchema = z.array(historyEntrySchema);

export type CandidateApplicationHistoryEntry = z.infer<
  typeof historyEntrySchema
>;

export type LoadCandidateApplicationHistoryResult =
  { ok: true; history: CandidateApplicationHistoryEntry[] } | { ok: false };

/**
 * Candidate-safe status timeline via
 * `list_current_candidate_application_status_history` only — never a
 * direct `application_status_history` read. The RPC itself scopes to
 * `applications.candidate_id = auth.uid()` internally and returns zero
 * rows (not an error) for an unknown or unowned application id, so this
 * is safe to call for any UUID; callers that have already confirmed
 * ownership via `loadCandidateApplicationConfirmation` simply get the
 * real timeline back.
 */
export async function loadCandidateApplicationHistory(
  applicationId: string,
): Promise<LoadCandidateApplicationHistoryResult> {
  const parsedId = applicationIdSchema.safeParse(applicationId);
  if (!parsedId.success) {
    return { ok: false };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "list_current_candidate_application_status_history",
    { p_application_id: parsedId.data },
  );

  if (error !== null || data === null) {
    return { ok: false };
  }

  const parsed = historySchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false };
  }

  return { ok: true, history: parsed.data };
}

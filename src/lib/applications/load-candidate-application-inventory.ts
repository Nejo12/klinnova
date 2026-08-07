import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applicationInventorySchema,
  type ApplicationInventoryRow,
} from "@/lib/applications/snapshot-schemas";
import { loadCandidateCompletionStatus } from "@/lib/onboarding/candidate-completion-status";
import type { Database } from "@/types/database";

export type LoadCandidateApplicationInventoryResult =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "incomplete" }
  | { status: "ready"; applications: ApplicationInventoryRow[] }
  | { status: "failure" };

/**
 * Candidate-owned application inventory for `/candidate/applications`.
 * Reads only `public.applications` (RLS: `applications_select_own`,
 * `candidate_id = auth.uid()` — no caller-supplied candidate id, no
 * service role). Never reads the live `vacancies` table: title/employer/
 * city come from the immutable `vacancy_snapshot` frozen at submission
 * time, so a paused, filled, withdrawn, expired, or no-longer-public
 * vacancy still renders correctly here.
 */
export async function loadCandidateApplicationInventory(
  supabase: SupabaseClient<Database>,
): Promise<LoadCandidateApplicationInventoryResult> {
  const completion = await loadCandidateCompletionStatus(supabase);
  if (completion.status !== "complete") {
    return completion;
  }

  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, vacancy_id, status, submitted_at, snapshot_version, vacancy_snapshot",
    )
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: true });

  if (error !== null || data === null) {
    return { status: "failure" };
  }

  const parsed = applicationInventorySchema.safeParse(data);
  if (!parsed.success) {
    return { status: "failure" };
  }

  return { status: "ready", applications: parsed.data };
}

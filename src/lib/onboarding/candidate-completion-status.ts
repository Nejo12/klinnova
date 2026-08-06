import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type CandidateCompletionStatus =
  | { status: "unauthenticated" }
  | { status: "profile_missing" }
  | { status: "incomplete" }
  | { status: "complete" }
  | { status: "failure" };

/**
 * Narrow, candidate-owned completion guard (`candidate_profiles_select_own`
 * RLS: `(select auth.uid()) = id`). Selects only `onboarding_completed_at` —
 * no job category, employment type, shift, German, availability, or
 * language field, so this cannot be mistaken for (or reused as) matching
 * input. Exists specifically so `/candidate/matches` can distinguish
 * missing-profile / incomplete / complete without calling the canonical
 * eligibility RPC or reading any matching-relevant column.
 */
export async function loadCandidateCompletionStatus(
  supabase: SupabaseClient<Database>,
): Promise<CandidateCompletionStatus> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return { status: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error !== null) {
    return { status: "failure" };
  }
  if (data === null) {
    return { status: "profile_missing" };
  }

  return data.onboarding_completed_at !== null
    ? { status: "complete" }
    : { status: "incomplete" };
}

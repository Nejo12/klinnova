import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountCapabilities } from "@/lib/employer/capability-routing";
import type { Database } from "@/types/database";

type AppClient = SupabaseClient<Database>;

/**
 * Load whether the authenticated user has candidate and/or employer profiles.
 * Identity comes from the session via RLS; no caller-supplied UUID.
 */
export async function loadAccountCapabilities(
  supabase: AppClient,
): Promise<AccountCapabilities | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return null;
  }

  const [candidateResult, employerResult] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("employer_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (candidateResult.error !== null || employerResult.error !== null) {
    return null;
  }

  return {
    hasCandidateProfile: candidateResult.data !== null,
    hasEmployerProfile: employerResult.data !== null,
  };
}

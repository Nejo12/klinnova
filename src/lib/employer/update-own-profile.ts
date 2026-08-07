import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapEmployerWriteError } from "@/lib/employer/errors";
import {
  EMPLOYER_GENERIC_FAILURE,
  EMPLOYER_RESTRICTED_ACTION,
} from "@/lib/employer/messages";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import type { Database } from "@/types/database";

export type UpdateOwnEmployerProfileResult =
  { ok: true } | { ok: false; reason: "restricted" | "failed"; error: string };

type EmployerProfileUpdate =
  Database["public"]["Tables"]["employer_profiles"]["Update"];

/**
 * The single shared path for every direct `employer_profiles` UPDATE this
 * app issues (savePrivateEmployerAction, completeEmployerOnboardingAction's
 * private branch, setLawfulHiringDeclared). RLS is the authoritative
 * security boundary — a suspended employer's UPDATE is already a silent
 * zero-row no-op under the narrowed `employer_profiles_update_own` policy.
 * This helper closes the resulting UX gap two ways:
 *
 * 1. A pre-check via `is_current_employer_suspended()` skips the UPDATE
 *    attempt entirely when already known to be suspended (fast path, UX
 *    only — not itself a security control).
 * 2. `.select("id").maybeSingle()` makes a zero-row UPDATE distinguishable
 *    from a real one row affected — closing the race where suspension
 *    happens between the pre-check and the UPDATE. A null result after
 *    the pre-check passed re-checks suspension once more before falling
 *    back to a generic failure, so an unrelated zero-row cause (e.g. a
 *    stale `employer_type` filter) is never misreported as "restricted".
 */
export async function updateOwnEmployerProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  updates: EmployerProfileUpdate,
  options: { employerType?: "private" | "organisation" } = {},
): Promise<UpdateOwnEmployerProfileResult> {
  const preCheck = await loadCurrentEmployerSuspensionStatus(supabase);
  if (preCheck.ok && preCheck.suspended) {
    return {
      ok: false,
      reason: "restricted",
      error: EMPLOYER_RESTRICTED_ACTION,
    };
  }

  let query = supabase
    .from("employer_profiles")
    .update(updates)
    .eq("id", userId);
  if (options.employerType !== undefined) {
    query = query.eq("employer_type", options.employerType);
  }

  const { data, error } = await query.select("id").maybeSingle();

  if (error !== null) {
    return { ok: false, reason: "failed", error: mapEmployerWriteError(error) };
  }

  if (data === null) {
    const postCheck = await loadCurrentEmployerSuspensionStatus(supabase);
    if (postCheck.ok && postCheck.suspended) {
      return {
        ok: false,
        reason: "restricted",
        error: EMPLOYER_RESTRICTED_ACTION,
      };
    }
    return { ok: false, reason: "failed", error: EMPLOYER_GENERIC_FAILURE };
  }

  return { ok: true };
}

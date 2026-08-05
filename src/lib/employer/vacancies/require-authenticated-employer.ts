import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AuthenticatedEmployerGate =
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false };

/**
 * Minimal authentication-only gate for vacancy lifecycle actions
 * (publish/pause/resume/fill/withdraw/materialize/renew). Ownership,
 * verification, readiness, and lifecycle-state validity are the mutation
 * RPC's responsibility (`employer_profile_id <> auth.uid()` -> unavailable,
 * wrong state -> invalid_state, etc.) — this only avoids calling an RPC for
 * an obviously unauthenticated session. Deliberately lighter than
 * `requireCompletedEmployer`: these RPCs act on an already-existing owned
 * vacancy and must not be pre-empted by a stricter completeness gate the
 * RPC itself does not require.
 */
export async function requireAuthenticatedEmployer(
  supabase: SupabaseClient<Database>,
): Promise<AuthenticatedEmployerGate> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    return { ok: false };
  }

  return { ok: true, supabase, userId: user.id };
}

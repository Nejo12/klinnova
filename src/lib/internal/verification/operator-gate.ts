import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type ActiveOperatorGate =
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; reason: "unauthenticated" | "not_operator" | "failed" };

/**
 * Shared server-side gate for /internal/verification routes and actions.
 * Authorization comes only from `is_current_user_verification_operator()` —
 * never from an empty list/detail result, and never from a caller-supplied
 * operator id. Does not query `verification_operators` directly.
 */
export async function requireActiveOperator(
  supabase: SupabaseClient<Database>,
): Promise<ActiveOperatorGate> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data, error } = await supabase.rpc(
    "is_current_user_verification_operator",
  );

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  if (data !== true) {
    return { ok: false, reason: "not_operator" };
  }

  return { ok: true, supabase, userId: user.id };
}

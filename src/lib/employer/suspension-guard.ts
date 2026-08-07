import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/types/database";

export type LoadCurrentEmployerSuspensionStatusResult =
  | { ok: true; suspended: boolean }
  | { ok: false; reason: "unauthenticated" | "failed" };

const suspensionStatusSchema = z.boolean();

/**
 * The single reusable check for "is the current session's own employer
 * account suspended." Calls `is_current_employer_suspended()` only — never
 * queries `employer_suspension` directly, never accepts a caller-supplied
 * employer id, never returns the suspension reason (that is operator-only
 * per the accepted D-072 contract).
 *
 * On failure (auth error, RPC error, unexpected shape), callers must treat
 * the result as "unknown" and fall back to their own existing safe
 * behavior — this loader is a UX improvement, not the authorization
 * boundary. RLS/RPC-level suspension checks remain authoritative
 * independent of this loader's result.
 */
export async function loadCurrentEmployerSuspensionStatus(
  supabase: SupabaseClient<Database>,
): Promise<LoadCurrentEmployerSuspensionStatusResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data, error } = await supabase.rpc("is_current_employer_suspended");

  if (error !== null) {
    return { ok: false, reason: "failed" };
  }

  const parsed = suspensionStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "failed" };
  }

  return { ok: true, suspended: parsed.data };
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import {
  exportAccountMetadataSchema,
  type ExportAccountMetadata,
} from "./schemas";

export type CurrentExportAccount =
  | { kind: "unauthenticated" }
  | { kind: "deleted" }
  | { kind: "ready"; userId: string; account: ExportAccountMetadata };

/**
 * Resolve the current authenticated identity and its D-077 Auth metadata
 * (`email`/`created_at` only — never `last_sign_in_at`, phone,
 * user_metadata, app_metadata, identities, or session/token material),
 * then apply the D-085 whole-account deleted gate before any role-scoped
 * export data is read.
 *
 * Uses `_is_current_stint_account_deleted()` (PR 8.2) explicitly, rather
 * than relying solely on the role-local RLS composition that already
 * blocks a deleted profile's own reads — this is deliberate defense in
 * depth per D-088/D-089's stale-JWT requirement, and gives export a single
 * early, directly testable "deleted" outcome instead of inferring it from
 * several empty reads. PR 8.3b adds no migration, so this calls the
 * existing RLS-support helper directly rather than introducing a new
 * public wrapper RPC solely for this call site.
 */
export async function resolveCurrentExportAccount(
  supabase: SupabaseClient<Database>,
): Promise<CurrentExportAccount> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { kind: "unauthenticated" };
  }

  const { data: deleted, error: deletedError } = await supabase.rpc(
    "_is_current_stint_account_deleted",
  );

  if (deletedError !== null) {
    return { kind: "unauthenticated" };
  }

  if (deleted === true) {
    return { kind: "deleted" };
  }

  const parsedAccount = exportAccountMetadataSchema.safeParse({
    email: user.email ?? null,
    created_at: user.created_at,
  });

  if (!parsedAccount.success) {
    return { kind: "unauthenticated" };
  }

  return { kind: "ready", userId: user.id, account: parsedAccount.data };
}

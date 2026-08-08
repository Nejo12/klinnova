import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  processAccountDeletionRequest,
  type ProcessDeletionResult,
} from "@/lib/account-deletion/processor";
import {
  cancelAccountDeletionResultSchema,
  requestAccountDeletionResultSchema,
} from "@/lib/account-deletion/rpc-schemas";
import type { Database } from "@/types/database";

type AppClient = SupabaseClient<Database>;

export type AccountDeletionOutcome =
  | { status: "unauthenticated" }
  | { status: "unavailable" }
  | { status: "processing" }
  | { status: "completed" }
  | { status: "failure" };

export type CancelDeletionOutcome =
  | { status: "unauthenticated" }
  | { status: "not_cancellable" }
  | { status: "cancelled" };

function mapProcessResult(
  result: ProcessDeletionResult,
): AccountDeletionOutcome {
  switch (result.kind) {
    case "completed":
      return { status: "completed" };
    case "processing":
      return { status: "processing" };
    case "not_found":
      return { status: "failure" };
    case "failed":
      return { status: "failure" };
  }
}

/**
 * D-081/D-085 self-service confirm flow. Uses the ordinary authenticated
 * client only for `request_account_deletion()` (self-scoped via
 * `auth.uid()`, no caller-supplied target) and hands the server-derived
 * request id — never anything read from form state — to the isolated
 * privileged processor.
 */
export async function confirmAccountDeletion(
  supabase: AppClient,
): Promise<AccountDeletionOutcome> {
  const requested = await supabase.rpc("request_account_deletion");
  if (requested.error !== null) {
    return { status: "unauthenticated" };
  }

  const parsed = requestAccountDeletionResultSchema.safeParse(requested.data);
  if (!parsed.success) {
    return { status: "failure" };
  }

  if (parsed.data.status === "unavailable") {
    return { status: "unavailable" };
  }
  if (parsed.data.status === "already_completed") {
    return { status: "completed" };
  }

  const processed = await processAccountDeletionRequest(parsed.data.request_id);
  return mapProcessResult(processed);
}

/**
 * D-081 pending-only cancellation. Ordinary authenticated client only;
 * always safe to call blind — there is no self-scoped status-read RPC, so
 * the UI never needs to know in advance whether a pending request exists.
 */
export async function cancelPendingAccountDeletion(
  supabase: AppClient,
): Promise<CancelDeletionOutcome> {
  const cancelled = await supabase.rpc("cancel_account_deletion_request");
  if (cancelled.error !== null) {
    return { status: "unauthenticated" };
  }

  const parsed = cancelAccountDeletionResultSchema.safeParse(cancelled.data);
  if (!parsed.success || parsed.data.status === "unavailable") {
    return { status: "unauthenticated" };
  }

  return parsed.data.status === "cancelled"
    ? { status: "cancelled" }
    : { status: "not_cancellable" };
}

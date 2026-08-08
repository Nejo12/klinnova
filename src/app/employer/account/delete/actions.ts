"use server";

import type {
  CancelDeletionActionState,
  DeleteAccountActionState,
} from "@/components/account-deletion/delete-account-action-state";
import {
  cancelPendingAccountDeletion,
  confirmAccountDeletion,
} from "@/lib/account-deletion/self-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function confirmEmployerAccountDeletionAction(
  _prev: DeleteAccountActionState,
  _formData: FormData,
): Promise<DeleteAccountActionState> {
  const supabase = await createServerSupabaseClient();
  const outcome = await confirmAccountDeletion(supabase);

  // Local session teardown is deliberately NOT performed here. Clearing
  // session cookies inside this same action would make Next.js refresh the
  // page's Server Component before the client ever renders the "completed"
  // state below, redirecting the user away from the success message they
  // are owed (D-081). The panel's own "Return to Stint" control signs out
  // as a separate, explicit follow-up step once that message has rendered.
  return { status: outcome.status };
}

export async function cancelEmployerAccountDeletionAction(
  _prev: CancelDeletionActionState,
  _formData: FormData,
): Promise<CancelDeletionActionState> {
  const supabase = await createServerSupabaseClient();
  const outcome = await cancelPendingAccountDeletion(supabase);

  return { status: outcome.status };
}

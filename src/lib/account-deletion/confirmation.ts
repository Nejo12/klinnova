/**
 * Server-authoritative destructive-confirmation contract for whole-account
 * deletion, shared between the client checkbox (name/value) and both
 * destructive Server Actions (candidate/employer). The client-side
 * disabled-button UX is not itself a security boundary — this predicate is
 * the boundary the Server Actions actually enforce before any deletion RPC
 * or privileged processing runs. No dependency, no browser-only import —
 * safe from both a Server Action and a Client Component.
 */
export const ACCOUNT_DELETION_CONFIRMATION_FIELD = "confirmAccountDeletion";
export const ACCOUNT_DELETION_CONFIRMATION_VALUE = "yes";

export function hasValidAccountDeletionConfirmation(
  formData: FormData,
): boolean {
  return (
    formData.get(ACCOUNT_DELETION_CONFIRMATION_FIELD) ===
    ACCOUNT_DELETION_CONFIRMATION_VALUE
  );
}

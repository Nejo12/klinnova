/** Client-safe initial state (must not live in a `"use server"` module). */

export type DeleteAccountActionState = {
  status:
    | "idle"
    | "confirmation_required"
    | "unauthenticated"
    | "unavailable"
    | "processing"
    | "completed"
    | "failure";
};

export const initialDeleteAccountActionState: DeleteAccountActionState = {
  status: "idle",
};

export type CancelDeletionActionState = {
  status: "idle" | "unauthenticated" | "not_cancellable" | "cancelled";
};

export const initialCancelDeletionActionState: CancelDeletionActionState = {
  status: "idle",
};

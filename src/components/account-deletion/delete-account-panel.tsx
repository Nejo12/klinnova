"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { logoutAction } from "@/app/auth/actions";
import {
  initialCancelDeletionActionState,
  initialDeleteAccountActionState,
  type CancelDeletionActionState,
  type DeleteAccountActionState,
} from "@/components/account-deletion/delete-account-action-state";
import {
  ACCOUNT_DELETION_CONFIRMATION_FIELD,
  ACCOUNT_DELETION_CONFIRMATION_VALUE,
} from "@/lib/account-deletion/confirmation";
import {
  CANCEL_DELETION_CANCELLED_MESSAGE,
  CANCEL_DELETION_NOT_CANCELLABLE_MESSAGE,
  CANCEL_DELETION_UNAUTHENTICATED_MESSAGE,
  DELETE_ACCOUNT_BUTTON_LABEL,
  DELETE_ACCOUNT_BUTTON_PENDING_LABEL,
  DELETE_ACCOUNT_CANCEL_BUTTON_LABEL,
  DELETE_ACCOUNT_CANCEL_HEADING,
  DELETE_ACCOUNT_CANCEL_LEAD,
  DELETE_ACCOUNT_COMPLETED_MESSAGE,
  DELETE_ACCOUNT_CONFIRM_LABEL,
  DELETE_ACCOUNT_CONFIRMATION_REQUIRED_MESSAGE,
  DELETE_ACCOUNT_CONTINUE_LABEL,
  DELETE_ACCOUNT_DUAL_CAPABILITY_NOTE,
  DELETE_ACCOUNT_FAILURE_MESSAGE,
  DELETE_ACCOUNT_HEADING,
  DELETE_ACCOUNT_LEAD,
  DELETE_ACCOUNT_PROCESSING_MESSAGE,
  DELETE_ACCOUNT_RETENTION_NOTE,
  DELETE_ACCOUNT_UNAUTHENTICATED_MESSAGE,
  DELETE_ACCOUNT_UNAVAILABLE_MESSAGE,
} from "@/lib/account-deletion/messages";

import styles from "./delete-account-panel.module.scss";

type DeleteAccountPanelProps = {
  dualCapability: boolean;
  confirmAction: (
    prevState: DeleteAccountActionState,
    formData: FormData,
  ) => Promise<DeleteAccountActionState>;
  cancelAction: (
    prevState: CancelDeletionActionState,
    formData: FormData,
  ) => Promise<CancelDeletionActionState>;
};

function confirmMessage(status: DeleteAccountActionState["status"]) {
  switch (status) {
    case "confirmation_required":
      return DELETE_ACCOUNT_CONFIRMATION_REQUIRED_MESSAGE;
    case "unauthenticated":
      return DELETE_ACCOUNT_UNAUTHENTICATED_MESSAGE;
    case "unavailable":
      return DELETE_ACCOUNT_UNAVAILABLE_MESSAGE;
    case "processing":
      return DELETE_ACCOUNT_PROCESSING_MESSAGE;
    case "failure":
      return DELETE_ACCOUNT_FAILURE_MESSAGE;
    default:
      return null;
  }
}

function cancelMessage(status: CancelDeletionActionState["status"]) {
  switch (status) {
    case "unauthenticated":
      return CANCEL_DELETION_UNAUTHENTICATED_MESSAGE;
    case "not_cancellable":
      return CANCEL_DELETION_NOT_CANCELLABLE_MESSAGE;
    case "cancelled":
      return CANCEL_DELETION_CANCELLED_MESSAGE;
    default:
      return null;
  }
}

export function DeleteAccountPanel({
  dualCapability,
  confirmAction,
  cancelAction,
}: DeleteAccountPanelProps) {
  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmAction,
    initialDeleteAccountActionState,
  );
  const [cancelState, cancelFormAction, cancelPending] = useActionState(
    cancelAction,
    initialCancelDeletionActionState,
  );
  const [acknowledged, setAcknowledged] = useState(false);

  const resultRef = useRef<HTMLParagraphElement>(null);
  const cancelResultRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (confirmState.status !== "idle") {
      resultRef.current?.focus();
    }
  }, [confirmState]);

  useEffect(() => {
    if (cancelState.status !== "idle") {
      cancelResultRef.current?.focus();
    }
  }, [cancelState]);

  if (confirmState.status === "completed") {
    return (
      <main className={styles.page}>
        <h1 className={styles.heading}>{DELETE_ACCOUNT_HEADING}</h1>
        <p className={styles.success} role="status">
          {DELETE_ACCOUNT_COMPLETED_MESSAGE}
        </p>
        {/* Deliberate separate step (D-081/PART S): the user has already
            seen the success message above; signing out here — as its own
            explicit action — now terminates the local session. */}
        <form action={logoutAction}>
          <button className={styles.linkButton} type="submit">
            {DELETE_ACCOUNT_CONTINUE_LABEL}
          </button>
        </form>
      </main>
    );
  }

  const confirmResultMessage = confirmMessage(confirmState.status);
  const cancelResultMessage = cancelMessage(cancelState.status);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{DELETE_ACCOUNT_HEADING}</h1>
      <p className={styles.lead}>{DELETE_ACCOUNT_LEAD}</p>
      {dualCapability ? (
        <p className={styles.note}>{DELETE_ACCOUNT_DUAL_CAPABILITY_NOTE}</p>
      ) : null}
      <p className={styles.note}>{DELETE_ACCOUNT_RETENTION_NOTE}</p>

      <section className={styles.section}>
        <h2 className={styles.heading}>{DELETE_ACCOUNT_CANCEL_HEADING}</h2>
        <p className={styles.note}>{DELETE_ACCOUNT_CANCEL_LEAD}</p>
        <form action={cancelFormAction}>
          <button
            className={styles.buttonSecondary}
            type="submit"
            disabled={cancelPending}
          >
            {DELETE_ACCOUNT_CANCEL_BUTTON_LABEL}
          </button>
        </form>
        <p ref={cancelResultRef} tabIndex={-1}>
          {cancelResultMessage !== null ? (
            <span className={styles.status} role="status">
              {cancelResultMessage}
            </span>
          ) : null}
        </p>
      </section>

      <form
        className={styles.form}
        action={confirmFormAction}
        aria-label={DELETE_ACCOUNT_HEADING}
        noValidate
      >
        <label className={styles.option}>
          <input
            type="checkbox"
            name={ACCOUNT_DELETION_CONFIRMATION_FIELD}
            value={ACCOUNT_DELETION_CONFIRMATION_VALUE}
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            disabled={confirmPending}
          />
          <span className={styles.optionLabel}>
            {DELETE_ACCOUNT_CONFIRM_LABEL}
          </span>
        </label>
        <p ref={resultRef} tabIndex={-1}>
          {confirmResultMessage !== null ? (
            <span
              className={
                confirmState.status === "failure" ? styles.error : styles.status
              }
              role={confirmState.status === "failure" ? "alert" : "status"}
            >
              {confirmResultMessage}
            </span>
          ) : null}
        </p>
        <div>
          <button
            className={styles.button}
            type="submit"
            disabled={!acknowledged || confirmPending}
          >
            {confirmPending
              ? DELETE_ACCOUNT_BUTTON_PENDING_LABEL
              : DELETE_ACCOUNT_BUTTON_LABEL}
          </button>
        </div>
      </form>
    </main>
  );
}

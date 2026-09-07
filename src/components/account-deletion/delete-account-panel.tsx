"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { logoutAction } from "@/app/auth/actions";
import { useLocale } from "@/components/i18n/locale-provider";
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
import type { MessageKey } from "@/lib/i18n/messages";

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

function confirmMessageKey(
  status: DeleteAccountActionState["status"],
): MessageKey | null {
  switch (status) {
    case "confirmation_required":
      return "candidate.account.confirmDeleteError";
    case "unauthenticated":
      return "candidate.account.deleteUnauthenticated";
    case "unavailable":
      return "candidate.account.deleteUnavailable";
    case "processing":
      return "candidate.account.deleting";
    case "failure":
      return "candidate.account.deleteFailure";
    default:
      return null;
  }
}

function cancelMessageKey(
  status: CancelDeletionActionState["status"],
): MessageKey | null {
  switch (status) {
    case "unauthenticated":
      return "candidate.account.cancelUnauthenticated";
    case "not_cancellable":
      return "candidate.account.cancelUnavailable";
    case "cancelled":
      return "candidate.account.cancelled";
    default:
      return null;
  }
}

export function DeleteAccountPanel({
  dualCapability,
  confirmAction,
  cancelAction,
}: DeleteAccountPanelProps) {
  const { t } = useLocale();
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
        <h1 className={styles.heading}>
          {t("candidate.account.deleteHeading")}
        </h1>
        <p className={styles.success} role="status">
          {t("candidate.account.deleteCompleted")}
        </p>
        {/* Deliberate separate step (D-081/PART S): the user has already
            seen the success message above; signing out here — as its own
            explicit action — now terminates the local session. */}
        <form action={logoutAction}>
          <button className={styles.linkButton} type="submit">
            {t("candidate.account.return")}
          </button>
        </form>
      </main>
    );
  }

  const confirmResultKey = confirmMessageKey(confirmState.status);
  const cancelResultKey = cancelMessageKey(cancelState.status);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{t("candidate.account.deleteHeading")}</h1>
      <p className={styles.lead}>{t("candidate.account.deleteLead")}</p>
      {dualCapability ? (
        <p className={styles.note}>{t("candidate.account.deleteDual")}</p>
      ) : null}
      <p className={styles.note}>{t("candidate.account.deleteRetention")}</p>

      <section className={styles.section}>
        <h2 className={styles.heading}>
          {t("candidate.account.pendingDeleteHeading")}
        </h2>
        <p className={styles.note}>
          {t("candidate.account.pendingDeleteLead")}
        </p>
        <form action={cancelFormAction}>
          <button
            className={styles.buttonSecondary}
            type="submit"
            disabled={cancelPending}
          >
            {t("candidate.account.cancelDelete")}
          </button>
        </form>
        <p ref={cancelResultRef} tabIndex={-1}>
          {cancelResultKey !== null ? (
            <span className={styles.status} role="status">
              {t(cancelResultKey)}
            </span>
          ) : null}
        </p>
      </section>

      <form
        className={styles.form}
        action={confirmFormAction}
        aria-label={t("candidate.account.deleteHeading")}
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
            {t("candidate.account.deleteConfirm")}
          </span>
        </label>
        <p ref={resultRef} tabIndex={-1}>
          {confirmResultKey !== null ? (
            <span
              className={
                confirmState.status === "failure" ? styles.error : styles.status
              }
              role={confirmState.status === "failure" ? "alert" : "status"}
            >
              {t(confirmResultKey)}
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
              ? t("candidate.account.deleting")
              : t("candidate.account.deleteAction")}
          </button>
        </div>
      </form>
    </main>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  approveVerificationAction,
  rejectVerificationAction,
  type InternalVerificationActionState,
} from "@/app/internal/verification/actions";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import {
  INTERNAL_APPROVE_CONFIRM_LABEL,
  INTERNAL_REJECT_CONFIRM_LABEL,
  INTERNAL_REVIEW_REASON_LABEL,
} from "@/lib/internal/verification/messages";

const initialState: InternalVerificationActionState = {
  error: null,
  message: null,
};

type VerificationReviewActionsProps = {
  employerProfileId: string;
};

export function VerificationReviewActions({
  employerProfileId,
}: VerificationReviewActionsProps) {
  const [approveState, approveFormAction, approvePending] = useActionState(
    approveVerificationAction,
    initialState,
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(
    rejectVerificationAction,
    initialState,
  );

  const approveErrorRef = useRef<HTMLParagraphElement>(null);
  const rejectErrorRef = useRef<HTMLParagraphElement>(null);
  const busy = approvePending || rejectPending;

  useEffect(() => {
    if (approveState.error !== null) {
      approveErrorRef.current?.focus();
    }
  }, [approveState]);

  useEffect(() => {
    if (
      rejectState.error !== null ||
      rejectState.fieldErrors?.reason !== undefined
    ) {
      rejectErrorRef.current?.focus();
    }
  }, [rejectState]);

  return (
    <div className={styles.actionsPanel}>
      <form
        className={styles.form}
        action={approveFormAction}
        aria-label="Approve verification"
        noValidate
      >
        <input
          type="hidden"
          name="employerProfileId"
          value={employerProfileId}
        />
        <label className={styles.option}>
          <input
            type="checkbox"
            name="confirmApprove"
            value="true"
            disabled={busy}
          />
          <span className={styles.optionLabel}>
            {INTERNAL_APPROVE_CONFIRM_LABEL}
          </span>
        </label>
        {approveState.error !== null ? (
          <p
            className={styles.error}
            role="alert"
            ref={approveErrorRef}
            tabIndex={-1}
          >
            {approveState.error}
          </p>
        ) : null}
        <div>
          <button className={styles.button} type="submit" disabled={busy}>
            {approvePending ? "Approving…" : "Approve"}
          </button>
        </div>
      </form>

      <form
        className={styles.form}
        action={rejectFormAction}
        aria-label="Reject verification"
        noValidate
      >
        <input
          type="hidden"
          name="employerProfileId"
          value={employerProfileId}
        />
        <label className={styles.label} htmlFor="internal-reject-reason">
          {INTERNAL_REVIEW_REASON_LABEL}
        </label>
        <textarea
          id="internal-reject-reason"
          className={styles.textarea}
          name="reason"
          disabled={busy}
          aria-invalid={
            rejectState.fieldErrors?.reason !== undefined ? true : undefined
          }
          aria-describedby={
            rejectState.fieldErrors?.reason !== undefined
              ? "internal-reject-reason-error"
              : undefined
          }
        />
        {rejectState.fieldErrors?.reason !== undefined ? (
          <p className={styles.fieldError} id="internal-reject-reason-error">
            {rejectState.fieldErrors.reason}
          </p>
        ) : null}
        <label className={styles.option}>
          <input
            type="checkbox"
            name="confirmReject"
            value="true"
            disabled={busy}
          />
          <span className={styles.optionLabel}>
            {INTERNAL_REJECT_CONFIRM_LABEL}
          </span>
        </label>
        <div ref={rejectErrorRef} tabIndex={-1}>
          {rejectState.error !== null ? (
            <p className={styles.error} role="alert">
              {rejectState.error}
            </p>
          ) : null}
        </div>
        <div>
          <button
            className={styles.buttonSecondary}
            type="submit"
            disabled={busy}
          >
            {rejectPending ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </form>
    </div>
  );
}

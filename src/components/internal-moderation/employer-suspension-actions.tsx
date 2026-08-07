"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  suspendEmployerAction,
  unsuspendEmployerAction,
  type EmployerModerationActionState,
} from "@/app/internal/employers/[employerProfileId]/actions";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import {
  SUSPEND_CONFIRM_LABEL,
  SUSPEND_REASON_LABEL,
  UNSUSPEND_CONFIRM_LABEL,
} from "@/lib/internal/moderation/messages";

const initialState: EmployerModerationActionState = {
  error: null,
  message: null,
};

type EmployerSuspensionActionsProps = {
  employerProfileId: string;
  suspended: boolean;
};

export function EmployerSuspensionActions({
  employerProfileId,
  suspended,
}: EmployerSuspensionActionsProps) {
  const [suspendState, suspendFormAction, suspendPending] = useActionState(
    suspendEmployerAction,
    initialState,
  );
  const [unsuspendState, unsuspendFormAction, unsuspendPending] =
    useActionState(unsuspendEmployerAction, initialState);

  const suspendErrorRef = useRef<HTMLDivElement>(null);
  const unsuspendErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (
      suspendState.error !== null ||
      suspendState.fieldErrors?.reason !== undefined
    ) {
      suspendErrorRef.current?.focus();
    }
  }, [suspendState]);

  useEffect(() => {
    if (unsuspendState.error !== null) {
      unsuspendErrorRef.current?.focus();
    }
  }, [unsuspendState]);

  if (suspended) {
    return (
      <form
        className={styles.form}
        action={unsuspendFormAction}
        aria-label="Unsuspend employer"
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
            name="confirmUnsuspend"
            value="true"
            disabled={unsuspendPending}
          />
          <span className={styles.optionLabel}>{UNSUSPEND_CONFIRM_LABEL}</span>
        </label>
        <div ref={unsuspendErrorRef} tabIndex={-1}>
          {unsuspendState.error !== null ? (
            <p className={styles.error} role="alert">
              {unsuspendState.error}
            </p>
          ) : null}
        </div>
        <div>
          <button
            className={styles.buttonSecondary}
            type="submit"
            disabled={unsuspendPending}
          >
            {unsuspendPending ? "Unsuspending…" : "Unsuspend employer"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className={styles.form}
      action={suspendFormAction}
      aria-label="Suspend employer"
      noValidate
    >
      <input type="hidden" name="employerProfileId" value={employerProfileId} />
      <label className={styles.label} htmlFor="suspend-reason">
        {SUSPEND_REASON_LABEL}
      </label>
      <textarea
        id="suspend-reason"
        className={styles.textarea}
        name="reason"
        maxLength={500}
        disabled={suspendPending}
        aria-invalid={
          suspendState.fieldErrors?.reason !== undefined ? true : undefined
        }
        aria-describedby={
          suspendState.fieldErrors?.reason !== undefined
            ? "suspend-reason-error"
            : undefined
        }
      />
      {suspendState.fieldErrors?.reason !== undefined ? (
        <p className={styles.fieldError} id="suspend-reason-error">
          {suspendState.fieldErrors.reason}
        </p>
      ) : null}
      <label className={styles.option}>
        <input
          type="checkbox"
          name="confirmSuspend"
          value="true"
          disabled={suspendPending}
        />
        <span className={styles.optionLabel}>{SUSPEND_CONFIRM_LABEL}</span>
      </label>
      <div ref={suspendErrorRef} tabIndex={-1}>
        {suspendState.error !== null ? (
          <p className={styles.error} role="alert">
            {suspendState.error}
          </p>
        ) : null}
      </div>
      <div>
        <button
          className={styles.button}
          type="submit"
          disabled={suspendPending}
        >
          {suspendPending ? "Suspending…" : "Suspend employer"}
        </button>
      </div>
    </form>
  );
}

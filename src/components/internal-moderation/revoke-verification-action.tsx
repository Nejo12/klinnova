"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  revokeEmployerVerificationAction,
  type EmployerModerationActionState,
} from "@/app/internal/employers/[employerProfileId]/actions";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import {
  REVOKE_VERIFICATION_CONFIRM_LABEL,
  REVOKE_VERIFICATION_REASON_LABEL,
} from "@/lib/internal/moderation/messages";

const initialState: EmployerModerationActionState = {
  error: null,
  message: null,
};

type RevokeVerificationActionProps = {
  employerProfileId: string;
};

/**
 * Only rendered when verification_state === 'verified' (checked by the
 * caller). Deliberately a separate form/action from suspend/unsuspend —
 * revocation is a distinct, weaker trust-gate reset (D-070), not a
 * punitive safety hold (D-072), and the UI must not imply they are
 * equivalent.
 */
export function RevokeVerificationAction({
  employerProfileId,
}: RevokeVerificationActionProps) {
  const [state, formAction, pending] = useActionState(
    revokeEmployerVerificationAction,
    initialState,
  );
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error !== null || state.fieldErrors?.reason !== undefined) {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form
      className={styles.form}
      action={formAction}
      aria-label="Revoke verification"
      noValidate
    >
      <input type="hidden" name="employerProfileId" value={employerProfileId} />
      <label className={styles.label} htmlFor="revoke-reason">
        {REVOKE_VERIFICATION_REASON_LABEL}
      </label>
      <textarea
        id="revoke-reason"
        className={styles.textarea}
        name="reason"
        maxLength={500}
        disabled={pending}
        aria-invalid={
          state.fieldErrors?.reason !== undefined ? true : undefined
        }
        aria-describedby={
          state.fieldErrors?.reason !== undefined
            ? "revoke-reason-error"
            : undefined
        }
      />
      {state.fieldErrors?.reason !== undefined ? (
        <p className={styles.fieldError} id="revoke-reason-error">
          {state.fieldErrors.reason}
        </p>
      ) : null}
      <label className={styles.option}>
        <input
          type="checkbox"
          name="confirmRevoke"
          value="true"
          disabled={pending}
        />
        <span className={styles.optionLabel}>
          {REVOKE_VERIFICATION_CONFIRM_LABEL}
        </span>
      </label>
      <div ref={errorRef} tabIndex={-1}>
        {state.error !== null ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
      <div>
        <button
          className={styles.buttonSecondary}
          type="submit"
          disabled={pending}
        >
          {pending ? "Revoking…" : "Revoke verification"}
        </button>
      </div>
    </form>
  );
}

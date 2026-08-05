"use client";

import { useActionState } from "react";

import { requestEmployerVerificationAction } from "@/app/employer/verification/actions";
import type { EmployerVerificationActionState } from "@/app/employer/verification/actions";
import { VERIFICATION_ATTESTATION_LABEL } from "@/lib/employer/verification/messages";

import styles from "./employer-verification.module.scss";

const initialState: EmployerVerificationActionState = {
  error: null,
  message: null,
};

type VerificationRequestFormProps = {
  submitLabel: string;
  pendingLabel: string;
};

export function VerificationRequestForm({
  submitLabel,
  pendingLabel,
}: VerificationRequestFormProps) {
  const [state, formAction, pending] = useActionState(
    requestEmployerVerificationAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Attestation</legend>
        <label className={styles.option}>
          <input
            type="checkbox"
            name="attestationConfirmed"
            value="true"
            disabled={pending}
            aria-invalid={
              state.fieldErrors?.attestationConfirmed ? true : undefined
            }
            aria-describedby={
              state.fieldErrors?.attestationConfirmed
                ? "attestation-error"
                : undefined
            }
          />
          <span className={styles.optionLabel}>
            {VERIFICATION_ATTESTATION_LABEL}
          </span>
        </label>
        {state.fieldErrors?.attestationConfirmed ? (
          <p className={styles.fieldError} id="attestation-error">
            {state.fieldErrors.attestationConfirmed}
          </p>
        ) : null}
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message !== null ? (
        <p className={styles.status} role="status">
          {state.message}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

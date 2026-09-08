"use client";

import { useActionState } from "react";

import { requestEmployerVerificationAction } from "@/app/employer/verification/actions";
import type { EmployerVerificationActionState } from "@/app/employer/verification/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
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
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(
    requestEmployerVerificationAction,
    initialState,
  );

  return (
    <form
      className={styles.form}
      action={formAction}
      noValidate
      aria-busy={pending || undefined}
    >
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("employer.verification.attestation")}
        </legend>
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
            {locale === "de"
              ? "Ich bestätige, dass die Angaben in meinem Arbeitgeberprofil richtig sind und ich berechtigt bin, für die von mir erstellten Stellen zu rekrutieren."
              : VERIFICATION_ATTESTATION_LABEL}
          </span>
        </label>
        {state.fieldErrors?.attestationConfirmed ? (
          <p className={styles.fieldError} id="attestation-error">
            {localizeEmployerMessage(
              state.fieldErrors.attestationConfirmed,
              locale,
            )}
          </p>
        ) : null}
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {localizeEmployerMessage(state.error, locale)}
        </p>
      ) : null}
      {state.message !== null ? (
        <p className={styles.status} role="status">
          {localizeEmployerMessage(state.message, locale)}
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

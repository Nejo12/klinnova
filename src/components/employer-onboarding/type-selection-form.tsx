"use client";

import { useActionState } from "react";
import { Fieldset } from "@nova-component/ui";

import {
  selectEmployerTypeAction,
  type EmployerOnboardingActionState,
} from "@/app/employer/onboarding/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";

import styles from "./employer-onboarding.module.scss";

const initialState: EmployerOnboardingActionState = {
  error: null,
  message: null,
};

type TypeSelectionFormProps = {
  currentType: "private" | "organisation" | null;
  typeLocked: boolean;
};

export function TypeSelectionForm({
  currentType,
  typeLocked,
}: TypeSelectionFormProps) {
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(
    selectEmployerTypeAction,
    initialState,
  );

  if (typeLocked && currentType !== null) {
    return (
      <section className={styles.form} aria-labelledby="employer-type-heading">
        <h2 className={styles.heading} id="employer-type-heading">
          {t("employer.onboarding.type")}
        </h2>
        <p className={styles.lead}>
          {currentType === "organisation"
            ? locale === "de"
              ? "Sie stellen als Organisation ein. Diese Auswahl ist für Ihr Konto festgelegt."
              : "You hire as an organisation. This type is locked for your account."
            : locale === "de"
              ? "Sie stellen als Privatperson ein. Diese Auswahl ist für Ihr Konto festgelegt."
              : "You hire as a private person. This type is locked for your account."}
        </p>
      </section>
    );
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      <Fieldset
        className={styles.fieldset}
        legend={t("employer.onboarding.howHire")}
        description={
          locale === "de"
            ? "Wählen Sie Privatperson, wenn Sie als Einzelperson einstellen, oder Organisation, wenn Sie für ein Unternehmen einstellen. Während der Einrichtung kann diese Auswahl korrigiert werden, solange noch kein Unternehmen angelegt wurde."
            : "Choose private if you hire as an individual. Choose organisation if you hire for a company. You can correct this while onboarding is incomplete and no organisation company exists yet."
        }
      >
        <div className={styles.optionList}>
          <label className={styles.option}>
            <input
              type="radio"
              name="employerType"
              value="private"
              defaultChecked={currentType === "private"}
              required
              disabled={pending}
            />
            <span className={styles.optionLabel}>
              {t("employer.onboarding.private")}
            </span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="employerType"
              value="organisation"
              defaultChecked={currentType === "organisation"}
              required
              disabled={pending}
            />
            <span className={styles.optionLabel}>
              {t("employer.onboarding.organisation")}
            </span>
          </label>
        </div>
      </Fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {localizeEmployerMessage(state.error, locale)}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending
            ? t("employer.onboarding.saving")
            : t("employer.onboarding.continue")}
        </button>
      </div>
    </form>
  );
}

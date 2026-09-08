"use client";

import { useActionState } from "react";

import {
  completeEmployerOnboardingAction,
  savePrivateEmployerAction,
  type EmployerOnboardingActionState,
} from "@/app/employer/onboarding/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
import { EMPLOYER_LAWFUL_HIRING_SUPPORT } from "@/lib/employer/messages";
import type { EmployerProfileData } from "@/lib/employer/load-employer";

import styles from "./employer-onboarding.module.scss";

const initialState: EmployerOnboardingActionState = {
  error: null,
  message: null,
};

type PrivateProfileFormProps = {
  profile: EmployerProfileData;
};

export function PrivateProfileForm({ profile }: PrivateProfileFormProps) {
  const { locale, t } = useLocale();
  const copy =
    locale === "de"
      ? {
          lead: "Teilen Sie Bewerbenden mit, wer Sie sind und in welchem Berliner Ortsteil Sie einstellen. Genaue Adressen werden nicht erfasst.",
          locality: "Berliner Ortsteil",
          phone: "Telefon (optional)",
          website: "Website (optional)",
          lawful: "Rechtmäßige Einstellung",
          lawfulHelp:
            "Diese Selbsterklärung ist erforderlich, bevor die Einrichtung abgeschlossen werden kann.",
          save: "Fortschritt speichern",
          complete: "Einrichtung abschließen",
          completing: "Wird abgeschlossen…",
        }
      : {
          lead: "Tell candidates who you are and where in Berlin you hire. Exact addresses are not collected.",
          locality: "Berlin locality",
          phone: "Phone (optional)",
          website: "Website (optional)",
          lawful: "Lawful hiring",
          lawfulHelp: EMPLOYER_LAWFUL_HIRING_SUPPORT,
          save: "Save progress",
          complete: "Complete onboarding",
          completing: "Completing…",
        };
  const [saveState, saveAction, savePending] = useActionState(
    savePrivateEmployerAction,
    initialState,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeEmployerOnboardingAction,
    initialState,
  );

  const pending = savePending || completePending;
  const error = completeState.error ?? saveState.error;
  const message =
    completeState.error === null ? (saveState.message ?? null) : null;
  const fieldErrors = completeState.fieldErrors ?? saveState.fieldErrors;

  return (
    <div className={styles.formStack}>
      <form className={styles.form} action={saveAction} noValidate>
        <h2 className={styles.heading}>
          {t("employer.onboarding.privateHeading")}
        </h2>
        <p className={styles.lead}>{copy.lead}</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">
            {t("employer.onboarding.displayName")}
          </label>
          <input
            className={styles.input}
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={profile.displayName ?? ""}
            required
            maxLength={80}
            disabled={pending}
            aria-invalid={fieldErrors?.displayName ? true : undefined}
            aria-describedby={
              fieldErrors?.displayName ? "displayName-error" : undefined
            }
          />
          {fieldErrors?.displayName ? (
            <p className={styles.fieldError} id="displayName-error">
              {localizeEmployerMessage(fieldErrors.displayName, locale)}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="berlinLocality">
            {copy.locality}
          </label>
          <input
            className={styles.input}
            id="berlinLocality"
            name="berlinLocality"
            type="text"
            defaultValue={profile.berlinLocality ?? ""}
            required
            maxLength={120}
            disabled={pending}
            aria-invalid={fieldErrors?.berlinLocality ? true : undefined}
            aria-describedby={
              fieldErrors?.berlinLocality ? "berlinLocality-error" : undefined
            }
          />
          {fieldErrors?.berlinLocality ? (
            <p className={styles.fieldError} id="berlinLocality-error">
              {localizeEmployerMessage(fieldErrors.berlinLocality, locale)}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="phone">
            {copy.phone}
          </label>
          <input
            className={styles.input}
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            maxLength={40}
            disabled={pending}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="website">
            {copy.website}
          </label>
          <input
            className={styles.input}
            id="website"
            name="website"
            type="text"
            defaultValue={profile.website ?? ""}
            maxLength={255}
            disabled={pending}
          />
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{copy.lawful}</legend>
          <p className={styles.support}>{copy.lawfulHelp}</p>
          <label className={styles.option}>
            <input
              type="checkbox"
              name="lawfulHiringDeclared"
              value="yes"
              defaultChecked={profile.lawfulHiringDeclared === true}
              disabled={pending}
              aria-invalid={
                fieldErrors?.lawfulHiringDeclared ? true : undefined
              }
              aria-describedby={
                fieldErrors?.lawfulHiringDeclared
                  ? "lawfulHiring-error"
                  : undefined
              }
            />
            <span className={styles.optionLabel}>
              {t("employer.onboarding.lawfulHiring")}
            </span>
          </label>
          {fieldErrors?.lawfulHiringDeclared ? (
            <p className={styles.fieldError} id="lawfulHiring-error">
              {localizeEmployerMessage(
                fieldErrors.lawfulHiringDeclared,
                locale,
              )}
            </p>
          ) : null}
        </fieldset>

        {error !== null ? (
          <p className={styles.error} role="alert">
            {localizeEmployerMessage(error, locale)}
          </p>
        ) : null}
        {message !== null ? (
          <p className={styles.note} role="status">
            {localizeEmployerMessage(message, locale)}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            type="submit"
            disabled={pending}
          >
            {savePending ? t("employer.onboarding.saving") : copy.save}
          </button>
          <button
            className={styles.button}
            type="submit"
            formAction={completeAction}
            disabled={pending}
          >
            {completePending ? copy.completing : copy.complete}
          </button>
        </div>
      </form>
    </div>
  );
}

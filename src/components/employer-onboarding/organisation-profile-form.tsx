"use client";

import { useActionState } from "react";

import {
  completeEmployerOnboardingAction,
  saveOrganisationEmployerAction,
  type EmployerOnboardingActionState,
} from "@/app/employer/onboarding/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
import type { EmployerProfileData } from "@/lib/employer/load-employer";
import { EMPLOYER_LAWFUL_HIRING_SUPPORT } from "@/lib/employer/messages";

import styles from "./employer-onboarding.module.scss";

const initialState: EmployerOnboardingActionState = {
  error: null,
  message: null,
};

type OrganisationProfileFormProps = {
  profile: EmployerProfileData;
};

export function OrganisationProfileForm({
  profile,
}: OrganisationProfileFormProps) {
  const { locale, t } = useLocale();
  const copy =
    locale === "de"
      ? {
          heading: "Organisationsprofil",
          lead: "Ergänzen Sie die Organisations- und Unternehmensangaben für die Einstellung. Registrierungsdokumente werden hier nicht erfasst.",
          contact: "Anzeigename der Kontaktperson",
          locality: "Berliner Ortsteil",
          slug: "Unternehmens-Slug",
          slugHelp:
            "Nur Kleinbuchstaben, Zahlen und Bindestriche. Muss eindeutig sein.",
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
          heading: "Organisation employer profile",
          lead: "Add the organisation and company details used for hiring. Registration documents are not collected here.",
          contact: "Contact display name",
          locality: "Berlin locality",
          slug: "Company slug",
          slugHelp:
            "Lowercase letters, numbers, and hyphens only. Must be unique.",
          phone: "Phone (optional)",
          website: "Website (optional)",
          lawful: "Lawful hiring",
          lawfulHelp: EMPLOYER_LAWFUL_HIRING_SUPPORT,
          save: "Save progress",
          complete: "Complete onboarding",
          completing: "Completing…",
        };
  const [saveState, saveAction, savePending] = useActionState(
    saveOrganisationEmployerAction,
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
    <form className={styles.form} action={saveAction} noValidate>
      <h2 className={styles.heading}>{copy.heading}</h2>
      <p className={styles.lead}>{copy.lead}</p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="displayName">
          {copy.contact}
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
            fieldErrors?.displayName ? "org-displayName-error" : undefined
          }
        />
        {fieldErrors?.displayName ? (
          <p className={styles.fieldError} id="org-displayName-error">
            {localizeEmployerMessage(fieldErrors.displayName, locale)}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="organisationLegalName">
          {t("employer.onboarding.legalName")}
        </label>
        <input
          className={styles.input}
          id="organisationLegalName"
          name="organisationLegalName"
          type="text"
          defaultValue={profile.organisationLegalName ?? ""}
          required
          maxLength={160}
          disabled={pending}
          aria-invalid={fieldErrors?.organisationLegalName ? true : undefined}
          aria-describedby={
            fieldErrors?.organisationLegalName
              ? "organisationLegalName-error"
              : undefined
          }
        />
        {fieldErrors?.organisationLegalName ? (
          <p className={styles.fieldError} id="organisationLegalName-error">
            {localizeEmployerMessage(fieldErrors.organisationLegalName, locale)}
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
            fieldErrors?.berlinLocality ? "org-berlinLocality-error" : undefined
          }
        />
        {fieldErrors?.berlinLocality ? (
          <p className={styles.fieldError} id="org-berlinLocality-error">
            {localizeEmployerMessage(fieldErrors.berlinLocality, locale)}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="companyName">
          {t("employer.onboarding.companyName")}
        </label>
        <input
          className={styles.input}
          id="companyName"
          name="companyName"
          type="text"
          defaultValue={profile.company?.name ?? ""}
          required
          maxLength={160}
          disabled={pending}
          aria-invalid={fieldErrors?.companyName ? true : undefined}
          aria-describedby={
            fieldErrors?.companyName ? "companyName-error" : undefined
          }
        />
        {fieldErrors?.companyName ? (
          <p className={styles.fieldError} id="companyName-error">
            {localizeEmployerMessage(fieldErrors.companyName, locale)}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="companySlug">
          {copy.slug}
        </label>
        <input
          className={styles.input}
          id="companySlug"
          name="companySlug"
          type="text"
          defaultValue={profile.company?.slug ?? ""}
          required
          maxLength={80}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          disabled={pending}
          aria-describedby={
            fieldErrors?.companySlug
              ? "companySlug-error companySlug-help"
              : "companySlug-help"
          }
          aria-invalid={fieldErrors?.companySlug ? true : undefined}
        />
        <p className={styles.support} id="companySlug-help">
          {copy.slugHelp}
        </p>
        {fieldErrors?.companySlug ? (
          <p className={styles.fieldError} id="companySlug-error">
            {localizeEmployerMessage(fieldErrors.companySlug, locale)}
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
            aria-invalid={fieldErrors?.lawfulHiringDeclared ? true : undefined}
            aria-describedby={
              fieldErrors?.lawfulHiringDeclared
                ? "org-lawfulHiring-error"
                : undefined
            }
          />
          <span className={styles.optionLabel}>
            {t("employer.onboarding.lawfulHiring")}
          </span>
        </label>
        {fieldErrors?.lawfulHiringDeclared ? (
          <p className={styles.fieldError} id="org-lawfulHiring-error">
            {localizeEmployerMessage(fieldErrors.lawfulHiringDeclared, locale)}
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
  );
}

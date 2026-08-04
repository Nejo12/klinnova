"use client";

import { useActionState } from "react";

import {
  completeEmployerOnboardingAction,
  saveOrganisationEmployerAction,
  type EmployerOnboardingActionState,
} from "@/app/employer/onboarding/actions";
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
      <h2 className={styles.heading}>Organisation employer profile</h2>
      <p className={styles.lead}>
        Add the organisation and company details used for hiring. Registration
        documents are not collected here.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="displayName">
          Contact display name
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
            {fieldErrors.displayName}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="organisationLegalName">
          Organisation legal name
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
            {fieldErrors.organisationLegalName}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="berlinLocality">
          Berlin locality
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
            {fieldErrors.berlinLocality}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="companyName">
          Company display name
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
            {fieldErrors.companyName}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="companySlug">
          Company slug
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
          Lowercase letters, numbers, and hyphens only. Must be unique.
        </p>
        {fieldErrors?.companySlug ? (
          <p className={styles.fieldError} id="companySlug-error">
            {fieldErrors.companySlug}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="phone">
          Phone (optional)
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
          Website (optional)
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
        <legend className={styles.legend}>Lawful hiring</legend>
        <p className={styles.support}>{EMPLOYER_LAWFUL_HIRING_SUPPORT}</p>
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
            I confirm I will only hire people who are allowed to work in Germany
          </span>
        </label>
        {fieldErrors?.lawfulHiringDeclared ? (
          <p className={styles.fieldError} id="org-lawfulHiring-error">
            {fieldErrors.lawfulHiringDeclared}
          </p>
        ) : null}
      </fieldset>

      {error !== null ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {message !== null ? (
        <p className={styles.note} role="status">
          {message}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          type="submit"
          disabled={pending}
        >
          {savePending ? "Saving…" : "Save progress"}
        </button>
        <button
          className={styles.button}
          type="submit"
          formAction={completeAction}
          disabled={pending}
        >
          {completePending ? "Completing…" : "Complete onboarding"}
        </button>
      </div>
    </form>
  );
}

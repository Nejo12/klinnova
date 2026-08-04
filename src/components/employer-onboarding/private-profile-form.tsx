"use client";

import { useActionState } from "react";

import {
  completeEmployerOnboardingAction,
  savePrivateEmployerAction,
  type EmployerOnboardingActionState,
} from "@/app/employer/onboarding/actions";
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
        <h2 className={styles.heading}>Private employer profile</h2>
        <p className={styles.lead}>
          Tell candidates who you are and where in Berlin you hire. Exact
          addresses are not collected.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">
            Display name
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
              {fieldErrors.displayName}
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
              fieldErrors?.berlinLocality ? "berlinLocality-error" : undefined
            }
          />
          {fieldErrors?.berlinLocality ? (
            <p className={styles.fieldError} id="berlinLocality-error">
              {fieldErrors.berlinLocality}
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
              I confirm I will only hire people who are allowed to work in
              Germany
            </span>
          </label>
          {fieldErrors?.lawfulHiringDeclared ? (
            <p className={styles.fieldError} id="lawfulHiring-error">
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
    </div>
  );
}

"use client";

import { useActionState } from "react";

import {
  selectEmployerTypeAction,
  type EmployerOnboardingActionState,
} from "@/app/employer/onboarding/actions";

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
  const [state, formAction, pending] = useActionState(
    selectEmployerTypeAction,
    initialState,
  );

  if (typeLocked && currentType !== null) {
    return (
      <section className={styles.form} aria-labelledby="employer-type-heading">
        <h2 className={styles.heading} id="employer-type-heading">
          Employer type
        </h2>
        <p className={styles.lead}>
          {currentType === "organisation"
            ? "You hire as an organisation. This type is locked for your account."
            : "You hire as a private person. This type is locked for your account."}
        </p>
      </section>
    );
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>How do you hire?</legend>
        <p className={styles.support}>
          Choose private if you hire as an individual. Choose organisation if
          you hire for a company. You can correct this while onboarding is
          incomplete and no organisation company exists yet.
        </p>
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
            <span className={styles.optionLabel}>Private person</span>
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
            <span className={styles.optionLabel}>Organisation</span>
          </label>
        </div>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}

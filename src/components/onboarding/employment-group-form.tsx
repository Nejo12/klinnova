"use client";

import { useActionState } from "react";

import {
  saveEmploymentGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  SHIFT_PREFERENCE_OPTIONS,
} from "@/lib/onboarding/allow-lists";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type EmploymentGroupFormProps = {
  employmentTypes: string[];
  shiftPreferences: string[];
};

const initialState: OnboardingActionState = { error: null, message: null };

export function EmploymentGroupForm({
  employmentTypes,
  shiftPreferences,
}: EmploymentGroupFormProps) {
  const [state, formAction, pending] = useActionState(
    saveEmploymentGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Employment types</legend>
        <div className={styles.optionList}>
          {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
            <label key={option.code} className={styles.option}>
              <input
                type="checkbox"
                name="employmentTypes"
                value={option.code}
                defaultChecked={employmentTypes.includes(option.code)}
              />
              <span className={styles.optionLabel}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Shift preferences</legend>
        <div className={styles.optionList}>
          {SHIFT_PREFERENCE_OPTIONS.map((option) => (
            <label key={option.code} className={styles.option}>
              <input
                type="checkbox"
                name="shiftPreferences"
                value={option.code}
                defaultChecked={shiftPreferences.includes(option.code)}
              />
              <span className={styles.optionLabel}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <GroupNav
        current="employment"
        pending={pending}
        continueLabel="Save and review"
      />
    </form>
  );
}

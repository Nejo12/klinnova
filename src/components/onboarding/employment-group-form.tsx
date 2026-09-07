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
import { useLocale } from "@/components/i18n/locale-provider";
import { employmentTypeLabel, shiftLabel } from "@/lib/matching/labels";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";

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
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveEmploymentGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("candidate.onboarding.employmentTypes")}
        </legend>
        <div className={styles.optionList}>
          {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
            <label key={option.code} className={styles.option}>
              <input
                type="checkbox"
                name="employmentTypes"
                value={option.code}
                defaultChecked={employmentTypes.includes(option.code)}
              />
              <span className={styles.optionLabel}>
                {employmentTypeLabel(option.code, locale)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("candidate.onboarding.shiftPreferences")}
        </legend>
        <div className={styles.optionList}>
          {SHIFT_PREFERENCE_OPTIONS.map((option) => (
            <label key={option.code} className={styles.option}>
              <input
                type="checkbox"
                name="shiftPreferences"
                value={option.code}
                defaultChecked={shiftPreferences.includes(option.code)}
              />
              <span className={styles.optionLabel}>
                {shiftLabel(option.code, locale)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {localizeOnboardingError(state.error, t)}
        </p>
      ) : null}

      <GroupNav current="employment" pending={pending} continueToReview />
    </form>
  );
}

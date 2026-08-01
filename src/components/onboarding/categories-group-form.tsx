"use client";

import { useActionState } from "react";

import {
  saveCategoriesGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import { JOB_CATEGORY_OPTIONS } from "@/lib/onboarding/allow-lists";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type CategoriesGroupFormProps = {
  jobCategories: string[];
};

const initialState: OnboardingActionState = { error: null, message: null };

export function CategoriesGroupForm({
  jobCategories,
}: CategoriesGroupFormProps) {
  const [state, formAction, pending] = useActionState(
    saveCategoriesGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset} aria-describedby="categories-error">
        <legend className={styles.legend}>Job categories</legend>
        <p className={styles.support}>
          Choose every kind of work you want to be considered for.
        </p>
        <div className={styles.optionList}>
          {JOB_CATEGORY_OPTIONS.map((option) => (
            <label key={option.code} className={styles.option}>
              <input
                type="checkbox"
                name="jobCategories"
                value={option.code}
                defaultChecked={jobCategories.includes(option.code)}
              />
              <span className={styles.optionLabel}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert" id="categories-error">
          {state.error}
        </p>
      ) : null}

      <GroupNav current="categories" pending={pending} />
    </form>
  );
}

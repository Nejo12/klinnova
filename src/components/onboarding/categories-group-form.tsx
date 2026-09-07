"use client";

import { useActionState } from "react";

import {
  saveCategoriesGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import { JOB_CATEGORY_OPTIONS } from "@/lib/onboarding/allow-lists";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";
import { useLocale } from "@/components/i18n/locale-provider";
import { jobCategoryLabel } from "@/lib/matching/labels";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type CategoriesGroupFormProps = {
  jobCategories: string[];
};

const initialState: OnboardingActionState = { error: null, message: null };

export function CategoriesGroupForm({
  jobCategories,
}: CategoriesGroupFormProps) {
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveCategoriesGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset} aria-describedby="categories-error">
        <legend className={styles.legend}>
          {t("candidate.onboarding.group.categories")}
        </legend>
        <p className={styles.support}>
          {t("candidate.onboarding.categoriesHelp")}
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
              <span className={styles.optionLabel}>
                {jobCategoryLabel(option.code, locale)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert" id="categories-error">
          {localizeOnboardingError(state.error, t)}
        </p>
      ) : null}

      <GroupNav current="categories" pending={pending} />
    </form>
  );
}

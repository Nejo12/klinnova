"use client";

import { useActionState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";
import {
  saveWorkAuthorisationGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type WorkAuthorisationGroupFormProps = {
  workAuthorisationDeclared: boolean | null;
};

const initialState: OnboardingActionState = { error: null, message: null };

export function WorkAuthorisationGroupForm({
  workAuthorisationDeclared,
}: WorkAuthorisationGroupFormProps) {
  const { t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveWorkAuthorisationGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("candidate.onboarding.workAuthorisationQuestion")}
        </legend>
        <p className={styles.support}>
          {t("candidate.onboarding.workAuthorisationHelp")}
        </p>
        <div className={styles.optionList}>
          <label className={styles.option}>
            <input
              type="radio"
              name="workAuthorisationDeclared"
              value="yes"
              defaultChecked={workAuthorisationDeclared === true}
              required
            />
            <span className={styles.optionLabel}>
              {t("candidate.onboarding.yes")}
            </span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="workAuthorisationDeclared"
              value="not_sure"
              defaultChecked={workAuthorisationDeclared === false}
              required
            />
            <span className={styles.optionLabel}>
              {t("candidate.onboarding.notSure")}
            </span>
          </label>
        </div>
        <p className={styles.note}>
          {t("candidate.onboarding.workAuthorisationNotSure")}
        </p>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {localizeOnboardingError(state.error, t)}
        </p>
      ) : null}

      <GroupNav current="work_authorisation" pending={pending} />
    </form>
  );
}

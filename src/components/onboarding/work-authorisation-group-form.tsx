"use client";

import { useActionState } from "react";

import {
  saveWorkAuthorisationGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import {
  WORK_AUTHORISATION_NOT_SURE_GUIDANCE,
  WORK_AUTHORISATION_SUPPORT,
} from "@/lib/onboarding/messages";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type WorkAuthorisationGroupFormProps = {
  workAuthorisationDeclared: boolean | null;
};

const initialState: OnboardingActionState = { error: null, message: null };

export function WorkAuthorisationGroupForm({
  workAuthorisationDeclared,
}: WorkAuthorisationGroupFormProps) {
  const [state, formAction, pending] = useActionState(
    saveWorkAuthorisationGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          Are you currently allowed to work in Germany?
        </legend>
        <p className={styles.support}>{WORK_AUTHORISATION_SUPPORT}</p>
        <div className={styles.optionList}>
          <label className={styles.option}>
            <input
              type="radio"
              name="workAuthorisationDeclared"
              value="yes"
              defaultChecked={workAuthorisationDeclared === true}
              required
            />
            <span className={styles.optionLabel}>Yes</span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="workAuthorisationDeclared"
              value="not_sure"
              defaultChecked={workAuthorisationDeclared === false}
              required
            />
            <span className={styles.optionLabel}>Not sure</span>
          </label>
        </div>
        <p className={styles.note}>{WORK_AUTHORISATION_NOT_SURE_GUIDANCE}</p>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <GroupNav current="work_authorisation" pending={pending} />
    </form>
  );
}

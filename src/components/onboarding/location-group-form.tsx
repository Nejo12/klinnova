"use client";

import { useActionState } from "react";

import {
  saveLocationGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import { TRAVEL_TIME_OPTIONS } from "@/lib/onboarding/allow-lists";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type LocationGroupFormProps = {
  travelRadiusMinutes: number | null;
};

const initialState: OnboardingActionState = { error: null, message: null };

export function LocationGroupForm({
  travelRadiusMinutes,
}: LocationGroupFormProps) {
  const [state, formAction, pending] = useActionState(
    saveLocationGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <input type="hidden" name="city" value="Berlin" />
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Where you can work</legend>
        <p className={styles.support}>
          Klinnova starts in Berlin. Choose the longest one-way travel time you
          are willing to take.
        </p>
        <p className={styles.option}>
          <span className={styles.optionLabel}>City: Berlin</span>
        </p>
        <div
          className={styles.optionList}
          role="radiogroup"
          aria-required="true"
        >
          {TRAVEL_TIME_OPTIONS.map((option) => (
            <label key={option.minutes} className={styles.option}>
              <input
                type="radio"
                name="travelRadiusMinutes"
                value={String(option.minutes)}
                defaultChecked={travelRadiusMinutes === option.minutes}
                required
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

      <GroupNav current="location" pending={pending} />
    </form>
  );
}

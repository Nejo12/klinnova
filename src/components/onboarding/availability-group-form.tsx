"use client";

import { useActionState } from "react";

import {
  saveAvailabilityGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import { berlinTodayIso } from "@/lib/onboarding/schemas";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type AvailabilityGroupFormProps = {
  availableFrom: string | null;
};

const initialState: OnboardingActionState = { error: null, message: null };

export function AvailabilityGroupForm({
  availableFrom,
}: AvailabilityGroupFormProps) {
  const [state, formAction, pending] = useActionState(
    saveAvailabilityGroupAction,
    initialState,
  );
  const today = berlinTodayIso();
  const defaultValue =
    availableFrom !== null && availableFrom >= today ? availableFrom : today;

  return (
    <form className={styles.form} action={formAction} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="availableFrom">
          Earliest date you can start
        </label>
        <p className={styles.support}>
          Choose today or a future date (Berlin calendar). Weekly schedules come
          later.
        </p>
        <input
          className={styles.input}
          id="availableFrom"
          name="availableFrom"
          type="date"
          min={today}
          defaultValue={defaultValue}
          required
        />
      </div>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <GroupNav current="availability" pending={pending} />
    </form>
  );
}

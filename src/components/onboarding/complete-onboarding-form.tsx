"use client";

import { useActionState } from "react";

import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";

import styles from "./onboarding.module.scss";

const initialState: OnboardingActionState = { error: null, message: null };

export function CompleteOnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.actions}>
      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <button className={styles.button} disabled={pending} type="submit">
        {pending ? "Confirming…" : "Confirm essentials"}
      </button>
    </form>
  );
}

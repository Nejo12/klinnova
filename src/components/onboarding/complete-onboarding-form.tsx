"use client";

import { useActionState } from "react";

import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";

import styles from "./onboarding.module.scss";

const initialState: OnboardingActionState = { error: null, message: null };

export function CompleteOnboardingForm() {
  const { t } = useLocale();
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.actions}>
      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {localizeOnboardingError(state.error, t)}
        </p>
      ) : null}
      <button className={styles.button} disabled={pending} type="submit">
        {pending
          ? t("candidateReview.completing")
          : t("candidateReview.completeProfile")}
      </button>
    </form>
  );
}

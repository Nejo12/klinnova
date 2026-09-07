"use client";

import { useActionState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  saveLocationGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import { TRAVEL_TIME_OPTIONS } from "@/lib/onboarding/allow-lists";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type LocationGroupFormProps = {
  travelRadiusMinutes: number | null;
};

const initialState: OnboardingActionState = { error: null, message: null };

export function LocationGroupForm({
  travelRadiusMinutes,
}: LocationGroupFormProps) {
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveLocationGroupAction,
    initialState,
  );

  return (
    <form className={styles.form} action={formAction} noValidate>
      <input type="hidden" name="city" value="Berlin" />
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("candidate.onboarding.locationQuestion")}
        </legend>
        <p className={styles.support}>
          {t("candidate.onboarding.locationHelp")}
        </p>
        <p className={styles.option}>
          <span className={styles.optionLabel}>
            {t("candidate.onboarding.cityBerlin")}
          </span>
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
              <span className={styles.optionLabel}>
                {locale === "de"
                  ? `Bis zu ${option.minutes} Minuten pro Strecke`
                  : option.label}
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

      <GroupNav current="location" pending={pending} />
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  saveLanguagesGroupAction,
  type OnboardingActionState,
} from "@/app/candidate/onboarding/actions";
import {
  GERMAN_COMFORT_OPTIONS,
  LANGUAGE_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
} from "@/lib/onboarding/allow-lists";
import type { CandidateLanguageRow } from "@/lib/onboarding/load-candidate";
import { localizeOnboardingError } from "@/lib/onboarding/localize-error";
import {
  germanComfortLabel,
  languageLabel,
  languageProficiencyLabel,
} from "@/lib/matching/labels";

import { GroupNav } from "./group-nav";
import styles from "./onboarding.module.scss";

type LanguageDraft = {
  key: string;
  languageCode: string;
  proficiency: string;
};

type LanguagesGroupFormProps = {
  germanComfort: string | null;
  languages: CandidateLanguageRow[];
};

const initialState: OnboardingActionState = { error: null, message: null };

export function LanguagesGroupForm({
  germanComfort,
  languages,
}: LanguagesGroupFormProps) {
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveLanguagesGroupAction,
    initialState,
  );
  const [rows, setRows] = useState<LanguageDraft[]>(() =>
    languages.length > 0
      ? languages.map((language) => ({
          key: language.id,
          languageCode: language.languageCode,
          proficiency: language.proficiency,
        }))
      : [{ key: "new-1", languageCode: "en", proficiency: "basic" }],
  );

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: `new-${current.length + 1}-${Date.now()}`,
        languageCode: "",
        proficiency: "basic",
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((current) =>
      current.length <= 1 ? current : current.filter((row) => row.key !== key),
    );
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("candidate.onboarding.germanComfort")}
        </legend>
        <p className={styles.support}>
          {t("candidate.onboarding.germanComfortHelp")}
        </p>
        <div
          className={styles.optionList}
          role="radiogroup"
          aria-required="true"
        >
          {GERMAN_COMFORT_OPTIONS.map((option) => (
            <label key={option.code} className={styles.option}>
              <input
                type="radio"
                name="germanComfort"
                value={option.code}
                defaultChecked={germanComfort === option.code}
                required
              />
              <span className={styles.optionLabel}>
                {germanComfortLabel(option.code, locale)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t("candidate.onboarding.languagesSpoken")}
        </legend>
        <p className={styles.support}>
          {t("candidate.onboarding.languagesHelp")}
        </p>
        {rows.map((row, index) => (
          <div className={styles.languageRow} key={row.key}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`language-${row.key}`}>
                {t("candidate.onboarding.language")} {index + 1}
              </label>
              <select
                className={styles.select}
                id={`language-${row.key}`}
                name="languageCode"
                defaultValue={row.languageCode}
                required
              >
                <option value="" disabled>
                  {t("candidate.onboarding.chooseLanguage")}
                </option>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {languageLabel(option.code, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor={`proficiency-${row.key}`}
              >
                {t("candidate.onboarding.proficiency")} {index + 1}
              </label>
              <select
                className={styles.select}
                id={`proficiency-${row.key}`}
                name="proficiency"
                defaultValue={row.proficiency}
                required
              >
                {LANGUAGE_PROFICIENCY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {languageProficiencyLabel(option.code, locale)}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              type="button"
              onClick={() => {
                removeRow(row.key);
              }}
              aria-label={`${t("candidate.onboarding.removeLanguage")} ${index + 1}`}
              disabled={rows.length <= 1}
            >
              {t("candidate.onboarding.remove")}
            </button>
          </div>
        ))}
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          type="button"
          onClick={addRow}
        >
          {t("candidate.onboarding.addLanguage")}
        </button>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {localizeOnboardingError(state.error, t)}
        </p>
      ) : null}

      <GroupNav current="languages" pending={pending} />
    </form>
  );
}

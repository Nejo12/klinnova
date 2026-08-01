"use client";

import { useActionState, useState } from "react";

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
        <legend className={styles.legend}>German comfort</legend>
        <p className={styles.support}>
          Self-reported comfort using German at work — not a certificate.
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
              <span className={styles.optionLabel}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Languages you speak</legend>
        <p className={styles.support}>
          Add every language that helps you work. “Another language” records
          that the list is incomplete — no free-text name in this step.
        </p>
        {rows.map((row, index) => (
          <div className={styles.languageRow} key={row.key}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`language-${row.key}`}>
                Language {index + 1}
              </label>
              <select
                className={styles.select}
                id={`language-${row.key}`}
                name="languageCode"
                defaultValue={row.languageCode}
                required
              >
                <option value="" disabled>
                  Choose a language
                </option>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor={`proficiency-${row.key}`}
              >
                Proficiency {index + 1}
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
                    {option.label}
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
              aria-label={`Remove language entry ${index + 1}`}
              disabled={rows.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          type="button"
          onClick={addRow}
        >
          Add another language
        </button>
      </fieldset>

      {state.error !== null ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <GroupNav current="languages" pending={pending} />
    </form>
  );
}

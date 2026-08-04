"use client";

import { useActionState, useState } from "react";

import {
  replaceEmployerVacancyLanguagesAction,
  type EmployerVacancyActionState,
} from "@/app/employer/vacancies/actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import type { LanguageRequirementRow } from "@/lib/employer/vacancies/schemas";
import {
  LANGUAGE_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
} from "@/lib/onboarding/allow-lists";

type LanguageDraft = {
  key: string;
  languageCode: string;
  minProficiency: string;
};

type LanguageRequirementsEditorProps = {
  vacancyId: string;
  languages: LanguageRequirementRow[];
};

const initialState: EmployerVacancyActionState = {
  error: null,
  message: null,
};

export function LanguageRequirementsEditor({
  vacancyId,
  languages,
}: LanguageRequirementsEditorProps) {
  const [state, formAction, pending] = useActionState(
    replaceEmployerVacancyLanguagesAction,
    initialState,
  );
  const [rows, setRows] = useState<LanguageDraft[]>(() =>
    languages.map((language, index) => ({
      key: `${language.languageCode}-${index}`,
      languageCode: language.languageCode,
      minProficiency: language.minProficiency,
    })),
  );

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: `new-${current.length + 1}-${Date.now()}`,
        languageCode: "",
        minProficiency: "basic",
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Language requirements</legend>
        <p className={styles.support}>
          Optional while drafting. At least one language is required for
          publication readiness. No free-text languages.
        </p>

        {state.error !== null ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}
        {state.message !== null ? (
          <p className={styles.status} role="status">
            {state.message}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className={styles.support}>No language requirements yet.</p>
        ) : (
          rows.map((row, index) => (
            <div key={row.key} className={styles.languageRow}>
              <div className={styles.field}>
                <label
                  className={styles.label}
                  htmlFor={`languageCode-${row.key}`}
                >
                  Language {index + 1}
                </label>
                <select
                  id={`languageCode-${row.key}`}
                  className={styles.select}
                  name="languageCode"
                  value={row.languageCode}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? { ...item, languageCode: value }
                          : item,
                      ),
                    );
                  }}
                  required
                >
                  <option value="">Select language</option>
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
                  htmlFor={`minProficiency-${row.key}`}
                >
                  Minimum proficiency {index + 1}
                </label>
                <select
                  id={`minProficiency-${row.key}`}
                  className={styles.select}
                  name="minProficiency"
                  value={row.minProficiency}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? { ...item, minProficiency: value }
                          : item,
                      ),
                    );
                  }}
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
                onClick={() => removeRow(row.key)}
                aria-label={`Remove language requirement ${index + 1}`}
              >
                Remove
              </button>
            </div>
          ))
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            type="button"
            onClick={addRow}
          >
            Add language
          </button>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save languages"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

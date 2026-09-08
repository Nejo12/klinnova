"use client";

import { useActionState, useState } from "react";

import {
  replaceEmployerVacancyLanguagesAction,
  type EmployerVacancyActionState,
} from "@/app/employer/vacancies/actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
import type { LanguageRequirementRow } from "@/lib/employer/vacancies/schemas";
import {
  LANGUAGE_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
} from "@/lib/onboarding/allow-lists";
import { languageLabel, languageProficiencyLabel } from "@/lib/matching/labels";

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
  const { locale, t } = useLocale();
  const copy =
    locale === "de"
      ? {
          help: "Während der Entwurfsphase optional. Zur Veröffentlichung ist mindestens eine Sprache erforderlich. Keine Freitexteingabe.",
          empty: "Noch keine Sprachanforderungen.",
          language: "Sprache",
          proficiency: "Mindestkenntnisse",
          select: "Sprache auswählen",
          remove: "Entfernen",
          add: "Sprache hinzufügen",
          save: "Sprachen speichern",
        }
      : {
          help: "Optional while drafting. At least one language is required for publication readiness. No free-text languages.",
          empty: "No language requirements yet.",
          language: "Language",
          proficiency: "Minimum proficiency",
          select: "Select language",
          remove: "Remove",
          add: "Add language",
          save: "Save languages",
        };
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
        <legend className={styles.legend}>
          {t("employer.vacancies.languages")}
        </legend>
        <p className={styles.support}>{copy.help}</p>

        {state.error !== null ? (
          <p className={styles.error} role="alert">
            {localizeEmployerMessage(state.error, locale)}
          </p>
        ) : null}
        {state.message !== null ? (
          <p className={styles.status} role="status">
            {localizeEmployerMessage(state.message, locale)}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className={styles.support}>{copy.empty}</p>
        ) : (
          rows.map((row, index) => (
            <div key={row.key} className={styles.languageRow}>
              <div className={styles.field}>
                <label
                  className={styles.label}
                  htmlFor={`languageCode-${row.key}`}
                >
                  {copy.language} {index + 1}
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
                  <option value="">{copy.select}</option>
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
                  htmlFor={`minProficiency-${row.key}`}
                >
                  {copy.proficiency} {index + 1}
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
                      {languageProficiencyLabel(option.code, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label={`${copy.remove} ${copy.language.toLocaleLowerCase(locale === "de" ? "de-DE" : "en-GB")} ${index + 1}`}
              >
                {copy.remove}
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
            {copy.add}
          </button>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? t("employer.vacancies.saving") : copy.save}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

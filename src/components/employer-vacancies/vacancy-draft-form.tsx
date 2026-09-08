"use client";

import { useActionState, useState } from "react";

import {
  createEmployerVacancyDraftAction,
  updateEmployerVacancyDraftAction,
  type EmployerVacancyActionState,
} from "@/app/employer/vacancies/actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { GermanRequirementField } from "@/components/employer-vacancies/german-requirement-field";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
import {
  SALARY_PERIOD_OPTIONS,
  SHIFT_REQUIREMENT_OPTIONS,
  WORK_FREQUENCY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "@/lib/employer/vacancies/allow-lists";
import {
  VACANCY_LOCALITY_SUPPORT,
  VACANCY_PRIVATE_HOME_WARNING,
} from "@/lib/employer/vacancies/messages";
import { centsToEurString } from "@/lib/employer/vacancies/salary";
import type { EmployerDraftDetail } from "@/lib/employer/vacancies/load-employer-draft";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_OPTIONS,
  type GermanComfortCode,
} from "@/lib/onboarding/allow-lists";
import {
  employmentTypeLabel,
  jobCategoryLabel,
  shiftLabel,
} from "@/lib/matching/labels";
import {
  workplaceTypeLabel,
  workFrequencyLabel,
} from "@/lib/public-jobs/labels";

/**
 * A draft's persisted `germanRequirement` always satisfies the DB CHECK
 * constraint (one of the real 4 codes), but its TS type is a plain
 * `string` like the other draft enum fields (`jobCategory`, etc.) — narrow
 * defensively rather than asserting, so a corrupt/foreign value can never
 * flow a CEFR-shaped or otherwise invalid string into the radio group.
 */
function toGermanComfortCode(value: string | undefined): GermanComfortCode {
  return (GERMAN_COMFORT_CODES as readonly string[]).includes(value ?? "")
    ? (value as GermanComfortCode)
    : "none";
}

type VacancyDraftFormProps =
  | { mode: "create"; draft?: undefined }
  | { mode: "edit"; draft: EmployerDraftDetail };

const initialState: EmployerVacancyActionState = {
  error: null,
  message: null,
};

function fieldError(
  state: EmployerVacancyActionState,
  key: string,
): string | undefined {
  return state.fieldErrors?.[key];
}

export function VacancyDraftForm(props: VacancyDraftFormProps) {
  const { locale, t } = useLocale();
  const copy =
    locale === "de"
      ? {
          sections: "Abschnitte des Stellenformulars",
          basics: "Grundlagen",
          role: "Stellendetails",
          salary: "Vergütung",
          jobCategory: "Stellenkategorie",
          selectCategory: "Kategorie auswählen",
          notSet: "Noch nicht angegeben",
          employment: "Beschäftigungsarten",
          shifts: "Schichtanforderungen",
          clearDate: "Verfügbarkeitsdatum löschen",
          englishInterview:
            "Vorstellungsgespräch kann auf Englisch stattfinden",
          gross: "Vergütung (EUR brutto)",
          salaryHelp:
            "Für einen Entwurf optional, zur Veröffentlichung erforderlich. Beträge werden in ganzen Cent gespeichert.",
          amount: "Betrag in EUR",
          period: "Zeitraum",
          clearSalary: "Vergütung löschen",
          create: "Entwurf erstellen",
        }
      : {
          sections: "Vacancy form sections",
          basics: "Basics",
          role: "Role details",
          salary: "Salary",
          jobCategory: "Job category",
          selectCategory: "Select a category",
          notSet: "Not set yet",
          employment: "Employment types",
          shifts: "Shift requirements",
          clearDate: "Clear available-from date",
          englishInterview: "Interview can be in English",
          gross: "Salary (EUR gross)",
          salaryHelp:
            "Optional for saving a draft. Required later for publication readiness. Amounts are stored as integer cents.",
          amount: "Amount in EUR",
          period: "Period",
          clearSalary: "Clear salary",
          create: "Create draft",
        };
  const action =
    props.mode === "create"
      ? createEmployerVacancyDraftAction
      : updateEmployerVacancyDraftAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const draft = props.mode === "edit" ? props.draft : null;
  const [germanRequirement, setGermanRequirement] = useState<GermanComfortCode>(
    toGermanComfortCode(draft?.germanRequirement),
  );
  const salaryDefault =
    draft?.salaryAmountCents !== null && draft?.salaryAmountCents !== undefined
      ? centsToEurString(draft.salaryAmountCents)
      : "";

  return (
    <>
      <nav className={styles.sectionNav} aria-label={copy.sections}>
        <ul className={styles.sectionNavList}>
          <li>
            <a className={styles.sectionNavLink} href="#section-basics">
              {copy.basics}
            </a>
          </li>
          <li>
            <a className={styles.sectionNavLink} href="#section-role-details">
              {copy.role}
            </a>
          </li>
          <li>
            <a className={styles.sectionNavLink} href="#section-salary">
              {copy.salary}
            </a>
          </li>
        </ul>
      </nav>
      <form className={styles.form} action={formAction} noValidate>
        {props.mode === "edit" ? (
          <input type="hidden" name="vacancyId" value={props.draft.id} />
        ) : null}

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

        <fieldset id="section-basics" className={styles.fieldset}>
          <legend className={styles.legend}>{copy.basics}</legend>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="title">
              {t("employer.vacancies.title")}
            </label>
            <input
              id="title"
              className={styles.input}
              name="title"
              type="text"
              required
              maxLength={120}
              defaultValue={draft?.title ?? ""}
              aria-invalid={fieldError(state, "title") ? true : undefined}
              aria-describedby={
                fieldError(state, "title") ? "title-error" : undefined
              }
            />
            {fieldError(state, "title") ? (
              <p id="title-error" className={styles.fieldError}>
                {localizeEmployerMessage(fieldError(state, "title")!, locale)}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="jobCategory">
              {copy.jobCategory}
            </label>
            <select
              id="jobCategory"
              className={styles.select}
              name="jobCategory"
              required
              defaultValue={draft?.jobCategory ?? ""}
              aria-invalid={fieldError(state, "jobCategory") ? true : undefined}
              aria-describedby={
                fieldError(state, "jobCategory")
                  ? "jobCategory-error"
                  : undefined
              }
            >
              <option value="">{copy.selectCategory}</option>
              {JOB_CATEGORY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {jobCategoryLabel(option.code, locale)}
                </option>
              ))}
            </select>
            {fieldError(state, "jobCategory") ? (
              <p id="jobCategory-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "jobCategory")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="publicLocality">
              {t("employer.vacancies.locality")}
            </label>
            <p id="publicLocality-support" className={styles.support}>
              {locale === "de"
                ? "Zeigen Sie nur einen Bezirk oder Ortsteil an — niemals eine genaue Wohnadresse."
                : VACANCY_LOCALITY_SUPPORT}
            </p>
            <input
              id="publicLocality"
              className={styles.input}
              name="publicLocality"
              type="text"
              required
              maxLength={120}
              defaultValue={draft?.publicLocality ?? ""}
              aria-describedby={
                fieldError(state, "publicLocality")
                  ? "publicLocality-support publicLocality-error"
                  : "publicLocality-support"
              }
              aria-invalid={
                fieldError(state, "publicLocality") ? true : undefined
              }
            />
            {fieldError(state, "publicLocality") ? (
              <p id="publicLocality-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "publicLocality")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset id="section-role-details" className={styles.fieldset}>
          <legend className={styles.legend}>{copy.role}</legend>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">
              {t("employer.vacancies.description")}
            </label>
            <textarea
              id="description"
              className={styles.textarea}
              name="description"
              maxLength={5000}
              defaultValue={draft?.description ?? ""}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="workplaceType">
              {t("employer.vacancies.workplaceType")}
            </label>
            <select
              id="workplaceType"
              className={styles.select}
              name="workplaceType"
              defaultValue={draft?.workplaceType ?? ""}
            >
              <option value="">{copy.notSet}</option>
              {WORKPLACE_TYPE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {workplaceTypeLabel(option.code, locale)}
                </option>
              ))}
            </select>
            <p className={styles.warning}>
              {locale === "de"
                ? "Geben Sie bei Privathaushalten keine genaue Adresse in öffentlich sichtbaren Feldern an."
                : VACANCY_PRIVATE_HOME_WARNING}
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="workFrequency">
              {t("employer.vacancies.workFrequency")}
            </label>
            <select
              id="workFrequency"
              className={styles.select}
              name="workFrequency"
              defaultValue={draft?.workFrequency ?? ""}
            >
              <option value="">{copy.notSet}</option>
              {WORK_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {workFrequencyLabel(option.code, locale)}
                </option>
              ))}
            </select>
          </div>

          <fieldset className={styles.field}>
            <legend className={styles.label}>{copy.employment}</legend>
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <label key={option.code} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  name="employmentTypes"
                  value={option.code}
                  defaultChecked={draft?.employmentTypes.includes(option.code)}
                />
                <span>{employmentTypeLabel(option.code, locale)}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.label}>{copy.shifts}</legend>
            {SHIFT_REQUIREMENT_OPTIONS.map((option) => (
              <label key={option.code} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  name="shiftRequirements"
                  value={option.code}
                  defaultChecked={draft?.shiftRequirements.includes(
                    option.code,
                  )}
                />
                <span>{shiftLabel(option.code, locale)}</span>
              </label>
            ))}
          </fieldset>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="availableFrom">
              {t("employer.vacancies.availableFrom")}
            </label>
            <input
              id="availableFrom"
              className={styles.input}
              name="availableFrom"
              type="date"
              defaultValue={draft?.availableFrom ?? ""}
            />
            {props.mode === "edit" ? (
              <label className={styles.checkboxRow}>
                <input type="checkbox" name="clearAvailableFrom" value="true" />
                <span>{copy.clearDate}</span>
              </label>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="experienceNotes">
              {t("employer.vacancies.experienceNotes")}
            </label>
            <textarea
              id="experienceNotes"
              className={styles.textarea}
              name="experienceNotes"
              maxLength={2000}
              defaultValue={draft?.experienceNotes ?? ""}
            />
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="cvRequired"
              value="true"
              defaultChecked={draft?.cvRequired === true}
            />
            <span>{t("employer.vacancies.cvRequired")}</span>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="interviewEnglishOk"
              value="true"
              defaultChecked={draft?.interviewEnglishOk === true}
            />
            <span>{copy.englishInterview}</span>
          </label>

          <GermanRequirementField
            name="germanRequirement"
            value={germanRequirement}
            onChange={setGermanRequirement}
          />
        </fieldset>

        <fieldset id="section-salary" className={styles.fieldset}>
          <legend className={styles.legend}>{copy.gross}</legend>
          <p className={styles.support}>{copy.salaryHelp}</p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="salaryAmountEur">
              {copy.amount}
            </label>
            <input
              id="salaryAmountEur"
              className={styles.input}
              name="salaryAmountEur"
              type="text"
              inputMode="decimal"
              placeholder="15.00"
              defaultValue={salaryDefault}
              aria-invalid={
                fieldError(state, "salaryAmountEur") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "salaryAmountEur")
                  ? "salaryAmountEur-error"
                  : undefined
              }
            />
            {fieldError(state, "salaryAmountEur") ? (
              <p id="salaryAmountEur-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "salaryAmountEur")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="salaryPeriod">
              {copy.period}
            </label>
            <select
              id="salaryPeriod"
              className={styles.select}
              name="salaryPeriod"
              defaultValue={draft?.salaryPeriod ?? ""}
              aria-invalid={
                fieldError(state, "salaryPeriod") ? true : undefined
              }
            >
              <option value="">{copy.notSet}</option>
              {SALARY_PERIOD_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {locale === "de"
                    ? (
                        {
                          hourly: "Pro Stunde",
                          monthly: "Pro Monat",
                          fixed_job: "Pauschal für den Auftrag",
                        } as const
                      )[option.code]
                    : option.label}
                </option>
              ))}
            </select>
            {fieldError(state, "salaryPeriod") ? (
              <p className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "salaryPeriod")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>
          <label className={styles.checkboxRow}>
            <input type="checkbox" name="clearSalary" value="true" />
            <span>{copy.clearSalary}</span>
          </label>
        </fieldset>

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending
              ? t("employer.vacancies.saving")
              : props.mode === "create"
                ? copy.create
                : t("employer.vacancies.save")}
          </button>
        </div>
      </form>
    </>
  );
}

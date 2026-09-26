"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

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

type FormValues = {
  title: string;
  jobCategory: string;
  publicLocality: string;
  description: string;
  workplaceType: string;
  workFrequency: string;
  employmentTypes: string[];
  shiftRequirements: string[];
  availableFrom: string;
  clearAvailableFrom: boolean;
  experienceNotes: string;
  cvRequired: boolean;
  interviewEnglishOk: boolean;
  germanRequirement: GermanComfortCode;
  salaryAmountEur: string;
  salaryPeriod: string;
  clearSalary: boolean;
};

// Survives a Server Component refresh that remounts the edit form. This is
// tab-local memory, never a persisted draft or an autosave.
const unsavedForms = new Map<string, FormValues>();
let createRedirectPending = false;

function valuesFromDraft(draft: EmployerDraftDetail | null): FormValues {
  return {
    title: draft?.title ?? "",
    jobCategory: draft?.jobCategory ?? "",
    publicLocality: draft?.publicLocality ?? "",
    description: draft?.description ?? "",
    workplaceType: draft?.workplaceType ?? "",
    workFrequency: draft?.workFrequency ?? "",
    employmentTypes: draft?.employmentTypes ?? [],
    shiftRequirements: draft?.shiftRequirements ?? [],
    availableFrom: draft?.availableFrom ?? "",
    clearAvailableFrom: false,
    experienceNotes: draft?.experienceNotes ?? "",
    cvRequired: draft?.cvRequired === true,
    interviewEnglishOk: draft?.interviewEnglishOk === true,
    germanRequirement: toGermanComfortCode(draft?.germanRequirement),
    salaryAmountEur:
      draft?.salaryAmountCents != null
        ? centsToEurString(draft.salaryAmountCents)
        : "",
    salaryPeriod: draft?.salaryPeriod ?? "",
    clearSalary: false,
  };
}

function valuesFromForm(form: HTMLFormElement): FormValues {
  const data = new FormData(form);
  const value = (key: string) => String(data.get(key) ?? "");
  return {
    title: value("title"),
    jobCategory: value("jobCategory"),
    publicLocality: value("publicLocality"),
    description: value("description"),
    workplaceType: value("workplaceType"),
    workFrequency: value("workFrequency"),
    employmentTypes: data.getAll("employmentTypes").map(String),
    shiftRequirements: data.getAll("shiftRequirements").map(String),
    availableFrom: value("availableFrom"),
    clearAvailableFrom: data.has("clearAvailableFrom"),
    experienceNotes: value("experienceNotes"),
    cvRequired: data.has("cvRequired"),
    interviewEnglishOk: data.has("interviewEnglishOk"),
    germanRequirement: toGermanComfortCode(value("germanRequirement")),
    salaryAmountEur: value("salaryAmountEur"),
    salaryPeriod: value("salaryPeriod"),
    clearSalary: data.has("clearSalary"),
  };
}

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
  const formKey = draft?.id ?? "create";
  const [values, setValues] = useState<FormValues>(
    () => unsavedForms.get(formKey) ?? valuesFromDraft(draft),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const submittedValues = useRef<FormValues | null>(null);

  function updateValues(next: FormValues) {
    unsavedForms.set(formKey, next);
    setValues(next);
  }

  useEffect(() => {
    // A successful create redirects straight to edit without returning a
    // success state. Clear its submitted snapshot at the destination.
    if (draft && createRedirectPending) {
      unsavedForms.delete("create");
      createRedirectPending = false;
    }
  }, [draft]);

  useEffect(() => {
    if (props.mode === "create" && state.error !== null) {
      createRedirectPending = false;
    }
    if (
      state.error === null &&
      state.message !== null &&
      submittedValues.current
    ) {
      if (JSON.stringify(values) === JSON.stringify(submittedValues.current)) {
        unsavedForms.delete(formKey);
      }
      submittedValues.current = null;
    }
  }, [state, values, formKey, props.mode]);

  useEffect(() => {
    if (!state.fieldErrors || !formRef.current) return;
    const invalid = Array.from(formRef.current.elements).find(
      (element) =>
        element instanceof HTMLElement &&
        "name" in element &&
        typeof element.name === "string" &&
        state.fieldErrors?.[element.name],
    );
    if (invalid instanceof HTMLElement) invalid.focus();
  }, [state]);

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
      <form
        ref={formRef}
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          submittedValues.current = valuesFromForm(form);
          const data = new FormData(form);
          if (props.mode === "create") createRedirectPending = true;
          startTransition(() => formAction(data));
        }}
      >
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
              value={values.title}
              aria-invalid={fieldError(state, "title") ? true : undefined}
              aria-describedby={
                fieldError(state, "title") ? "title-error" : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
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
              value={values.jobCategory}
              aria-invalid={fieldError(state, "jobCategory") ? true : undefined}
              aria-describedby={
                fieldError(state, "jobCategory")
                  ? "jobCategory-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
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
              value={values.publicLocality}
              aria-describedby={
                fieldError(state, "publicLocality")
                  ? "publicLocality-support publicLocality-error"
                  : "publicLocality-support"
              }
              aria-invalid={
                fieldError(state, "publicLocality") ? true : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
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
              value={values.description}
              aria-invalid={fieldError(state, "description") ? true : undefined}
              aria-describedby={
                fieldError(state, "description")
                  ? "description-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            />
            {fieldError(state, "description") ? (
              <p id="description-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "description")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="workplaceType">
              {t("employer.vacancies.workplaceType")}
            </label>
            <select
              id="workplaceType"
              className={styles.select}
              name="workplaceType"
              value={values.workplaceType}
              aria-invalid={
                fieldError(state, "workplaceType") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "workplaceType")
                  ? "workplaceType-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            >
              <option value="">{copy.notSet}</option>
              {WORKPLACE_TYPE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {workplaceTypeLabel(option.code, locale)}
                </option>
              ))}
            </select>
            {fieldError(state, "workplaceType") ? (
              <p id="workplaceType-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "workplaceType")!,
                  locale,
                )}
              </p>
            ) : null}
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
              value={values.workFrequency}
              aria-invalid={
                fieldError(state, "workFrequency") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "workFrequency")
                  ? "workFrequency-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            >
              <option value="">{copy.notSet}</option>
              {WORK_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {workFrequencyLabel(option.code, locale)}
                </option>
              ))}
            </select>
            {fieldError(state, "workFrequency") ? (
              <p id="workFrequency-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "workFrequency")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>

          <fieldset className={styles.field}>
            <legend className={styles.label}>{copy.employment}</legend>
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <label key={option.code} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  name="employmentTypes"
                  value={option.code}
                  checked={values.employmentTypes.includes(option.code)}
                  aria-invalid={
                    fieldError(state, "employmentTypes") ? true : undefined
                  }
                  aria-describedby={
                    fieldError(state, "employmentTypes")
                      ? "employmentTypes-error"
                      : undefined
                  }
                  onChange={(event) =>
                    updateValues(valuesFromForm(event.currentTarget.form!))
                  }
                />
                <span>{employmentTypeLabel(option.code, locale)}</span>
              </label>
            ))}
            {fieldError(state, "employmentTypes") ? (
              <p id="employmentTypes-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "employmentTypes")!,
                  locale,
                )}
              </p>
            ) : null}
          </fieldset>

          <fieldset className={styles.field}>
            <legend className={styles.label}>{copy.shifts}</legend>
            {SHIFT_REQUIREMENT_OPTIONS.map((option) => (
              <label key={option.code} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  name="shiftRequirements"
                  value={option.code}
                  checked={values.shiftRequirements.includes(option.code)}
                  aria-invalid={
                    fieldError(state, "shiftRequirements") ? true : undefined
                  }
                  aria-describedby={
                    fieldError(state, "shiftRequirements")
                      ? "shiftRequirements-error"
                      : undefined
                  }
                  onChange={(event) =>
                    updateValues(valuesFromForm(event.currentTarget.form!))
                  }
                />
                <span>{shiftLabel(option.code, locale)}</span>
              </label>
            ))}
            {fieldError(state, "shiftRequirements") ? (
              <p id="shiftRequirements-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "shiftRequirements")!,
                  locale,
                )}
              </p>
            ) : null}
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
              value={values.availableFrom}
              aria-invalid={
                fieldError(state, "availableFrom") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "availableFrom")
                  ? "availableFrom-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            />
            {fieldError(state, "availableFrom") ? (
              <p id="availableFrom-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "availableFrom")!,
                  locale,
                )}
              </p>
            ) : null}
            {props.mode === "edit" ? (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  name="clearAvailableFrom"
                  value="true"
                  checked={values.clearAvailableFrom}
                  onChange={(event) =>
                    updateValues(valuesFromForm(event.currentTarget.form!))
                  }
                />
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
              value={values.experienceNotes}
              aria-invalid={
                fieldError(state, "experienceNotes") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "experienceNotes")
                  ? "experienceNotes-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            />
            {fieldError(state, "experienceNotes") ? (
              <p id="experienceNotes-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "experienceNotes")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="cvRequired"
              value="true"
              checked={values.cvRequired}
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            />
            <span>{t("employer.vacancies.cvRequired")}</span>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="interviewEnglishOk"
              value="true"
              checked={values.interviewEnglishOk}
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            />
            <span>{copy.englishInterview}</span>
          </label>

          <GermanRequirementField
            name="germanRequirement"
            value={values.germanRequirement}
            onChange={(germanRequirement) =>
              updateValues({ ...values, germanRequirement })
            }
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
              value={values.salaryAmountEur}
              aria-invalid={
                fieldError(state, "salaryAmountEur") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "salaryAmountEur")
                  ? "salaryAmountEur-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
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
              value={values.salaryPeriod}
              aria-invalid={
                fieldError(state, "salaryPeriod") ? true : undefined
              }
              aria-describedby={
                fieldError(state, "salaryPeriod")
                  ? "salaryPeriod-error"
                  : undefined
              }
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
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
              <p id="salaryPeriod-error" className={styles.fieldError}>
                {localizeEmployerMessage(
                  fieldError(state, "salaryPeriod")!,
                  locale,
                )}
              </p>
            ) : null}
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="clearSalary"
              value="true"
              checked={values.clearSalary}
              onChange={(event) =>
                updateValues(valuesFromForm(event.currentTarget.form!))
              }
            />
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

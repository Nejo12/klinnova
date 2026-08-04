"use client";

import { useActionState } from "react";

import {
  createEmployerVacancyDraftAction,
  updateEmployerVacancyDraftAction,
  type EmployerVacancyActionState,
} from "@/app/employer/vacancies/actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  SALARY_PERIOD_OPTIONS,
  WORK_FREQUENCY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "@/lib/employer/vacancies/allow-lists";
import {
  VACANCY_LOCALITY_SUPPORT,
  VACANCY_PRIVATE_HOME_WARNING,
} from "@/lib/employer/vacancies/messages";
import { centsToEurString } from "@/lib/employer/vacancies/salary";
import type { EmployerDraftDetail } from "@/lib/employer/vacancies/load-employer-draft";
import { JOB_CATEGORY_OPTIONS } from "@/lib/onboarding/allow-lists";

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
  const action =
    props.mode === "create"
      ? createEmployerVacancyDraftAction
      : updateEmployerVacancyDraftAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const draft = props.mode === "edit" ? props.draft : null;
  const salaryDefault =
    draft?.salaryAmountCents !== null && draft?.salaryAmountCents !== undefined
      ? centsToEurString(draft.salaryAmountCents)
      : "";

  return (
    <form className={styles.form} action={formAction} noValidate>
      {props.mode === "edit" ? (
        <input type="hidden" name="vacancyId" value={props.draft.id} />
      ) : null}

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

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Basics</legend>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">
            Title
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
              {fieldError(state, "title")}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="jobCategory">
            Job category
          </label>
          <select
            id="jobCategory"
            className={styles.select}
            name="jobCategory"
            required
            defaultValue={draft?.jobCategory ?? ""}
            aria-invalid={fieldError(state, "jobCategory") ? true : undefined}
            aria-describedby={
              fieldError(state, "jobCategory") ? "jobCategory-error" : undefined
            }
          >
            <option value="">Select a category</option>
            {JOB_CATEGORY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldError(state, "jobCategory") ? (
            <p id="jobCategory-error" className={styles.fieldError}>
              {fieldError(state, "jobCategory")}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="publicLocality">
            Berlin public locality
          </label>
          <p id="publicLocality-support" className={styles.support}>
            {VACANCY_LOCALITY_SUPPORT}
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
              {fieldError(state, "publicLocality")}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Role details</legend>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">
            Description
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
            Workplace type
          </label>
          <select
            id="workplaceType"
            className={styles.select}
            name="workplaceType"
            defaultValue={draft?.workplaceType ?? ""}
          >
            <option value="">Not set yet</option>
            {WORKPLACE_TYPE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <p className={styles.warning}>{VACANCY_PRIVATE_HOME_WARNING}</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="workFrequency">
            Work frequency
          </label>
          <select
            id="workFrequency"
            className={styles.select}
            name="workFrequency"
            defaultValue={draft?.workFrequency ?? ""}
          >
            <option value="">Not set yet</option>
            {WORK_FREQUENCY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="availableFrom">
            Available from
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
              <span>Clear available-from date</span>
            </label>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="experienceNotes">
            Experience notes
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
          <span>CV required</span>
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            name="interviewEnglishOk"
            value="true"
            defaultChecked={draft?.interviewEnglishOk === true}
          />
          <span>Interview can be in English</span>
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Salary (EUR gross)</legend>
        <p className={styles.support}>
          Optional for saving a draft. Required later for publication readiness.
          Amounts are stored as integer cents.
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="salaryAmountEur">
            Amount in EUR
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
              {fieldError(state, "salaryAmountEur")}
            </p>
          ) : null}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="salaryPeriod">
            Period
          </label>
          <select
            id="salaryPeriod"
            className={styles.select}
            name="salaryPeriod"
            defaultValue={draft?.salaryPeriod ?? ""}
            aria-invalid={fieldError(state, "salaryPeriod") ? true : undefined}
          >
            <option value="">Not set yet</option>
            {SALARY_PERIOD_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldError(state, "salaryPeriod") ? (
            <p className={styles.fieldError}>
              {fieldError(state, "salaryPeriod")}
            </p>
          ) : null}
        </div>
        <label className={styles.checkboxRow}>
          <input type="checkbox" name="clearSalary" value="true" />
          <span>Clear salary</span>
        </label>
      </fieldset>

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : props.mode === "create"
              ? "Create draft"
              : "Save draft"}
        </button>
      </div>
    </form>
  );
}

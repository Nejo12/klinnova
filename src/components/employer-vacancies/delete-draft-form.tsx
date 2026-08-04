"use client";

import { useActionState } from "react";

import {
  deleteEmployerVacancyDraftAction,
  type EmployerVacancyActionState,
} from "@/app/employer/vacancies/actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

type DeleteDraftFormProps = {
  vacancyId: string;
  title: string;
};

const initialState: EmployerVacancyActionState = {
  error: null,
  message: null,
};

export function DeleteDraftForm({ vacancyId, title }: DeleteDraftFormProps) {
  const [state, formAction, pending] = useActionState(
    deleteEmployerVacancyDraftAction,
    initialState,
  );

  return (
    <section
      id="delete-draft"
      className={styles.section}
      aria-labelledby="delete-draft-heading"
    >
      <h2 id="delete-draft-heading" className={styles.sectionHeading}>
        Delete draft
      </h2>
      <p className={styles.support}>
        Delete “{title}” only if it has never been published and has no
        applications. This cannot be undone.
      </p>
      <form className={styles.form} action={formAction} noValidate>
        <input type="hidden" name="vacancyId" value={vacancyId} />
        {state.error !== null ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmTitle">
            Type the draft title to confirm
          </label>
          <input
            id="confirmTitle"
            className={styles.input}
            name="confirmTitle"
            type="text"
            required
            autoComplete="off"
            aria-invalid={
              state.fieldErrors?.confirmTitle !== undefined ? true : undefined
            }
            aria-describedby={
              state.fieldErrors?.confirmTitle !== undefined
                ? "confirmTitle-error"
                : undefined
            }
          />
          {state.fieldErrors?.confirmTitle !== undefined ? (
            <p id="confirmTitle-error" className={styles.fieldError}>
              {state.fieldErrors.confirmTitle}
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            type="submit"
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete draft permanently"}
          </button>
        </div>
      </form>
    </section>
  );
}

"use client";

import { useActionState } from "react";

import {
  deleteEmployerVacancyDraftAction,
  type EmployerVacancyActionState,
} from "@/app/employer/vacancies/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
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
  const { locale, t } = useLocale();
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
        {t("employer.vacancies.deleteDraft")}
      </h2>
      <p className={styles.support}>
        {locale === "de"
          ? `Löschen Sie „${title}“ nur, wenn der Entwurf nie veröffentlicht wurde und keine Bewerbungen vorliegen. Dies kann nicht rückgängig gemacht werden.`
          : `Delete “${title}” only if it has never been published and has no applications. This cannot be undone.`}
      </p>
      <form className={styles.form} action={formAction} noValidate>
        <input type="hidden" name="vacancyId" value={vacancyId} />
        {state.error !== null ? (
          <p className={styles.error} role="alert">
            {localizeEmployerMessage(state.error, locale)}
          </p>
        ) : null}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmTitle">
            {t("employer.vacancies.deleteConfirm")}
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
              {localizeEmployerMessage(state.fieldErrors.confirmTitle, locale)}
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            type="submit"
            disabled={pending}
          >
            {pending
              ? t("employer.vacancies.deleting")
              : t("employer.vacancies.deletePermanently")}
          </button>
        </div>
      </form>
    </section>
  );
}

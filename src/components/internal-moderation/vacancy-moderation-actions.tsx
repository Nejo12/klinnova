"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  moderateVacancyAction,
  restoreVacancyAction,
  type VacancyModerationActionState,
} from "@/app/internal/employers/[employerProfileId]/vacancies/[vacancyId]/actions";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import {
  MODERATE_VACANCY_CONFIRM_LABEL,
  MODERATE_VACANCY_REASON_LABEL,
  RESTORE_VACANCY_CONFIRM_LABEL,
} from "@/lib/internal/moderation/messages";

const initialState: VacancyModerationActionState = {
  error: null,
  message: null,
};

type VacancyModerationActionsProps = {
  employerProfileId: string;
  vacancyId: string;
  moderated: boolean;
};

export function VacancyModerationActions({
  employerProfileId,
  vacancyId,
  moderated,
}: VacancyModerationActionsProps) {
  const [moderateState, moderateFormAction, moderatePending] = useActionState(
    moderateVacancyAction,
    initialState,
  );
  const [restoreState, restoreFormAction, restorePending] = useActionState(
    restoreVacancyAction,
    initialState,
  );

  const moderateErrorRef = useRef<HTMLDivElement>(null);
  const restoreErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (
      moderateState.error !== null ||
      moderateState.fieldErrors?.reason !== undefined
    ) {
      moderateErrorRef.current?.focus();
    }
  }, [moderateState]);

  useEffect(() => {
    if (restoreState.error !== null) {
      restoreErrorRef.current?.focus();
    }
  }, [restoreState]);

  if (moderated) {
    return (
      <form
        className={styles.form}
        action={restoreFormAction}
        aria-label="Restore vacancy"
        noValidate
      >
        <input type="hidden" name="vacancyId" value={vacancyId} />
        <input
          type="hidden"
          name="employerProfileId"
          value={employerProfileId}
        />
        <label className={styles.option}>
          <input
            type="checkbox"
            name="confirmRestore"
            value="true"
            disabled={restorePending}
          />
          <span className={styles.optionLabel}>
            {RESTORE_VACANCY_CONFIRM_LABEL}
          </span>
        </label>
        <div ref={restoreErrorRef} tabIndex={-1}>
          {restoreState.error !== null ? (
            <p className={styles.error} role="alert">
              {restoreState.error}
            </p>
          ) : null}
        </div>
        <div>
          <button
            className={styles.buttonSecondary}
            type="submit"
            disabled={restorePending}
          >
            {restorePending ? "Restoring…" : "Restore vacancy"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className={styles.form}
      action={moderateFormAction}
      aria-label="Moderate vacancy"
      noValidate
    >
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <input type="hidden" name="employerProfileId" value={employerProfileId} />
      <label className={styles.label} htmlFor="moderate-reason">
        {MODERATE_VACANCY_REASON_LABEL}
      </label>
      <textarea
        id="moderate-reason"
        className={styles.textarea}
        name="reason"
        maxLength={500}
        disabled={moderatePending}
        aria-invalid={
          moderateState.fieldErrors?.reason !== undefined ? true : undefined
        }
        aria-describedby={
          moderateState.fieldErrors?.reason !== undefined
            ? "moderate-reason-error"
            : undefined
        }
      />
      {moderateState.fieldErrors?.reason !== undefined ? (
        <p className={styles.fieldError} id="moderate-reason-error">
          {moderateState.fieldErrors.reason}
        </p>
      ) : null}
      <label className={styles.option}>
        <input
          type="checkbox"
          name="confirmModerate"
          value="true"
          disabled={moderatePending}
        />
        <span className={styles.optionLabel}>
          {MODERATE_VACANCY_CONFIRM_LABEL}
        </span>
      </label>
      <div ref={moderateErrorRef} tabIndex={-1}>
        {moderateState.error !== null ? (
          <p className={styles.error} role="alert">
            {moderateState.error}
          </p>
        ) : null}
      </div>
      <div>
        <button
          className={styles.button}
          type="submit"
          disabled={moderatePending}
        >
          {moderatePending ? "Moderating…" : "Moderate vacancy"}
        </button>
      </div>
    </form>
  );
}

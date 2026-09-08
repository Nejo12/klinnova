"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  fillEmployerVacancyAction,
  materializeEmployerVacancyExpiryAction,
  pauseEmployerVacancyAction,
  publishEmployerVacancyAction,
  renewEmployerVacancyAction,
  resumeEmployerVacancyAction,
  withdrawEmployerVacancyAction,
  type EmployerVacancyLifecycleActionState,
} from "@/app/employer/vacancies/[vacancyId]/lifecycle-actions";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { localizeEmployerMessage } from "@/lib/employer/localize-message";
import type { EmployerVacancyDetail } from "@/lib/employer/vacancies/load-employer-vacancy";
import {
  VACANCY_FILL_CONFIRM,
  VACANCY_PAUSE_CONFIRM,
  VACANCY_PUBLISH_CONFIRM,
  VACANCY_PUBLISH_EXPIRY_NOTE,
  VACANCY_RENEW_CONFIRM,
  VACANCY_RESUME_CONFIRM,
  VACANCY_WITHDRAW_CONFIRM,
} from "@/lib/employer/vacancies/messages";
import { mapReadinessChecklist } from "@/lib/employer/vacancies/readiness";
import { readinessItemLabel } from "@/lib/employer/vacancies/readiness";

const initialState: EmployerVacancyLifecycleActionState = {
  error: null,
  message: null,
};

type LifecycleAction = (
  state: EmployerVacancyLifecycleActionState,
  formData: FormData,
) => Promise<EmployerVacancyLifecycleActionState>;

type ConfirmedFormProps = {
  formKey: string;
  action: LifecycleAction;
  vacancyId: string;
  confirmLabel: string;
  submitLabel: string;
  pendingLabel: string;
  buttonClassName: string | undefined;
  disabledByOther: boolean;
  onPendingChange: (formKey: string, pending: boolean) => void;
  note?: string;
};

function ConfirmedLifecycleForm({
  formKey,
  action,
  vacancyId,
  confirmLabel,
  submitLabel,
  pendingLabel,
  buttonClassName,
  disabledByOther,
  onPendingChange,
  note,
}: ConfirmedFormProps) {
  const { locale, t } = useLocale();
  const [state, formAction, pending] = useActionState(action, initialState);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPendingChange(formKey, pending);
  }, [formKey, pending, onPendingChange]);

  // A successful transition changes publicationState, which flips this
  // slot's `show*` flag to false and unmounts this form — often while
  // `pending` was still true, so the effect above never gets a final
  // `pending=false` call. Without this, the key leaks in the parent's
  // pendingKeys set and permanently disables every sibling form.
  useEffect(() => {
    return () => onPendingChange(formKey, false);
  }, [formKey, onPendingChange]);

  useEffect(() => {
    if (state.error !== null) {
      errorRef.current?.focus();
    }
  }, [state.error]);

  const disabled = pending || disabledByOther;
  const checkboxId = `confirm-${formKey}`;

  return (
    <form className={styles.form} action={formAction} noValidate>
      <input type="hidden" name="vacancyId" value={vacancyId} />
      {note !== undefined ? <p className={styles.note}>{note}</p> : null}
      <div className={styles.checkboxRow}>
        <input
          type="checkbox"
          id={checkboxId}
          name="confirmed"
          value="true"
          disabled={disabled}
        />
        <label htmlFor={checkboxId}>{confirmLabel}</label>
      </div>

      <div ref={errorRef} tabIndex={-1}>
        {state.error !== null ? (
          <p className={styles.error} role="alert">
            {localizeEmployerMessage(state.error, locale)}
          </p>
        ) : null}
      </div>

      {state.missing !== undefined && state.missing.length > 0 ? (
        <ul className={styles.checklist}>
          {mapReadinessChecklist(state.missing).map((item) => (
            <li
              key={item.id}
              className={styles.checklistItem}
              data-complete={item.complete ? "true" : "false"}
            >
              <span className={styles.checklistMarker}>
                {item.complete
                  ? t("employer.vacancies.complete")
                  : t("employer.vacancies.missing")}
              </span>
              <span>{readinessItemLabel(item, locale)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {state.message !== null ? (
        <p className={styles.status} role="status">
          {localizeEmployerMessage(state.message, locale)}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={buttonClassName} type="submit" disabled={disabled}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

type VacancyLifecycleActionsProps = {
  vacancyId: string;
  publicationState: EmployerVacancyDetail["publicationState"];
  isEffectivelyExpired: boolean;
};

export function VacancyLifecycleActions({
  vacancyId,
  publicationState,
  isEffectivelyExpired,
}: VacancyLifecycleActionsProps) {
  const { locale, t } = useLocale();
  const de = locale === "de";
  const [materializeState, materializeFormAction, materializePending] =
    useActionState(materializeEmployerVacancyExpiryAction, initialState);

  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  // Stable across renders: an unmemoized callback here would change the
  // `onPendingChange` prop identity on every render, re-triggering each
  // child's effect and looping indefinitely, since setPendingKeys always
  // fires (even as a same-membership no-op below prevents that).
  const handlePendingChange = useCallback(
    (formKey: string, pending: boolean) => {
      setPendingKeys((previous) => {
        const alreadyPending = previous.has(formKey);
        if (alreadyPending === pending) {
          return previous;
        }
        const next = new Set(previous);
        if (pending) {
          next.add(formKey);
        } else {
          next.delete(formKey);
        }
        return next;
      });
    },
    [],
  );

  const anyConfirmedFormPending = pendingKeys.size > 0;
  const anyPending = anyConfirmedFormPending || materializePending;

  const showPublish = publicationState === "draft";
  const showPause = publicationState === "published";
  const showResume = publicationState === "paused";
  const showFill =
    publicationState === "published" || publicationState === "paused";
  const showWithdraw =
    publicationState === "published" || publicationState === "paused";
  const showRenew = publicationState === "expired";
  const showMaterialize =
    (publicationState === "published" || publicationState === "paused") &&
    isEffectivelyExpired;

  const nothingToShow =
    !showPublish &&
    !showPause &&
    !showResume &&
    !showFill &&
    !showWithdraw &&
    !showRenew &&
    !showMaterialize;

  if (nothingToShow) {
    return null;
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="lifecycle-actions-heading"
    >
      <h2 id="lifecycle-actions-heading" className={styles.sectionHeading}>
        {t("employer.vacancies.lifecycle")}
      </h2>

      {showPublish ? (
        <ConfirmedLifecycleForm
          formKey="publish"
          action={publishEmployerVacancyAction}
          vacancyId={vacancyId}
          confirmLabel={
            de
              ? "Ich bestätige, dass dieser Entwurf veröffentlicht werden soll."
              : VACANCY_PUBLISH_CONFIRM
          }
          submitLabel={de ? "Veröffentlichen" : "Publish"}
          pendingLabel={de ? "Wird veröffentlicht…" : "Publishing…"}
          buttonClassName={styles.button}
          disabledByOther={anyPending && !pendingKeys.has("publish")}
          onPendingChange={handlePendingChange}
          note={
            de
              ? "Veröffentlichte Stellen laufen nach dem festgelegten Zeitraum ab."
              : VACANCY_PUBLISH_EXPIRY_NOTE
          }
        />
      ) : null}

      {showPause ? (
        <ConfirmedLifecycleForm
          formKey="pause"
          action={pauseEmployerVacancyAction}
          vacancyId={vacancyId}
          confirmLabel={
            de
              ? "Ich bestätige, dass diese Stelle pausiert werden soll."
              : VACANCY_PAUSE_CONFIRM
          }
          submitLabel={de ? "Pausieren" : "Pause"}
          pendingLabel={de ? "Wird pausiert…" : "Pausing…"}
          buttonClassName={styles.buttonSecondary}
          disabledByOther={anyPending && !pendingKeys.has("pause")}
          onPendingChange={handlePendingChange}
        />
      ) : null}

      {showResume ? (
        <ConfirmedLifecycleForm
          formKey="resume"
          action={resumeEmployerVacancyAction}
          vacancyId={vacancyId}
          confirmLabel={
            de
              ? "Ich bestätige, dass diese Stelle wieder sichtbar werden soll."
              : VACANCY_RESUME_CONFIRM
          }
          submitLabel={de ? "Fortsetzen" : "Resume"}
          pendingLabel={de ? "Wird fortgesetzt…" : "Resuming…"}
          buttonClassName={styles.button}
          disabledByOther={anyPending && !pendingKeys.has("resume")}
          onPendingChange={handlePendingChange}
        />
      ) : null}

      {showFill ? (
        <ConfirmedLifecycleForm
          formKey="fill"
          action={fillEmployerVacancyAction}
          vacancyId={vacancyId}
          confirmLabel={
            de
              ? "Ich bestätige, dass diese Stelle besetzt ist."
              : VACANCY_FILL_CONFIRM
          }
          submitLabel={de ? "Als besetzt markieren" : "Mark filled"}
          pendingLabel={de ? "Wird als besetzt markiert…" : "Marking filled…"}
          buttonClassName={styles.buttonSecondary}
          disabledByOther={anyPending && !pendingKeys.has("fill")}
          onPendingChange={handlePendingChange}
        />
      ) : null}

      {showWithdraw ? (
        <ConfirmedLifecycleForm
          formKey="withdraw"
          action={withdrawEmployerVacancyAction}
          vacancyId={vacancyId}
          confirmLabel={
            de
              ? "Ich bestätige, dass diese Stelle zurückgezogen werden soll."
              : VACANCY_WITHDRAW_CONFIRM
          }
          submitLabel={de ? "Zurückziehen" : "Withdraw"}
          pendingLabel={de ? "Wird zurückgezogen…" : "Withdrawing…"}
          buttonClassName={styles.buttonDanger}
          disabledByOther={anyPending && !pendingKeys.has("withdraw")}
          onPendingChange={handlePendingChange}
        />
      ) : null}

      {showRenew ? (
        <ConfirmedLifecycleForm
          formKey="renew"
          action={renewEmployerVacancyAction}
          vacancyId={vacancyId}
          confirmLabel={
            de
              ? "Ich bestätige, dass diese Stelle als Entwurf erneuert werden soll."
              : VACANCY_RENEW_CONFIRM
          }
          submitLabel={de ? "Als Entwurf erneuern" : "Renew to draft"}
          pendingLabel={de ? "Wird erneuert…" : "Renewing…"}
          buttonClassName={styles.button}
          disabledByOther={anyPending && !pendingKeys.has("renew")}
          onPendingChange={handlePendingChange}
        />
      ) : null}

      {showMaterialize ? (
        <form
          className={styles.form}
          action={materializeFormAction}
          aria-label={
            de ? "Ablaufstatus aktualisieren" : "Refresh expired status"
          }
          noValidate
        >
          <input type="hidden" name="vacancyId" value={vacancyId} />
          {materializeState.error !== null ? (
            <p className={styles.error} role="alert">
              {localizeEmployerMessage(materializeState.error, locale)}
            </p>
          ) : null}
          {materializeState.message !== null ? (
            <p className={styles.status} role="status">
              {localizeEmployerMessage(materializeState.message, locale)}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button
              className={styles.buttonSecondary}
              type="submit"
              disabled={anyPending}
            >
              {materializePending
                ? de
                  ? "Wird aktualisiert…"
                  : "Refreshing…"
                : de
                  ? "Ablaufstatus aktualisieren"
                  : "Refresh expired status"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

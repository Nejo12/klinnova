"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { transitionEmployerApplicationAction } from "@/app/employer/applications/[applicationId]/transition-actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  APPLICATION_ALREADY_IN_STATE,
  APPLICATION_GENERIC_FAILURE,
  APPLICATION_INCOMPLETE_EMPLOYER,
  APPLICATION_INVALID_TRANSITION,
  APPLICATION_REASON_MAX_LENGTH,
  APPLICATION_TERMINAL_STATE,
  APPLICATION_UNAVAILABLE,
} from "@/lib/employer/applications/messages";
import {
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/employer/applications/status";
import {
  initialTransitionActionState,
  type TransitionApplicationActionState,
} from "@/lib/employer/applications/transition-action-state";

type ApplicationTransitionFormProps = {
  applicationId: string;
  currentStatus: ApplicationStatus;
  allowedTransitions: ApplicationStatus[];
};

function renderFeedback(state: TransitionApplicationActionState) {
  switch (state.kind) {
    case "idle":
      return null;
    case "updated":
      return (
        <p className={styles.status} role="status">
          Status updated to {applicationStatusLabel(state.currentStatus)}.
        </p>
      );
    case "already_in_state":
      return (
        <p className={styles.status} role="status">
          {APPLICATION_ALREADY_IN_STATE} Current status:{" "}
          {applicationStatusLabel(state.currentStatus)}.
        </p>
      );
    case "invalid_transition":
      return (
        <p className={styles.error} role="alert">
          {APPLICATION_INVALID_TRANSITION}
        </p>
      );
    case "unavailable":
      return (
        <p className={styles.error} role="alert">
          {APPLICATION_UNAVAILABLE}
        </p>
      );
    case "employer_unavailable":
      return (
        <p className={styles.error} role="alert">
          {APPLICATION_INCOMPLETE_EMPLOYER}
        </p>
      );
    case "failure":
      return (
        <p className={styles.error} role="alert">
          {APPLICATION_GENERIC_FAILURE}
        </p>
      );
  }
}

/**
 * Renders only the statuses the database's `allowed_transitions` already
 * approved (D-070) — this component never recomputes the transition
 * matrix. The rejection-reason field is shown only while the selected
 * target is "rejected" and is cleared whenever the target changes away
 * from it, so a stale reason is never carried into an unrelated
 * transition.
 */
export function ApplicationTransitionForm({
  applicationId,
  currentStatus,
  allowedTransitions,
}: ApplicationTransitionFormProps) {
  const [state, formAction, pending] = useActionState(
    transitionEmployerApplicationAction,
    initialTransitionActionState,
  );
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus | "">(
    allowedTransitions[0] ?? "",
  );
  const [reason, setReason] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind !== "idle") {
      feedbackRef.current?.focus();
    }
  }, [state]);

  if (allowedTransitions.length === 0) {
    return (
      <section className={styles.section} aria-labelledby="transition-heading">
        <h2 id="transition-heading" className={styles.sectionHeading}>
          Status
        </h2>
        <p className={styles.support}>
          Current status: {applicationStatusLabel(currentStatus)}
        </p>
        <p className={styles.note}>{APPLICATION_TERMINAL_STATE}</p>
      </section>
    );
  }

  function handleTargetChange(value: string) {
    setTargetStatus(value as ApplicationStatus);
    if (value !== "rejected") {
      setReason("");
    }
  }

  return (
    <section className={styles.section} aria-labelledby="transition-heading">
      <h2 id="transition-heading" className={styles.sectionHeading}>
        Status
      </h2>
      <p className={styles.support}>
        Current status: {applicationStatusLabel(currentStatus)}
      </p>

      <form className={styles.form} action={formAction} noValidate>
        <input type="hidden" name="applicationId" value={applicationId} />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="target-status">
            New status
          </label>
          <select
            id="target-status"
            className={styles.select}
            name="targetStatus"
            value={targetStatus}
            onChange={(event) => handleTargetChange(event.target.value)}
            disabled={pending}
          >
            {allowedTransitions.map((status) => (
              <option key={status} value={status}>
                {applicationStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {targetStatus === "rejected" ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reason">
              Reason (optional)
            </label>
            <textarea
              id="reason"
              className={styles.textarea}
              name="reason"
              maxLength={APPLICATION_REASON_MAX_LENGTH}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={pending}
            />
          </div>
        ) : null}

        <div ref={feedbackRef} tabIndex={-1}>
          {renderFeedback(state)}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.button}
            type="submit"
            disabled={pending || targetStatus === ""}
          >
            {pending ? "Updating…" : "Update status"}
          </button>
        </div>
      </form>
    </section>
  );
}

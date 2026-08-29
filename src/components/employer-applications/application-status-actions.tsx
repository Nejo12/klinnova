"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { transitionEmployerApplicationAction } from "@/app/employer/applications/[applicationId]/transition-actions";
import styles from "@/components/employer-applications/employer-applications.module.scss";
import { StatusTransitionConfirmDialog } from "@/components/employer-applications/status-transition-confirm-dialog";
import {
  APPLICATION_ALREADY_IN_STATE,
  APPLICATION_GENERIC_FAILURE,
  APPLICATION_INCOMPLETE_EMPLOYER,
  APPLICATION_INVALID_TRANSITION,
  APPLICATION_TERMINAL_STATE,
  APPLICATION_UNAVAILABLE,
} from "@/lib/employer/applications/messages";
import {
  applicationStatusLabel,
  employerApplicationActionLabel,
  employerApplicationActionPendingLabel,
  type ApplicationStatus,
} from "@/lib/employer/applications/status";
import {
  initialTransitionActionState,
  type TransitionApplicationActionState,
} from "@/lib/employer/applications/transition-action-state";

type ApplicationStatusActionsProps = {
  applicationId: string;
  currentStatus: ApplicationStatus;
  allowedTransitions: ApplicationStatus[];
};

type TerminalTransition = "accepted" | "rejected";

const TERMINAL_TRANSITIONS = new Set<ApplicationStatus>([
  "accepted",
  "rejected",
]);

function isTerminalTransition(
  status: ApplicationStatus,
): status is TerminalTransition {
  return TERMINAL_TRANSITIONS.has(status);
}

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
 * matrix. Ordinary transitions submit the shared form directly; the two
 * terminal transitions (`accepted`/`rejected`) open
 * `StatusTransitionConfirmDialog` first, whose own confirm button is the
 * real submit control for the same form (see that component's doc
 * comment for why it renders no `<form>` of its own).
 */
export function ApplicationStatusActions({
  applicationId,
  currentStatus,
  allowedTransitions,
}: ApplicationStatusActionsProps) {
  const [state, formAction, pending] = useActionState(
    transitionEmployerApplicationAction,
    initialTransitionActionState,
  );
  const [pendingTerminal, setPendingTerminal] =
    useState<TerminalTransition | null>(null);
  // Tracks which ordinary-transition button was pressed, so only that
  // button (not its disabled siblings) shows a pending label while the
  // shared `pending` boolean is true. Cleared alongside `pendingTerminal`
  // below once the request resolves.
  const [pressedStatus, setPressedStatus] = useState<ApplicationStatus | null>(
    null,
  );
  const feedbackRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (state.kind !== "idle") {
      feedbackRef.current?.focus();
    }
  }, [state]);

  // Auto-close the dialog once its submission resolves (pending goes from
  // true back to false) — the dialog otherwise has no signal that its own
  // submit already completed. The same transition also clears
  // `pressedStatus`, since an ordinary-transition submission has resolved
  // by the same signal (whichever of the two was actually in flight; the
  // other is already null and this is a no-op for it).
  const wasPending = useRef(pending);
  useEffect(() => {
    if (wasPending.current && !pending) {
      setPendingTerminal(null);
      setPressedStatus(null);
    }
    wasPending.current = pending;
  }, [pending]);

  useEffect(() => {
    if (pendingTerminal === null) {
      openerRef.current?.focus();
    }
  }, [pendingTerminal]);

  if (allowedTransitions.length === 0) {
    return (
      <section className={styles.reviewPanel} aria-labelledby="review-heading">
        <h2 id="review-heading" className={styles.sectionHeading}>
          Review
        </h2>
        <div className={styles.reviewCurrent}>
          <p className={styles.kicker}>Current status</p>
          <p className={styles.reviewStatus}>
            {applicationStatusLabel(currentStatus)}
          </p>
        </div>
        <p className={styles.note}>{APPLICATION_TERMINAL_STATE}</p>
      </section>
    );
  }

  const ordinaryTransitions = allowedTransitions.filter(
    (status) => !isTerminalTransition(status),
  );
  const terminalTransitions = allowedTransitions.filter(isTerminalTransition);
  const dialogOpen = pendingTerminal !== null;

  return (
    <section className={styles.reviewPanel} aria-labelledby="review-heading">
      <h2 id="review-heading" className={styles.sectionHeading}>
        Review
      </h2>
      <div className={styles.reviewCurrent}>
        <p className={styles.kicker}>Current status</p>
        <p className={styles.reviewStatus}>
          {applicationStatusLabel(currentStatus)}
        </p>
      </div>

      <form className={styles.form} action={formAction} noValidate>
        <input type="hidden" name="applicationId" value={applicationId} />

        <div ref={feedbackRef} tabIndex={-1}>
          {renderFeedback(state)}
        </div>

        <p className={styles.kicker}>Next status</p>
        <div className={`${styles.actions} ${styles.statusActionsGroup}`}>
          {ordinaryTransitions.map((status) => {
            const isPressed = pending && pressedStatus === status;
            return (
              <button
                key={status}
                type="submit"
                name="targetStatus"
                value={status}
                className={`${styles.button} ${styles.statusActionButton}`}
                disabled={pending || dialogOpen}
                aria-busy={isPressed ? true : undefined}
                onClick={() => setPressedStatus(status)}
              >
                {isPressed
                  ? employerApplicationActionPendingLabel(status)
                  : employerApplicationActionLabel(status)}
              </button>
            );
          })}
        </div>

        {terminalTransitions.length > 0 ? (
          <>
            <hr className={styles.divider} />
            <div className={`${styles.actions} ${styles.statusActionsGroup}`}>
              {terminalTransitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={
                    status === "rejected" ? styles.buttonDanger : styles.button
                  }
                  disabled={pending || dialogOpen}
                  onClick={(event) => {
                    openerRef.current = event.currentTarget;
                    setPendingTerminal(status);
                  }}
                >
                  {employerApplicationActionLabel(status)}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <p className={styles.note}>
          Accepted and rejected are terminal application states. Hired remains a
          separate outcome event.
        </p>

        {pendingTerminal !== null ? (
          <StatusTransitionConfirmDialog
            targetStatus={pendingTerminal}
            pending={pending}
            onCancel={() => setPendingTerminal(null)}
          />
        ) : null}
      </form>
    </section>
  );
}

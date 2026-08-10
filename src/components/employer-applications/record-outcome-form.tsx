"use client";

import { useActionState, useEffect, useRef } from "react";

import { recordApplicationOutcomeAction } from "@/app/employer/applications/[applicationId]/outcome-actions";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  OUTCOME_TYPE_CODES,
  outcomeTypeLabel,
} from "@/lib/applications/outcome-type";
import {
  OUTCOME_ALREADY_HIRED,
  OUTCOME_GENERIC_FAILURE,
  OUTCOME_INVALID_OCCURRED_AT,
  OUTCOME_UNAVAILABLE,
} from "@/lib/employer/applications/messages";
import {
  initialRecordOutcomeActionState,
  type RecordOutcomeActionState,
} from "@/lib/employer/applications/outcome-action-state";

type RecordOutcomeFormProps = {
  applicationId: string;
  /** Berlin-calendar "today" (YYYY-MM-DD), computed server-side so the
   * date input's default/max agree exactly with the Server Action's own
   * `computeOccurredAtIso` boundary — never a client `Date` read, which
   * could disagree with the server across timezones. */
  todayIso: string;
};

function renderFeedback(state: RecordOutcomeActionState) {
  switch (state.kind) {
    case "idle":
      return null;
    case "recorded":
      return (
        <p className={styles.status} role="status">
          {outcomeTypeLabel(state.outcomeType)} recorded.
        </p>
      );
    case "already_hired":
      return (
        <p className={styles.error} role="alert">
          {OUTCOME_ALREADY_HIRED}
        </p>
      );
    case "invalid_occurred_at":
      return (
        <p className={styles.error} role="alert">
          {OUTCOME_INVALID_OCCURRED_AT}
        </p>
      );
    case "unavailable":
      return (
        <p className={styles.error} role="alert">
          {OUTCOME_UNAVAILABLE}
        </p>
      );
    case "failure":
      return (
        <p className={styles.error} role="alert">
          {OUTCOME_GENERIC_FAILURE}
        </p>
      );
  }
}

/**
 * Records an interview/hire outcome (M5.1 Unit E, D-M5-22). Deliberately
 * offers exactly the two outcome types the database allows — no
 * scheduling/"Interview set" option exists to select. The date input is
 * date-only by design (agreed in review): precision beyond a calendar day
 * adds friction this beta measurement use case doesn't need.
 */
export function RecordOutcomeForm({
  applicationId,
  todayIso,
}: RecordOutcomeFormProps) {
  const [state, formAction, pending] = useActionState(
    recordApplicationOutcomeAction,
    initialRecordOutcomeActionState,
  );
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind !== "idle") {
      feedbackRef.current?.focus();
    }
  }, [state]);

  // Uncontrolled inputs, reset to their defaults after a successful record
  // by remounting the form (keyed on the just-recorded instant) rather than
  // imperatively resetting state from an effect.
  const formKey = state.kind === "recorded" ? state.occurredAt : "form";

  return (
    <section
      className={styles.section}
      aria-labelledby="record-outcome-heading"
    >
      <h2 id="record-outcome-heading" className={styles.sectionHeading}>
        Record an outcome
      </h2>

      <form
        key={formKey}
        className={styles.form}
        action={formAction}
        noValidate
      >
        <input type="hidden" name="applicationId" value={applicationId} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="outcome-type">
            Outcome
          </label>
          <select
            id="outcome-type"
            className={styles.select}
            name="outcomeType"
            defaultValue={OUTCOME_TYPE_CODES[0]}
            disabled={pending}
          >
            {OUTCOME_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {outcomeTypeLabel(code)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="occurred-at-date">
            Date
          </label>
          <input
            id="occurred-at-date"
            className={styles.input}
            type="date"
            name="occurredAtDate"
            defaultValue={todayIso}
            max={todayIso}
            disabled={pending}
          />
        </div>

        <div ref={feedbackRef} tabIndex={-1}>
          {renderFeedback(state)}
        </div>

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record outcome"}
          </button>
        </div>
      </form>
    </section>
  );
}

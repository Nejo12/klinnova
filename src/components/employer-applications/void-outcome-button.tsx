"use client";

import { useActionState, useEffect, useRef } from "react";

import { voidApplicationOutcomeAction } from "@/app/employer/applications/[applicationId]/outcome-actions";
import styles from "@/components/employer-applications/employer-applications.module.scss";
import {
  OUTCOME_ALREADY_VOIDED,
  OUTCOME_GENERIC_FAILURE,
  OUTCOME_UNAVAILABLE,
} from "@/lib/employer/applications/messages";
import {
  initialVoidOutcomeActionState,
  type VoidOutcomeActionState,
} from "@/lib/employer/applications/outcome-action-state";

type VoidOutcomeButtonProps = {
  applicationId: string;
  outcomeEventId: string;
};

function renderFeedback(state: VoidOutcomeActionState) {
  switch (state.kind) {
    case "idle":
    case "voided":
      // "voided" re-renders as a static row (see ApplicationOutcomeHistory)
      // once revalidatePath refreshes the parent's data — no separate
      // success message needed here.
      return null;
    case "already_voided":
      return (
        <p className={styles.error} role="alert">
          {OUTCOME_ALREADY_VOIDED}
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

/** One outcome event's void control — a single-purpose form, deliberately
 * with no free-text reason field (D-M5-22: void has no free-text reason). */
export function VoidOutcomeButton({
  applicationId,
  outcomeEventId,
}: VoidOutcomeButtonProps) {
  const [state, formAction, pending] = useActionState(
    voidApplicationOutcomeAction,
    initialVoidOutcomeActionState,
  );
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind !== "idle") {
      feedbackRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="outcomeEventId" value={outcomeEventId} />
      <div ref={feedbackRef} tabIndex={-1}>
        {renderFeedback(state)}
      </div>
      <button
        className={styles.buttonSecondary}
        type="submit"
        disabled={pending}
      >
        {pending ? "Voiding…" : "Void"}
      </button>
    </form>
  );
}

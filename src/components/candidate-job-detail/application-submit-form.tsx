"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { submitCandidateApplicationAction } from "@/app/candidate/jobs/[vacancyId]/actions";
import {
  APPLICATION_FAILURE_MESSAGE,
  APPLICATION_NOT_MATCHING_BODY,
  APPLICATION_NOT_MATCHING_HEADING,
  APPLICATION_SUBMIT_DISCLOSURE,
  APPLICATION_UNAVAILABLE_BODY,
  APPLICATION_UNAVAILABLE_HEADING,
  APPLICATION_VALIDATION_MESSAGE,
} from "@/lib/applications/messages";
import {
  initialSubmitCandidateApplicationState,
  type SubmitCandidateApplicationState,
} from "@/lib/applications/submit-action-state";

import styles from "./candidate-job-detail.module.scss";

type ApplicationSubmitFormProps = {
  vacancyId: string;
};

function SubmitButton({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || locked;

  return (
    <button
      className={styles.submitButton}
      disabled={disabled}
      type="submit"
      aria-describedby="application-submit-disclosure"
      aria-busy={pending}
    >
      {pending ? "Submitting…" : "Submit application"}
    </button>
  );
}

function resultCopy(state: SubmitCandidateApplicationState): {
  kind: "alert";
  heading: string;
  body: string;
} | null {
  switch (state.status) {
    case "submitted":
    case "already_applied":
      // Successful outcomes redirect server-side to confirmation.
      return null;
    case "not_matching":
      return {
        kind: "alert",
        heading: APPLICATION_NOT_MATCHING_HEADING,
        body: APPLICATION_NOT_MATCHING_BODY,
      };
    case "unavailable":
      return {
        kind: "alert",
        heading: APPLICATION_UNAVAILABLE_HEADING,
        body: APPLICATION_UNAVAILABLE_BODY,
      };
    case "validation_error":
      return {
        kind: "alert",
        heading: APPLICATION_UNAVAILABLE_HEADING,
        body: APPLICATION_VALIDATION_MESSAGE,
      };
    case "failure":
      return {
        kind: "alert",
        heading: "Submission failed",
        body: APPLICATION_FAILURE_MESSAGE,
      };
    case "idle":
      return null;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function ApplicationSubmitForm({
  vacancyId,
}: ApplicationSubmitFormProps) {
  const [state, formAction] = useActionState(
    submitCandidateApplicationAction,
    initialSubmitCandidateApplicationState,
  );
  const resultRef = useRef<HTMLDivElement>(null);
  const result = resultCopy(state);

  useEffect(() => {
    if (result !== null) {
      resultRef.current?.focus();
    }
  }, [result, state.status]);

  return (
    <section
      className={styles.section}
      aria-labelledby="application-submit-heading"
    >
      <h2 className={styles.sectionHeading} id="application-submit-heading">
        Submit application
      </h2>

      {result !== null ? (
        <div
          ref={resultRef}
          className={styles.resultAlert}
          role="alert"
          tabIndex={-1}
        >
          <p className={styles.resultHeading}>{result.heading}</p>
          <p className={styles.resultBody}>{result.body}</p>
          {state.status === "not_matching" ? (
            <Link className={styles.cta} href="/candidate/matches">
              Back to matches
            </Link>
          ) : null}
        </div>
      ) : null}

      <form action={formAction} className={styles.submitForm}>
        <input type="hidden" name="vacancyId" value={vacancyId} />
        <p className={styles.disclosure} id="application-submit-disclosure">
          {APPLICATION_SUBMIT_DISCLOSURE}
        </p>
        <SubmitButton locked={false} />
      </form>
    </section>
  );
}

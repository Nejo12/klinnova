"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@nova-component/ui";

import { submitCandidateApplicationAction } from "@/app/candidate/jobs/[vacancyId]/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  APPLICATION_INTRODUCTION_MAX_LENGTH,
  buildApplicationIntroductionSuggestion,
  normalizeApplicationIntroduction,
} from "@/lib/applications/application-introduction";
import {
  initialSubmitCandidateApplicationState,
  type SubmitCandidateApplicationState,
} from "@/lib/applications/submit-action-state";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import { MissingRequirementsList } from "./missing-requirements-list";
import styles from "./candidate-job-detail.module.scss";

type ApplicationSubmitFormProps = {
  employerDisplayName: string;
  vacancyId: string;
  vacancyTitle: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useLocale();

  return (
    <button
      className={styles.submitButton}
      disabled={pending}
      type="submit"
      aria-describedby="application-submit-disclosure"
      aria-busy={pending}
    >
      {pending
        ? t("application.introduction.submitting")
        : t("application.introduction.submit")}
    </button>
  );
}

function resultCopy(
  state: SubmitCandidateApplicationState,
  t: ReturnType<typeof useLocale>["t"],
): {
  heading: string;
  body: string;
} | null {
  switch (state.status) {
    case "submitted":
    case "already_applied":
      return null;
    case "ineligible":
      return {
        heading: t("candidate.jobs.ineligibleHeading"),
        body: t("candidate.jobs.ineligibleBody"),
      };
    case "unavailable":
      return {
        heading: t("candidate.jobs.unavailableHeading"),
        body: t("candidate.jobs.unavailableApplyBody"),
      };
    case "validation_error":
      return {
        heading: t("candidate.jobs.unavailableHeading"),
        body: t("candidate.jobs.validationBody"),
      };
    case "failure":
      return {
        heading: t("candidate.jobs.submitFailure"),
        body: t("candidate.jobs.failureBody"),
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
  employerDisplayName,
  vacancyId,
  vacancyTitle,
}: ApplicationSubmitFormProps) {
  const { locale, t } = useLocale();
  const [introduction, setIntroduction] = useState(() =>
    buildApplicationIntroductionSuggestion(locale, {
      employerDisplayName,
      vacancyTitle,
    }),
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [state, formAction] = useActionState(
    submitCandidateApplicationAction,
    initialSubmitCandidateApplicationState,
  );
  const resultRef = useRef<HTMLDivElement>(null);
  const result = resultCopy(state, t);
  const remaining = APPLICATION_INTRODUCTION_MAX_LENGTH - introduction.length;

  useEffect(() => {
    if (result !== null) {
      resultRef.current?.focus();
    }
  }, [result, state.status]);

  function showPreview() {
    setIntroduction(normalizeApplicationIntroduction(introduction));
    setIsPreviewing(true);
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="application-submit-heading"
    >
      <h2 className={styles.sectionHeading} id="application-submit-heading">
        {isPreviewing
          ? t("application.introduction.previewHeading")
          : t("application.introduction.heading")}
      </h2>

      {result !== null ? (
        <div
          ref={resultRef}
          className={styles.resultAlert}
          role="alert"
          tabIndex={-1}
        >
          <p
            className={styles.resultHeading}
            id="application-submit-result-heading"
          >
            {result.heading}
          </p>
          <p className={styles.resultBody}>{result.body}</p>
          {state.status === "ineligible" ? (
            <>
              <MissingRequirementsList
                codes={state.missingRequirements}
                labelledBy="application-submit-result-heading"
              />
              <Link className={styles.cta} href={onboardingGroupHref("review")}>
                {t("candidate.jobs.reviewPreferences")}
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      {isPreviewing ? (
        <form action={formAction} className={styles.submitForm}>
          <input type="hidden" name="vacancyId" value={vacancyId} />
          <input type="hidden" name="introductionText" value={introduction} />
          <dl className={styles.applicationContext}>
            <div>
              <dt>{t("application.introduction.recipient")}</dt>
              <dd>{employerDisplayName}</dd>
            </div>
            <div>
              <dt>{t("application.introduction.job")}</dt>
              <dd>{vacancyTitle}</dd>
            </div>
          </dl>
          <div className={styles.introductionPreview}>
            {introduction.length === 0 ? (
              <p className={styles.disclosure}>
                {t("application.introduction.empty")}
              </p>
            ) : (
              <p className={styles.authoredText}>{introduction}</p>
            )}
          </div>
          <p className={styles.disclosure} id="application-submit-disclosure">
            {t("candidate.jobs.submitDisclosure")}
          </p>
          <div className={styles.formActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => setIsPreviewing(false)}
            >
              {t("application.introduction.edit")}
            </button>
            <SubmitButton />
          </div>
        </form>
      ) : (
        <div className={styles.submitForm}>
          <p className={styles.suggestionLabel}>
            {t("application.introduction.suggested")}
          </p>
          <label
            className={styles.fieldLabel}
            htmlFor="application-introduction"
          >
            {t("application.introduction.label")}
          </label>
          <Textarea
            className={styles.introductionTextarea}
            id="application-introduction"
            maxLength={APPLICATION_INTRODUCTION_MAX_LENGTH}
            onChange={(event) => setIntroduction(event.target.value)}
            value={introduction}
            aria-describedby="application-introduction-hint application-introduction-count"
          />
          <div className={styles.fieldSupport}>
            <p id="application-introduction-hint">
              {t("application.introduction.hint")}
            </p>
            <p id="application-introduction-count" aria-live="polite">
              {remaining} {t("application.introduction.characters")}
            </p>
          </div>
          <button
            className={styles.submitButton}
            type="button"
            onClick={showPreview}
          >
            {t("application.introduction.preview")}
          </button>
        </div>
      )}
    </section>
  );
}

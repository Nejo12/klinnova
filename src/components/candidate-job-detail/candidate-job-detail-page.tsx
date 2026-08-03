import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { ApplicationPreviewSection } from "@/components/candidate-job-detail/application-preview-section";
import { ApplicationSubmitForm } from "@/components/candidate-job-detail/application-submit-form";
import { JobDetailUnavailable } from "@/components/candidate-job-detail/job-detail-unavailable";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import type { ApplicationPreview } from "@/lib/applications/application-preview";
import {
  APPLIED_STATUS_LABEL,
  formatSubmittedAtUtc,
} from "@/lib/applications/application-confirmation";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { CandidateVacancyDetail } from "@/lib/matching/candidate-vacancy-detail";

import styles from "./candidate-job-detail.module.scss";

type CandidateJobDetailPageProps =
  | {
      status: "ready";
      detail: CandidateVacancyDetail;
      preview: ApplicationPreview;
      application: OwnedApplicationSummary | null;
    }
  | { status: "unavailable"; reason: "unavailable" | "not_matching" }
  | { status: "failure" };

export function CandidateJobDetailPage(props: CandidateJobDetailPageProps) {
  if (props.status !== "ready") {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <Link className={styles.brand} href="/candidate">
            Stint
          </Link>
          <LogoutButton />
        </div>
        <JobDetailUnavailable
          reason={props.status === "failure" ? "failure" : props.reason}
        />
      </main>
    );
  }

  const { detail, preview, application } = props;
  const reasonsHeadingId = `job-reasons-${detail.vacancyId}`;
  const languagesHeadingId = `job-languages-${detail.vacancyId}`;
  const submittedAtLabel =
    application === null ? null : formatSubmittedAtUtc(application.submittedAt);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/candidate">
          Stint
        </Link>
        <LogoutButton />
      </div>

      <Link className={styles.backLink} href="/candidate/matches">
        Back to matches
      </Link>

      <div className={styles.titleRow}>
        <h1 className={styles.heading}>{detail.title}</h1>
        <div className={styles.badgeGroup}>
          <p className={styles.demoLabel}>{detail.demoLabel}</p>
          {application !== null ? (
            <p className={styles.appliedLabel}>{APPLIED_STATUS_LABEL}</p>
          ) : null}
        </div>
      </div>

      <p className={styles.company}>{detail.employerDisplayName}</p>

      <WorkAuthorisationNotice />

      <section className={styles.section} aria-labelledby="job-details-heading">
        <h2 className={styles.sectionHeading} id="job-details-heading">
          Job details
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Location</dt>
            <dd className={styles.metaValue}>{detail.city}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Category</dt>
            <dd className={styles.metaValue}>{detail.jobCategoryLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Employment</dt>
            <dd className={styles.metaValue}>{detail.employmentTypesLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Shifts</dt>
            <dd className={styles.metaValue}>
              {detail.shiftRequirementsLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>German</dt>
            <dd className={styles.metaValue}>
              {detail.germanRequirementLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Available</dt>
            <dd className={styles.metaValue}>{detail.availableFromLabel}</dd>
          </div>
          {detail.listedOnLabel !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Listed</dt>
              <dd className={styles.metaValue}>{detail.listedOnLabel}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {detail.languageRequirements.length > 0 ? (
        <section
          className={styles.section}
          aria-labelledby={languagesHeadingId}
        >
          <h2 className={styles.sectionHeading} id={languagesHeadingId}>
            Additional languages
          </h2>
          <ul className={styles.languageList}>
            {detail.languageRequirements.map((requirement) => (
              <li
                key={requirement.languageCode}
                className={styles.languageItem}
              >
                {requirement.languageLabel} — {requirement.minProficiencyLabel}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.matchReasons.length > 0 ? (
        <section className={styles.section} aria-labelledby={reasonsHeadingId}>
          <h2 className={styles.sectionHeading} id={reasonsHeadingId}>
            Why this matches
          </h2>
          <ul className={styles.reasons} aria-labelledby={reasonsHeadingId}>
            {detail.matchReasons.map((reason) => (
              <li key={reason.key} className={styles.reason}>
                {reason.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {application !== null ? (
        <section
          className={styles.section}
          aria-labelledby="application-applied-heading"
        >
          <h2
            className={styles.sectionHeading}
            id="application-applied-heading"
          >
            Application
          </h2>
          <p className={styles.appliedStatus}>
            {APPLIED_STATUS_LABEL}
            {submittedAtLabel !== null ? (
              <>
                {" · "}
                <time dateTime={application.submittedAt}>
                  {submittedAtLabel}
                </time>
              </>
            ) : null}
          </p>
          <Link
            className={styles.cta}
            href={`/candidate/applications/${application.applicationId}`}
            aria-label={`View application: ${detail.title}`}
          >
            View application
          </Link>
        </section>
      ) : (
        <>
          <ApplicationPreviewSection preview={preview} />
          <ApplicationSubmitForm vacancyId={detail.vacancyId} />
        </>
      )}
    </main>
  );
}

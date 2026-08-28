import Link from "next/link";

import {
  APPLICATION_CONFIRMATION_BODY,
  APPLICATION_CONFIRMATION_HEADING,
  APPLICATION_CONFIRMATION_MARKER,
  type ApplicationConfirmation,
} from "@/lib/applications/application-confirmation";
import type { CandidateApplicationHistoryEntry } from "@/lib/applications/load-candidate-application-history";
import type { CandidateApplicationOutcomeEntry } from "@/lib/applications/load-candidate-application-outcomes";
import { ApplicationOutcomeTimeline } from "@/components/candidate-application-confirmation/application-outcome-timeline";
import { ApplicationStatusTimeline } from "@/components/candidate-application-confirmation/application-status-timeline";
import { CandidateApplicationsPageHeader } from "@/components/candidate-applications/candidate-applications-page-header";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";

import styles from "./application-confirmation.module.scss";

type ApplicationConfirmationPageProps = { showEmployerNav: boolean } & (
  | {
      status: "ready";
      confirmation: ApplicationConfirmation;
      history: CandidateApplicationHistoryEntry[];
      outcomes: CandidateApplicationOutcomeEntry[];
    }
  | { status: "unavailable" }
  | { status: "failure" }
);

export function ApplicationConfirmationPage(
  props: ApplicationConfirmationPageProps,
) {
  if (props.status !== "ready") {
    return (
      <main className={styles.page}>
        <CandidateApplicationsPageHeader
          showEmployerNav={props.showEmployerNav}
        />
        <section
          className={styles.unavailable}
          aria-labelledby="unavailable-heading"
        >
          <h1 className={styles.unavailableHeading} id="unavailable-heading">
            Application not available
          </h1>
          <p className={styles.unavailableBody}>
            This application could not be shown. It may not exist or you may not
            have access.
          </p>
          <Link className={styles.cta} href="/candidate/matches">
            Back to matches
          </Link>
        </section>
      </main>
    );
  }

  const { confirmation, history, outcomes } = props;
  const vacancyLanguagesHeadingId = "confirmation-vacancy-languages";
  const candidateLanguagesHeadingId = "confirmation-candidate-languages";

  return (
    <main className={styles.page}>
      <CandidateApplicationsPageHeader
        showEmployerNav={props.showEmployerNav}
      />

      <section className={styles.hero} aria-labelledby="confirmation-heading">
        <p className={styles.eyebrow}>{APPLICATION_CONFIRMATION_MARKER}</p>
        <div className={styles.titleRow}>
          <h1 className={styles.heading} id="confirmation-heading">
            {APPLICATION_CONFIRMATION_HEADING}
          </h1>
          {confirmation.demoLabel !== null ? (
            <p className={styles.demoLabel}>{confirmation.demoLabel}</p>
          ) : null}
        </div>
        <p className={styles.lead}>
          Your application for {confirmation.vacancyTitle} is now with{" "}
          {confirmation.employerDisplayName}.
        </p>
      </section>

      <section className={styles.statusPanel} aria-labelledby="status-heading">
        <h2 className={styles.statusHeading} id="status-heading">
          Current status
        </h2>
        <p className={styles.statusValue}>{confirmation.statusLabel}</p>
        <p className={styles.support}>{APPLICATION_CONFIRMATION_BODY}</p>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Status</dt>
            <dd className={styles.metaValue}>{confirmation.statusLabel}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Submitted</dt>
            <dd className={styles.metaValue}>
              <time dateTime={confirmation.submittedAtIso}>
                {confirmation.submittedAtLabel}
              </time>
            </dd>
          </div>
        </dl>
      </section>

      {confirmation.status === "accepted" ? (
        <section
          className={styles.acceptedBanner}
          aria-labelledby="accepted-banner-heading"
        >
          <h2
            className={styles.acceptedBannerHeading}
            id="accepted-banner-heading"
          >
            Application accepted
          </h2>
          <p className={styles.acceptedBannerBody}>
            This application has been accepted. Accepted is a status on this
            application only — it is separate from being hired, employment
            starting, or a contract being signed.
          </p>
        </section>
      ) : null}

      <section
        className={styles.section}
        aria-labelledby="confirmation-vacancy-heading"
      >
        <h2 className={styles.sectionHeading} id="confirmation-vacancy-heading">
          Job details
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Job</dt>
            <dd className={styles.metaValue}>{confirmation.vacancyTitle}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Employer</dt>
            <dd className={styles.metaValue}>
              {confirmation.employerDisplayName}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Location</dt>
            <dd className={styles.metaValue}>{confirmation.city}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Category</dt>
            <dd className={styles.metaValue}>
              {confirmation.vacancyJobCategoryLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Employment</dt>
            <dd className={styles.metaValue}>
              {confirmation.vacancyEmploymentTypesLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Shifts</dt>
            <dd className={styles.metaValue}>
              {confirmation.vacancyShiftRequirementsLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>German</dt>
            <dd className={styles.metaValue}>
              {confirmation.vacancyGermanRequirementLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Available</dt>
            <dd className={styles.metaValue}>
              {confirmation.vacancyAvailableFromLabel}
            </dd>
          </div>
        </dl>

        <h3 className={styles.subHeading} id={vacancyLanguagesHeadingId}>
          Additional languages
        </h3>
        {confirmation.vacancyNoAdditionalLanguagesLabel !== null ? (
          <p className={styles.support}>
            {confirmation.vacancyNoAdditionalLanguagesLabel}
          </p>
        ) : (
          <ul
            className={styles.languageList}
            aria-labelledby={vacancyLanguagesHeadingId}
          >
            {confirmation.vacancyLanguageRequirements.map((requirement) => (
              <li
                key={requirement.languageCode}
                className={styles.languageItem}
              >
                {requirement.languageLabel} — {requirement.minProficiencyLabel}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={styles.section}
        aria-labelledby="confirmation-candidate-heading"
      >
        <h2
          className={styles.sectionHeading}
          id="confirmation-candidate-heading"
        >
          Your submitted profile
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Your name</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateDisplayName}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Matched category</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateMatchedCategoryLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>German comfort</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateGermanComfortLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Work authorisation</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateWorkAuthorisationLabel}
            </dd>
          </div>
          {confirmation.candidateAvailableFromLabel !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Available from</dt>
              <dd className={styles.metaValue}>
                {confirmation.candidateAvailableFromLabel}
              </dd>
            </div>
          ) : null}
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Employment preferences</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateEmploymentPreferencesLabel}
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Shift preferences</dt>
            <dd className={styles.metaValue}>
              {confirmation.candidateShiftPreferencesLabel}
            </dd>
          </div>
        </dl>

        <h3 className={styles.subHeading} id={candidateLanguagesHeadingId}>
          Additional languages
        </h3>
        {confirmation.candidateNoAdditionalLanguagesLabel !== null ? (
          <p className={styles.support}>
            {confirmation.candidateNoAdditionalLanguagesLabel}
          </p>
        ) : (
          <ul
            className={styles.languageList}
            aria-labelledby={candidateLanguagesHeadingId}
          >
            {confirmation.candidateLanguages.map((language) => (
              <li key={language.languageCode} className={styles.languageItem}>
                {language.languageLabel} — {language.proficiencyLabel}
              </li>
            ))}
          </ul>
        )}

        <p className={styles.notice}>{WORK_AUTHORISATION_NOTICE}</p>
      </section>

      <ApplicationStatusTimeline history={history} />

      {outcomes.length > 0 ? (
        <ApplicationOutcomeTimeline outcomes={outcomes} />
      ) : null}

      <nav className={styles.nav} aria-label="Application next steps">
        <Link
          className={styles.cta}
          href={`/candidate/jobs/${confirmation.vacancyId}`}
        >
          View job
        </Link>
        <Link className={styles.secondaryLink} href="/candidate/matches">
          Back to matches
        </Link>
      </nav>
    </main>
  );
}

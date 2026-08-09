import Link from "next/link";

import { ApplicationSubmitForm } from "@/components/candidate-job-detail/application-submit-form";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { JobDetailUnavailable } from "@/components/candidate-job-detail/job-detail-unavailable";
import { MissingRequirementsList } from "@/components/candidate-job-detail/missing-requirements-list";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import {
  APPLIED_STATUS_LABEL,
  formatSubmittedAtUtc,
} from "@/lib/applications/application-confirmation";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { MissingRequirementCode } from "@/lib/matching/missing-requirement-codes";
import type {
  PublicVacancy,
  PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";
import { splitDescriptionParagraphs } from "@/lib/public-jobs/description";
import { safeExternalHref } from "@/lib/public-jobs/external-link";
import {
  formatListingDate,
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";
import { DEMO_VACANCY_LABEL } from "@/lib/public-jobs/messages";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import styles from "./candidate-job-detail.module.scss";

type CandidateJobDetailPageProps =
  | {
      status: "ready";
      eligible: boolean;
      missingRequirements: MissingRequirementCode[];
      vacancy: PublicVacancy;
      languages: PublicVacancyLanguage[];
      application: OwnedApplicationSummary | null;
      showEmployerNav?: boolean;
    }
  | { status: "unavailable"; showEmployerNav?: boolean }
  | { status: "failure"; showEmployerNav?: boolean };

export function CandidateJobDetailPage(props: CandidateJobDetailPageProps) {
  const showEmployerNav = props.showEmployerNav === true;

  if (props.status !== "ready") {
    return (
      <main className={styles.page}>
        <CandidateAppHeader showEmployerNav={showEmployerNav} />
        <JobDetailUnavailable />
      </main>
    );
  }

  const { eligible, missingRequirements, vacancy, languages, application } =
    props;
  const languagesHeadingId = `job-languages-${vacancy.vacancyId}`;
  const missingHeadingId = `job-missing-requirements-${vacancy.vacancyId}`;
  const submittedAtLabel =
    application === null ? null : formatSubmittedAtUtc(application.submittedAt);
  const externalHref = safeExternalHref(vacancy.website);
  const paragraphs =
    vacancy.description !== null
      ? splitDescriptionParagraphs(vacancy.description)
      : [];
  const closingDate = formatListingDate(vacancy.expiresAt);

  return (
    <main className={styles.page}>
      <CandidateAppHeader showEmployerNav={showEmployerNav} />

      <Link className={styles.backLink} href="/candidate/matches">
        Back to matches
      </Link>

      <div className={styles.titleRow}>
        <h1 className={styles.heading}>{vacancy.title}</h1>
        <div className={styles.badgeGroup}>
          {vacancy.source === "seed" ? (
            <p className={styles.demoLabel}>{DEMO_VACANCY_LABEL}</p>
          ) : null}
          {application !== null ? (
            <p className={styles.appliedLabel}>{APPLIED_STATUS_LABEL}</p>
          ) : null}
        </div>
      </div>

      <p className={styles.company}>
        {vacancy.employerDisplayName ?? "Berlin employer"}
        {vacancy.companyName !== null ? ` · ${vacancy.companyName}` : ""}
      </p>

      <WorkAuthorisationNotice />

      <section className={styles.section} aria-labelledby="job-details-heading">
        <h2 className={styles.sectionHeading} id="job-details-heading">
          Job details
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Category</dt>
            <dd className={styles.metaValue}>
              {jobCategoryLabel(vacancy.jobCategory)}
            </dd>
          </div>
          {vacancy.publicLocality !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Location</dt>
              <dd className={styles.metaValue}>
                {vacancy.publicLocality}, Berlin
              </dd>
            </div>
          ) : null}
          {vacancy.workplaceType !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Workplace</dt>
              <dd className={styles.metaValue}>
                {workplaceTypeLabel(vacancy.workplaceType)}
              </dd>
            </div>
          ) : null}
          {vacancy.workFrequency !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Frequency</dt>
              <dd className={styles.metaValue}>
                {workFrequencyLabel(vacancy.workFrequency)}
              </dd>
            </div>
          ) : null}
          {vacancy.cvRequired !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>CV</dt>
              <dd className={styles.metaValue}>
                {vacancy.cvRequired ? "CV required" : "CV not required"}
              </dd>
            </div>
          ) : null}
          {vacancy.interviewEnglishOk !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Interview</dt>
              <dd className={styles.metaValue}>
                {vacancy.interviewEnglishOk
                  ? "Interview can be in English"
                  : "Interview in German"}
              </dd>
            </div>
          ) : null}
          {closingDate !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>Closes</dt>
              <dd className={styles.metaValue}>{closingDate}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {languages.length > 0 ? (
        <section
          className={styles.section}
          aria-labelledby={languagesHeadingId}
        >
          <h2 className={styles.sectionHeading} id={languagesHeadingId}>
            Additional languages
          </h2>
          <ul className={styles.languageList}>
            {languages.map((language) => (
              <li key={language.languageCode} className={styles.languageItem}>
                {languageLabel(language.languageCode)} —{" "}
                {languageProficiencyLabel(language.minProficiency)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {paragraphs.length > 0 ? (
        <section
          className={styles.section}
          aria-labelledby="job-description-heading"
        >
          <h2 className={styles.sectionHeading} id="job-description-heading">
            About this job
          </h2>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className={styles.metaValue}>
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}

      {externalHref !== null ? (
        <p>
          <a
            className={styles.backLink}
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Employer website
          </a>
        </p>
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
            aria-label={`View application: ${vacancy.title}`}
          >
            View application
          </Link>
        </section>
      ) : eligible ? (
        <ApplicationSubmitForm vacancyId={vacancy.vacancyId} />
      ) : (
        <section className={styles.section} aria-labelledby={missingHeadingId}>
          <h2 className={styles.sectionHeading} id={missingHeadingId}>
            You don&rsquo;t currently meet these requirements
          </h2>
          <MissingRequirementsList
            codes={missingRequirements}
            labelledBy={missingHeadingId}
          />
          <Link className={styles.cta} href={onboardingGroupHref("review")}>
            Review your saved preferences
          </Link>
        </section>
      )}
    </main>
  );
}

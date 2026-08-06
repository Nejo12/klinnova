import Link from "next/link";

import { ApplicationEntryNotice } from "@/components/public-jobs/application-entry-notice";
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
import {
  DEMO_VACANCY_LABEL,
  PUBLIC_JOBS_LOAD_FAILURE_BODY,
  PUBLIC_JOBS_LOAD_FAILURE_HEADING,
} from "@/lib/public-jobs/messages";

import styles from "./public-job-detail.module.scss";

type PublicJobDetailPageProps =
  | {
      status: "ready";
      vacancy: PublicVacancy;
      languages: PublicVacancyLanguage[];
      authenticated: boolean;
    }
  | { status: "failure" };

export function PublicJobDetailPage(props: PublicJobDetailPageProps) {
  if (props.status !== "ready") {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <Link className={styles.brand} href="/">
            Stint
          </Link>
        </div>
        <section aria-labelledby="public-job-detail-error-heading">
          <h1 id="public-job-detail-error-heading">
            {PUBLIC_JOBS_LOAD_FAILURE_HEADING}
          </h1>
          <p>{PUBLIC_JOBS_LOAD_FAILURE_BODY}</p>
        </section>
      </main>
    );
  }

  const { vacancy, languages, authenticated } = props;
  const externalHref = safeExternalHref(vacancy.website);
  const paragraphs =
    vacancy.description !== null
      ? splitDescriptionParagraphs(vacancy.description)
      : [];
  const closingDate = formatListingDate(vacancy.expiresAt);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Stint
        </Link>
      </div>

      <Link className={styles.backLink} href="/jobs">
        Back to jobs
      </Link>

      <div className={styles.titleRow}>
        <h1 className={styles.heading}>{vacancy.title}</h1>
        {vacancy.source === "seed" ? (
          <p className={styles.demoLabel}>{DEMO_VACANCY_LABEL}</p>
        ) : null}
      </div>

      <p className={styles.company}>
        {vacancy.employerDisplayName ?? "Berlin employer"}
        {vacancy.companyName !== null ? ` · ${vacancy.companyName}` : ""}
      </p>

      <section
        className={styles.section}
        aria-labelledby="public-job-details-heading"
      >
        <h2 className={styles.sectionHeading} id="public-job-details-heading">
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
          aria-labelledby="public-job-languages-heading"
        >
          <h2
            className={styles.sectionHeading}
            id="public-job-languages-heading"
          >
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
          aria-labelledby="public-job-description-heading"
        >
          <h2
            className={styles.sectionHeading}
            id="public-job-description-heading"
          >
            About this job
          </h2>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className={styles.descriptionParagraph}>
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}

      {externalHref !== null ? (
        <p>
          <a
            className={styles.externalLink}
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Employer website
            <span className={styles.srOnly}> (opens in a new tab)</span>
          </a>
        </p>
      ) : null}

      <ApplicationEntryNotice
        vacancyId={vacancy.vacancyId}
        authenticated={authenticated}
      />
    </main>
  );
}

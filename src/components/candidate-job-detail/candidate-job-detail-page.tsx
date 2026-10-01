"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { ApplicationSubmitForm } from "@/components/candidate-job-detail/application-submit-form";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { JobDetailUnavailable } from "@/components/candidate-job-detail/job-detail-unavailable";
import { MissingRequirementsList } from "@/components/candidate-job-detail/missing-requirements-list";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import { formatSubmittedAtUtc } from "@/lib/applications/application-confirmation";
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
  workplaceTypeLabel,
  workFrequencyLabel,
} from "@/lib/public-jobs/labels";
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
      displayName?: string | null;
    }
  | {
      status: "unavailable";
      showEmployerNav?: boolean;
      displayName?: string | null;
    }
  | {
      status: "failure";
      showEmployerNav?: boolean;
      displayName?: string | null;
    };

function employerLine(vacancy: PublicVacancy, defaultEmployer: string): string {
  const employerName = vacancy.employerDisplayName ?? defaultEmployer;
  const locality =
    vacancy.publicLocality === null
      ? "Berlin"
      : `${vacancy.publicLocality}, Berlin`;
  return vacancy.companyName === null
    ? `${employerName} · ${locality}`
    : `${employerName} · ${vacancy.companyName} · ${locality}`;
}

export function CandidateJobDetailPage(props: CandidateJobDetailPageProps) {
  const { locale, t } = useLocale();
  const showEmployerNav = props.showEmployerNav === true;

  if (props.status !== "ready") {
    return (
      <main className={styles.page}>
        <CandidateAppHeader
          showEmployerNav={showEmployerNav}
          displayName={props.displayName}
        />
        <JobDetailUnavailable />
      </main>
    );
  }

  const { eligible, missingRequirements, vacancy, languages, application } =
    props;
  const languagesHeadingId = `job-languages-${vacancy.vacancyId}`;
  const missingHeadingId = `job-missing-requirements-${vacancy.vacancyId}`;
  const submittedAtLabel =
    application === null
      ? null
      : formatSubmittedAtUtc(application.submittedAt, locale);
  const externalHref = safeExternalHref(vacancy.website);
  const paragraphs =
    vacancy.description !== null
      ? splitDescriptionParagraphs(vacancy.description)
      : [];
  const closingDate = formatListingDate(vacancy.expiresAt, locale);

  return (
    <main className={styles.page}>
      <CandidateAppHeader
        showEmployerNav={showEmployerNav}
        displayName={props.displayName}
      />

      <Link className={styles.backLink} href="/candidate/matches">
        {t("candidate.jobs.back")}
      </Link>

      <section className={styles.hero} aria-labelledby="job-detail-heading">
        <div className={styles.titleRow}>
          <h1 className={styles.heading} id="job-detail-heading">
            {vacancy.title}
          </h1>
          <div className={styles.badgeGroup}>
            {vacancy.source === "seed" ? (
              <p className={styles.demoLabel}>{t("publicJobs.demo")}</p>
            ) : null}
            {vacancy.source === "employer" ? (
              <p className={styles.verifiedBadge}>
                {t("candidate.matches.verifiedEmployer")}
              </p>
            ) : null}
            {application !== null ? (
              <p className={styles.appliedLabel}>
                {t("candidate.matches.applied")}
              </p>
            ) : null}
          </div>
        </div>
        <p className={styles.company}>
          {employerLine(vacancy, t("publicJobs.defaultEmployer"))}
        </p>
      </section>

      <WorkAuthorisationNotice />

      <section className={styles.section} aria-labelledby="job-details-heading">
        <h2 className={styles.sectionHeading} id="job-details-heading">
          {t("candidate.jobs.details")}
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>{t("publicJobs.category")}</dt>
            <dd className={styles.metaValue}>
              {jobCategoryLabel(vacancy.jobCategory, locale)}
            </dd>
          </div>
          {vacancy.workplaceType !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>{t("publicJobs.workplace")}</dt>
              <dd className={styles.metaValue}>
                {workplaceTypeLabel(vacancy.workplaceType, locale)}
              </dd>
            </div>
          ) : null}
          {vacancy.workFrequency !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>{t("publicJobs.frequency")}</dt>
              <dd className={styles.metaValue}>
                {workFrequencyLabel(vacancy.workFrequency, locale)}
              </dd>
            </div>
          ) : null}
          {vacancy.cvRequired !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>{t("publicJobs.cv")}</dt>
              <dd className={styles.metaValue}>
                {t(
                  vacancy.cvRequired
                    ? "publicJobs.cvRequired"
                    : "publicJobs.cvNotRequired",
                )}
              </dd>
            </div>
          ) : null}
          {vacancy.interviewEnglishOk !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>{t("publicJobs.interview")}</dt>
              <dd className={styles.metaValue}>
                {t(
                  vacancy.interviewEnglishOk
                    ? "publicJobs.interviewEnglish"
                    : "publicJobs.interviewGerman",
                )}
              </dd>
            </div>
          ) : null}
          {closingDate !== null ? (
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>{t("publicJobs.closes")}</dt>
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
            {t("candidate.jobs.additionalLanguages")}
          </h2>
          <ul className={styles.languageList}>
            {languages.map((language) => (
              <li key={language.languageCode} className={styles.languageItem}>
                {languageLabel(language.languageCode, locale)} —{" "}
                {languageProficiencyLabel(language.minProficiency, locale)}
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
            {t("candidate.jobs.about")}
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
            {t("candidate.jobs.employerWebsite")}
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
            {t("candidate.jobs.application")}
          </h2>
          <p className={styles.appliedStatus}>
            {t("candidate.matches.applied")}
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
            aria-label={`${t("candidate.matches.viewApplication")}: ${vacancy.title}`}
          >
            {t("candidate.matches.viewApplication")}
          </Link>
        </section>
      ) : eligible ? (
        <ApplicationSubmitForm
          employerDisplayName={
            vacancy.employerDisplayName ??
            vacancy.companyName ??
            t("publicJobs.defaultEmployer")
          }
          vacancyId={vacancy.vacancyId}
          vacancyTitle={vacancy.title}
        />
      ) : (
        <section className={styles.section} aria-labelledby={missingHeadingId}>
          <h2 className={styles.sectionHeading} id={missingHeadingId}>
            {t("candidate.jobs.missingHeading")}
          </h2>
          <MissingRequirementsList
            codes={missingRequirements}
            labelledBy={missingHeadingId}
          />
          <Link className={styles.cta} href={onboardingGroupHref("review")}>
            {t("candidate.jobs.reviewPreferences")}
          </Link>
        </section>
      )}
    </main>
  );
}

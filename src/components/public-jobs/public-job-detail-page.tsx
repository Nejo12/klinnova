"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { ApplicationEntryNotice } from "@/components/public-jobs/application-entry-notice";
import { PublicFooter } from "@/components/public-shared/public-footer";
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
  const { locale, t } = useLocale();

  if (props.status !== "ready") {
    return (
      <>
        <main className={styles.page}>
          <div className={styles.header}>
            <Link className={styles.brand} href="/">
              Klinnova
            </Link>
          </div>
          <section aria-labelledby="public-job-detail-error-heading">
            <h1 id="public-job-detail-error-heading">
              {t("publicJobs.failureHeading")}
            </h1>
            <p>{t("publicJobs.failureBody")}</p>
          </section>
        </main>
        <footer className={styles.footer}>
          <PublicFooter />
        </footer>
      </>
    );
  }

  const { vacancy, languages, authenticated } = props;
  const externalHref = safeExternalHref(vacancy.website);
  const paragraphs =
    vacancy.description !== null
      ? splitDescriptionParagraphs(vacancy.description)
      : [];
  const closingDate = formatListingDate(vacancy.expiresAt, locale);

  return (
    <>
      <main className={styles.page}>
        <div className={styles.header}>
          <Link className={styles.brand} href="/">
            Klinnova
          </Link>
        </div>

        <Link className={styles.backLink} href="/jobs">
          {t("publicJobs.back")}
        </Link>

        <div className={styles.titleRow}>
          <h1 className={styles.heading}>{vacancy.title}</h1>
          {vacancy.source === "seed" ? (
            <p className={styles.demoLabel}>{t("publicJobs.demo")}</p>
          ) : null}
        </div>

        <p className={styles.company}>
          {vacancy.employerDisplayName ?? t("publicJobs.defaultEmployer")}
          {vacancy.companyName !== null ? ` · ${vacancy.companyName}` : ""}
        </p>

        <section
          className={styles.section}
          aria-labelledby="public-job-details-heading"
        >
          <h2 className={styles.sectionHeading} id="public-job-details-heading">
            {t("publicJobs.details")}
          </h2>
          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt className={styles.metaLabel}>{t("publicJobs.category")}</dt>
              <dd className={styles.metaValue}>
                {jobCategoryLabel(vacancy.jobCategory, locale)}
              </dd>
            </div>
            {vacancy.publicLocality !== null ? (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>{t("publicJobs.location")}</dt>
                <dd className={styles.metaValue}>
                  {vacancy.publicLocality}, Berlin
                </dd>
              </div>
            ) : null}
            {vacancy.workplaceType !== null ? (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>
                  {t("publicJobs.workplace")}
                </dt>
                <dd className={styles.metaValue}>
                  {workplaceTypeLabel(vacancy.workplaceType, locale)}
                </dd>
              </div>
            ) : null}
            {vacancy.workFrequency !== null ? (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>
                  {t("publicJobs.frequency")}
                </dt>
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
                <dt className={styles.metaLabel}>
                  {t("publicJobs.interview")}
                </dt>
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
            aria-labelledby="public-job-languages-heading"
          >
            <h2
              className={styles.sectionHeading}
              id="public-job-languages-heading"
            >
              {t("publicJobs.additionalLanguages")}
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
            aria-labelledby="public-job-description-heading"
          >
            <h2
              className={styles.sectionHeading}
              id="public-job-description-heading"
            >
              {t("publicJobs.about")}
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
              {t("publicJobs.employerWebsite")}
              <span className={styles.srOnly}>
                {` (${t("publicJobs.newTab")})`}
              </span>
            </a>
          </p>
        ) : null}

        <ApplicationEntryNotice
          vacancyId={vacancy.vacancyId}
          authenticated={authenticated}
        />
      </main>
      <footer className={styles.footer}>
        <PublicFooter />
      </footer>
    </>
  );
}

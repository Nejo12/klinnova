import Link from "next/link";

import {
  jobCategoryLabel,
  languageLabel,
  languageProficiencyLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";
import type { PublicVacancyListItem } from "@/lib/public-jobs/load-public-vacancies";
import { DEMO_VACANCY_LABEL } from "@/lib/public-jobs/messages";

import styles from "./public-jobs.module.scss";

type PublicJobCardProps = {
  item: PublicVacancyListItem;
  /**
   * Heading level for the job title. Defaults to "h2" to preserve the
   * exact rendering on /jobs, where each card sits directly under that
   * page's own <h1>. The homepage reuses this card lower in its own
   * heading hierarchy, so it passes "h3" to avoid implying every job
   * title is a top-level page section.
   */
  headingLevel?: "h2" | "h3";
};

export function PublicJobCard({
  item,
  headingLevel = "h2",
}: PublicJobCardProps) {
  const { vacancy, languages } = item;
  const titleId = `public-job-title-${vacancy.vacancyId}`;
  const detailHref = `/jobs/${vacancy.vacancyId}`;
  const TitleTag = headingLevel;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <TitleTag className={styles.cardTitle} id={titleId}>
          {vacancy.title}
        </TitleTag>
        {vacancy.source === "seed" ? (
          <p className={styles.demoLabel}>{DEMO_VACANCY_LABEL}</p>
        ) : null}
      </div>

      <p className={styles.company}>
        {vacancy.employerDisplayName ?? "Berlin employer"}
        {vacancy.companyName !== null ? ` · ${vacancy.companyName}` : ""}
      </p>

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
      </dl>

      {languages.length > 0 ? (
        <ul className={styles.languageList}>
          {languages.map((language) => (
            <li key={language.languageCode} className={styles.languageItem}>
              {languageLabel(language.languageCode)} —{" "}
              {languageProficiencyLabel(language.minProficiency)}
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        className={styles.detailLink}
        href={detailHref}
        aria-label={`View job: ${vacancy.title}`}
      >
        View job
      </Link>
    </article>
  );
}

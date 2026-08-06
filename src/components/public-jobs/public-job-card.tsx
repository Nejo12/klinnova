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
};

export function PublicJobCard({ item }: PublicJobCardProps) {
  const { vacancy, languages } = item;
  const titleId = `public-job-title-${vacancy.vacancyId}`;
  const detailHref = `/jobs/${vacancy.vacancyId}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={titleId}>
          {vacancy.title}
        </h2>
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

import Link from "next/link";

import { APPLIED_STATUS_LABEL } from "@/lib/applications/application-confirmation";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { PublicVacancy } from "@/lib/public-jobs/domain";
import {
  jobCategoryLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";
import { DEMO_VACANCY_LABEL } from "@/lib/public-jobs/messages";

import styles from "./candidate-matches.module.scss";

type MatchCardProps = {
  vacancy: PublicVacancy;
  application: OwnedApplicationSummary | null;
};

export function MatchCard({ vacancy, application }: MatchCardProps) {
  const titleId = `match-title-${vacancy.vacancyId}`;
  const detailHref = `/candidate/jobs/${vacancy.vacancyId}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={titleId}>
          {vacancy.title}
        </h2>
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
      {vacancy.description !== null && vacancy.description.trim().length > 0 ? (
        <p className={styles.summary}>{vacancy.description}</p>
      ) : null}

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

      <div className={styles.cardActions}>
        <Link
          className={styles.detailLink}
          href={detailHref}
          aria-label={`View job: ${vacancy.title}`}
        >
          View job
        </Link>
        {application !== null ? (
          <Link
            className={styles.applicationLink}
            href={`/candidate/applications/${application.applicationId}`}
            aria-label={`View application: ${vacancy.title}`}
          >
            View application
          </Link>
        ) : null}
      </div>
    </article>
  );
}

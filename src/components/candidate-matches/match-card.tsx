import Link from "next/link";

import { VacancyFactChips } from "@/components/public-jobs/vacancy-fact-chips";
import { APPLIED_STATUS_LABEL } from "@/lib/applications/application-confirmation";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { PublicVacancy } from "@/lib/public-jobs/domain";
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
          {vacancy.source === "employer" ? (
            <p className={styles.verifiedBadge}>Verified employer</p>
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

      <VacancyFactChips vacancy={vacancy} />

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

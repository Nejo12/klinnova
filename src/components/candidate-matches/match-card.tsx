import Link from "next/link";

import { APPLIED_STATUS_LABEL } from "@/lib/applications/application-confirmation";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import {
  jobCategoryLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";
import type { PublicVacancy } from "@/lib/public-jobs/domain";
import { DEMO_VACANCY_LABEL } from "@/lib/public-jobs/messages";

import styles from "./candidate-matches.module.scss";

type MatchCardProps = {
  vacancy: PublicVacancy;
  application: OwnedApplicationSummary | null;
};

type MatchFact = {
  label: string;
  value: string;
};

function uniqueNonEmpty(values: readonly (string | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const trimmed = value?.trim();
    if (trimmed === undefined || trimmed.length === 0 || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    result.push(trimmed);
  });

  return result;
}

function formatEmployerLine(vacancy: PublicVacancy): string {
  const nameParts = uniqueNonEmpty([
    vacancy.companyName,
    vacancy.employerDisplayName,
  ]);
  const employerName =
    nameParts.length > 0 ? nameParts.join(" · ") : "Berlin employer";
  const locality =
    vacancy.publicLocality !== null
      ? `${vacancy.publicLocality}, Berlin`
      : null;

  return [employerName, locality].filter(Boolean).join(" · ");
}

function getMatchFacts(vacancy: PublicVacancy): MatchFact[] {
  const facts: MatchFact[] = [
    {
      label: "Category",
      value: jobCategoryLabel(vacancy.jobCategory),
    },
  ];

  if (vacancy.workplaceType !== null) {
    facts.push({
      label: "Workplace",
      value: workplaceTypeLabel(vacancy.workplaceType),
    });
  }

  if (vacancy.workFrequency !== null) {
    facts.push({
      label: "Frequency",
      value: workFrequencyLabel(vacancy.workFrequency),
    });
  }

  return facts;
}

export function MatchCard({ vacancy, application }: MatchCardProps) {
  const titleId = `match-title-${vacancy.vacancyId}`;
  const detailHref = `/candidate/jobs/${vacancy.vacancyId}`;
  const facts = getMatchFacts(vacancy);
  const applicationHref =
    application !== null
      ? `/candidate/applications/${application.applicationId}`
      : null;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
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

      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={titleId}>
          {vacancy.title}
        </h2>
      </div>

      <p className={styles.company}>{formatEmployerLine(vacancy)}</p>
      {vacancy.description !== null && vacancy.description.trim().length > 0 ? (
        <p className={styles.summary}>{vacancy.description}</p>
      ) : null}

      <dl className={styles.meta}>
        {facts.map((fact) => (
          <div className={styles.metaRow} key={fact.label}>
            <dt className={styles.metaLabel}>{fact.label}</dt>
            <dd className={styles.metaValue}>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.cardActions}>
        {applicationHref !== null ? (
          <Link
            className={styles.applicationLink}
            href={applicationHref}
            aria-label={`View application: ${vacancy.title}`}
          >
            View application
          </Link>
        ) : null}
        <Link
          className={
            applicationHref === null ? styles.detailLink : styles.secondaryLink
          }
          href={detailHref}
          aria-label={`View job: ${vacancy.title}`}
        >
          View job
        </Link>
      </div>
    </article>
  );
}

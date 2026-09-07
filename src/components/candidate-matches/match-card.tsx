"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import {
  jobCategoryLabel,
  workFrequencyLabel,
  workplaceTypeLabel,
} from "@/lib/public-jobs/labels";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

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

function formatEmployerLine(
  vacancy: PublicVacancy,
  defaultEmployer: string,
): string {
  const nameParts = uniqueNonEmpty([
    vacancy.companyName,
    vacancy.employerDisplayName,
  ]);
  const employerName =
    nameParts.length > 0 ? nameParts.join(" · ") : defaultEmployer;
  const locality =
    vacancy.publicLocality !== null
      ? `${vacancy.publicLocality}, Berlin`
      : null;

  return [employerName, locality].filter(Boolean).join(" · ");
}

function getMatchFacts(
  vacancy: PublicVacancy,
  locale: "en" | "de",
  labels: { category: string; workplace: string; frequency: string },
): MatchFact[] {
  const facts: MatchFact[] = [
    {
      label: labels.category,
      value: jobCategoryLabel(vacancy.jobCategory, locale),
    },
  ];

  if (vacancy.workplaceType !== null) {
    facts.push({
      label: labels.workplace,
      value: workplaceTypeLabel(vacancy.workplaceType, locale),
    });
  }

  if (vacancy.workFrequency !== null) {
    facts.push({
      label: labels.frequency,
      value: workFrequencyLabel(vacancy.workFrequency, locale),
    });
  }

  return facts;
}

export function MatchCard({ vacancy, application }: MatchCardProps) {
  const { locale, t } = useLocale();
  const titleId = `match-title-${vacancy.vacancyId}`;
  const detailHref = `/candidate/jobs/${vacancy.vacancyId}`;
  const facts = getMatchFacts(vacancy, locale, {
    category: t("candidate.matches.category"),
    workplace: t("candidate.matches.workplace"),
    frequency: t("candidate.matches.frequency"),
  });
  const applicationHref =
    application !== null
      ? `/candidate/applications/${application.applicationId}`
      : null;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
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

      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={titleId}>
          {vacancy.title}
        </h2>
      </div>

      <p className={styles.company}>
        {formatEmployerLine(vacancy, t("publicJobs.defaultEmployer"))}
      </p>
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
            aria-label={`${t("candidate.matches.viewApplication")}: ${vacancy.title}`}
          >
            {t("candidate.matches.viewApplication")}
          </Link>
        ) : null}
        <Link
          className={
            applicationHref === null ? styles.detailLink : styles.secondaryLink
          }
          href={detailHref}
          aria-label={`${t("candidate.matches.viewJob")}: ${vacancy.title}`}
        >
          {t("candidate.matches.viewJob")}
        </Link>
      </div>
    </article>
  );
}

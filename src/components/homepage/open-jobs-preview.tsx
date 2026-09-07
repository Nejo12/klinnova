"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { PublicJobCard } from "@/components/public-jobs/public-job-card";
import type { LoadPublicVacanciesResult } from "@/lib/public-jobs/load-public-vacancies";

import styles from "./open-jobs-preview.module.scss";

const PREVIEW_COUNT = 3;

type OpenJobsPreviewProps = {
  result: LoadPublicVacanciesResult;
};

export function OpenJobsPreview({ result }: OpenJobsPreviewProps) {
  const { t } = useLocale();
  const items = result.ok ? result.vacancies.slice(0, PREVIEW_COUNT) : [];

  return (
    <section className={styles.section} aria-labelledby="open-jobs-heading">
      <div className={styles.header}>
        <h2 className={styles.heading} id="open-jobs-heading">
          {t("homepage.jobs.heading")}
        </h2>
        <Link className={styles.seeAllLink} href="/jobs">
          {t("homepage.jobs.seeAll")}
        </Link>
      </div>

      {result.ok && items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.vacancy.vacancyId}>
              <PublicJobCard item={item} headingLevel="h3" />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.fallback}>
          {t(result.ok ? "homepage.jobs.empty" : "homepage.jobs.failure")}
        </p>
      )}
    </section>
  );
}

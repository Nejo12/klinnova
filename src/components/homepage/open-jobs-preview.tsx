import Link from "next/link";

import { PublicJobCard } from "@/components/public-jobs/public-job-card";
import type { LoadPublicVacanciesResult } from "@/lib/public-jobs/load-public-vacancies";

import styles from "./open-jobs-preview.module.scss";

const PREVIEW_COUNT = 3;

type OpenJobsPreviewProps = {
  result: LoadPublicVacanciesResult;
};

export function OpenJobsPreview({ result }: OpenJobsPreviewProps) {
  const items = result.ok ? result.vacancies.slice(0, PREVIEW_COUNT) : [];

  return (
    <section className={styles.section} aria-labelledby="open-jobs-heading">
      <div className={styles.header}>
        <h2 className={styles.heading} id="open-jobs-heading">
          Open in Berlin right now
        </h2>
        <Link className={styles.seeAllLink} href="/jobs">
          See all jobs
        </Link>
      </div>

      {result.ok && items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.vacancy.vacancyId}>
              <PublicJobCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.fallback}>
          {result.ok
            ? "No vacancies are open right now — check back soon."
            : "Jobs are temporarily unavailable."}
        </p>
      )}
    </section>
  );
}

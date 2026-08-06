import Link from "next/link";

import { PublicJobCard } from "@/components/public-jobs/public-job-card";
import { PublicJobsEmptyState } from "@/components/public-jobs/public-jobs-empty-state";
import type { PublicVacancyListItem } from "@/lib/public-jobs/load-public-vacancies";
import {
  PUBLIC_JOBS_HEADING,
  PUBLIC_JOBS_LEAD,
  PUBLIC_JOBS_LOAD_FAILURE_BODY,
  PUBLIC_JOBS_LOAD_FAILURE_HEADING,
  formatPublicVacancyCount,
} from "@/lib/public-jobs/messages";

import styles from "./public-jobs.module.scss";

type PublicJobsPageProps =
  { status: "success"; items: PublicVacancyListItem[] } | { status: "failure" };

export function PublicJobsPage(props: PublicJobsPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Stint
        </Link>
      </div>

      <h1 className={styles.heading}>{PUBLIC_JOBS_HEADING}</h1>
      <p className={styles.lead}>{PUBLIC_JOBS_LEAD}</p>

      {props.status === "failure" ? (
        <section
          className={styles.error}
          aria-labelledby="public-jobs-error-heading"
        >
          <h2 className={styles.errorHeading} id="public-jobs-error-heading">
            {PUBLIC_JOBS_LOAD_FAILURE_HEADING}
          </h2>
          <p className={styles.errorBody}>{PUBLIC_JOBS_LOAD_FAILURE_BODY}</p>
        </section>
      ) : props.items.length === 0 ? (
        <PublicJobsEmptyState />
      ) : (
        <>
          <p className={styles.count}>
            {formatPublicVacancyCount(props.items.length)}
          </p>
          <ul className={styles.list}>
            {props.items.map((item) => (
              <li key={item.vacancy.vacancyId}>
                <PublicJobCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

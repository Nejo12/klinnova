import Link from "next/link";

import styles from "@/components/public-jobs/public-job-detail.module.scss";
import {
  PUBLIC_JOB_NOT_FOUND_BODY,
  PUBLIC_JOB_NOT_FOUND_HEADING,
} from "@/lib/public-jobs/messages";

export function PublicJobsNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
      </div>
      <section aria-labelledby="public-job-not-found-heading">
        <h1 id="public-job-not-found-heading">
          {PUBLIC_JOB_NOT_FOUND_HEADING}
        </h1>
        <p>{PUBLIC_JOB_NOT_FOUND_BODY}</p>
        <Link className={styles.cta} href="/jobs">
          Browse open jobs
        </Link>
      </section>
    </main>
  );
}

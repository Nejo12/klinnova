import {
  PUBLIC_JOBS_EMPTY_BODY,
  PUBLIC_JOBS_EMPTY_HEADING,
} from "@/lib/public-jobs/messages";

import styles from "./public-jobs.module.scss";

export function PublicJobsEmptyState() {
  return (
    <section
      className={styles.empty}
      aria-labelledby="public-jobs-empty-heading"
    >
      <h2 className={styles.emptyHeading} id="public-jobs-empty-heading">
        {PUBLIC_JOBS_EMPTY_HEADING}
      </h2>
      <p className={styles.emptyBody}>{PUBLIC_JOBS_EMPTY_BODY}</p>
    </section>
  );
}

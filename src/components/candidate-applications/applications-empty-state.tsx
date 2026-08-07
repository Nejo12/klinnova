import Link from "next/link";

import styles from "@/components/candidate-matches/candidate-matches.module.scss";

export function ApplicationsEmptyState() {
  return (
    <section
      className={styles.empty}
      aria-labelledby="applications-empty-heading"
    >
      <h2 className={styles.emptyHeading} id="applications-empty-heading">
        You haven&apos;t applied to any jobs yet
      </h2>
      <Link className={styles.link} href="/candidate/matches">
        Browse matching jobs
      </Link>
    </section>
  );
}

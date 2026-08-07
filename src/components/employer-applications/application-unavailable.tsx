import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { APPLICATION_UNAVAILABLE } from "@/lib/employer/applications/messages";

export function ApplicationUnavailable() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Application unavailable</h1>
      <p className={styles.lead}>{APPLICATION_UNAVAILABLE}</p>
      <p className={styles.actions}>
        <Link className={styles.linkButton} href="/employer/applications">
          Back to applications
        </Link>
      </p>
    </main>
  );
}

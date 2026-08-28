import Link from "next/link";

import styles from "@/components/candidate-applications/candidate-applications.module.scss";

export function ApplicationsErrorState() {
  return (
    <section
      className={styles.error}
      aria-labelledby="applications-error-heading"
    >
      <h2 className={styles.errorHeading} id="applications-error-heading">
        We could not load your applications
      </h2>
      <p className={styles.errorBody}>
        Something went wrong on our side. Please try again later.
      </p>
      <Link className={styles.link} href="/candidate">
        Back to your account
      </Link>
    </section>
  );
}

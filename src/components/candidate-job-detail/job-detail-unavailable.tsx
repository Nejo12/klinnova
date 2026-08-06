import Link from "next/link";

import styles from "./candidate-job-detail.module.scss";

export function JobDetailUnavailable() {
  const heading = "This job is not available";
  const body =
    "This vacancy is not available to view right now. Return to your matches to see current options.";

  return (
    <section className={styles.unavailable} aria-labelledby="job-unavailable">
      <h1 className={styles.unavailableHeading} id="job-unavailable">
        {heading}
      </h1>
      <p className={styles.unavailableBody}>{body}</p>
      <Link className={styles.cta} href="/candidate/matches">
        Back to matches
      </Link>
    </section>
  );
}

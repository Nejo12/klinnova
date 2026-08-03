import Link from "next/link";

import styles from "./candidate-job-detail.module.scss";

type JobDetailUnavailableProps = {
  reason: "unavailable" | "not_matching" | "failure";
};

export function JobDetailUnavailable({ reason }: JobDetailUnavailableProps) {
  const heading =
    reason === "not_matching"
      ? "This job no longer matches your preferences"
      : "This job is not available";

  const body =
    reason === "not_matching"
      ? "Your current essentials no longer match this vacancy. Return to your matches to see current options."
      : "This vacancy is not available to view right now. Return to your matches to see current options.";

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

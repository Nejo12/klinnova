import Link from "next/link";

import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import styles from "./candidate-matches.module.scss";

export function MatchesErrorState() {
  return (
    <section className={styles.error} aria-labelledby="matches-error-heading">
      <h2 className={styles.errorHeading} id="matches-error-heading">
        We could not load your matches
      </h2>
      <p className={styles.errorBody}>
        Something went wrong on our side. Please try again later.
      </p>
      <Link className={styles.link} href={onboardingGroupHref("review")}>
        Review saved preferences
      </Link>
    </section>
  );
}

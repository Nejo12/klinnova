import Link from "next/link";

import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import styles from "./candidate-matches.module.scss";

export function MatchesEmptyState() {
  return (
    <section className={styles.empty} aria-labelledby="matches-empty-heading">
      <h2 className={styles.emptyHeading} id="matches-empty-heading">
        No matches right now
      </h2>
      <p className={styles.emptyBody}>
        No jobs match all of your saved preferences right now.
      </p>
      <div className={styles.stateDivider} />
      <h3 className={styles.stateSubheading}>What you can do</h3>
      <p className={styles.emptyBody}>
        Review your saved preferences. Opening them does not clear your
        completion on its own.
      </p>
      <Link className={styles.link} href={onboardingGroupHref("review")}>
        Review your saved preferences
      </Link>
    </section>
  );
}

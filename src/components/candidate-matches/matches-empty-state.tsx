import Link from "next/link";

import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import styles from "./candidate-matches.module.scss";

export function MatchesEmptyState() {
  return (
    <section className={styles.empty} aria-labelledby="matches-empty-heading">
      <h2 className={styles.emptyHeading} id="matches-empty-heading">
        No jobs match all of your saved preferences right now
      </h2>
      <p className={styles.emptyBody}>
        We looked at the jobs currently available using your saved onboarding
        answers. You can review those preferences any time — opening them does
        not clear your completion on its own.
      </p>
      <Link className={styles.link} href={onboardingGroupHref("review")}>
        Review your saved preferences
      </Link>
    </section>
  );
}

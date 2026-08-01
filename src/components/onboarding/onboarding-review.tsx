import Link from "next/link";

import {
  ONBOARDING_GROUP_LABELS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type { OnboardingProgress } from "@/lib/onboarding/progress";

import styles from "./onboarding.module.scss";

type OnboardingReviewProps = {
  progress: OnboardingProgress;
  displayName: string;
};

export function OnboardingReview({
  progress,
  displayName,
}: OnboardingReviewProps) {
  if (progress.essentialsValid) {
    return (
      <section className={styles.form} aria-labelledby="review-heading">
        <h1 className={styles.heading} id="review-heading">
          Essentials look complete, {displayName}
        </h1>
        <p className={styles.lead}>
          Your answers are saved. Matching is not available yet — the next step
          confirms completion on the server and opens suitable work.
        </p>
        <p className={styles.note}>
          No job matches are shown here. Completion is confirmed in a later
          step, not by opening this screen.
        </p>
        <div className={styles.actions}>
          <Link className={styles.linkButton} href="/candidate">
            Return to candidate home
          </Link>
          <Link
            className={`${styles.button} ${styles.buttonSecondary}`}
            href={onboardingGroupHref("languages")}
          >
            Review answers
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.form} aria-labelledby="review-heading">
      <h1 className={styles.heading} id="review-heading">
        A few essentials still need answers
      </h1>
      <p className={styles.lead}>
        Progress is saved after each section. Continue from the first unfinished
        section when you are ready.
      </p>
      <ul className={styles.reviewList}>
        {progress.incompleteGroups.map((group: OnboardingGroupId) => (
          <li key={group}>
            <Link href={onboardingGroupHref(group)}>
              {ONBOARDING_GROUP_LABELS[group]}
            </Link>
          </li>
        ))}
      </ul>
      {progress.firstIncompleteGroup !== null ? (
        <div className={styles.actions}>
          <Link
            className={styles.button}
            href={onboardingGroupHref(progress.firstIncompleteGroup)}
          >
            Continue onboarding
          </Link>
        </div>
      ) : null}
    </section>
  );
}

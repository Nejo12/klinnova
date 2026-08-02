import Link from "next/link";

import { CompleteOnboardingForm } from "@/components/onboarding/complete-onboarding-form";
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
  onboardingCompleted: boolean;
};

export function OnboardingReview({
  progress,
  displayName,
  onboardingCompleted,
}: OnboardingReviewProps) {
  if (onboardingCompleted) {
    return (
      <section className={styles.form} aria-labelledby="review-heading">
        <h1 className={styles.heading} id="review-heading">
          Essentials confirmed, {displayName}
        </h1>
        <p className={styles.lead}>
          Your essential answers are complete. You can view jobs that match your
          saved preferences, or review your answers any time.
        </p>
        <p className={styles.note}>
          Updating answers can clear completion when essentials are no longer
          met. Completion stays server-controlled.
        </p>
        <div className={styles.actions}>
          <Link className={styles.button} href="/candidate/matches">
            View matching jobs
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

  if (progress.essentialsValid) {
    return (
      <section className={styles.form} aria-labelledby="review-heading">
        <h1 className={styles.heading} id="review-heading">
          Essentials look complete, {displayName}
        </h1>
        <p className={styles.lead}>
          Your answers are saved. Confirm when you are ready — the server checks
          your saved essentials before marking onboarding complete.
        </p>
        <p className={styles.note}>
          After you confirm, you can view jobs that match your saved
          preferences.
        </p>
        <CompleteOnboardingForm />
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

import Link from "next/link";

import {
  ONBOARDING_GROUP_LABELS,
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type { OnboardingProgress } from "@/lib/onboarding/progress";

import styles from "./onboarding.module.scss";

type OnboardingProgressNavProps = {
  progress: OnboardingProgress;
  current: OnboardingGroupId | "review";
};

export function OnboardingProgressNav({
  progress,
  current,
}: OnboardingProgressNavProps) {
  return (
    <nav className={styles.progress} aria-label="Onboarding progress">
      <p className={styles.progressLabel}>
        {progress.completeCount} of {progress.totalGroups} sections saved
      </p>
      <ol className={styles.progressList}>
        {ONBOARDING_GROUPS.map((group, index) => {
          const complete = progress.completeGroups.includes(group);
          const isCurrent = current === group;
          const state = isCurrent
            ? "current"
            : complete
              ? "complete"
              : "upcoming";
          const marker = complete ? "Saved" : isCurrent ? "Current" : "Next";

          return (
            <li key={group}>
              <Link
                className={styles.progressItem}
                href={onboardingGroupHref(group)}
                data-state={state}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className={styles.progressMarker}>{marker}</span>
                <span className={styles.progressItemLabel}>
                  {index + 1}. {ONBOARDING_GROUP_LABELS[group]}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

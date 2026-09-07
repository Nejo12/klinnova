"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import type { OnboardingGroupId } from "@/lib/onboarding/allow-lists";
import {
  onboardingGroupHref,
  previousOnboardingGroup,
} from "@/lib/onboarding/navigation";

import styles from "./onboarding.module.scss";

type GroupNavProps = {
  current: OnboardingGroupId;
  pending: boolean;
  continueToReview?: boolean;
};

export function GroupNav({
  current,
  pending,
  continueToReview = false,
}: GroupNavProps) {
  const { t } = useLocale();
  const previous = previousOnboardingGroup(current);

  return (
    <div className={styles.actions}>
      {previous !== null ? (
        <Link
          className={styles.linkButton}
          href={onboardingGroupHref(previous)}
        >
          {t("candidate.onboarding.backPrevious")}
        </Link>
      ) : (
        <Link className={styles.linkButton} href="/candidate">
          {t("candidate.onboarding.backHome")}
        </Link>
      )}
      <button className={styles.button} type="submit" disabled={pending}>
        {pending
          ? t("candidate.onboarding.saving")
          : t(
              continueToReview
                ? "candidate.onboarding.saveReview"
                : "candidate.onboarding.saveContinue",
            )}
      </button>
    </div>
  );
}

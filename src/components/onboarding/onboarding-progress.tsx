"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import {
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
  const { locale, t } = useLocale();
  const groupLabels: Record<OnboardingGroupId, string> = {
    languages: t("candidate.onboarding.group.languages"),
    work_authorisation: t("candidate.onboarding.group.workAuthorisation"),
    location: t("candidate.onboarding.group.location"),
    categories: t("candidate.onboarding.group.categories"),
    availability: t("candidate.onboarding.group.availability"),
    employment: t("candidate.onboarding.group.employment"),
  };

  return (
    <nav
      className={styles.progress}
      aria-label={t("candidate.onboarding.progress")}
    >
      <p className={styles.progressLabel}>
        {progress.completeCount} {locale === "de" ? "von" : "of"}{" "}
        {progress.totalGroups} {t("candidate.home.sectionsSaved")}
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
          const marker = complete
            ? t("candidate.onboarding.saved")
            : isCurrent
              ? t("candidate.onboarding.current")
              : t("candidate.onboarding.next");

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
                  {index + 1}. {groupLabels[group]}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

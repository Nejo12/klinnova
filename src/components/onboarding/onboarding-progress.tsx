"use client";

import Link from "next/link";
import { Progress, VisuallyHidden } from "@nova-component/ui";

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

  const currentIndex = ONBOARDING_GROUPS.findIndex(
    (group) => group === current,
  );
  const stepPosition =
    currentIndex === -1 ? progress.totalGroups : currentIndex + 1;

  return (
    <nav
      className={styles.progress}
      aria-label={t("candidate.onboarding.progress")}
    >
      <p className={styles.progressLabel}>
        {t("candidate.onboarding.step")} {stepPosition}{" "}
        {locale === "de" ? "von" : "of"} {progress.totalGroups}
      </p>
      <Progress
        value={progress.completeCount}
        min={0}
        max={progress.totalGroups}
        aria-label={t("candidate.home.progressLabel")}
        className={styles.progressBar}
      />
      <ol className={styles.progressList}>
        {ONBOARDING_GROUPS.map((group, index) => {
          const complete = progress.completeGroups.includes(group);
          const isCurrent = current === group;
          const state = isCurrent
            ? "current"
            : complete
              ? "complete"
              : "upcoming";

          const label = groupLabels[group];

          return (
            <li key={group}>
              <Link
                className={styles.progressItem}
                href={onboardingGroupHref(group)}
                data-state={state}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={
                  complete
                    ? `${label}: ${t("candidateReview.edit")}`
                    : undefined
                }
              >
                <span className={styles.progressIndex} aria-hidden="true">
                  {complete ? "✓" : index + 1}
                </span>
                <span
                  className={styles.progressItemLabel}
                  aria-hidden={complete || undefined}
                >
                  {label}
                </span>
                {complete ? (
                  <>
                    <VisuallyHidden>
                      {t("candidate.onboarding.completed")}
                    </VisuallyHidden>
                    <span className={styles.progressEdit} aria-hidden="true">
                      {t("candidateReview.edit")}
                    </span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type {
  ProgressLanguage,
  ProgressProfile,
} from "@/lib/onboarding/progress";
import { formatReviewRow } from "@/lib/onboarding/review-values";
import type { MessageKey } from "@/lib/i18n/messages";

import styles from "./onboarding.module.scss";

type OnboardingReviewSummaryProps = {
  profile: ProgressProfile;
  languages: readonly ProgressLanguage[];
};

const GROUP_MESSAGE_KEYS: Record<OnboardingGroupId, MessageKey> = {
  languages: "candidateReview.group.languages",
  work_authorisation: "candidateReview.group.workAuthorisation",
  location: "candidateReview.group.location",
  categories: "candidateReview.group.categories",
  availability: "candidateReview.group.availability",
  employment: "candidateReview.group.workPreferences",
};

export function OnboardingReviewSummary({
  profile,
  languages,
}: OnboardingReviewSummaryProps) {
  const { locale, t } = useLocale();

  return (
    <section
      className={styles.reviewSummaryCard}
      aria-labelledby="saved-profile-heading"
    >
      <h2 className={styles.reviewSummaryHeading} id="saved-profile-heading">
        {t("candidateReview.savedProfile")}
      </h2>
      <dl className={styles.reviewDefinitionList}>
        {ONBOARDING_GROUPS.map((group: OnboardingGroupId) => {
          const row = formatReviewRow(group, profile, languages, locale);
          const label = t(GROUP_MESSAGE_KEYS[group]);

          return (
            <div key={group} className={styles.reviewRow}>
              <div className={styles.reviewRowCopy}>
                <dt className={styles.reviewTerm}>{label}</dt>
                <dd className={styles.reviewDescription}>{row.value}</dd>
              </div>
              <Link
                href={onboardingGroupHref(group)}
                className={styles.reviewEditLink}
                aria-label={`${label}: ${t("candidateReview.edit")}`}
              >
                {t("candidateReview.edit")}
              </Link>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

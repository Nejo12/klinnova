"use client";

import Link from "next/link";

import { InlineAlert } from "@/components/inline-alert/inline-alert";
import { CompleteOnboardingForm } from "@/components/onboarding/complete-onboarding-form";
import { OnboardingReviewSummary } from "@/components/onboarding/onboarding-review-summary";
import { StateSuccess } from "@/components/state-success/state-success";
import { useLocale } from "@/components/i18n/locale-provider";
import { type OnboardingGroupId } from "@/lib/onboarding/allow-lists";
import type { MessageKey } from "@/lib/i18n/messages";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type {
  OnboardingProgress,
  ProgressLanguage,
  ProgressProfile,
} from "@/lib/onboarding/progress";

import styles from "./onboarding.module.scss";

type OnboardingReviewProps = {
  progress: OnboardingProgress;
  onboardingCompleted: boolean;
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

export function OnboardingReview({
  progress,
  onboardingCompleted,
  profile,
  languages,
}: OnboardingReviewProps) {
  const { locale, t } = useLocale();
  const savedCount = `${progress.completeCount} ${
    locale === "de" ? "von" : "of"
  } ${progress.totalGroups} ${t("candidateReview.essentialsSaved")}`;

  if (onboardingCompleted) {
    return (
      <section className={styles.reviewForm} aria-labelledby="review-heading">
        <header className={styles.reviewHeader}>
          <h1 className={styles.heading} id="review-heading">
            {t("candidateReview.heading")}
          </h1>
          <p className={styles.lead}>{t("candidateReview.lead")}</p>
        </header>
        <StateSuccess
          className={styles.readinessState}
          title={t("candidateReview.readyTitle")}
        >
          {savedCount}
        </StateSuccess>
        <OnboardingReviewSummary profile={profile} languages={languages} />
        <div className={styles.reviewActions}>
          <Link className={styles.button} href="/candidate/matches">
            {t("candidateReview.viewMatches")}
          </Link>
          <Link
            className={`${styles.button} ${styles.buttonSecondary}`}
            href={onboardingGroupHref("languages")}
          >
            {t("candidateReview.editProfile")}
          </Link>
        </div>
      </section>
    );
  }

  if (progress.essentialsValid) {
    return (
      <section className={styles.reviewForm} aria-labelledby="review-heading">
        <header className={styles.reviewHeader}>
          <h1 className={styles.heading} id="review-heading">
            {t("candidateReview.heading")}
          </h1>
          <p className={styles.lead}>{t("candidateReview.lead")}</p>
        </header>
        <InlineAlert
          tone="info"
          title={t("candidateReview.readyToCompleteTitle")}
        >
          {t("candidateReview.readyToCompleteBody")}
        </InlineAlert>
        <OnboardingReviewSummary profile={profile} languages={languages} />
        <CompleteOnboardingForm />
      </section>
    );
  }

  const incompleteCount = progress.incompleteGroups.length;
  const incompleteCountLabel = `${incompleteCount} ${t(
    incompleteCount === 1
      ? "candidateReview.essentialStillNeeded"
      : "candidateReview.essentialsStillNeeded",
  )}`;

  return (
    <section className={styles.reviewForm} aria-labelledby="review-heading">
      <header className={styles.reviewHeader}>
        <h1 className={styles.heading} id="review-heading">
          {t("candidateReview.finishHeading")}
        </h1>
        <p className={styles.lead}>{incompleteCountLabel}</p>
      </header>
      <InlineAlert tone="warning" title={t("candidateReview.stillNeeded")}>
        <ul className={styles.missingList}>
          {progress.incompleteGroups.map((group: OnboardingGroupId) => (
            <li key={group}>
              <Link href={onboardingGroupHref(group)}>
                {t(GROUP_MESSAGE_KEYS[group])}
              </Link>
            </li>
          ))}
        </ul>
      </InlineAlert>
      <OnboardingReviewSummary profile={profile} languages={languages} />
      {progress.firstIncompleteGroup !== null ? (
        <div className={styles.reviewActions}>
          <Link
            className={styles.button}
            href={onboardingGroupHref(progress.firstIncompleteGroup)}
          >
            {t("candidateReview.continueProfile")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

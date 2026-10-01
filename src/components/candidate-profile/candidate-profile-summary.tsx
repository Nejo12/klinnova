"use client";

import Link from "next/link";

import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import { useLocale } from "@/components/i18n/locale-provider";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import type {
  OnboardingProgress,
  ProgressLanguage,
  ProgressProfile,
} from "@/lib/onboarding/progress";
import { formatReviewRow } from "@/lib/onboarding/review-values";

import styles from "./candidate-profile-summary.module.scss";

type CandidateProfileSummaryProps = {
  displayName: string;
  onboardingCompleted: boolean;
  profile: ProgressProfile;
  languages: readonly ProgressLanguage[];
  progress: OnboardingProgress;
};

function initials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${second}`.toUpperCase();
}

export function CandidateProfileSummary({
  displayName,
  onboardingCompleted,
  profile,
  languages,
  progress,
}: CandidateProfileSummaryProps) {
  const { locale, t } = useLocale();

  const languageRow = formatReviewRow("languages", profile, languages, locale);
  const workAuthorisationRow = formatReviewRow(
    "work_authorisation",
    profile,
    languages,
    locale,
  );
  const locationRow = formatReviewRow("location", profile, languages, locale);
  const categoriesRow = formatReviewRow(
    "categories",
    profile,
    languages,
    locale,
  );
  const availabilityRow = formatReviewRow(
    "availability",
    profile,
    languages,
    locale,
  );
  const employmentRow = formatReviewRow(
    "employment",
    profile,
    languages,
    locale,
  );

  const profileReady = onboardingCompleted && progress.essentialsValid;

  return (
    <section
      className={styles.profile}
      aria-labelledby="candidate-profile-heading"
    >
      <header className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(displayName)}
        </span>
        <div className={styles.identityCopy}>
          <p className={styles.eyebrow}>{t("candidate.profile.eyebrow")}</p>
          <h1 className={styles.heading} id="candidate-profile-heading">
            {displayName}
          </h1>
          <div className={styles.readiness}>
            <span
              className={styles.readinessBadge}
              data-ready={profileReady ? "true" : "false"}
            >
              {t(
                profileReady
                  ? "candidate.profile.ready"
                  : "candidate.profile.inProgress",
              )}
            </span>
            <span className={styles.readinessCopy}>
              {t(
                profileReady
                  ? "candidate.profile.readyBody"
                  : "candidate.profile.inProgressBody",
              )}
            </span>
          </div>
        </div>
        <Link
          className={styles.primaryAction}
          href={onboardingGroupHref("review")}
        >
          {t("candidate.profile.edit")}
        </Link>
      </header>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="profile-work-heading">
          <h2 className={styles.cardHeading} id="profile-work-heading">
            {t("candidate.profile.workPreferences")}
          </h2>
          <dl className={styles.definitionList}>
            <div className={styles.row}>
              <dt>{t("candidate.profile.roles")}</dt>
              <dd>{categoriesRow.value}</dd>
            </div>
            <div className={styles.row}>
              <dt>{t("candidate.profile.employment")}</dt>
              <dd>{employmentRow.value}</dd>
            </div>
          </dl>
        </section>

        <section
          className={styles.card}
          aria-labelledby="profile-language-heading"
        >
          <h2 className={styles.cardHeading} id="profile-language-heading">
            {t("candidate.profile.languages")}
          </h2>
          <p className={styles.cardValue}>{languageRow.value}</p>
          <p className={styles.support}>
            {t("candidate.profile.languageNotice")}
          </p>
        </section>

        <section
          className={styles.card}
          aria-labelledby="profile-availability-heading"
        >
          <h2 className={styles.cardHeading} id="profile-availability-heading">
            {t("candidate.profile.availabilityLocation")}
          </h2>
          <dl className={styles.definitionList}>
            <div className={styles.row}>
              <dt>{t("candidate.profile.available")}</dt>
              <dd>{availabilityRow.value}</dd>
            </div>
            <div className={styles.row}>
              <dt>{t("candidate.profile.location")}</dt>
              <dd>{locationRow.value}</dd>
            </div>
          </dl>
        </section>

        <section
          className={styles.card}
          aria-labelledby="profile-authorisation-heading"
        >
          <h2 className={styles.cardHeading} id="profile-authorisation-heading">
            {t("candidate.profile.workAuthorisation")}
          </h2>
          <p className={styles.cardValue}>{workAuthorisationRow.value}</p>
          <WorkAuthorisationNotice />
        </section>
      </div>

      <section
        className={styles.accountLinkCard}
        aria-labelledby="profile-account-heading"
      >
        <div>
          <h2 className={styles.cardHeading} id="profile-account-heading">
            {t("candidate.profile.accountHeading")}
          </h2>
          <p className={styles.support}>{t("candidate.profile.accountBody")}</p>
        </div>
        <Link className={styles.secondaryAction} href="/candidate/account">
          {t("candidate.profile.accountAction")}
        </Link>
      </section>
    </section>
  );
}

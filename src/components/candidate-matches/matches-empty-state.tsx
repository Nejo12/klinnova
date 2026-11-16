"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import styles from "./candidate-matches.module.scss";

export function MatchesEmptyState() {
  const { t } = useLocale();
  return (
    <section className={styles.empty} aria-labelledby="matches-empty-heading">
      <h2 className={styles.emptyHeading} id="matches-empty-heading">
        {t("candidate.matches.emptyHeading")}
      </h2>
      <p className={styles.emptyBody}>{t("candidate.matches.emptyBody")}</p>
      <p className={styles.emptyBody}>
        {t("candidate.matches.emptyProfileNote")}
      </p>
      <div className={styles.stateDivider} />
      <h3 className={styles.stateSubheading}>
        {t("candidate.matches.emptyActionHeading")}
      </h3>
      <p className={styles.emptyBody}>
        {t("candidate.matches.emptyActionBody")}
      </p>
      <Link className={styles.link} href={onboardingGroupHref("review")}>
        {t("candidate.matches.emptyAction")}
      </Link>
      <h3 className={styles.stateSubheading}>
        {t("candidate.matches.emptyBrowseHeading")}
      </h3>
      <p className={styles.emptyBody}>
        {t("candidate.matches.emptyBrowseBody")}
      </p>
      <Link className={styles.link} href="/jobs">
        {t("candidate.matches.emptyBrowseAction")}
      </Link>
    </section>
  );
}

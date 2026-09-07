"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";

import styles from "./candidate-matches.module.scss";

export function MatchesErrorState() {
  const { t } = useLocale();
  return (
    <section className={styles.error} aria-labelledby="matches-error-heading">
      <p className={styles.stateSubheading}>
        {t("candidate.matches.errorSubheading")}
      </p>
      <h2 className={styles.errorHeading} id="matches-error-heading">
        {t("candidate.matches.errorHeading")}
      </h2>
      <p className={styles.errorBody}>{t("candidate.matches.errorBody")}</p>
      <Link className={styles.link} href={onboardingGroupHref("review")}>
        {t("candidate.matches.errorAction")}
      </Link>
    </section>
  );
}

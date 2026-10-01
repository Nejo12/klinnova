"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "./candidate-nav.module.scss";

export type CandidateNavDestination =
  "matches" | "applications" | "profile" | "account";

type CandidateNavProps = {
  /** Omit when the current page is not literally one of the four destinations (e.g. the candidate home/job detail). */
  current?: CandidateNavDestination;
};

/**
 * The coherent authenticated candidate navigation (M5.1 Unit B / D-M5-20):
 * Matches, Applications, Profile / Preferences, Account. Sign-out is
 * deliberately not a destination here — it lives inside Account so it
 * cannot become an accidental primary-navigation target.
 */
export function CandidateNav({ current }: CandidateNavProps) {
  const { t } = useLocale();

  return (
    <nav aria-label={t("candidate.navLabel")} className={styles.nav}>
      <Link
        className={styles.navLink}
        href="/candidate/matches"
        aria-current={current === "matches" ? "page" : undefined}
      >
        {t("candidate.nav.matches")}
      </Link>
      <Link
        className={styles.navLink}
        href="/candidate/applications"
        aria-current={current === "applications" ? "page" : undefined}
      >
        {t("candidate.nav.applications")}
      </Link>
      <Link
        className={styles.navLink}
        href="/candidate/profile"
        aria-current={current === "profile" ? "page" : undefined}
      >
        {t("candidate.nav.profile")}
      </Link>
      <Link
        className={styles.navLink}
        href="/candidate/account"
        aria-current={current === "account" ? "page" : undefined}
      >
        {t("candidate.nav.account")}
      </Link>
    </nav>
  );
}

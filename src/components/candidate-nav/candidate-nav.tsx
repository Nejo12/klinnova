import Link from "next/link";

import { onboardingGroupHref } from "@/lib/onboarding/navigation";

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
  return (
    <nav aria-label="Candidate" className={styles.nav}>
      <Link
        className={styles.navLink}
        href="/candidate/matches"
        aria-current={current === "matches" ? "page" : undefined}
      >
        Matches
      </Link>
      <Link
        className={styles.navLink}
        href="/candidate/applications"
        aria-current={current === "applications" ? "page" : undefined}
      >
        Applications
      </Link>
      <Link
        className={styles.navLink}
        href={onboardingGroupHref("review")}
        aria-current={current === "profile" ? "page" : undefined}
      >
        Profile
      </Link>
      <Link
        className={styles.navLink}
        href="/candidate/account"
        aria-current={current === "account" ? "page" : undefined}
      >
        Account
      </Link>
    </nav>
  );
}

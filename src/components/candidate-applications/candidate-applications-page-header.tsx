import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import { CapabilityNav } from "@/components/employer-onboarding/capability-nav";

type CandidateApplicationsPageHeaderProps = {
  showEmployerNav: boolean;
};

/**
 * Shared header for `/candidate/applications` and
 * `/candidate/applications/[applicationId]` — both routes in the
 * Applications family, so the nav link is always marked current on either.
 */
export function CandidateApplicationsPageHeader({
  showEmployerNav,
}: CandidateApplicationsPageHeaderProps) {
  return (
    <div className={styles.header}>
      <Link className={styles.brand} href="/candidate">
        Stint
      </Link>
      <div className={styles.headerActions}>
        <nav aria-label="Candidate">
          <Link
            className={styles.link}
            href="/candidate/applications"
            aria-current="page"
          >
            Applications
          </Link>
        </nav>
        <CapabilityNav
          showCandidate
          showEmployer={showEmployerNav}
          current="candidate"
        />
        <LogoutButton />
      </div>
    </div>
  );
}

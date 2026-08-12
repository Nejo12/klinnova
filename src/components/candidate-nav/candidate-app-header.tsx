import Link from "next/link";

import {
  CandidateNav,
  type CandidateNavDestination,
} from "@/components/candidate-nav/candidate-nav";
import { CapabilityNav } from "@/components/employer-onboarding/capability-nav";

import styles from "./candidate-nav.module.scss";

type CandidateAppHeaderProps = {
  current?: CandidateNavDestination;
  showEmployerNav: boolean;
  /** The candidate matches page uses a plain "/" brand link in its failure state, before a session is confirmed. */
  brandHref?: string;
};

/**
 * The single header used across every authenticated candidate page
 * (M5.1 Unit B / D-M5-20). Consolidates what were previously five
 * inconsistent per-page header implementations into one coherent pattern.
 */
export function CandidateAppHeader({
  current,
  showEmployerNav,
  brandHref = "/candidate",
}: CandidateAppHeaderProps) {
  return (
    <div className={styles.header}>
      <Link className={styles.brand} href={brandHref}>
        Klinnova
      </Link>
      <div className={styles.headerActions}>
        <CandidateNav current={current} />
        <CapabilityNav
          showCandidate
          showEmployer={showEmployerNav}
          current="candidate"
        />
      </div>
    </div>
  );
}

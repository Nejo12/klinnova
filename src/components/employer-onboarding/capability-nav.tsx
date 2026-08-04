import Link from "next/link";

import styles from "./employer-onboarding.module.scss";

type CapabilityNavProps = {
  showCandidate: boolean;
  showEmployer: boolean;
  current: "candidate" | "employer";
};

/** Visible Candidate / Employer navigation for dual-capability users (D-047). */
export function CapabilityNav({
  showCandidate,
  showEmployer,
  current,
}: CapabilityNavProps) {
  if (!showCandidate || !showEmployer) {
    return null;
  }

  return (
    <nav className={styles.capabilityNav} aria-label="Account spaces">
      <Link
        className={styles.capabilityLink}
        href="/candidate"
        aria-current={current === "candidate" ? "page" : undefined}
      >
        Candidate
      </Link>
      <Link
        className={styles.capabilityLink}
        href="/employer"
        aria-current={current === "employer" ? "page" : undefined}
      >
        Employer
      </Link>
    </nav>
  );
}

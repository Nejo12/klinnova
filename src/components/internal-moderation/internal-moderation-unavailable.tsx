import Link from "next/link";

import styles from "@/components/internal-verification/internal-verification.module.scss";
import { INTERNAL_UNAVAILABLE } from "@/lib/internal/verification/messages";

/**
 * Shared render for authenticated non-operators, malformed ids, nonexistent
 * employers/vacancies, and employer/vacancy ownership mismatches. These
 * cases are intentionally not distinguished from each other in the
 * rendered message — no existence oracle.
 */
export function InternalModerationUnavailable() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Not available</h1>
      <p className={styles.lead}>{INTERNAL_UNAVAILABLE}</p>
      <p>
        <Link className={styles.linkButton} href="/internal/employers">
          Back to employers
        </Link>
      </p>
    </main>
  );
}

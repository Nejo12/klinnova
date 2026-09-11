"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "@/components/internal-verification/internal-verification.module.scss";

/**
 * Minimal in-page nav shared by every /internal/* route — not a general
 * admin dashboard, the existing operator surfaces (verification queue,
 * employer moderation, and aggregate M5 metrics). Existing verification routes are unchanged.
 */
export function InternalNav() {
  const pathname = usePathname();
  const onVerification = pathname.startsWith("/internal/verification");
  const onEmployers = pathname.startsWith("/internal/employers");
  const onMetrics = pathname.startsWith("/internal/metrics");

  return (
    <nav className={styles.nav} aria-label="Internal">
      <Link
        className={
          onVerification
            ? `${styles.navLink} ${styles.navLinkActive}`
            : styles.navLink
        }
        href="/internal/verification"
        aria-current={onVerification ? "page" : undefined}
      >
        Verification
      </Link>
      <Link
        className={
          onEmployers
            ? `${styles.navLink} ${styles.navLinkActive}`
            : styles.navLink
        }
        href="/internal/employers"
        aria-current={onEmployers ? "page" : undefined}
      >
        Employers
      </Link>
      <Link
        className={
          onMetrics
            ? `${styles.navLink} ${styles.navLinkActive}`
            : styles.navLink
        }
        href="/internal/metrics"
        aria-current={onMetrics ? "page" : undefined}
      >
        M5 metrics
      </Link>
    </nav>
  );
}

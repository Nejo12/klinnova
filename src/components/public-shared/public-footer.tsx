import Link from "next/link";

import { ThemePreferenceControl } from "@/components/theme/theme-preference-control";

import styles from "./public-footer.module.scss";

/**
 * Minimal legal footer nav shared across public/auth-facing routes
 * (landing, /jobs, /login, /register, /employer/register, and the legal
 * pages themselves). Not added to authenticated candidate/employer/
 * internal dashboards, which have their own navigation.
 */
export function PublicFooter() {
  return (
    <div className={styles.footer}>
      <ThemePreferenceControl />
      <nav className={styles.legalNav} aria-label="Legal">
        <Link className={styles.legalLink} href="/privacy">
          Privacy
        </Link>
        <Link className={styles.legalLink} href="/terms">
          Terms
        </Link>
        <Link className={styles.legalLink} href="/impressum">
          Impressum
        </Link>
      </nav>
    </div>
  );
}

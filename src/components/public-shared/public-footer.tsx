"use client";

import Link from "next/link";

import { LanguagePreferenceControl } from "@/components/i18n/language-preference-control";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./public-footer.module.scss";

/**
 * Minimal legal footer nav shared across public/auth-facing routes
 * (landing, /jobs, /login, /register, /employer/register, and the legal
 * pages themselves). Not added to authenticated candidate/employer/
 * internal dashboards, which have their own navigation.
 */
export function PublicFooter() {
  const { t } = useLocale();

  return (
    <div className={styles.footer}>
      <LanguagePreferenceControl />
      <nav className={styles.legalNav} aria-label={t("footer.legalNav")}>
        <Link className={styles.legalLink} href="/privacy">
          {t("footer.privacy")}
        </Link>
        <Link className={styles.legalLink} href="/terms">
          {t("footer.terms")}
        </Link>
        <Link className={styles.legalLink} href="/impressum">
          {t("footer.impressum")}
        </Link>
      </nav>
    </div>
  );
}

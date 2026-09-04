"use client";

import Link from "next/link";

import { LanguagePreferenceControl } from "@/components/i18n/language-preference-control";
import { useLocale } from "@/components/i18n/locale-provider";
import { ThemePreferenceControl } from "@/components/theme/theme-preference-control";

import styles from "./public-footer.module.scss";

/** Shared preferences and legal navigation for public/auth-facing routes. */
export function PublicFooter() {
  const { t } = useLocale();

  return (
    <div className={styles.footer}>
      <LanguagePreferenceControl />
      <ThemePreferenceControl />
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

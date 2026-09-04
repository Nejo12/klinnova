"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./shell-header.module.scss";

export function ShellHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();
  const { t } = useLocale();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          className={styles.brand}
          href="/"
          aria-label={t("shell.homeLabel")}
        >
          <BrandMark as="span" />
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls={navId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {t("shell.menu")}
        </button>

        <nav
          id={navId}
          className={menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
          aria-label={t("shell.siteNav")}
        >
          <div className={styles.navLinks}>
            <Link
              className={styles.navLink}
              href="/jobs"
              onClick={() => setMenuOpen(false)}
            >
              {t("shell.jobs")}
            </Link>
            <a
              className={styles.navLink}
              href="#for-candidates"
              onClick={() => setMenuOpen(false)}
            >
              {t("shell.forCandidates")}
            </a>
            <a
              className={styles.navLink}
              href="#for-employers"
              onClick={() => setMenuOpen(false)}
            >
              {t("shell.forEmployers")}
            </a>
          </div>
          <div className={styles.authActions}>
            <Link
              className={styles.signInLink}
              href="/login"
              onClick={() => setMenuOpen(false)}
            >
              {t("shell.signIn")}
            </Link>
            <Link
              className={styles.createAccountLink}
              href="/register"
              onClick={() => setMenuOpen(false)}
            >
              {t("shell.createAccount")}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

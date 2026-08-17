"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

import styles from "./shell-header.module.scss";

export function ShellHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();

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
        <Link className={styles.brand} href="/" aria-label="Klinnova home">
          <BrandMark as="span" />
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls={navId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>

        <nav
          id={navId}
          className={menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
          aria-label="Site"
        >
          <div className={styles.navLinks}>
            <Link
              className={styles.navLink}
              href="/jobs"
              onClick={() => setMenuOpen(false)}
            >
              Jobs
            </Link>
            <a
              className={styles.navLink}
              href="#for-candidates"
              onClick={() => setMenuOpen(false)}
            >
              For candidates
            </a>
            <a
              className={styles.navLink}
              href="#for-employers"
              onClick={() => setMenuOpen(false)}
            >
              For employers
            </a>
          </div>
          <div className={styles.authActions}>
            <Link
              className={styles.signInLink}
              href="/login"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
            <Link
              className={styles.createAccountLink}
              href="/register"
              onClick={() => setMenuOpen(false)}
            >
              Create account
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

import styles from "./shell-header.module.scss";

export function ShellHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <BrandMark />
        <nav className={styles.nav} aria-label="Site">
          <Link className={styles.navLink} href="/jobs">
            Jobs
          </Link>
        </nav>
      </div>
    </header>
  );
}

import { BrandMark } from "@/components/brand-mark";

import styles from "./shell-header.module.scss";

export function ShellHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <BrandMark />
        <p className={styles.tagline}>One step closer.</p>
      </div>
    </header>
  );
}

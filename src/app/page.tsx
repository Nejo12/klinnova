import { BrandMark } from "@/components/brand-mark";

import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <BrandMark />
      <h1 className={styles.title}>One step closer.</h1>
      <p className={styles.lead}>
        Employment access for people ready to contribute.
      </p>
    </main>
  );
}

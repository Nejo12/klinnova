import Link from "next/link";

import styles from "./final-cta.module.scss";

export function FinalCta() {
  return (
    <section className={styles.section} aria-labelledby="final-cta-heading">
      <div className={styles.copy}>
        <h2 className={styles.heading} id="final-cta-heading">
          Find work that fits your situation
        </h2>
        <p className={styles.body}>
          Create your candidate account to see jobs matched to your availability, language and location.
        </p>
      </div>
      <div className={styles.ctas}>
        <Link className={styles.primaryCta} href="/register">
          Create your account
        </Link>
        <Link className={styles.secondaryCta} href="/jobs">
          Browse jobs first
        </Link>
      </div>
    </section>
  );
}

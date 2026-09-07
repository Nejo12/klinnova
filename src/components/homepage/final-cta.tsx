"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./final-cta.module.scss";

export function FinalCta({
  authenticatedDestination,
}: {
  authenticatedDestination?: string;
}) {
  const { t } = useLocale();

  return (
    <section className={styles.section} aria-labelledby="final-cta-heading">
      <div className={styles.copy}>
        <h2 className={styles.heading} id="final-cta-heading">
          {t("homepage.final.heading")}
        </h2>
        <p className={styles.body}>{t("homepage.final.body")}</p>
      </div>
      <div className={styles.ctas}>
        <Link
          className={styles.primaryCta}
          href={authenticatedDestination ?? "/register"}
        >
          {t(
            authenticatedDestination === undefined
              ? "homepage.final.createAccount"
              : "shell.dashboard",
          )}
        </Link>
        <Link className={styles.secondaryCta} href="/jobs">
          {t("homepage.final.browseJobs")}
        </Link>
      </div>
    </section>
  );
}

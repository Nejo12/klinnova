"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/public-jobs/public-job-detail.module.scss";

export function PublicJobsNotFound() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
      </div>
      <section aria-labelledby="public-job-not-found-heading">
        <h1 id="public-job-not-found-heading">
          {t("publicJobs.notFoundHeading")}
        </h1>
        <p>{t("publicJobs.notFoundBody")}</p>
        <Link className={styles.cta} href="/jobs">
          {t("publicJobs.browse")}
        </Link>
      </section>
    </main>
  );
}

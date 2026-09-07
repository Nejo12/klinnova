"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./public-jobs.module.scss";

export function PublicJobsEmptyState() {
  const { t } = useLocale();

  return (
    <section
      className={styles.empty}
      aria-labelledby="public-jobs-empty-heading"
    >
      <h2 className={styles.emptyHeading} id="public-jobs-empty-heading">
        {t("publicJobs.emptyHeading")}
      </h2>
      <p className={styles.emptyBody}>{t("publicJobs.emptyBody")}</p>
    </section>
  );
}

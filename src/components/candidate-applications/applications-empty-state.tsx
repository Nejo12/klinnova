"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "@/components/candidate-applications/candidate-applications.module.scss";

export function ApplicationsEmptyState() {
  const { t } = useLocale();
  return (
    <section
      className={styles.empty}
      aria-labelledby="applications-empty-heading"
    >
      <h2 className={styles.emptyHeading} id="applications-empty-heading">
        {t("candidate.applications.emptyHeading")}
      </h2>
      <Link className={styles.link} href="/candidate/matches">
        {t("candidate.applications.browseMatches")}
      </Link>
    </section>
  );
}

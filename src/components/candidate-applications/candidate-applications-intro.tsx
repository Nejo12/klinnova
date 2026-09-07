"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "./candidate-applications.module.scss";

export function CandidateApplicationsIntro() {
  const { t } = useLocale();

  return (
    <div className={styles.headingCluster}>
      <h1 className={styles.heading}>{t("candidate.applications.heading")}</h1>
      <p className={styles.lead}>{t("candidate.applications.lead")}</p>
    </div>
  );
}

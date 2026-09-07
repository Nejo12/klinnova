"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import styles from "@/app/candidate/page.module.scss";

export function CandidateWelcome({ displayName }: { displayName: string }) {
  const { t } = useLocale();
  return (
    <h1 className={styles.heading}>
      {t("candidate.home.welcome")}, {displayName}
    </h1>
  );
}

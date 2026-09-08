"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { APPLICATION_UNAVAILABLE } from "@/lib/employer/applications/messages";

export function ApplicationUnavailable() {
  const { locale, t } = useLocale();
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>
        {locale === "de"
          ? "Bewerbung nicht verfügbar"
          : "Application unavailable"}
      </h1>
      <p className={styles.lead}>
        {locale === "de"
          ? "Diese Bewerbung ist nicht verfügbar oder gehört nicht zu Ihrem Arbeitgeberkonto."
          : APPLICATION_UNAVAILABLE}
      </p>
      <p className={styles.actions}>
        <Link className={styles.linkButton} href="/employer/applications">
          {t("employer.applications.back")}
        </Link>
      </p>
    </main>
  );
}

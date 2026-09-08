"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VACANCY_UNAVAILABLE } from "@/lib/employer/vacancies/messages";

export function VacancyUnavailable() {
  const { locale } = useLocale();
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>
        {locale === "de" ? "Stelle nicht verfügbar" : "Vacancy unavailable"}
      </h1>
      <p className={styles.lead}>
        {locale === "de"
          ? "Diese Stelle ist nicht verfügbar oder gehört nicht zu Ihrem Arbeitgeberkonto."
          : VACANCY_UNAVAILABLE}
      </p>
      <p className={styles.actions}>
        <Link className={styles.linkButton} href="/employer/vacancies">
          {locale === "de" ? "Zurück zu den Stellen" : "Back to vacancies"}
        </Link>
      </p>
    </main>
  );
}

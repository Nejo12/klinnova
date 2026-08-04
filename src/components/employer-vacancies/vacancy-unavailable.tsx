import Link from "next/link";

import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VACANCY_UNAVAILABLE } from "@/lib/employer/vacancies/messages";

export function VacancyUnavailable() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Vacancy draft unavailable</h1>
      <p className={styles.lead}>{VACANCY_UNAVAILABLE}</p>
      <p className={styles.actions}>
        <Link className={styles.linkButton} href="/employer/vacancies">
          Back to vacancies
        </Link>
      </p>
    </main>
  );
}

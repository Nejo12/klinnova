"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

import styles from "@/components/candidate-applications/candidate-applications.module.scss";

export function ApplicationsErrorState() {
  const { t } = useLocale();
  return (
    <section
      className={styles.error}
      aria-labelledby="applications-error-heading"
    >
      <h2 className={styles.errorHeading} id="applications-error-heading">
        {t("candidate.applications.errorHeading")}
      </h2>
      <p className={styles.errorBody}>
        {t("candidate.applications.errorBody")}
      </p>
      <Link className={styles.link} href="/candidate">
        {t("candidate.applications.backAccount")}
      </Link>
    </section>
  );
}

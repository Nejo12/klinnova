"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/locale-provider";
import { PublicJobCard } from "@/components/public-jobs/public-job-card";
import { PublicJobsEmptyState } from "@/components/public-jobs/public-jobs-empty-state";
import { PublicFooter } from "@/components/public-shared/public-footer";
import type { PublicVacancyListItem } from "@/lib/public-jobs/load-public-vacancies";
import { formatPublicVacancyCount } from "@/lib/public-jobs/messages";

import styles from "./public-jobs.module.scss";

type PublicJobsPageProps =
  { status: "success"; items: PublicVacancyListItem[] } | { status: "failure" };

export function PublicJobsPage(props: PublicJobsPageProps) {
  const { locale, t } = useLocale();

  return (
    <>
      <main className={styles.page}>
        <div className={styles.header}>
          <Link className={styles.brand} href="/">
            Klinnova
          </Link>
        </div>

        <h1 className={styles.heading}>{t("publicJobs.heading")}</h1>
        <p className={styles.lead}>{t("publicJobs.lead")}</p>

        {props.status === "failure" ? (
          <section
            className={styles.error}
            aria-labelledby="public-jobs-error-heading"
          >
            <h2 className={styles.errorHeading} id="public-jobs-error-heading">
              {t("publicJobs.failureHeading")}
            </h2>
            <p className={styles.errorBody}>{t("publicJobs.failureBody")}</p>
          </section>
        ) : props.items.length === 0 ? (
          <PublicJobsEmptyState />
        ) : (
          <>
            <p className={styles.count}>
              {formatPublicVacancyCount(props.items.length, locale)}
            </p>
            <ul className={styles.list}>
              {props.items.map((item) => (
                <li key={item.vacancy.vacancyId}>
                  <PublicJobCard item={item} />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <footer className={styles.footer}>
        <PublicFooter />
      </footer>
    </>
  );
}

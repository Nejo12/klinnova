"use client";

import Link from "next/link";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

const LIVE_SKELETON_COUNT = 2;
const NOT_LIVE_SKELETON_COUNT = 1;

function VacancyRowSkeleton() {
  return (
    <li className={`${styles.listItem} ${styles.vacancyRow}`}>
      <div className={styles.rowMain}>
        <Skeleton height="1.25rem" width="min(100%, 14rem)" radius="sm" />
        <Skeleton height="1rem" width="min(100%, 18rem)" radius="sm" />
        <Skeleton height="1.75rem" width="7rem" radius="pill" />
        <Skeleton height="1rem" width="min(100%, 22rem)" radius="sm" />
      </div>
      <div className={styles.rowActions}>
        <Skeleton height="2.75rem" width="6rem" radius="sm" />
      </div>
    </li>
  );
}

/**
 * Route-loading state for /employer/vacancies. Renders static chrome
 * (two-tier employer header, H1, lead, private notice, Create draft) and
 * skeletons only the data-dependent Live / Not live rows.
 *
 * Group counts, vacancy titles, lifecycle labels, readiness copy, dates,
 * and Manage/Edit/Delete controls stay unknown — those remain skeletons
 * or omitted. Create draft is a real static action, not a pretend
 * Publish/Edit control.
 */
export default function Loading() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="vacancies"
      />
      <h1 className={styles.heading}>{t("employer.vacancies.heading")}</h1>
      <div className={styles.pageIntro}>
        <div className={styles.pageIntroCopy}>
          <p className={styles.lead}>{t("employer.vacancies.listLead")}</p>
          <p className={styles.note}>
            {t("employer.vacancies.listPrivateNotice")}
          </p>
        </div>
        <p className={styles.pageIntroActions}>
          <Link className={styles.button} href="/employer/vacancies/new">
            {t("employer.vacancies.createDraft")}
          </Link>
        </p>
      </div>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.liveVacancies")}>
          <div className={`${styles.section} ${styles.vacancyGroup}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>
                {t("employer.vacancies.live")}
              </h2>
              <Skeleton height="1rem" width="1.5rem" radius="sm" />
            </div>
            <ul className={styles.list}>
              {Array.from({ length: LIVE_SKELETON_COUNT }, (_, index) => (
                <VacancyRowSkeleton key={index} />
              ))}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.notLiveVacancies")}>
          <div className={`${styles.section} ${styles.vacancyGroup}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>
                {t("employer.vacancies.notLive")}
              </h2>
              <Skeleton height="1rem" width="1.5rem" radius="sm" />
            </div>
            <ul className={styles.list}>
              {Array.from({ length: NOT_LIVE_SKELETON_COUNT }, (_, index) => (
                <VacancyRowSkeleton key={index} />
              ))}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

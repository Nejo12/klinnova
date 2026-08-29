import Link from "next/link";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  VACANCY_LIST_HEADING,
  VACANCY_LIST_LEAD,
  VACANCY_PRIVATE_NOTICE,
} from "@/lib/employer/vacancies/messages";

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
  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="vacancies"
      />
      <h1 className={styles.heading}>{VACANCY_LIST_HEADING}</h1>
      <div className={styles.pageIntro}>
        <div className={styles.pageIntroCopy}>
          <p className={styles.lead}>{VACANCY_LIST_LEAD}</p>
          <p className={styles.note}>{VACANCY_PRIVATE_NOTICE}</p>
        </div>
        <p className={styles.pageIntroActions}>
          <Link className={styles.button} href="/employer/vacancies/new">
            Create draft
          </Link>
        </p>
      </div>

      <DelayedReveal>
        <SkeletonRegion label="Loading live vacancies">
          <div className={`${styles.section} ${styles.vacancyGroup}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Live</h2>
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
        <SkeletonRegion label="Loading not-live vacancies">
          <div className={`${styles.section} ${styles.vacancyGroup}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionHeading}>Not live</h2>
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

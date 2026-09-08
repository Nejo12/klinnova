"use client";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { useLocale } from "@/components/i18n/locale-provider";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-verification/employer-verification.module.scss";

/**
 * Route-loading state for /employer/verification. Renders static chrome
 * (two-tier employer header, H1) and skeletons one state surface.
 *
 * Status labels, reasons, timestamps, and Request/Resubmit controls stay
 * unknown until loadEmployerProfile resolves — those remain omitted.
 */
export default function Loading() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="verification"
      />
      <h1 className={styles.heading}>{t("employer.verification.heading")}</h1>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.verificationStatus")}>
          <div className={styles.panel}>
            <Skeleton height="1.75rem" width="7rem" radius="pill" />
            <Skeleton height="1.5rem" width="min(100%, 22rem)" radius="sm" />
            <Skeleton height="1rem" width="min(100%, 34rem)" radius="sm" />
            <Skeleton height="1rem" width="min(100%, 28rem)" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

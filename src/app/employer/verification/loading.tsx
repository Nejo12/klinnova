import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import { VERIFICATION_PAGE_HEADING } from "@/lib/employer/verification/messages";

/**
 * Route-loading state for /employer/verification. Renders static chrome
 * (two-tier employer header, H1) and skeletons one state surface.
 *
 * Status labels, reasons, timestamps, and Request/Resubmit controls stay
 * unknown until loadEmployerProfile resolves — those remain omitted.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={false}
        showEmployer={true}
        currentPath="verification"
      />
      <h1 className={styles.heading}>{VERIFICATION_PAGE_HEADING}</h1>

      <DelayedReveal>
        <SkeletonRegion label="Loading verification status">
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

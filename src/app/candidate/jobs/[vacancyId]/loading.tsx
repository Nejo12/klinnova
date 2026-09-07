"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/candidate-job-detail/candidate-job-detail.module.scss";

// Paired label+value skeleton matching the two-column `.metaRow` grid that
// VacancyFactChips and the "Job details" `<dl>` actually render
// (src/components/public-jobs/vacancy-fact-chips.tsx and
// candidate-job-detail-page.tsx), rather than a single full-width bar.
function MetaRowSkeleton({
  labelWidth,
  valueWidth,
}: {
  labelWidth: string;
  valueWidth: string;
}) {
  return (
    <div className={styles.metaRow}>
      <Skeleton height="0.875rem" width={labelWidth} radius="sm" />
      <Skeleton height="1rem" width={valueWidth} radius="sm" />
    </div>
  );
}

/**
 * Route-loading state for /candidate/jobs/[vacancyId]. Skeletons the
 * job-detail fields that are genuinely data-driven — title, source badge,
 * employer line, the "Job details" fact rows, and the description
 * paragraphs — at the real component's geometry. The header/nav and the
 * "Back to matches" link are interactive chrome, left out entirely (a
 * skeleton must never render a fake link). The eligibility/application
 * section below the description is skipped too: which of the three
 * mutually-exclusive branches (applied / eligible / missing requirements)
 * will render is itself unknown until the request resolves, and two of
 * those three render interactive controls a skeleton may not fabricate.
 *
 * The real page (CandidateJobDetailPage) has four distinct top-level
 * children under `<main className={styles.page}>` for the fields skeletoned
 * here — the title row, the employer line, the "Job details" section, and
 * the "About this job" section — each individually gapped by `.page`'s
 * `gap: var(--space-5)`/`var(--space-6)`. A single DelayedReveal/
 * SkeletonRegion pair around all four (as this file used to have) makes
 * them one child of `.page`, so that gap never applies between them. One
 * pair per genuinely distinct region restores it.
 */
export default function Loading() {
  const { t } = useLocale();
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label={t("candidate.loading.jobTitle")}>
          <div className={styles.titleRow}>
            <Skeleton height="2.25rem" width="60%" radius="sm" />
            <div className={styles.badgeGroup}>
              <Skeleton height="1.5rem" width="7rem" radius="sm" />
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("candidate.loading.employer")}>
          <Skeleton height="1.25rem" width="45%" radius="sm" />
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("candidate.loading.jobDetails")}>
          <div className={styles.section}>
            <Skeleton height="1.25rem" width="9rem" radius="sm" />
            <div className={styles.meta}>
              <MetaRowSkeleton labelWidth="5.5rem" valueWidth="80%" />
              <MetaRowSkeleton labelWidth="5rem" valueWidth="65%" />
              <MetaRowSkeleton labelWidth="4.5rem" valueWidth="70%" />
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("candidate.loading.jobDescription")}>
          <div className={styles.section}>
            <Skeleton height="1.25rem" width="10rem" radius="sm" />
            <Skeleton height="1rem" width="100%" radius="sm" />
            <Skeleton height="1rem" width="100%" radius="sm" />
            <Skeleton height="1rem" width="80%" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

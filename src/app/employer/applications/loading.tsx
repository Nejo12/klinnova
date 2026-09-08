"use client";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-applications/employer-applications.module.scss";

// Representative counts, not a claim about how many applications actually
// fall into each group — the real split (and whether the list is empty
// altogether, in which case ApplicationList renders an empty state instead)
// is exactly what's unknown until loadEmployerApplications resolves.
const NEEDS_REVIEW_SKELETON_COUNT = 2;
const OPEN_SKELETON_COUNT = 1;
const DECIDED_SKELETON_COUNT = 1;

// ApplicationListRow renders a compact triage grid: candidate, vacancy,
// factual fit/availability line, submitted timestamp, status badge, and
// Review action. Values are unknown pre-load, so every visible datum is a
// skeleton rather than an illustrative candidate/status/count.
function ApplicationRowSkeleton() {
  return (
    <li className={styles.listItem}>
      <Skeleton height="1.125rem" width="55%" radius="sm" />
      <Skeleton height="1rem" width="70%" radius="sm" />
      <Skeleton height="1rem" width="min(100%, 22rem)" radius="sm" />
      <Skeleton height="0.85rem" width="10rem" radius="sm" />
      <Skeleton height="1.75rem" width="6rem" radius="pill" />
      <div className={styles.actions}>
        <Skeleton height="2.75rem" width="6rem" radius="sm" />
      </div>
    </li>
  );
}

/**
 * Route-loading state for /employer/applications. Skeletons the page
 * hierarchy, informational count chips, quiet filter controls, and the
 * Needs review / Open / Decided triage groups at `ApplicationList`'s real
 * row geometry.
 *
 * Left out entirely because their structure is data-dependent:
 * - the summary and group counts — unknown pre-load
 * - the empty-list state (whether it's empty is itself the unresolved
 *   question)
 * - candidate identities, vacancy titles, status labels, timestamps, and
 *   availability details
 */
export default function Loading() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applications")}>
          <div className={styles.pageIntro}>
            <Skeleton height="2.25rem" width="45%" radius="sm" />
            <Skeleton height="1rem" width="70%" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applicationSummary")}>
          <ul className={styles.summaryList}>
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className={styles.summaryChip}>
                <Skeleton height="0.75rem" width="5rem" radius="sm" />
              </li>
            ))}
          </ul>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applicationFilters")}>
          <div className={styles.filterPanel}>
            <div className={styles.filterForm}>
              <div className={styles.field}>
                <Skeleton height="0.875rem" width="7rem" radius="sm" />
                <Skeleton
                  height="2.75rem"
                  width="min(100%, 18rem)"
                  radius="sm"
                />
              </div>
              <div className={styles.filterActions}>
                <Skeleton height="2.75rem" width="7rem" radius="sm" />
              </div>
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applicationsNeedsReview")}>
          <div className={styles.section} data-priority="primary">
            <div className={styles.sectionHeader}>
              <Skeleton height="1.25rem" width="9rem" radius="sm" />
              <Skeleton height="1rem" width="2rem" radius="sm" />
            </div>
            <ul className={styles.list}>
              {Array.from(
                { length: NEEDS_REVIEW_SKELETON_COUNT },
                (_, index) => (
                  <ApplicationRowSkeleton key={index} />
                ),
              )}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applicationsOpen")}>
          <div className={styles.section} data-priority="quiet">
            <div className={styles.sectionHeader}>
              <Skeleton height="1.25rem" width="5rem" radius="sm" />
              <Skeleton height="1rem" width="2rem" radius="sm" />
            </div>
            <ul className={styles.list}>
              {Array.from({ length: OPEN_SKELETON_COUNT }, (_, index) => (
                <ApplicationRowSkeleton key={index} />
              ))}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applicationsDecided")}>
          <div className={styles.section} data-priority="quiet">
            <div className={styles.sectionHeader}>
              <Skeleton height="1.25rem" width="6rem" radius="sm" />
              <Skeleton height="1rem" width="2rem" radius="sm" />
            </div>
            <ul className={styles.list}>
              {Array.from({ length: DECIDED_SKELETON_COUNT }, (_, index) => (
                <ApplicationRowSkeleton key={index} />
              ))}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/public-jobs/public-job-detail.module.scss";

// Paired label+value skeleton matching the two-column `.metaRow` grid the
// real "Job details" `<dl>` renders (public-job-detail.module.scss).
// PublicJobDetailPage builds its meta rows inline rather than through the
// shared VacancyFactChips component, so this reuses the page's own module
// classes directly instead of importing vacancy-fact-chips.module.scss.
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
 * Route-loading state for /jobs/[vacancyId]. Skeletons the job-detail
 * fields that are genuinely data-driven — title, employer line, the
 * "Job details" fact rows, and the description paragraphs — at the real
 * component's geometry.
 *
 * Left out entirely:
 * - the brand-link header and "Back to jobs" link — interactive chrome, a
 *   skeleton must never fabricate a link.
 * - the source-demo badge next to the title — conditional on
 *   `vacancy.source === "seed"`, unknown pre-load.
 * - the "Additional languages" section — whether it renders at all depends
 *   on `languages.length > 0`, unknown pre-load.
 * - the external "Employer website" link — conditional on `vacancy.website`
 *   and itself an interactive control.
 * - `ApplicationEntryNotice` — per the P3.5 discovery note, its label and
 *   href depend on `authenticated`, which resolves from a second,
 *   sequential `getUser()` call after `getDetail()`. This task skeletons
 *   the content region only and does not touch that data-loading shape.
 *   It also renders an interactive CTA link, which a skeleton must never
 *   fabricate regardless.
 *
 * The real page (PublicJobDetailPage) has four distinct top-level children
 * under `<main className={styles.page}>` for the fields skeletoned here —
 * the title row, the employer line, the "Job details" section, and the
 * "About this job" section — each individually gapped by `.page`'s
 * `gap: var(--space-5)`/`var(--space-6)`. One DelayedReveal/SkeletonRegion
 * pair per section keeps that gap genuinely in effect between them,
 * rather than collapsing to 0 under one shared wrapper.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading job title">
          <Skeleton height="2.25rem" width="60%" radius="sm" />
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading employer name">
          <Skeleton height="1.25rem" width="45%" radius="sm" />
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading job details">
          <div className={styles.section}>
            <Skeleton height="1.25rem" width="9rem" radius="sm" />
            <div className={styles.meta}>
              <MetaRowSkeleton labelWidth="6rem" valueWidth="80%" />
              <MetaRowSkeleton labelWidth="5.5rem" valueWidth="60%" />
              <MetaRowSkeleton labelWidth="6.5rem" valueWidth="65%" />
              <MetaRowSkeleton labelWidth="6rem" valueWidth="55%" />
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading job description">
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

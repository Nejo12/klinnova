import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import factStyles from "@/components/public-jobs/vacancy-fact-chips.module.scss";
import styles from "@/components/public-jobs/public-jobs.module.scss";

// Representative count, not a claim about how many vacancies actually
// exist — the real count is exactly what's unknown until
// loadPublicVacancies resolves.
const JOB_CARD_SKELETON_COUNT = 3;

// Paired label+value skeleton matching the two-column `.metaRow` grid that
// VacancyFactChips actually renders (src/components/public-jobs/
// vacancy-fact-chips.tsx) — public-jobs.module.scss has no metaRow class
// of its own, since PublicJobCard delegates the fact-row markup to that
// shared component and its own module.
function MetaRowSkeleton({
  labelWidth,
  valueWidth,
}: {
  labelWidth: string;
  valueWidth: string;
}) {
  return (
    <div className={factStyles.metaRow}>
      <Skeleton height="0.875rem" width={labelWidth} radius="sm" />
      <Skeleton height="1rem" width={valueWidth} radius="sm" />
    </div>
  );
}

/**
 * Route-loading state for /jobs. Skeletons only the genuinely data-driven
 * part of the page: the result count and the vacancy card list.
 *
 * Left out entirely:
 * - the brand-link header, and the page heading/lead ("Jobs in Berlin that
 *   don't require fluent German" copy) — static text the real page renders
 *   identically regardless of loadPublicVacancies' outcome. Per the same
 *   call made in candidate/matches/loading.tsx ("static chrome the real
 *   page renders regardless of the vacancies query's outcome"), it's left
 *   out rather than re-typed verbatim into a second file that would then
 *   need to be kept in sync with the real copy.
 * - which of the three mutually-exclusive states (failure / empty / list)
 *   actually resolves — unknown pre-load. This skeletons the populated-list
 *   guess, matching the precedent set by the matches/vacancies loading
 *   states elsewhere in this phase.
 * - each card's demo-source badge and language list — both conditional on
 *   data not yet available — and the "View job" link, an interactive
 *   control a skeleton must never fabricate.
 *
 * The real page (PublicJobsPage) renders `<p className={styles.count}>`
 * and `<ul className={styles.list}>` as two separate direct children of
 * `<main className={styles.page}>` in the populated branch (a Fragment,
 * not a wrapping element, sits between them), each individually gapped by
 * `.page`'s `gap: var(--space-5)`/`var(--space-6)`. One DelayedReveal/
 * SkeletonRegion pair per child keeps that gap genuinely in effect between
 * them, rather than collapsing to 0 under one shared wrapper.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading job count">
          <Skeleton height="1.125rem" width="9rem" radius="sm" />
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading jobs">
          <ul className={styles.list}>
            {Array.from({ length: JOB_CARD_SKELETON_COUNT }, (_, index) => (
              <li key={index}>
                <div className={styles.card}>
                  <Skeleton height="1.375rem" width="70%" radius="sm" />
                  <Skeleton height="1rem" width="45%" radius="sm" />
                  <div className={factStyles.meta}>
                    <MetaRowSkeleton labelWidth="5.5rem" valueWidth="75%" />
                    <MetaRowSkeleton labelWidth="5rem" valueWidth="55%" />
                    <MetaRowSkeleton labelWidth="6rem" valueWidth="65%" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

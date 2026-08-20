import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import factStyles from "@/components/public-jobs/vacancy-fact-chips.module.scss";
import styles from "@/components/public-jobs/public-jobs.module.scss";
import {
  PUBLIC_JOBS_HEADING,
  PUBLIC_JOBS_LEAD,
} from "@/lib/public-jobs/messages";

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
 * Route-loading state for /jobs. Renders the static heading/lead for real
 * (imported straight from the same source PublicJobsPage uses) and
 * skeletons only the genuinely data-driven part of the page: the result
 * count and the vacancy card list.
 *
 * Next.js wraps the whole /jobs page.tsx subtree in a single Suspense
 * boundary — there is no nested Suspense inside PublicJobsPage — so this
 * fallback and the real tree swap atomically, in one shot. PUBLIC_JOBS_
 * HEADING/PUBLIC_JOBS_LEAD never depend on loadPublicVacancies' outcome,
 * so rendering them here (rather than skeletoning or omitting them) means
 * the real h1/lead never pops in above the count/list on swap, and this
 * copy can't drift out of sync with the real page since it's the same
 * imported constants.
 *
 * Still left out:
 * - the brand-link header — genuinely static chrome, but not implicated in
 *   the heading/lead content-relocation finding this fix addresses.
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
      <h1 className={styles.heading}>{PUBLIC_JOBS_HEADING}</h1>
      <p className={styles.lead}>{PUBLIC_JOBS_LEAD}</p>

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

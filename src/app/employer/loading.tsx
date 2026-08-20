import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

// A representative count for the vacancies mini-list — the real count (and
// whether the list is empty at all, in which case a different empty-state
// message renders instead) is exactly what's unknown until
// loadEmployerDrafts resolves, so this isn't a claim about how many
// vacancies actually exist.
const VACANCY_MINI_LIST_SKELETON_COUNT = 2;

/**
 * Route-loading state for /employer. Every value on this page — the
 * welcome heading, the meta list, the vacancies mini-list — sits behind one
 * sequential await chain (profile -> capabilities -> unseen count ->
 * drafts) before any JSX renders, so the whole content region's geometry,
 * not just individually-async values, is unknown until it resolves.
 *
 * Left out entirely because their STRUCTURE (not just their values) is
 * data-dependent:
 * - the "Organisation company" meta line (only for organisation employers)
 * - the single attention slot (unseen applications vs. verification notice
 *   vs. nothing at all — mutually exclusive, and often nothing renders)
 * - the "Vacancies needing attention" section (only for drafts that are
 *   incomplete; most employers have none)
 * - the vacancies mini-list's own empty state (whether the list is empty
 *   is itself the unresolved question)
 *
 * The header/nav (`EmployerVacancyPageHeader`) is per-page chrome outside
 * this content region — every loading.tsx under /employer shares this
 * convention (see the P3.6 Task C report for why there's no shared layout
 * to preserve it across the swap).
 */
// This route's real content region (src/app/employer/page.tsx) is a
// flat run of `<main className={styles.page}>` direct children — `.page`
// is `display: flex; flex-direction: column; gap: var(--space-6)`, and
// that gap only applies BETWEEN direct children. Wrapping the whole
// content run in one DelayedReveal/SkeletonRegion pair (as this file used
// to) makes it a single child of `.page`, so the gap never reaches the
// sections inside it. Splitting into one pair per genuinely distinct
// top-level region — matching the real page's own grouping — restores
// that spacing. Each region keeps its own aria-busy announcement; see
// SkeletonRegion's doc for why that's an acceptable trade (this page's
// load is atomically sequential, but announcing per-region is still
// accurate, just more granular than strictly necessary).
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading employer home">
          <Skeleton height="2.25rem" width="55%" radius="sm" />
          <Skeleton height="1.125rem" width="70%" radius="sm" />

          <ul className={styles.meta}>
            <li>
              <Skeleton height="0.875rem" width="10rem" radius="sm" />
            </li>
            <li>
              <Skeleton height="0.875rem" width="7rem" radius="sm" />
            </li>
            <li>
              <Skeleton height="0.875rem" width="9rem" radius="sm" />
            </li>
          </ul>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading actions">
          <div className={styles.actions}>
            <Skeleton height="2.75rem" width="7rem" radius="sm" />
            <Skeleton height="2.75rem" width="7rem" radius="sm" />
            <Skeleton height="2.75rem" width="7rem" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading vacancies">
          <div className={styles.section}>
            <Skeleton height="1.25rem" width="10rem" radius="sm" />
            <ul className={styles.list}>
              {Array.from(
                { length: VACANCY_MINI_LIST_SKELETON_COUNT },
                (_, index) => (
                  <li key={index} className={styles.listItem}>
                    <Skeleton height="1.125rem" width="60%" radius="sm" />
                    <ul className={styles.meta}>
                      <li>
                        <Skeleton height="0.8rem" width="8rem" radius="sm" />
                      </li>
                      <li>
                        <Skeleton height="0.8rem" width="6rem" radius="sm" />
                      </li>
                    </ul>
                  </li>
                ),
              )}
            </ul>
            <div className={styles.actions}>
              <Skeleton height="2.75rem" width="7rem" radius="sm" />
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading account data">
          <Skeleton height="1.5rem" width="8rem" radius="sm" />
          <Skeleton height="1rem" width="85%" radius="sm" />
          <div className={styles.actions}>
            <Skeleton height="2.75rem" width="9rem" radius="sm" />
            <Skeleton height="2.75rem" width="8rem" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

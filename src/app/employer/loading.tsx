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

          <div className={styles.actions}>
            <Skeleton height="2.75rem" width="7rem" radius="sm" />
            <Skeleton height="2.75rem" width="7rem" radius="sm" />
            <Skeleton height="2.75rem" width="7rem" radius="sm" />
          </div>

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

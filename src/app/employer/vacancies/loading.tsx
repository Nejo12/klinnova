import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

// Representative counts, not a claim about how many vacancies exist in
// either group — the real split (and whether the list is empty altogether,
// in which case VacancyList renders one of two empty states instead) is
// exactly what's unknown until loadEmployerDrafts resolves.
const LIVE_SKELETON_COUNT = 2;
const NOT_LIVE_SKELETON_COUNT = 1;

// VacancyListRow's `.meta` list renders single-line "Label: value" text
// items (not a two-column grid — employer-vacancies.module.scss has no
// `.metaRow`-style class), so each row gets one Skeleton bar, matching that
// real shape rather than a paired label/value block. Six lines, not four:
// of the eight possible meta lines (Category, Locality, Employer type,
// Company, Status, Expires, Next, Updated), Company and Expires are the
// only genuinely conditional ones — the other six always render, per
// `VacancyListRow` in vacancy-list.tsx.
function VacancyRowSkeleton() {
  return (
    <li className={styles.listItem}>
      <Skeleton height="1.125rem" width="55%" radius="sm" />
      <ul className={styles.meta}>
        <li>
          <Skeleton height="0.8rem" width="9rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="7rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="10rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="6rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="8rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="9rem" radius="sm" />
        </li>
      </ul>
      <div className={styles.actions}>
        <Skeleton height="2.75rem" width="6rem" radius="sm" />
      </div>
    </li>
  );
}

/**
 * Route-loading state for /employer/vacancies. Skeletons `VacancyList`'s
 * lead/notice text and the Live/Not-live row groups at their real
 * `.listItem`/`.meta` geometry.
 *
 * Left out entirely because their structure is data-dependent:
 * - `EmployerRestrictedNotice` (only for suspended employers)
 * - the group heading counts ("Live (N)") — N is unknown pre-load
 * - either empty state (no vacancies yet / not verified) — whether the
 *   list is empty at all is itself the unresolved question
 * - each row's consequence sentence and Edit/Delete links, both of which
 *   depend on `publicationState`, unknown per-row until the request
 *   resolves
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading vacancies">
          <Skeleton height="2.25rem" width="40%" radius="sm" />
          <Skeleton height="1rem" width="65%" radius="sm" />
          <Skeleton height="0.875rem" width="50%" radius="sm" />
          <div className={styles.actions}>
            <Skeleton height="2.75rem" width="8rem" radius="sm" />
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="6rem" radius="sm" />
            <ul className={styles.list}>
              {Array.from({ length: LIVE_SKELETON_COUNT }, (_, index) => (
                <VacancyRowSkeleton key={index} />
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="7rem" radius="sm" />
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

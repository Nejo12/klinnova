import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  VACANCY_LIST_HEADING,
  VACANCY_LIST_LEAD,
  VACANCY_PRIVATE_NOTICE,
} from "@/lib/employer/vacancies/messages";

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
 * Route-loading state for /employer/vacancies. Renders the static
 * heading/lead/note for real (imported straight from the same sources
 * `EmployerVacanciesPage`/`VacancyList` use) and skeletons only the
 * genuinely data-driven Live/Not-live row groups, at their real
 * `.listItem`/`.meta` geometry.
 *
 * `VacancyList` renders its lead/note (and the "Create draft" actions row)
 * unconditionally, before branching on `drafts.length` — none of the three
 * depend on `loadEmployerDrafts`'s outcome — so rendering the heading/lead/
 * note here for real means they never pop in above the row-group skeletons
 * on swap, and this copy can't drift out of sync with the real page since
 * it's the same imported constants (the same fix already applied to
 * `src/app/jobs/loading.tsx`; Task F re-audit, P3.6).
 *
 * The "Create draft" actions row is left as a skeleton bar below — also
 * static, but out of this fix's assigned scope (heading/lead/note only).
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
// The real page (src/app/employer/vacancies/page.tsx, via VacancyList) has
// six distinct top-level children under `<main className={styles.page}>`:
// heading, lead, note, the top actions row, the Live group, and the
// Not-live group — each individually gapped by `.page`'s
// `gap: var(--space-6)`. A single DelayedReveal/SkeletonRegion pair around
// all of it (as this file used to have) makes them one child of `.page`,
// so that gap never applies between them. One pair per genuinely distinct
// region restores it.
export default function Loading() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{VACANCY_LIST_HEADING}</h1>
      <p className={styles.lead}>{VACANCY_LIST_LEAD}</p>
      <p className={styles.note}>{VACANCY_PRIVATE_NOTICE}</p>

      <DelayedReveal>
        <SkeletonRegion label="Loading actions">
          <div className={styles.actions}>
            <Skeleton height="2.75rem" width="8rem" radius="sm" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading live vacancies">
          <div className={styles.section}>
            <Skeleton height="1.25rem" width="6rem" radius="sm" />
            <ul className={styles.list}>
              {Array.from({ length: LIVE_SKELETON_COUNT }, (_, index) => (
                <VacancyRowSkeleton key={index} />
              ))}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label="Loading not-live vacancies">
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

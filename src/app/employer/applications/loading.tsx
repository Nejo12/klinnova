import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

// Representative counts, not a claim about how many applications actually
// fall into each group — the real split (and whether the list is empty
// altogether, in which case ApplicationList renders an empty state instead)
// is exactly what's unknown until loadEmployerApplications resolves.
const NEEDS_REVIEW_SKELETON_COUNT = 2;
const OPEN_SKELETON_COUNT = 1;
const DECIDED_SKELETON_COUNT = 1;

// ApplicationListRow's `.meta` list renders single-line "Label: value" text
// items (not a two-column grid — employer-vacancies.module.scss has no
// `.metaRow`-style class), so each row gets one Skeleton bar per line,
// matching that real shape rather than a paired label/value block. Six
// lines — Vacancy, Matched category, German comfort, Available from,
// Status, Submitted — the typical, higher-fidelity case per
// `ApplicationListRow` in application-list.tsx: those last three lines
// disappear only when `candidate_deleted` is true, which — like the
// applicant-detail skeleton's identical assumption on the confirmation
// route — is unknown pre-load, so the common case is skeletoned rather
// than the shorter deleted-candidate branch.
function ApplicationRowSkeleton() {
  return (
    <li className={styles.listItem}>
      <Skeleton height="1.125rem" width="55%" radius="sm" />
      <ul className={styles.meta}>
        <li>
          <Skeleton height="0.8rem" width="10rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="8rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="9rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="6rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="11rem" radius="sm" />
        </li>
        <li>
          <Skeleton height="0.8rem" width="7rem" radius="sm" />
        </li>
      </ul>
      <div className={styles.actions}>
        <Skeleton height="2.75rem" width="6rem" radius="sm" />
      </div>
    </li>
  );
}

/**
 * Route-loading state for /employer/applications. Skeletons the page
 * heading/lead and the Needs review / Open / Decided row groups at
 * `ApplicationList`'s real `.listItem`/`.meta` geometry.
 *
 * Left out entirely because their structure is data-dependent:
 * - `ApplicationListFilters` (interactive filter controls, not loaded data)
 * - the group heading counts ("Needs review (N)") — N is unknown pre-load
 * - the empty-list state (whether it's empty is itself the unresolved
 *   question)
 * - each row's language/proficiency/available-from lines when
 *   `candidate_deleted` is true — unknown per-row until the request
 *   resolves, so the typical (non-deleted) row shape is skeletoned instead
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading applications">
          <Skeleton height="2.25rem" width="45%" radius="sm" />
          <Skeleton height="1rem" width="70%" radius="sm" />

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="9rem" radius="sm" />
            <ul className={styles.list}>
              {Array.from(
                { length: NEEDS_REVIEW_SKELETON_COUNT },
                (_, index) => (
                  <ApplicationRowSkeleton key={index} />
                ),
              )}
            </ul>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="5rem" radius="sm" />
            <ul className={styles.list}>
              {Array.from({ length: OPEN_SKELETON_COUNT }, (_, index) => (
                <ApplicationRowSkeleton key={index} />
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="6rem" radius="sm" />
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

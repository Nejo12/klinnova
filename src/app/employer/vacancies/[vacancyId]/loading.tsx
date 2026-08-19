import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

// Mirrors the fixed, unconditional `<dl><div><dt/dd></div></dl>` rows
// VacancyDetail always renders (Title, Category, Berlin public locality,
// Employer type, Description, Workplace type, Work frequency, Available
// from, Salary, CV required, Interview in English, Experience notes,
// Language requirements) — 13 rows, the ROW STRUCTURE is static per the
// component, only the VALUES are unknown until loadEmployerVacancy
// resolves. The one genuinely conditional row ("Company", organisation
// employers only) is deliberately not represented here.
const VACANCY_DETAIL_ROW_COUNT = 13;

// employer-vacancies.module.scss's `.detailList` stacks a bare `<dt>` over
// a bare `<dd>` inside an unclassed wrapper `<div>` — there is no
// `.metaRow`-style two-column grid class on this surface (confirmed by
// reading the module directly), so each row here is two stacked Skeleton
// blocks, not a paired label|value grid.
function DetailRowSkeleton({
  labelWidth,
  valueWidth,
}: {
  labelWidth: string;
  valueWidth: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
      }}
    >
      <Skeleton height="0.875rem" width={labelWidth} radius="sm" />
      <Skeleton height="1rem" width={valueWidth} radius="sm" />
    </div>
  );
}

/**
 * Route-loading state for /employer/vacancies/[vacancyId]. Skeletons the
 * page title and the always-present detail list at `VacancyDetail`'s real
 * `.detailList` geometry.
 *
 * Left out entirely because their structure is data-dependent on
 * `publicationState`/readiness, unknown pre-load:
 * - `VacancyLifecycleStatus`'s conditional support/warning lines (only its
 *   unconditional heading + status badge are skeletoned)
 * - the "Edit vacancy" action (only for draft/paused vacancies)
 * - `ReadinessChecklist` (only rendered for draft vacancies)
 * - `VacancyLifecycleActions` (which action forms show depends entirely on
 *   `publicationState`; they're also interactive controls a skeleton must
 *   never fabricate)
 * - `DeleteDraftForm` (draft vacancies only)
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading vacancy">
          <Skeleton height="2.25rem" width="60%" radius="sm" />

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="5rem" radius="sm" />
            <Skeleton height="1.5rem" width="8rem" radius="sm" />
          </div>

          <div className={styles.actions}>
            <Skeleton height="2.75rem" width="8rem" radius="sm" />
          </div>

          <div className={styles.detailList}>
            {Array.from({ length: VACANCY_DETAIL_ROW_COUNT }, (_, index) => (
              <DetailRowSkeleton
                key={index}
                labelWidth="9rem"
                valueWidth="65%"
              />
            ))}
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

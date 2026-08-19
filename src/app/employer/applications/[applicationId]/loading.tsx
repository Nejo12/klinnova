import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";

// Mirrors the fixed, unconditional `<dl><div><dt/dd></div></dl>` rows
// `ApplicationDetail`'s "Applicant" section renders when the candidate has
// not been deleted (Name, Matched category, German comfort, Languages,
// Work permission, Available from, Availability, Employment types) — the
// typical, higher-fidelity case. Whether `candidate_deleted` is true is
// itself unknown pre-load; that branch instead collapses to a single Name
// row plus a support notice, which this skeleton does not attempt to
// predict.
const APPLICANT_ROW_COUNT = 8;
// "Vacancy" section rows (Title, Submitted, Current status) — always
// rendered regardless of candidate state.
const VACANCY_ROW_COUNT = 3;
// A representative count for status history — every application has at
// least one "Submitted" event (from_status === null), but the real count
// is unknown until the history query resolves.
const STATUS_HISTORY_ROW_COUNT = 2;

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
 * Route-loading state for /employer/applications/[applicationId] — per
 * P3.5 discovery Section 6, this is the one real measured outlier in the
 * employer app (94.8ms server / 129.5ms total, vs. 55-80ms elsewhere), so
 * an honest loading state matters most here (this task does not change
 * that latency — P3.7's job).
 *
 * Nothing in this component streams partially: the route awaits the full
 * chain (suspension check -> application -> mark-seen -> capabilities ->
 * unseen count -> outcomes) before returning any JSX, so every value below
 * is genuinely unknown until the request resolves.
 *
 * Left out entirely, because rendering them would mean guessing at
 * structure the data hasn't confirmed yet:
 * - the "First opened" notice (only shown once `employer_seen_at` is set)
 * - `ApplicationStatusActions` (which transition buttons show depends
 *   entirely on `current_status`/`allowed_transitions`; they're also
 *   interactive controls a skeleton must never fabricate)
 * - `ApplicationOutcomeHistory` (only renders entries when outcomes are
 *   non-empty; most applications have none, mirroring the equivalent
 *   candidate-side "outcomes timeline" exclusion)
 *
 * `RecordOutcomeForm` is always rendered regardless of application data
 * (its own shape — an outcome select, a date input, a submit button — is
 * static), so its footprint is skeletoned to avoid a layout jump when it
 * mounts, using plain blocks rather than any real `<select>`/`<input>`/
 * `<button>`.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading application">
          <Skeleton height="2.25rem" width="50%" radius="sm" />

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="6rem" radius="sm" />
            <div className={styles.detailList}>
              {Array.from({ length: APPLICANT_ROW_COUNT }, (_, index) => (
                <DetailRowSkeleton
                  key={index}
                  labelWidth="8rem"
                  valueWidth="60%"
                />
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="6rem" radius="sm" />
            <div className={styles.detailList}>
              {Array.from({ length: VACANCY_ROW_COUNT }, (_, index) => (
                <DetailRowSkeleton
                  key={index}
                  labelWidth="7rem"
                  valueWidth="55%"
                />
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="9rem" radius="sm" />
            <ul className={styles.list}>
              {Array.from({ length: STATUS_HISTORY_ROW_COUNT }, (_, index) => (
                <li key={index} className={styles.listItem}>
                  <Skeleton height="1.125rem" width="45%" radius="sm" />
                  <ul className={styles.meta}>
                    <li>
                      <Skeleton height="0.8rem" width="9rem" radius="sm" />
                    </li>
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="10rem" radius="sm" />
            <div className={styles.field}>
              <Skeleton height="0.875rem" width="4rem" radius="sm" />
              <Skeleton height="2.75rem" width="100%" radius="sm" />
            </div>
            <div className={styles.field}>
              <Skeleton height="0.875rem" width="3rem" radius="sm" />
              <Skeleton height="2.75rem" width="100%" radius="sm" />
            </div>
            <div className={styles.actions}>
              <Skeleton height="2.75rem" width="9rem" radius="sm" />
            </div>
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

"use client";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { useLocale } from "@/components/i18n/locale-provider";
import styles from "@/components/employer-applications/employer-applications.module.scss";

// Mirrors the fixed, unconditional `<dl><div><dt/dd></div></dl>` rows
// `ApplicationDetail`'s "Applicant essentials" section renders when the candidate has
// not been deleted (Matched category, German comfort, Languages, Work
// permission, Available from, Availability, Employment types) — the
// typical, higher-fidelity case. Whether `candidate_deleted` is true is
// itself unknown pre-load; that branch instead collapses to a single Name
// row plus a support notice, which this skeleton does not attempt to
// predict.
const APPLICANT_ROW_COUNT = 7;
// A representative count for status history — every application has at
// least one "Submitted" event (from_status === null), but the real count
// is unknown until the history query resolves.
const STATUS_HISTORY_ROW_COUNT = 2;

// employer-applications.module.scss's detail rows use the same label/value
// structure as the real detail surface, while keeping every dynamic value as
// a skeleton until the application authority has loaded.
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
 * - real status transition buttons (which buttons show depends entirely on
 *   `current_status`/`allowed_transitions`; a skeleton must never fabricate
 *   them)
 * - concrete `ApplicationOutcomeHistory` entries
 *
 * `RecordOutcomeForm` is always rendered regardless of application data
 * (its own shape — an outcome select, a date input, a submit button — is
 * static), so its footprint is skeletoned to avoid a layout jump when it
 * mounts, using plain blocks rather than any real `<select>`/`<input>`/
 * `<button>`.
 */
export default function Loading() {
  const { t } = useLocale();

  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.application")}>
          <div className={styles.detailBackShell}>
            <Skeleton height="1rem" width="10rem" radius="sm" />
          </div>
          <div className={styles.detailHeader}>
            <div className={styles.pageIntro}>
              <Skeleton height="2.25rem" width="min(18rem, 70%)" radius="sm" />
              <Skeleton height="1rem" width="min(26rem, 90%)" radius="sm" />
            </div>
            <Skeleton height="1.75rem" width="6rem" radius="pill" />
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.applicantReview")}>
          <div className={styles.detailGrid}>
            <div className={styles.detailMain}>
              <section className={styles.section}>
                <Skeleton height="1.25rem" width="11rem" radius="sm" />
                <div className={styles.detailList}>
                  {Array.from({ length: APPLICANT_ROW_COUNT }, (_, index) => (
                    <DetailRowSkeleton
                      key={index}
                      labelWidth="8rem"
                      valueWidth="60%"
                    />
                  ))}
                </div>
                <div className={styles.historyBlock}>
                  <Skeleton height="1.125rem" width="9rem" radius="sm" />
                  <ul className={styles.historyList}>
                    {Array.from(
                      { length: STATUS_HISTORY_ROW_COUNT },
                      (_, index) => (
                        <li key={index} className={styles.historyItem}>
                          <Skeleton height="1rem" width="45%" radius="sm" />
                          <Skeleton height="0.8rem" width="9rem" radius="sm" />
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </section>
            </div>

            <aside className={styles.detailSide}>
              <section className={styles.section}>
                <Skeleton height="1.25rem" width="5rem" radius="sm" />
                <Skeleton height="0.75rem" width="7rem" radius="sm" />
                <Skeleton height="1.5rem" width="8rem" radius="sm" />
                <div className={styles.divider} />
                <Skeleton height="0.875rem" width="6rem" radius="sm" />
                <Skeleton height="2.75rem" width="100%" radius="sm" />
                <Skeleton height="2.75rem" width="100%" radius="sm" />
              </section>
            </aside>
          </div>
        </SkeletonRegion>
      </DelayedReveal>

      <DelayedReveal>
        <SkeletonRegion label={t("employer.loading.outcomeForm")}>
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

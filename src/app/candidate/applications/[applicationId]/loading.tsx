import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/candidate-application-confirmation/application-confirmation.module.scss";

// These counts mirror the fixed, unconditional `<dl>` rows each section
// always renders in ApplicationConfirmationPage (Job details / Your
// submitted profile) — the ROW STRUCTURE is static per the component, only
// the VALUES inside each row are unknown until the request resolves. The
// one genuinely conditional row ("Available from") is deliberately not
// represented here.
const JOB_DETAILS_META_ROW_COUNT = 8;
const CANDIDATE_PROFILE_META_ROW_COUNT = 6;
// A representative count for the status timeline — every application has
// at least one "Submitted" event, but the real count is unknown until the
// history query resolves.
const STATUS_TIMELINE_ROW_COUNT = 2;

function MetaRowSkeleton({
  labelWidth,
  valueWidth,
}: {
  labelWidth: string;
  valueWidth: string;
}) {
  return (
    <div className={styles.metaRow}>
      <Skeleton height="0.875rem" width={labelWidth} radius="sm" />
      <Skeleton height="1rem" width={valueWidth} radius="sm" />
    </div>
  );
}

/**
 * Route-loading state for /candidate/applications/[applicationId] — the
 * deepest sequential-load chain in the candidate app (confirmation →
 * history → outcomes, per P3.5 discovery Section 3.4/6/8), and the flow
 * that was explicitly measured. Nothing in this component streams
 * partially: the route awaits the full chain before returning any JSX, so
 * every value below is genuinely unknown until the request resolves.
 *
 * Left out entirely, because rendering them would mean guessing at
 * structure the data hasn't confirmed yet:
 * - the page header/nav and the two footer links (interactive chrome)
 * - the "Application accepted" banner (only renders for one status)
 * - the per-section "Additional languages" subsections (each is either a
 *   "no additional languages" sentence or a list — which one is data)
 * - the outcomes timeline (only renders when outcomes are non-empty; most
 *   applications have none)
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading application">
          <div className={styles.titleRow}>
            <Skeleton height="2.25rem" width="55%" radius="sm" />
          </div>
          <Skeleton height="1.125rem" width="70%" radius="sm" />

          <div className={styles.meta}>
            <MetaRowSkeleton labelWidth="5rem" valueWidth="8rem" />
            <MetaRowSkeleton labelWidth="6rem" valueWidth="10rem" />
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="9rem" radius="sm" />
            <div className={styles.meta}>
              {Array.from(
                { length: JOB_DETAILS_META_ROW_COUNT },
                (_, index) => (
                  <MetaRowSkeleton
                    key={index}
                    labelWidth="6rem"
                    valueWidth="60%"
                  />
                ),
              )}
            </div>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="11rem" radius="sm" />
            <div className={styles.meta}>
              {Array.from(
                { length: CANDIDATE_PROFILE_META_ROW_COUNT },
                (_, index) => (
                  <MetaRowSkeleton
                    key={index}
                    labelWidth="6rem"
                    valueWidth="55%"
                  />
                ),
              )}
            </div>
          </div>

          <div className={styles.section}>
            <Skeleton height="1.25rem" width="8rem" radius="sm" />
            <ul className={styles.timeline}>
              {Array.from({ length: STATUS_TIMELINE_ROW_COUNT }, (_, index) => (
                <li key={index} className={styles.timelineItem}>
                  <span className={styles.timelineRail} aria-hidden="true">
                    <Skeleton radius="pill" width="0.75rem" height="0.75rem" />
                  </span>
                  <div className={styles.timelineContent}>
                    <Skeleton height="0.875rem" width="6rem" radius="sm" />
                    <Skeleton height="0.75rem" width="8rem" radius="sm" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

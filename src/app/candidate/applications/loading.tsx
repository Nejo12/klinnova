import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { CandidateApplicationsPageHeader } from "@/components/candidate-applications/candidate-applications-page-header";
import styles from "@/components/candidate-applications/candidate-applications.module.scss";
import railStyles from "@/components/candidate-applications/application-status-rail.module.scss";

// A representative count, not a claim about how many applications actually
// exist — the real count (and the Active/Closed split) is exactly the thing
// that's unknown here, so those group headings are left out entirely.
export const APPLICATION_CARD_SKELETON_COUNT = 3;
const STATUS_RAIL_NODE_COUNT = 4;
export const APPLICATION_META_ROW_SKELETON_COUNT = 2;

// Paired label+value skeleton matching the two-column `.metaRow` grid that
// ApplicationInventoryCard actually renders (src/components/
// candidate-applications/application-inventory-card.tsx), rather than a
// single full-width bar.
function MetaRowSkeleton({
  labelWidth,
  valueWidth,
}: {
  labelWidth: string;
  valueWidth: string;
}) {
  return (
    <div className={styles.metaRow} data-testid="application-loading-meta-row">
      <Skeleton height="0.875rem" width={labelWidth} radius="sm" />
      <Skeleton height="1rem" width={valueWidth} radius="sm" />
    </div>
  );
}

/**
 * Route-loading state for /candidate/applications. Skeletons only unknown
 * application data, matching ApplicationInventoryCard's current shape: title
 * plus employer line, a promoted status-badge slot, a label-then-segment
 * status rail, two metadata rows (Location, Submitted), and one action slot.
 * Active/Closed grouping is data-dependent (an application set can be all
 * active, all closed, or a mix), so those headings are not reproduced here —
 * that would fabricate structure the real query hasn't resolved yet.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <CandidateApplicationsPageHeader showEmployerNav={false} />
      <div className={styles.headingCluster}>
        <h1 className={styles.heading}>Applications</h1>
        <p className={styles.lead}>
          Your active and closed applications in one place.
        </p>
      </div>
      <DelayedReveal>
        <SkeletonRegion label="Loading applications">
          <ul className={styles.list}>
            {Array.from(
              { length: APPLICATION_CARD_SKELETON_COUNT },
              (_, index) => (
                <li key={index}>
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <Skeleton height="1.5rem" width="65%" radius="sm" />
                    </div>
                    <Skeleton height="1.125rem" width="40%" radius="sm" />
                    <ol className={railStyles.rail} aria-hidden="true">
                      {Array.from(
                        { length: STATUS_RAIL_NODE_COUNT },
                        (_, nodeIndex) => (
                          <li
                            key={nodeIndex}
                            className={railStyles.node}
                            data-testid="application-loading-rail-node"
                          >
                            <span data-testid="application-loading-rail-label">
                              <Skeleton
                                width="3rem"
                                height="0.75rem"
                                radius="sm"
                              />
                            </span>
                            <span data-testid="application-loading-rail-marker">
                              <Skeleton
                                className={railStyles.marker}
                                width="100%"
                                height="var(--step-line-width)"
                                radius="pill"
                              />
                            </span>
                          </li>
                        ),
                      )}
                    </ol>
                    <div className={styles.meta}>
                      {Array.from(
                        { length: APPLICATION_META_ROW_SKELETON_COUNT },
                        (_, rowIndex) => (
                          <MetaRowSkeleton
                            key={rowIndex}
                            labelWidth={rowIndex === 0 ? "5rem" : "5.5rem"}
                            valueWidth={rowIndex === 0 ? "70%" : "60%"}
                          />
                        ),
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <Skeleton height="1.25rem" width="6.5rem" radius="sm" />
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import railStyles from "@/components/candidate-applications/application-status-rail.module.scss";

// A representative count, not a claim about how many applications actually
// exist — the real count (and the Active/Closed split) is exactly the thing
// that's unknown here, so those group headings are left out entirely.
export const APPLICATION_CARD_SKELETON_COUNT = 3;
const STATUS_RAIL_NODE_COUNT = 4;

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
    <div className={styles.metaRow}>
      <Skeleton height="0.875rem" width={labelWidth} radius="sm" />
      <Skeleton height="1rem" width={valueWidth} radius="sm" />
    </div>
  );
}

/**
 * Route-loading state for /candidate/applications. Skeletons the row list
 * only, matching ApplicationInventoryCard's real shape (title, employer
 * line, status rail, three meta rows, one action link). The page header and
 * "Your applications" heading are static chrome, left out. The Active/
 * Closed grouping is itself data-dependent (an application set can be all
 * active, all closed, or a mix) so it isn't reproduced here — that would be
 * fabricating structure the real query hasn't resolved yet.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
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
                          <li key={nodeIndex} className={railStyles.node}>
                            <Skeleton
                              radius="pill"
                              width="var(--step-size)"
                              height="var(--step-size)"
                            />
                            <Skeleton width="3rem" height="0.75rem" />
                          </li>
                        ),
                      )}
                    </ol>
                    <div className={styles.meta}>
                      <MetaRowSkeleton labelWidth="5rem" valueWidth="70%" />
                      <MetaRowSkeleton labelWidth="4rem" valueWidth="55%" />
                      <MetaRowSkeleton labelWidth="5.5rem" valueWidth="60%" />
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

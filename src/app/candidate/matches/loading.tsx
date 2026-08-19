import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";

// A representative count, not a claim about how many matches actually
// exist — the real count is exactly the thing that's unknown here.
export const MATCH_CARD_SKELETON_COUNT = 3;

/**
 * Route-loading state for /candidate/matches. Per the P3.6 brief, this
 * skeletons the match-card list only — the page's header/heading/lead/
 * work-authorisation notice are static chrome the real page renders
 * regardless of the vacancies query's outcome, so they're left out here
 * rather than duplicated.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <DelayedReveal>
        <SkeletonRegion label="Loading matches">
          <ul className={styles.list}>
            {Array.from({ length: MATCH_CARD_SKELETON_COUNT }, (_, index) => (
              <li key={index}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <Skeleton height="1.5rem" width="65%" radius="sm" />
                    <div className={styles.badgeGroup}>
                      <Skeleton height="1.5rem" width="6rem" radius="sm" />
                    </div>
                  </div>
                  <Skeleton height="1.125rem" width="40%" radius="sm" />
                  <Skeleton height="1rem" width="92%" radius="sm" />
                  <div className={styles.meta}>
                    <Skeleton height="1rem" width="70%" radius="sm" />
                    <Skeleton height="1rem" width="55%" radius="sm" />
                  </div>
                  <div className={styles.cardActions}>
                    <Skeleton height="1.25rem" width="5.5rem" radius="sm" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

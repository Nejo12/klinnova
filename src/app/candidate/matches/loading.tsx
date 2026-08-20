import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";
import {
  CANDIDATE_MATCHES_HEADING,
  CANDIDATE_MATCHES_LEAD,
} from "@/lib/candidate-matches/messages";

// A representative count, not a claim about how many matches actually
// exist — the real count is exactly the thing that's unknown here.
export const MATCH_CARD_SKELETON_COUNT = 3;

// Paired label+value skeleton matching the two-column `.metaRow` grid that
// VacancyFactChips actually renders (src/components/public-jobs/
// vacancy-fact-chips.tsx), rather than a single full-width bar.
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
 * Route-loading state for /candidate/matches. Renders the static heading/
 * lead for real (imported straight from the same source
 * `CandidateMatchesPage` uses) and skeletons only the genuinely
 * data-driven match-card list.
 *
 * `CandidateMatchesPage` renders its `h1`/lead identically across both the
 * `success` and `failure` branches (the lead's presence is nominally tied
 * to `success`, but the string itself never depends on the vacancies
 * data — see that component), so rendering them here unconditionally
 * means the real h1 never pops in above the match-card list on swap, and
 * this copy can't drift out of sync with the real page since it's the
 * same imported constants — the same fix already applied to
 * `src/app/jobs/loading.tsx` (Task F re-audit, P3.6).
 *
 * Still left out:
 * - `CandidateAppHeader` — genuinely static chrome, but not implicated in
 *   the heading/lead content-relocation finding this fix addresses (same
 *   boundary `jobs/loading.tsx` draws around its own brand-link header).
 * - `WorkAuthorisationNotice` — static chrome too, but out of this fix's
 *   assigned scope (heading/lead only); its appearance at the swap still
 *   shifts the list down by its own height.
 * - the match-card list itself, genuinely data-dependent.
 */
export default function Loading() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{CANDIDATE_MATCHES_HEADING}</h1>
      <p className={styles.lead}>{CANDIDATE_MATCHES_LEAD}</p>

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
                    <MetaRowSkeleton labelWidth="4.5rem" valueWidth="70%" />
                    <MetaRowSkeleton labelWidth="5rem" valueWidth="55%" />
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

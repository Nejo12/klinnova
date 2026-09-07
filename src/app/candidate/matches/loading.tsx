"use client";

import { useLocale } from "@/components/i18n/locale-provider";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import styles from "@/components/candidate-matches/candidate-matches.module.scss";

// A representative count, not a claim about how many matches actually
// exist — the real count is exactly the thing that's unknown here.
export const MATCH_CARD_SKELETON_COUNT = 3;

/**
 * Route-loading state for /candidate/matches. Renders the static heading
 * cluster for real (imported straight from the same source
 * `CandidateMatchesPage` uses) and skeletons only the genuinely
 * data-driven match-card list.
 *
 * The count is unknown while the route is loading, so this shell shows only
 * the title and resolved fallback line. They cannot drift out of sync with
 * the real page since they use the same imported constants — the same fix
 * already applied to
 * `src/app/jobs/loading.tsx` (Task F re-audit, P3.6).
 *
 * The candidate header is also static enough to render here. Account-space
 * capability data is unresolved during route loading, so the Candidate /
 * Employer switcher is intentionally omitted until the resolved page renders.
 * `WorkAuthorisationNotice` remains out of the loading shell because it is
 * not part of the approved candidate navigation/state continuity slice.
 */
export default function Loading() {
  const { t } = useLocale();
  return (
    <main className={styles.page}>
      <CandidateAppHeader current="matches" showEmployerNav={false} />
      <div className={styles.headingCluster}>
        <h1 className={styles.heading}>{t("candidate.matches.heading")}</h1>
        <p className={styles.lead}>{t("candidate.matches.lead")}</p>
      </div>

      <DelayedReveal>
        <SkeletonRegion label={t("candidate.loading.matches")}>
          <ul className={`${styles.list} ${styles.loadingList}`}>
            {Array.from({ length: MATCH_CARD_SKELETON_COUNT }, (_, index) => (
              <li key={index}>
                <div className={styles.loadingCard}>
                  <Skeleton height="1.25rem" width="58%" radius="sm" />
                  <Skeleton height="0.875rem" width="38%" radius="sm" />
                  <Skeleton height="0.875rem" width="82%" radius="sm" />
                  <Skeleton height="0.875rem" width="34%" radius="sm" />
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.loadingNote}>
            {t("candidate.loading.matchesNote")}
          </p>
        </SkeletonRegion>
      </DelayedReveal>
    </main>
  );
}

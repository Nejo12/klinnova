import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { CandidateMatch } from "@/lib/matching/types";

import { MatchCard } from "@/components/candidate-matches/match-card";

import styles from "./candidate-matches.module.scss";

type MatchListProps = {
  matches: readonly CandidateMatch[];
  applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
};

export function MatchList({
  matches,
  applicationsByVacancyId,
}: MatchListProps) {
  return (
    <ul className={styles.list}>
      {matches.map((match) => (
        <li key={match.vacancy.id}>
          <MatchCard
            match={match}
            application={applicationsByVacancyId.get(match.vacancy.id) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}

import type { CandidateMatch } from "@/lib/matching/types";

import { MatchCard } from "@/components/candidate-matches/match-card";

import styles from "./candidate-matches.module.scss";

type MatchListProps = {
  matches: readonly CandidateMatch[];
};

export function MatchList({ matches }: MatchListProps) {
  return (
    <ul className={styles.list}>
      {matches.map((match) => (
        <li key={match.vacancy.id}>
          <MatchCard match={match} />
        </li>
      ))}
    </ul>
  );
}

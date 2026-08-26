import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

import { MatchCard } from "@/components/candidate-matches/match-card";

import styles from "./candidate-matches.module.scss";

type MatchListProps = {
  vacancies: readonly PublicVacancy[];
  applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
  pulseReveal?: boolean;
};

export function MatchList({
  vacancies,
  applicationsByVacancyId,
  pulseReveal = false,
}: MatchListProps) {
  return (
    <ul
      className={`${styles.list} ${pulseReveal ? styles.listPulseReveal : ""}`}
    >
      {vacancies.map((vacancy) => (
        <li key={vacancy.vacancyId}>
          <MatchCard
            vacancy={vacancy}
            application={applicationsByVacancyId.get(vacancy.vacancyId) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}

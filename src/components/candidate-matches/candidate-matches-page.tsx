import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { CandidatePulseHandoff } from "@/components/candidate-matches/candidate-pulse-handoff";
import { MatchCount } from "@/components/candidate-matches/match-count";
import { MatchList } from "@/components/candidate-matches/match-list";
import { MatchesEmptyState } from "@/components/candidate-matches/matches-empty-state";
import { MatchesErrorState } from "@/components/candidate-matches/matches-error-state";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import {
  CANDIDATE_MATCHES_HEADING,
  CANDIDATE_MATCHES_LEAD,
} from "@/lib/candidate-matches/messages";
import type { CandidatePulseProfileItem } from "@/lib/pulse/candidate-profile";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

import styles from "./candidate-matches.module.scss";

type CandidateMatchesPageProps =
  | {
      status: "success";
      vacancies: readonly PublicVacancy[];
      applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
      showEmployerNav?: boolean;
      pulseProfileItems?: readonly CandidatePulseProfileItem[] | null;
    }
  | { status: "failure"; showEmployerNav?: boolean };

export function CandidateMatchesPage(props: CandidateMatchesPageProps) {
  const brandHref = props.status === "failure" ? "/" : "/candidate";
  const showEmployerNav = props.showEmployerNav === true;

  return (
    <main className={styles.page}>
      <CandidateAppHeader
        current="matches"
        showEmployerNav={showEmployerNav}
        brandHref={brandHref}
      />

      {props.status === "failure" ? (
        <>
          <h1 className={styles.heading}>{CANDIDATE_MATCHES_HEADING}</h1>
          <MatchesErrorState />
        </>
      ) : (
        <>
          {props.pulseProfileItems !== null &&
          props.pulseProfileItems !== undefined ? (
            <CandidatePulseHandoff profileItems={props.pulseProfileItems} />
          ) : null}
          <h1 className={styles.heading}>{CANDIDATE_MATCHES_HEADING}</h1>
          <p className={styles.lead}>{CANDIDATE_MATCHES_LEAD}</p>
          <WorkAuthorisationNotice />
          {props.vacancies.length === 0 ? (
            <MatchesEmptyState />
          ) : (
            <>
              <MatchCount count={props.vacancies.length} />
              <MatchList
                vacancies={props.vacancies}
                applicationsByVacancyId={props.applicationsByVacancyId}
                pulseReveal={props.pulseProfileItems != null}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}

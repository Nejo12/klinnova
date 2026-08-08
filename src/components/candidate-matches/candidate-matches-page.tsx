import Link from "next/link";

import { CANDIDATE_EXPORT_BUTTON_LABEL } from "@/lib/account-export/messages";
import { LogoutButton } from "@/components/auth/logout-button";
import { CapabilityNav } from "@/components/employer-onboarding/capability-nav";
import { MatchCount } from "@/components/candidate-matches/match-count";
import { MatchList } from "@/components/candidate-matches/match-list";
import { MatchesEmptyState } from "@/components/candidate-matches/matches-empty-state";
import { MatchesErrorState } from "@/components/candidate-matches/matches-error-state";
import { WorkAuthorisationNotice } from "@/components/candidate-matches/work-authorisation-notice";
import type { OwnedApplicationSummary } from "@/lib/applications/owned-application";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

import styles from "./candidate-matches.module.scss";

type CandidateMatchesPageProps =
  | {
      status: "success";
      vacancies: readonly PublicVacancy[];
      applicationsByVacancyId: ReadonlyMap<string, OwnedApplicationSummary>;
      showEmployerNav?: boolean;
    }
  | { status: "failure"; showEmployerNav?: boolean };

export function CandidateMatchesPage(props: CandidateMatchesPageProps) {
  const brandHref = props.status === "failure" ? "/" : "/candidate";
  const showEmployerNav = props.showEmployerNav === true;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href={brandHref}>
          Stint
        </Link>
        <div className={styles.headerActions}>
          <CapabilityNav
            showCandidate
            showEmployer={showEmployerNav}
            current="candidate"
          />
          {/* Plain anchor, not next/link: this is a real file download from
              a Route Handler, not a client-side page transition. The
              server's Content-Disposition header is the authoritative
              download mechanism, not this element. */}
          <a className={styles.navLink} href="/candidate/account/export">
            {CANDIDATE_EXPORT_BUTTON_LABEL}
          </a>
          <LogoutButton />
        </div>
      </div>

      {props.status === "failure" ? (
        <>
          <h1 className={styles.heading}>Jobs that match your preferences</h1>
          <MatchesErrorState />
        </>
      ) : (
        <>
          <h1 className={styles.heading}>Jobs that match your preferences</h1>
          <p className={styles.lead}>
            These jobs match all of the preferences currently saved in your
            profile.
          </p>
          <WorkAuthorisationNotice />
          {props.vacancies.length === 0 ? (
            <MatchesEmptyState />
          ) : (
            <>
              <MatchCount count={props.vacancies.length} />
              <MatchList
                vacancies={props.vacancies}
                applicationsByVacancyId={props.applicationsByVacancyId}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}

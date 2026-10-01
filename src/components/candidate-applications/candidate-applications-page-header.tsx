import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";

type CandidateApplicationsPageHeaderProps = {
  showEmployerNav: boolean;
  displayName?: string | null;
};

/**
 * Shared header for `/candidate/applications` and
 * `/candidate/applications/[applicationId]` — both routes in the
 * Applications family, so the nav link is always marked current on either.
 */
export function CandidateApplicationsPageHeader({
  showEmployerNav,
  displayName = null,
}: CandidateApplicationsPageHeaderProps) {
  return (
    <CandidateAppHeader
      current="applications"
      showEmployerNav={showEmployerNav}
      displayName={displayName}
    />
  );
}

import { redirect } from "next/navigation";

import { ApplicationDetail } from "@/components/employer-applications/application-detail";
import { ApplicationUnavailable } from "@/components/employer-applications/application-unavailable";
import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { berlinTodayIso } from "@/lib/applications/outcome-type";
import { loadEmployerApplication } from "@/lib/employer/applications/load-employer-application";
import { loadEmployerApplicationOutcomes } from "@/lib/employer/applications/load-employer-application-outcomes";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { EMPLOYER_RESTRICTED_APPLICATIONS } from "@/lib/employer/messages";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmployerApplicationDetailPageProps = {
  params: Promise<{ applicationId: string }>;
};

export async function generateMetadata({
  params,
}: EmployerApplicationDetailPageProps) {
  const { applicationId } = await params;
  return {
    title: "Application · Klinnova",
    description: `Employer applicant review ${applicationId}`,
  };
}

export default async function EmployerApplicationDetailPage({
  params,
}: EmployerApplicationDetailPageProps) {
  const { applicationId } = await params;
  const supabase = await createServerSupabaseClient();

  // Checked before the applicationId is ever used against the applicant
  // RPC — a suspended employer sees the identical restricted state
  // regardless of whether applicationId is real, fake, or owned by
  // another employer, so this check itself creates no existence oracle.
  const suspension = await loadCurrentEmployerSuspensionStatus(supabase);
  if (suspension.ok && suspension.suspended) {
    const capabilities = await loadAccountCapabilities(supabase);
    return (
      <main className={styles.page}>
        <EmployerVacancyPageHeader
          showCandidate={capabilities?.hasCandidateProfile === true}
          showEmployer={capabilities?.hasEmployerProfile === true}
          currentPath="applications"
        />
        <h1 className={styles.heading}>Application</h1>
        <EmployerRestrictedNotice message={EMPLOYER_RESTRICTED_APPLICATIONS} />
      </main>
    );
  }

  const loaded = await loadEmployerApplication(supabase, applicationId);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect(`/login?next=/employer/applications/${applicationId}`);
    }
    if (loaded.reason === "incomplete") {
      redirect("/employer/onboarding");
    }
    if (loaded.reason === "unavailable") {
      return <ApplicationUnavailable />;
    }
    redirect("/auth/error?reason=profile");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const outcomesResult = await loadEmployerApplicationOutcomes(
    supabase,
    applicationId,
  );

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="applications"
      />
      <h1 className={styles.heading}>
        {loaded.application.candidate_display_name}
      </h1>
      <ApplicationDetail
        application={loaded.application}
        outcomes={outcomesResult.ok ? outcomesResult.outcomes : null}
        todayIso={berlinTodayIso()}
      />
    </main>
  );
}

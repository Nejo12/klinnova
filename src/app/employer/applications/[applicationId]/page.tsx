import { redirect } from "next/navigation";

import { ApplicationDetail } from "@/components/employer-applications/application-detail";
import { ApplicationUnavailable } from "@/components/employer-applications/application-unavailable";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { loadEmployerApplication } from "@/lib/employer/applications/load-employer-application";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
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
    title: "Application · Stint",
    description: `Employer applicant review ${applicationId}`,
  };
}

export default async function EmployerApplicationDetailPage({
  params,
}: EmployerApplicationDetailPageProps) {
  const { applicationId } = await params;
  const supabase = await createServerSupabaseClient();
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
      <ApplicationDetail application={loaded.application} />
    </main>
  );
}

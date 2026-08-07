import { redirect } from "next/navigation";

import { ApplicationList } from "@/components/employer-applications/application-list";
import { ApplicationListFilters } from "@/components/employer-applications/application-list-filters";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { APPLICATION_LIST_LEAD } from "@/lib/employer/applications/messages";
import { loadEmployerApplications } from "@/lib/employer/applications/load-employer-applications";
import { parseApplicationListFilters } from "@/lib/employer/applications/parse-list-filters";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Applications · Stint",
};

type EmployerApplicationsPageProps = {
  searchParams: Promise<{
    vacancy?: string | string[];
    status?: string | string[];
  }>;
};

export default async function EmployerApplicationsPage({
  searchParams,
}: EmployerApplicationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filter = parseApplicationListFilters(resolvedSearchParams);

  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerApplications(supabase, filter);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer/applications");
    }
    if (loaded.reason === "incomplete") {
      redirect("/employer/onboarding");
    }
    redirect("/auth/error?reason=profile");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const vacancyTitle =
    filter.vacancyId !== null
      ? (loaded.applications[0]?.vacancy_title ?? null)
      : null;

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="applications"
      />
      <h1 className={styles.heading}>Applications</h1>
      <p className={styles.lead}>{APPLICATION_LIST_LEAD}</p>
      <ApplicationListFilters filter={filter} vacancyTitle={vacancyTitle} />
      <ApplicationList applications={loaded.applications} />
    </main>
  );
}

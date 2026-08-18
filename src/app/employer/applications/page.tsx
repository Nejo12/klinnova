import { redirect } from "next/navigation";

import {
  ApplicationList,
  type FilteredVacancyInfo,
} from "@/components/employer-applications/application-list";
import { ApplicationListFilters } from "@/components/employer-applications/application-list-filters";
import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { APPLICATION_LIST_LEAD } from "@/lib/employer/applications/messages";
import { loadEmployerApplications } from "@/lib/employer/applications/load-employer-applications";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { parseApplicationListFilters } from "@/lib/employer/applications/parse-list-filters";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { EMPLOYER_RESTRICTED_APPLICATIONS } from "@/lib/employer/messages";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { loadEmployerVacancy } from "@/lib/employer/vacancies/load-employer-vacancy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Applications · Klinnova",
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

  // Checked before the applications RPC: while suspended, the RPC itself
  // already returns zero rows (D-072), which would otherwise render
  // indistinguishably from "no applications yet." This makes the actual
  // reason explicit without exposing any application/candidate data.
  const suspension = await loadCurrentEmployerSuspensionStatus(supabase);
  if (suspension.ok && suspension.suspended) {
    const capabilities = await loadAccountCapabilities(supabase);
    return (
      <main className={styles.page}>
        <EmployerVacancyPageHeader
          showCandidate={capabilities?.hasCandidateProfile === true}
          showEmployer={capabilities?.hasEmployerProfile === true}
          currentPath="applications"
          unseenApplicationsCount={0}
        />
        <h1 className={styles.heading}>Applications</h1>
        <EmployerRestrictedNotice message={EMPLOYER_RESTRICTED_APPLICATIONS} />
      </main>
    );
  }

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
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);

  // Single-row lookup, only when the filter narrows to a vacancy and the
  // result is empty: the RPC rows themselves carry a vacancy title, but
  // there are no rows to read one from in that case, and knowing the
  // vacancy's publication_state is what tells ApplicationList's empty
  // state whether the true reason is "still a draft" (state #6) or
  // "published, nobody's applied yet" (state #4). Reuses the same loader
  // `/employer/vacancies/[vacancyId]` already calls — not a new query.
  let filteredVacancy: FilteredVacancyInfo | null = null;
  if (filter.vacancyId !== null && loaded.applications.length === 0) {
    const vacancyResult = await loadEmployerVacancy(supabase, filter.vacancyId);
    filteredVacancy = vacancyResult.ok
      ? {
          id: filter.vacancyId,
          title: vacancyResult.vacancy.title,
          publicationState: vacancyResult.vacancy.publicationState,
          checklist: vacancyResult.vacancy.checklist,
        }
      : {
          id: filter.vacancyId,
          title: null,
          publicationState: null,
          checklist: [],
        };
  }

  const vacancyTitle =
    filter.vacancyId !== null
      ? (filteredVacancy?.title ??
        loaded.applications[0]?.vacancy_title ??
        null)
      : null;

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="applications"
        unseenApplicationsCount={unseenApplicationsCount}
      />
      <h1 className={styles.heading}>Applications</h1>
      <p className={styles.lead}>{APPLICATION_LIST_LEAD}</p>
      <ApplicationListFilters filter={filter} vacancyTitle={vacancyTitle} />
      <ApplicationList
        applications={loaded.applications}
        filteredVacancy={filteredVacancy}
      />
    </main>
  );
}

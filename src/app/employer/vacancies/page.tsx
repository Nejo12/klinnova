import { redirect } from "next/navigation";

import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VacancyList } from "@/components/employer-vacancies/vacancy-list";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { loadEmployerDrafts } from "@/lib/employer/vacancies/load-employer-drafts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vacancies · Klinnova",
};

export default async function EmployerVacanciesPage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerDrafts(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer/vacancies");
    }
    if (loaded.reason === "incomplete") {
      redirect("/employer/onboarding");
    }
    redirect("/auth/error?reason=profile");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);
  const suspension = await loadCurrentEmployerSuspensionStatus(supabase);
  const suspended = suspension.ok && suspension.suspended;

  // Single additional own-profile read, verification state only — reuses
  // `loadEmployerProfile` (already called by `/employer/page.tsx`), not a
  // new query pattern. Never gates or redirects: a failed load just leaves
  // `verificationState` null, and `VacancyList` falls back to its generic
  // empty state in that case (see its own prop doc).
  const profile = await loadEmployerProfile(supabase);
  const verificationState =
    profile.ok && profile.data !== null ? profile.data.verificationState : null;

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="vacancies"
        unseenApplicationsCount={unseenApplicationsCount}
      />
      <h1 className={styles.heading}>Vacancies</h1>
      {suspended ? <EmployerRestrictedNotice /> : null}
      <VacancyList
        drafts={loaded.drafts}
        verificationState={verificationState}
      />
    </main>
  );
}

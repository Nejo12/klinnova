import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VacancyList } from "@/components/employer-vacancies/vacancy-list";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerDrafts } from "@/lib/employer/vacancies/load-employer-drafts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vacancy drafts · Stint",
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

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="vacancies"
      />
      <h1 className={styles.heading}>Vacancy drafts</h1>
      <VacancyList drafts={loaded.drafts} />
    </main>
  );
}

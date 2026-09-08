import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { LocalizedText } from "@/components/i18n/localized-text";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VacancyDraftForm } from "@/components/employer-vacancies/vacancy-draft-form";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create vacancy draft · Klinnova",
};

export default async function NewEmployerVacancyPage() {
  const supabase = await createServerSupabaseClient();
  const gate = await requireCompletedEmployer(supabase);

  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      redirect("/login?next=/employer/vacancies/new");
    }
    if (gate.reason === "incomplete") {
      redirect("/employer/onboarding");
    }
    redirect("/auth/error?reason=profile");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="vacancies"
        unseenApplicationsCount={unseenApplicationsCount}
      />
      <h1 className={styles.heading}>
        <LocalizedText message="employer.vacancies.create" />
      </h1>
      <p className={styles.lead}>
        <LocalizedText message="employer.vacancies.createLead" />
      </p>
      <p className={styles.note}>
        <LocalizedText message="employer.vacancies.privateNotice" />
      </p>
      <p className={styles.note}>
        <LocalizedText message="employer.vacancies.verificationInfo" />
      </p>
      {gate.profile.employerType === "organisation" &&
      gate.profile.company !== null ? (
        <p className={styles.support}>
          <LocalizedText message="employer.vacancies.organisationCompany" />:{" "}
          {gate.profile.company.name}
        </p>
      ) : null}
      <VacancyDraftForm mode="create" />
    </main>
  );
}

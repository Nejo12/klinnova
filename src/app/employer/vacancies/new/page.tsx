import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VacancyDraftForm } from "@/components/employer-vacancies/vacancy-draft-form";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import {
  VACANCY_PRIVATE_NOTICE,
  VACANCY_VERIFICATION_INFO,
} from "@/lib/employer/vacancies/messages";
import { requireCompletedEmployer } from "@/lib/employer/vacancies/require-completed-employer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create vacancy draft · Stint",
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

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="vacancies"
      />
      <h1 className={styles.heading}>Create vacancy draft</h1>
      <p className={styles.lead}>
        Save a private draft with the minimum fields. You can add more detail
        later.
      </p>
      <p className={styles.note}>{VACANCY_PRIVATE_NOTICE}</p>
      <p className={styles.note}>{VACANCY_VERIFICATION_INFO}</p>
      {gate.profile.employerType === "organisation" &&
      gate.profile.company !== null ? (
        <p className={styles.support}>
          Organisation company: {gate.profile.company.name} (derived
          automatically — no company selector)
        </p>
      ) : null}
      <VacancyDraftForm mode="create" />
    </main>
  );
}

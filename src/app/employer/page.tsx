import Link from "next/link";
import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import {
  EMPLOYER_HOME_LEAD,
  EMPLOYER_VERIFICATION_NOTICE,
} from "@/lib/employer/messages";
import { resolveEmployerHomeView } from "@/lib/employer/resolve-employer-home";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employer · Stint",
};

export default async function EmployerHomePage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerProfile(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer");
    }
    redirect("/auth/error?reason=profile");
  }

  const view = resolveEmployerHomeView({
    hasProfile: loaded.data !== null,
    onboardingCompleted: loaded.data?.onboardingCompletedAt !== null,
    displayName: loaded.data?.displayName ?? null,
    employerType: loaded.data?.employerType ?? null,
    companyName: loaded.data?.company?.name ?? null,
    verificationState: loaded.data?.verificationState ?? null,
  });

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const capabilities = await loadAccountCapabilities(supabase);

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="home"
      />

      <h1 className={styles.heading}>Welcome, {view.displayName}</h1>
      <p className={styles.lead}>{EMPLOYER_HOME_LEAD}</p>

      <ul className={styles.meta}>
        <li>Employer type: {view.employerTypeLabel}</li>
        {view.companyName !== null ? (
          <li>Organisation company: {view.companyName}</li>
        ) : null}
        <li>Onboarding: complete</li>
        <li>Verification: {view.verificationState}</li>
      </ul>

      <p className={styles.actions}>
        <Link className={styles.button} href="/employer/vacancies">
          Vacancy drafts
        </Link>
        <Link className={styles.linkButton} href="/employer/vacancies/new">
          Create draft
        </Link>
        <Link className={styles.linkButton} href="/employer/verification">
          Verification
        </Link>
      </p>

      <p className={styles.note}>{EMPLOYER_VERIFICATION_NOTICE}</p>
    </main>
  );
}

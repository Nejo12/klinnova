import Link from "next/link";
import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import {
  EMPLOYER_EXPORT_BUTTON_LABEL,
  EMPLOYER_EXPORT_LEAD,
} from "@/lib/account-export/messages";
import { DELETE_ACCOUNT_HEADING } from "@/lib/account-deletion/messages";
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
  title: "Employer · Klinnova",
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
        <Link
          className={styles.button}
          href="/employer/vacancies"
          aria-label="View vacancies"
        >
          Vacancies
        </Link>
        <Link className={styles.linkButton} href="/employer/vacancies/new">
          Create draft
        </Link>
        <Link className={styles.linkButton} href="/employer/verification">
          Verification
        </Link>
      </p>

      {view.verificationState !== "verified" ? (
        <p className={styles.note}>{EMPLOYER_VERIFICATION_NOTICE}</p>
      ) : null}

      <h2 className={styles.heading}>Account data</h2>
      <p className={styles.note}>{EMPLOYER_EXPORT_LEAD}</p>
      <p className={styles.actions}>
        {/* Plain anchor, not next/link: this is a real file download from a
            Route Handler, not a client-side page transition. The server's
            Content-Disposition header is the authoritative download
            mechanism, not this element. */}
        <a className={styles.linkButton} href="/employer/account/export">
          {EMPLOYER_EXPORT_BUTTON_LABEL}
        </a>
        <Link className={styles.linkButton} href="/employer/account/delete">
          {DELETE_ACCOUNT_HEADING}
        </Link>
      </p>
    </main>
  );
}

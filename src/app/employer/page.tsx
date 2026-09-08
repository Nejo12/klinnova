import { redirect } from "next/navigation";

import { EmployerHomeContent } from "@/components/employer-home/employer-home-content";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/app/employer/employer-home.module.scss";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import { resolveEmployerHomeView } from "@/lib/employer/resolve-employer-home";
import { loadEmployerDrafts } from "@/lib/employer/vacancies/load-employer-drafts";
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
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);

  // Founder Ruling #7: loadEmployerDrafts already exists and already runs
  // on /employer/vacancies with zero modification — calling it from this
  // page is not the new aggregate-COUNT query the ruling restricts. Falls
  // back to an empty list rather than failing the page if the load errors;
  // this page's own auth/completion gates already ran above.
  const draftsResult = await loadEmployerDrafts(supabase);
  const drafts = draftsResult.ok ? draftsResult.drafts : [];

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="home"
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <EmployerHomeContent
        displayName={view.displayName}
        verificationState={view.verificationState}
        unseenApplicationsCount={unseenApplicationsCount}
        drafts={drafts}
      />
    </main>
  );
}

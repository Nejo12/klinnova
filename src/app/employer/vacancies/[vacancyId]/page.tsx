import Link from "next/link";
import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { VacancyDetail } from "@/components/employer-vacancies/vacancy-detail";
import { VacancyUnavailable } from "@/components/employer-vacancies/vacancy-unavailable";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { loadEmployerVacancy } from "@/lib/employer/vacancies/load-employer-vacancy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmployerVacancyDetailPageProps = {
  params: Promise<{ vacancyId: string }>;
};

export async function generateMetadata({
  params,
}: EmployerVacancyDetailPageProps) {
  const { vacancyId } = await params;
  return {
    title: `Vacancy · Klinnova`,
    description: `Manage vacancy ${vacancyId}`,
  };
}

export default async function EmployerVacancyDetailPage({
  params,
}: EmployerVacancyDetailPageProps) {
  const { vacancyId } = await params;
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerVacancy(supabase, vacancyId);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect(`/login?next=/employer/vacancies/${vacancyId}`);
    }
    if (loaded.reason === "incomplete") {
      redirect("/employer/onboarding");
    }
    if (loaded.reason === "unavailable") {
      return <VacancyUnavailable />;
    }
    redirect("/auth/error?reason=profile");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);
  const suspension = await loadCurrentEmployerSuspensionStatus(supabase);
  const suspended = suspension.ok && suspension.suspended;

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="vacancies"
        unseenApplicationsCount={unseenApplicationsCount}
      />
      <p className={styles.detailBack}>
        <Link className={styles.backLink} href="/employer/vacancies">
          Back to vacancies
        </Link>
      </p>
      <h1 className={styles.heading}>{loaded.vacancy.title}</h1>
      <VacancyDetail vacancy={loaded.vacancy} suspended={suspended} />
    </main>
  );
}

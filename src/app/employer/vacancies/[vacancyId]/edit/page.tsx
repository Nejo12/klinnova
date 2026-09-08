import Link from "next/link";
import { redirect } from "next/navigation";

import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { LocalizedText } from "@/components/i18n/localized-text";
import styles from "@/components/employer-vacancies/employer-vacancies.module.scss";
import { LanguageRequirementsEditor } from "@/components/employer-vacancies/language-requirements-editor";
import { ReadinessChecklist } from "@/components/employer-vacancies/readiness-checklist";
import { VacancyDraftForm } from "@/components/employer-vacancies/vacancy-draft-form";
import { VacancyUnavailable } from "@/components/employer-vacancies/vacancy-unavailable";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerDraft } from "@/lib/employer/vacancies/load-employer-draft";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditEmployerVacancyPageProps = {
  params: Promise<{ vacancyId: string }>;
};

export const metadata = {
  title: "Edit vacancy · Klinnova",
};

export default async function EditEmployerVacancyPage({
  params,
}: EditEmployerVacancyPageProps) {
  const { vacancyId } = await params;
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerDraft(supabase, vacancyId);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect(`/login?next=/employer/vacancies/${vacancyId}/edit`);
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

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="vacancies"
        unseenApplicationsCount={unseenApplicationsCount}
      />
      <h1 className={styles.heading}>
        <LocalizedText message="employer.vacancies.edit" />
      </h1>
      {loaded.draft.publicationState === "paused" ? (
        <p className={styles.note}>
          <LocalizedText message="employer.vacancies.pausedEdit" />
        </p>
      ) : (
        <>
          <p className={styles.note}>
            <LocalizedText message="employer.vacancies.privateNotice" />
          </p>
          <p className={styles.note}>
            <LocalizedText message="employer.vacancies.verificationInfo" />
          </p>
        </>
      )}
      {loaded.draft.companyName !== null ? (
        <p className={styles.support}>
          <LocalizedText message="employer.vacancies.organisationCompany" />:{" "}
          {loaded.draft.companyName}
        </p>
      ) : null}
      <p className={styles.actions}>
        <Link
          className={styles.linkButton}
          href={`/employer/vacancies/${loaded.draft.id}`}
        >
          <LocalizedText message="employer.vacancies.viewSummary" />
        </Link>
        <Link className={styles.linkButton} href="/employer/vacancies">
          <LocalizedText message="employer.vacancies.backList" />
        </Link>
      </p>

      <ReadinessChecklist
        ready={loaded.draft.ready}
        checklist={loaded.draft.checklist}
        available={loaded.draft.readinessAvailable}
      />

      <VacancyDraftForm mode="edit" draft={loaded.draft} />
      <LanguageRequirementsEditor
        vacancyId={loaded.draft.id}
        languages={loaded.draft.languages}
      />
    </main>
  );
}

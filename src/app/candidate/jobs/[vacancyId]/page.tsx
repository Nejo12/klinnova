import { redirect } from "next/navigation";

import { resolveJobDetailPageView } from "@/app/candidate/jobs/[vacancyId]/resolve-job-detail-view";
import { CandidateJobDetailPage } from "@/components/candidate-job-detail/candidate-job-detail-page";
import { loadCandidateDisplayName } from "@/lib/auth/load-candidate-display-name";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCurrentCandidateVacancyDetail } from "@/lib/matching/resolve-current-candidate-vacancy-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job · Klinnova",
  robots: {
    index: false,
    follow: false,
  },
};

type CandidateJobDetailRoutePageProps = {
  params: Promise<{ vacancyId: string }>;
};

export default async function CandidateJobDetailRoutePage({
  params,
}: CandidateJobDetailRoutePageProps) {
  const { vacancyId } = await params;
  const supabase = await createServerSupabaseClient();
  const result = await loadCurrentCandidateVacancyDetail(supabase, vacancyId);
  const view = resolveJobDetailPageView(vacancyId, result);

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const [capabilities, displayName] = await Promise.all([
    loadAccountCapabilities(supabase),
    loadCandidateDisplayName(supabase),
  ]);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  if (view.kind === "ready") {
    return (
      <CandidateJobDetailPage
        status="ready"
        eligible={view.eligible}
        missingRequirements={view.missingRequirements}
        vacancy={view.vacancy}
        languages={view.languages}
        application={view.application}
        showEmployerNav={showEmployerNav}
        displayName={displayName}
      />
    );
  }

  if (view.kind === "unavailable") {
    return (
      <CandidateJobDetailPage
        status="unavailable"
        showEmployerNav={showEmployerNav}
        displayName={displayName}
      />
    );
  }

  return (
    <CandidateJobDetailPage
      status="failure"
      showEmployerNav={showEmployerNav}
      displayName={displayName}
    />
  );
}

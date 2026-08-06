import { redirect } from "next/navigation";

import { resolveJobDetailPageView } from "@/app/candidate/jobs/[vacancyId]/resolve-job-detail-view";
import { CandidateJobDetailPage } from "@/components/candidate-job-detail/candidate-job-detail-page";
import { loadCurrentCandidateVacancyDetail } from "@/lib/matching/resolve-current-candidate-vacancy-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job · Stint",
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

  if (view.kind === "ready") {
    return (
      <CandidateJobDetailPage
        status="ready"
        eligible={view.eligible}
        missingRequirements={view.missingRequirements}
        vacancy={view.vacancy}
        languages={view.languages}
        application={view.application}
      />
    );
  }

  if (view.kind === "unavailable") {
    return <CandidateJobDetailPage status="unavailable" />;
  }

  return <CandidateJobDetailPage status="failure" />;
}

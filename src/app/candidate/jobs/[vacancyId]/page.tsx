import { redirect } from "next/navigation";

import { resolveJobDetailPageView } from "@/app/candidate/jobs/[vacancyId]/resolve-job-detail-view";
import { CandidateJobDetailPage } from "@/components/candidate-job-detail/candidate-job-detail-page";
import { loadCandidateVacancyDetail } from "@/lib/matching/load-candidate-vacancy-detail";

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
  const result = await loadCandidateVacancyDetail(vacancyId);
  const view = resolveJobDetailPageView(vacancyId, result);

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  if (view.kind === "ready") {
    return (
      <CandidateJobDetailPage
        status="ready"
        detail={view.detail}
        preview={view.preview}
      />
    );
  }

  if (view.kind === "unavailable") {
    return <CandidateJobDetailPage status="unavailable" reason={view.reason} />;
  }

  return <CandidateJobDetailPage status="failure" />;
}

import { redirect } from "next/navigation";

import { resolveConfirmationPageView } from "@/app/candidate/applications/[applicationId]/resolve-confirmation-view";
import { ApplicationConfirmationPage } from "@/components/candidate-application-confirmation/application-confirmation-page";
import { loadCandidateApplicationConfirmation } from "@/lib/applications/load-candidate-application-confirmation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Application · Stint",
  robots: {
    index: false,
    follow: false,
  },
};

type CandidateApplicationConfirmationRoutePageProps = {
  params: Promise<{ applicationId: string }>;
};

export default async function CandidateApplicationConfirmationRoutePage({
  params,
}: CandidateApplicationConfirmationRoutePageProps) {
  const { applicationId } = await params;
  const result = await loadCandidateApplicationConfirmation(applicationId);
  const view = resolveConfirmationPageView(applicationId, result);

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  if (view.kind === "ready") {
    return (
      <ApplicationConfirmationPage
        status="ready"
        confirmation={view.confirmation}
      />
    );
  }

  if (view.kind === "unavailable") {
    return <ApplicationConfirmationPage status="unavailable" />;
  }

  return <ApplicationConfirmationPage status="failure" />;
}

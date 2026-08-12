import { redirect } from "next/navigation";

import { resolveConfirmationPageView } from "@/app/candidate/applications/[applicationId]/resolve-confirmation-view";
import { ApplicationConfirmationPage } from "@/components/candidate-application-confirmation/application-confirmation-page";
import { loadCandidateApplicationConfirmation } from "@/lib/applications/load-candidate-application-confirmation";
import { loadCandidateApplicationHistory } from "@/lib/applications/load-candidate-application-history";
import { loadCandidateApplicationOutcomes } from "@/lib/applications/load-candidate-application-outcomes";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Application · Klinnova",
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

  const supabase = await createServerSupabaseClient();
  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  if (view.kind === "ready") {
    const historyResult = await loadCandidateApplicationHistory(applicationId);
    if (!historyResult.ok) {
      return (
        <ApplicationConfirmationPage
          status="failure"
          showEmployerNav={showEmployerNav}
        />
      );
    }
    // Fail-soft: an outcomes-read failure omits the (often-empty) outcomes
    // section rather than failing the whole confirmation page, which has
    // valuable information independent of this secondary read.
    const outcomesResult =
      await loadCandidateApplicationOutcomes(applicationId);
    return (
      <ApplicationConfirmationPage
        status="ready"
        confirmation={view.confirmation}
        history={historyResult.history}
        outcomes={outcomesResult.ok ? outcomesResult.outcomes : []}
        showEmployerNav={showEmployerNav}
      />
    );
  }

  if (view.kind === "unavailable") {
    return (
      <ApplicationConfirmationPage
        status="unavailable"
        showEmployerNav={showEmployerNav}
      />
    );
  }

  return (
    <ApplicationConfirmationPage
      status="failure"
      showEmployerNav={showEmployerNav}
    />
  );
}

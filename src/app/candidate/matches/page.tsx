import { redirect } from "next/navigation";

import { resolveMatchesPageView } from "@/app/candidate/matches/resolve-matches-view";
import { CandidateMatchesPage } from "@/components/candidate-matches/candidate-matches-page";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCurrentCandidateMatchesPage } from "@/lib/matching/load-current-candidate-matches-page";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Matches · Stint",
};

export default async function CandidateMatchesRoutePage() {
  const supabase = await createServerSupabaseClient();
  const result = await loadCurrentCandidateMatchesPage(supabase);
  const view = resolveMatchesPageView(result);

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  if (view.kind === "failure") {
    return (
      <CandidateMatchesPage
        status="failure"
        showEmployerNav={showEmployerNav}
      />
    );
  }

  return (
    <CandidateMatchesPage
      status="success"
      vacancies={view.vacancies}
      applicationsByVacancyId={view.applicationsByVacancyId}
      showEmployerNav={showEmployerNav}
    />
  );
}

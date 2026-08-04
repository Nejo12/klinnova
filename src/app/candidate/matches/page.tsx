import { redirect } from "next/navigation";

import { resolveMatchesPageView } from "@/app/candidate/matches/resolve-matches-view";
import { CandidateMatchesPage } from "@/components/candidate-matches/candidate-matches-page";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCandidateMatches } from "@/lib/matching/load-candidate-matches";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Matches · Stint",
};

export default async function CandidateMatchesRoutePage() {
  const result = await loadCandidateMatches();
  const view = resolveMatchesPageView(result);

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const supabase = await createServerSupabaseClient();
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
      matches={view.matches}
      applicationsByVacancyId={view.applicationsByVacancyId}
      showEmployerNav={showEmployerNav}
    />
  );
}

import { redirect } from "next/navigation";

import { resolveMatchesPageView } from "@/app/candidate/matches/resolve-matches-view";
import { CandidateMatchesPage } from "@/components/candidate-matches/candidate-matches-page";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCurrentCandidateMatchesPage } from "@/lib/matching/load-current-candidate-matches-page";
import { loadCandidateOnboarding } from "@/lib/onboarding/load-candidate";
import {
  buildCandidatePulseProfile,
  type CandidatePulseProfileItem,
} from "@/lib/pulse/candidate-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Matches · Klinnova",
};

type CandidateMatchesRoutePageProps = {
  searchParams: Promise<{ pulse?: string }>;
};

export default async function CandidateMatchesRoutePage({
  searchParams,
}: CandidateMatchesRoutePageProps) {
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

  const params = await searchParams;
  const pulseRequested = params.pulse === "ready";
  let pulseProfileItems: CandidatePulseProfileItem[] | null = null;

  if (pulseRequested) {
    const candidate = await loadCandidateOnboarding(supabase);
    if (
      candidate.ok &&
      candidate.data.profile.onboardingCompletedAt !== null
    ) {
      pulseProfileItems = buildCandidatePulseProfile(candidate.data);
    }
  }

  return (
    <CandidateMatchesPage
      status="success"
      vacancies={view.vacancies}
      applicationsByVacancyId={view.applicationsByVacancyId}
      showEmployerNav={showEmployerNav}
      pulseProfileItems={pulseProfileItems}
    />
  );
}

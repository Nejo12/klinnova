import { redirect } from "next/navigation";

import { CandidateMatchesPage } from "@/components/candidate-matches/candidate-matches-page";
import { resolveMatchesPageView } from "@/app/candidate/matches/resolve-matches-view";
import { loadCandidateMatches } from "@/lib/matching/load-candidate-matches";

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

  if (view.kind === "failure") {
    return <CandidateMatchesPage status="failure" />;
  }

  return <CandidateMatchesPage status="success" matches={view.matches} />;
}

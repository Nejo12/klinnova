import { redirect } from "next/navigation";

import { resolveCandidateHomeView } from "@/app/candidate/resolve-candidate-home";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { CandidateHomeProgress } from "@/components/candidate-home/candidate-home-progress";
import { CandidateWelcome } from "@/components/candidate-home/candidate-welcome";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCandidateOnboarding } from "@/lib/onboarding/load-candidate";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Candidate · Klinnova",
};

export default async function CandidatePage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadCandidateOnboarding(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/candidate");
    }
    redirect("/auth/error?reason=profile");
  }

  const { displayName, progress, profile } = loaded.data;
  const continueHref = progress.essentialsValid
    ? onboardingGroupHref("review")
    : onboardingGroupHref(progress.firstIncompleteGroup ?? "languages");

  const view = resolveCandidateHomeView({
    onboardingCompleted: profile.onboardingCompletedAt !== null,
    continueHref,
  });

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  return (
    <main className={styles.page}>
      <CandidateAppHeader showEmployerNav={showEmployerNav} />
      <CandidateWelcome displayName={displayName} />
      <CandidateHomeProgress
        completeCount={progress.completeCount}
        totalGroups={progress.totalGroups}
        essentialsValid={progress.essentialsValid}
        continueHref={view.continueHref}
      />
    </main>
  );
}

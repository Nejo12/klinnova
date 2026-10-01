import { redirect } from "next/navigation";

import { CandidateProfileSummary } from "@/components/candidate-profile/candidate-profile-summary";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCandidateOnboarding } from "@/lib/onboarding/load-candidate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import styles from "./profile.module.scss";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile · Klinnova",
};

export default async function CandidateProfilePage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadCandidateOnboarding(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/candidate/profile");
    }
    redirect("/auth/error?reason=profile");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;
  const { displayName, profile, languages, progress } = loaded.data;

  return (
    <main className={styles.page}>
      <CandidateAppHeader
        current="profile"
        showEmployerNav={showEmployerNav}
        displayName={displayName}
      />
      <CandidateProfileSummary
        displayName={displayName}
        onboardingCompleted={profile.onboardingCompletedAt !== null}
        profile={profile}
        languages={languages}
        progress={progress}
      />
    </main>
  );
}

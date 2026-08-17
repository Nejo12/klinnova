import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveCandidateHomeView } from "@/app/candidate/resolve-candidate-home";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
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
      <h1 className={styles.heading}>Welcome, {displayName}</h1>
      <p className={styles.lead}>
        {progress.essentialsValid
          ? "Your essential answers are saved. Confirm completion from review when you are ready."
          : "Continue essential onboarding so we can match you carefully. Progress is saved after each section."}
      </p>
      <section className={styles.section}>
        <div className={styles.progress}>
          <p className={styles.progressCaption}>
            {progress.completeCount} of {progress.totalGroups} sections saved.
          </p>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={progress.completeCount}
            aria-valuemin={0}
            aria-valuemax={progress.totalGroups}
            aria-label="Onboarding sections saved"
          >
            {Array.from({ length: progress.totalGroups }, (_, index) => (
              <span
                key={index}
                className={styles.progressSegment}
                data-state={
                  index < progress.completeCount ? "complete" : "upcoming"
                }
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <Link className={styles.cta} href={view.continueHref}>
          {progress.essentialsValid
            ? "Review and confirm essentials"
            : "Continue onboarding"}
        </Link>
      </section>
    </main>
  );
}

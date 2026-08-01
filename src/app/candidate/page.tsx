import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { loadCandidateOnboarding } from "@/lib/onboarding/load-candidate";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import styles from "./page.module.scss";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Candidate · Stint",
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
  const onboardingCompleted = profile.onboardingCompletedAt !== null;

  if (onboardingCompleted) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <Link className={styles.brand} href="/">
            Stint
          </Link>
          <LogoutButton />
        </div>
        <h1 className={styles.heading}>Welcome, {displayName}</h1>
        <p className={styles.lead}>
          Your essential onboarding is complete. Matching is not available yet —
          that opens in a later step.
        </p>
        <p className={styles.note}>
          No job matches are shown here. You can still review or update your
          essentials; completion stays server-controlled.
        </p>
        <p>
          <Link className={styles.cta} href={onboardingGroupHref("review")}>
            Review your essentials
          </Link>
        </p>
      </main>
    );
  }

  const continueHref = progress.essentialsValid
    ? onboardingGroupHref("review")
    : onboardingGroupHref(progress.firstIncompleteGroup ?? "languages");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Stint
        </Link>
        <LogoutButton />
      </div>
      <h1 className={styles.heading}>Welcome, {displayName}</h1>
      <p className={styles.lead}>
        {progress.essentialsValid
          ? "Your essential answers are saved. Confirm completion from review when you are ready — matching is not open yet."
          : "Continue essential onboarding so we can match you carefully later. Progress is saved after each section."}
      </p>
      <p className={styles.note}>
        {progress.completeCount} of {progress.totalGroups} sections saved. No
        job matches are shown here yet.
      </p>
      <p>
        <Link className={styles.cta} href={continueHref}>
          {progress.essentialsValid
            ? "Review and confirm essentials"
            : "Continue onboarding"}
        </Link>
      </p>
    </main>
  );
}

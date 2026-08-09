import { redirect } from "next/navigation";

import { AvailabilityGroupForm } from "@/components/onboarding/availability-group-form";
import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";
import { CategoriesGroupForm } from "@/components/onboarding/categories-group-form";
import { EmploymentGroupForm } from "@/components/onboarding/employment-group-form";
import { LanguagesGroupForm } from "@/components/onboarding/languages-group-form";
import { LocationGroupForm } from "@/components/onboarding/location-group-form";
import { OnboardingProgressNav } from "@/components/onboarding/onboarding-progress";
import { OnboardingReview } from "@/components/onboarding/onboarding-review";
import { WorkAuthorisationGroupForm } from "@/components/onboarding/work-authorisation-group-form";
import styles from "@/components/onboarding/onboarding.module.scss";
import {
  ONBOARDING_GROUP_LABELS,
  type OnboardingGroupId,
} from "@/lib/onboarding/allow-lists";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadCandidateOnboarding } from "@/lib/onboarding/load-candidate";
import { onboardingGroupHref } from "@/lib/onboarding/navigation";
import { resolveOnboardingGroupParam } from "@/lib/onboarding/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding · Stint",
};

type OnboardingPageProps = {
  searchParams: Promise<{ group?: string }>;
};

export default async function CandidateOnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadCandidateOnboarding(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/candidate/onboarding");
    }
    redirect("/auth/error?reason=profile");
  }

  const params = await searchParams;
  const requested = resolveOnboardingGroupParam(params.group);
  const current: OnboardingGroupId | "review" =
    requested ??
    loaded.data.progress.firstIncompleteGroup ??
    (loaded.data.progress.essentialsValid ? "review" : "languages");

  if (requested === null && params.group !== undefined) {
    redirect(onboardingGroupHref(current === "review" ? "review" : current));
  }

  const { profile, languages, progress, displayName } = loaded.data;
  const onboardingCompleted = profile.onboardingCompletedAt !== null;
  const capabilities = await loadAccountCapabilities(supabase);
  const showEmployerNav = capabilities?.hasEmployerProfile === true;

  return (
    <main className={styles.page}>
      <CandidateAppHeader current="profile" showEmployerNav={showEmployerNav} />

      <OnboardingProgressNav progress={progress} current={current} />

      {current === "review" ? (
        <OnboardingReview
          displayName={displayName}
          onboardingCompleted={onboardingCompleted}
          progress={progress}
        />
      ) : (
        <>
          <h1 className={styles.heading}>{ONBOARDING_GROUP_LABELS[current]}</h1>
          <p className={styles.lead}>
            Progress is saved when you continue. You can go back or reload
            without losing what you already saved.
          </p>
          {current === "languages" ? (
            <LanguagesGroupForm
              germanComfort={profile.germanComfort}
              languages={languages}
            />
          ) : null}
          {current === "work_authorisation" ? (
            <WorkAuthorisationGroupForm
              workAuthorisationDeclared={profile.workAuthorisationDeclared}
            />
          ) : null}
          {current === "location" ? (
            <LocationGroupForm
              travelRadiusMinutes={profile.travelRadiusMinutes}
            />
          ) : null}
          {current === "categories" ? (
            <CategoriesGroupForm jobCategories={profile.jobCategories} />
          ) : null}
          {current === "availability" ? (
            <AvailabilityGroupForm availableFrom={profile.availableFrom} />
          ) : null}
          {current === "employment" ? (
            <EmploymentGroupForm
              employmentTypes={profile.employmentTypes}
              shiftPreferences={profile.shiftPreferences}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

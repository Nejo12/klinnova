import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { LocalizedText } from "@/components/i18n/localized-text";
import styles from "@/components/employer-onboarding/employer-onboarding.module.scss";
import { OrganisationProfileForm } from "@/components/employer-onboarding/organisation-profile-form";
import { PrivateProfileForm } from "@/components/employer-onboarding/private-profile-form";
import { TypeSelectionForm } from "@/components/employer-onboarding/type-selection-form";
import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employer onboarding · Klinnova",
};

export default async function EmployerOnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerProfile(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer/onboarding");
    }
    redirect("/auth/error?reason=profile");
  }

  if (loaded.data?.onboardingCompletedAt !== null && loaded.data !== null) {
    redirect("/employer");
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const profile = loaded.data;

  // suspend_employer(uuid, text) requires only an existing employer_profiles
  // row, not onboarding_completed_at — an incomplete employer can be
  // suspended. A first-time caller (profile === null) has no row an
  // employer_suspension row could reference, so the check is skipped for
  // them entirely rather than issuing a self-check RPC call that can only
  // ever return false.
  const suspension =
    profile !== null
      ? await loadCurrentEmployerSuspensionStatus(supabase)
      : null;
  const suspended =
    suspension !== null && suspension.ok && suspension.suspended;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.brand} href="/">
          Klinnova
        </Link>
        <div className={styles.headerActions}>
          <WorkspaceSwitcher
            current="employer"
            hasCandidate={capabilities?.hasCandidateProfile === true}
            hasEmployer={profile !== null}
          />
          <LogoutButton />
        </div>
      </div>

      <h1 className={styles.heading}>
        <LocalizedText message="employer.onboarding.heading" />
      </h1>

      {suspended ? (
        <EmployerRestrictedNotice />
      ) : (
        <>
          <p className={styles.lead}>
            <LocalizedText message="employer.onboarding.lead" />
          </p>

          <TypeSelectionForm
            currentType={profile?.employerType ?? null}
            typeLocked={profile?.typeLocked === true}
          />

          {profile?.employerType === "private" ? (
            <PrivateProfileForm profile={profile} />
          ) : null}

          {profile?.employerType === "organisation" ? (
            <OrganisationProfileForm profile={profile} />
          ) : null}
        </>
      )}
    </main>
  );
}

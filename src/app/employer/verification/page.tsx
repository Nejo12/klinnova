import { redirect } from "next/navigation";

import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { LocalizedText } from "@/components/i18n/localized-text";
import { VerificationStatePanel } from "@/components/employer-verification/verification-state-panel";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import { loadUnseenApplicationsCount } from "@/lib/employer/applications/load-unseen-applications-count";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import { EMPLOYER_RESTRICTED_VERIFICATION } from "@/lib/employer/messages";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import { resolveVerificationView } from "@/lib/employer/verification/resolve-verification-view";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verification · Klinnova",
};

export default async function EmployerVerificationPage() {
  const supabase = await createServerSupabaseClient();
  const loaded = await loadEmployerProfile(supabase);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect("/login?next=/employer/verification");
    }
    redirect("/auth/error?reason=profile");
  }

  const view = resolveVerificationView({
    hasProfile: loaded.data !== null,
    onboardingCompleted: loaded.data?.onboardingCompletedAt !== null,
    verificationState: loaded.data?.verificationState ?? null,
    verificationRequestedAt: loaded.data?.verificationRequestedAt ?? null,
    verificationReviewedAt: loaded.data?.verificationReviewedAt ?? null,
    verificationReviewReason: loaded.data?.verificationReviewReason ?? null,
  });

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  const capabilities = await loadAccountCapabilities(supabase);
  const unseenApplicationsCount = await loadUnseenApplicationsCount(supabase);
  const onboardingIncomplete = loaded.data?.onboardingCompletedAt === null;
  const requestedAt = view.requestedAt;
  const reviewedAt = view.reviewedAt;

  const suspension = await loadCurrentEmployerSuspensionStatus(supabase);
  const suspended = suspension.ok && suspension.suspended;
  const canRequest = view.canRequest && !suspended;

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="verification"
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <h1 className={styles.heading}>
        <LocalizedText message="employer.verification.heading" />
      </h1>

      {suspended ? (
        <EmployerRestrictedNotice message={EMPLOYER_RESTRICTED_VERIFICATION} />
      ) : null}

      <VerificationStatePanel
        view={view}
        requestedAt={requestedAt}
        reviewedAt={reviewedAt}
        canRequest={canRequest}
        onboardingIncomplete={onboardingIncomplete}
      />
    </main>
  );
}

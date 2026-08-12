import Link from "next/link";
import { redirect } from "next/navigation";

import { EmployerRestrictedNotice } from "@/components/employer-shared/employer-restricted-notice";
import { EmployerVacancyPageHeader } from "@/components/employer-vacancies/employer-vacancy-page-header";
import { VerificationRequestForm } from "@/components/employer-verification/verification-request-form";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import { loadAccountCapabilities } from "@/lib/employer/load-capabilities";
import { loadEmployerProfile } from "@/lib/employer/load-employer";
import { EMPLOYER_RESTRICTED_VERIFICATION } from "@/lib/employer/messages";
import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";
import {
  VERIFICATION_PENDING_LEAD,
  VERIFICATION_REJECTED_LEAD,
  VERIFICATION_REVOKED_LEAD,
  VERIFICATION_REVOKED_NO_RESUBMIT,
  VERIFICATION_UNVERIFIED_LEAD,
  VERIFICATION_VERIFIED_LEAD,
} from "@/lib/employer/verification/messages";
import { resolveVerificationView } from "@/lib/employer/verification/resolve-verification-view";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verification · Klinnova",
};

function formatTimestamp(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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
  const onboardingIncomplete = loaded.data?.onboardingCompletedAt === null;
  const requestedAt = formatTimestamp(view.requestedAt);
  const reviewedAt = formatTimestamp(view.reviewedAt);

  const suspension = await loadCurrentEmployerSuspensionStatus(supabase);
  const suspended = suspension.ok && suspension.suspended;
  const canRequest = view.canRequest && !suspended;

  return (
    <main className={styles.page}>
      <EmployerVacancyPageHeader
        showCandidate={capabilities?.hasCandidateProfile === true}
        showEmployer={capabilities?.hasEmployerProfile === true}
        currentPath="verification"
      />

      <h1 className={styles.heading}>Verification</h1>

      {suspended ? (
        <EmployerRestrictedNotice message={EMPLOYER_RESTRICTED_VERIFICATION} />
      ) : null}

      {view.status === "unverified" ? (
        <section className={styles.panel} aria-labelledby="verification-status">
          <h2 className={styles.statusHeading} id="verification-status">
            Not requested
          </h2>
          <p className={styles.lead}>{VERIFICATION_UNVERIFIED_LEAD}</p>

          {onboardingIncomplete ? (
            <p className={styles.warning}>
              Finish employer onboarding before requesting verification.
            </p>
          ) : null}

          <p className={styles.actions}>
            <Link className={styles.linkButton} href="/employer/onboarding">
              Review employer profile
            </Link>
          </p>

          {canRequest ? (
            <VerificationRequestForm
              submitLabel="Request verification"
              pendingLabel="Requesting…"
            />
          ) : null}
        </section>
      ) : null}

      {view.status === "pending" ? (
        <section className={styles.panel} aria-labelledby="verification-status">
          <h2 className={styles.statusHeading} id="verification-status">
            Pending review
          </h2>
          <p className={styles.lead}>{VERIFICATION_PENDING_LEAD}</p>
          <dl className={styles.detailList}>
            {requestedAt !== null ? (
              <>
                <dt>Requested</dt>
                <dd>{requestedAt}</dd>
              </>
            ) : null}
          </dl>
          <p className={styles.actions}>
            <Link className={styles.linkButton} href="/employer/onboarding">
              Review employer profile
            </Link>
          </p>
        </section>
      ) : null}

      {view.status === "verified" ? (
        <section className={styles.panel} aria-labelledby="verification-status">
          <h2 className={styles.statusHeading} id="verification-status">
            Verified
          </h2>
          <p className={styles.lead}>{VERIFICATION_VERIFIED_LEAD}</p>
          <dl className={styles.detailList}>
            {reviewedAt !== null ? (
              <>
                <dt>Reviewed</dt>
                <dd>{reviewedAt}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {view.status === "rejected" ? (
        <section className={styles.panel} aria-labelledby="verification-status">
          <h2 className={styles.statusHeading} id="verification-status">
            Not approved
          </h2>
          <p className={styles.lead}>{VERIFICATION_REJECTED_LEAD}</p>
          <dl className={styles.detailList}>
            {view.reviewReason !== null ? (
              <>
                <dt>Reason</dt>
                <dd>{view.reviewReason}</dd>
              </>
            ) : null}
            {requestedAt !== null ? (
              <>
                <dt>Requested</dt>
                <dd>{requestedAt}</dd>
              </>
            ) : null}
            {reviewedAt !== null ? (
              <>
                <dt>Reviewed</dt>
                <dd>{reviewedAt}</dd>
              </>
            ) : null}
          </dl>
          <p className={styles.actions}>
            <Link className={styles.linkButton} href="/employer/onboarding">
              Edit employer profile
            </Link>
          </p>

          {canRequest ? (
            <VerificationRequestForm
              submitLabel="Resubmit verification"
              pendingLabel="Resubmitting…"
            />
          ) : null}
        </section>
      ) : null}

      {view.status === "revoked" ? (
        <section className={styles.panel} aria-labelledby="verification-status">
          <h2 className={styles.statusHeading} id="verification-status">
            Revoked
          </h2>
          <p className={styles.lead}>{VERIFICATION_REVOKED_LEAD}</p>
          <dl className={styles.detailList}>
            {view.reviewReason !== null ? (
              <>
                <dt>Reason</dt>
                <dd>{view.reviewReason}</dd>
              </>
            ) : null}
            {reviewedAt !== null ? (
              <>
                <dt>Reviewed</dt>
                <dd>{reviewedAt}</dd>
              </>
            ) : null}
          </dl>
          <p className={styles.warning}>{VERIFICATION_REVOKED_NO_RESUBMIT}</p>
          <p className={styles.actions}>
            <Link className={styles.linkButton} href="/employer/onboarding">
              Review employer profile
            </Link>
          </p>
        </section>
      ) : null}
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { InternalUnavailable } from "@/components/internal-verification/internal-unavailable";
import styles from "@/components/internal-verification/internal-verification.module.scss";
import { VerificationReviewActions } from "@/components/internal-verification/verification-review-actions";
import { VerificationReviewDetail } from "@/components/internal-verification/verification-review-detail";
import { loadVerificationReview } from "@/lib/internal/verification/load-verification-review";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InternalVerificationDetailPageProps = {
  params: Promise<{ employerProfileId: string }>;
};

export async function generateMetadata({
  params,
}: InternalVerificationDetailPageProps) {
  const { employerProfileId } = await params;
  return {
    title: "Verification review · Klinnova",
    description: `Operator review ${employerProfileId}`,
  };
}

export default async function InternalVerificationDetailPage({
  params,
}: InternalVerificationDetailPageProps) {
  const { employerProfileId } = await params;
  const supabase = await createServerSupabaseClient();
  const loaded = await loadVerificationReview(supabase, employerProfileId);

  if (!loaded.ok) {
    if (loaded.reason === "unauthenticated") {
      redirect(`/login?next=/internal/verification/${employerProfileId}`);
    }
    return <InternalUnavailable />;
  }

  const { review } = loaded;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{review.displayName ?? "Employer"}</h1>

      <section className={styles.panel} aria-labelledby="review-detail">
        <h2 className={styles.label} id="review-detail">
          Review detail
        </h2>
        <VerificationReviewDetail review={review} />
      </section>

      {review.verificationState === "pending" ? (
        <section className={styles.panel} aria-labelledby="review-actions">
          <h2 className={styles.label} id="review-actions">
            Decision
          </h2>
          <VerificationReviewActions
            employerProfileId={review.employerProfileId}
          />
        </section>
      ) : (
        <p className={styles.lead}>
          This request is no longer pending. No action is available here.
        </p>
      )}

      <p>
        <Link className={styles.linkButton} href="/internal/verification">
          Back to queue
        </Link>
      </p>
    </main>
  );
}

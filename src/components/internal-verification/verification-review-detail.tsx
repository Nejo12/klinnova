import styles from "@/components/internal-verification/internal-verification.module.scss";
import { formatTimestamp } from "@/lib/internal/verification/format-timestamp";
import type { VerificationReviewData } from "@/lib/internal/verification/load-verification-review";

function stateLabel(
  state: VerificationReviewData["verificationState"],
): string {
  switch (state) {
    case "pending":
      return "Pending review";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
  }
}

type VerificationReviewDetailProps = {
  review: VerificationReviewData;
};

export function VerificationReviewDetail({
  review,
}: VerificationReviewDetailProps) {
  const requestedAt = formatTimestamp(review.verificationRequestedAt);
  const attestedAt = formatTimestamp(review.verificationAttestedAt);
  const reviewedAt = formatTimestamp(review.verificationReviewedAt);

  return (
    <dl className={styles.detailList}>
      <dt>Employer</dt>
      <dd>{review.displayName ?? "—"}</dd>

      <dt>Type</dt>
      <dd>
        {review.employerType === "organisation" ? "Organisation" : "Private"}
      </dd>

      {review.employerType === "organisation" ? (
        <>
          <dt>Company</dt>
          <dd>{review.companyName ?? "—"}</dd>
        </>
      ) : null}

      {review.website !== null ? (
        <>
          <dt>Website</dt>
          <dd>{review.website}</dd>
        </>
      ) : null}

      <dt>Berlin locality</dt>
      <dd>{review.berlinLocality ?? "—"}</dd>

      <dt>Onboarding complete</dt>
      <dd>{review.onboardingCompleted ? "Yes" : "No"}</dd>

      <dt>Status</dt>
      <dd>{stateLabel(review.verificationState)}</dd>

      <dt>Requested</dt>
      <dd>{requestedAt ?? "—"}</dd>

      <dt>Attestation</dt>
      <dd>
        {review.verificationAttestationVersion}
        {attestedAt !== null ? ` · ${attestedAt}` : ""}
      </dd>

      {reviewedAt !== null ? (
        <>
          <dt>Reviewed</dt>
          <dd>{reviewedAt}</dd>
        </>
      ) : null}

      {review.verificationReviewReason !== null ? (
        <>
          <dt>Reason</dt>
          <dd>{review.verificationReviewReason}</dd>
        </>
      ) : null}
    </dl>
  );
}

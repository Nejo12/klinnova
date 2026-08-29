import Link from "next/link";

import { VerificationRequestForm } from "@/components/employer-verification/verification-request-form";
import styles from "@/components/employer-verification/employer-verification.module.scss";
import {
  VERIFICATION_HEADING_PENDING,
  VERIFICATION_HEADING_REJECTED,
  VERIFICATION_HEADING_REVOKED,
  VERIFICATION_HEADING_UNVERIFIED,
  VERIFICATION_HEADING_VERIFIED,
  VERIFICATION_INCOMPLETE_EMPLOYER,
  VERIFICATION_PENDING_LEAD,
  VERIFICATION_REJECTED_LEAD,
  VERIFICATION_REVOKED_LEAD,
  VERIFICATION_REVOKED_NO_RESUBMIT,
  VERIFICATION_STATUS_PENDING,
  VERIFICATION_STATUS_REJECTED,
  VERIFICATION_STATUS_REVOKED,
  VERIFICATION_STATUS_UNVERIFIED,
  VERIFICATION_STATUS_VERIFIED,
  VERIFICATION_UNVERIFIED_LEAD,
  VERIFICATION_VERIFIED_LEAD,
} from "@/lib/employer/verification/messages";
import type { VerificationViewState } from "@/lib/employer/verification/resolve-verification-view";

type PanelView = Extract<VerificationViewState, { kind: "panel" }>;

type VerificationStatePanelProps = {
  view: PanelView;
  requestedAt: string | null;
  reviewedAt: string | null;
  canRequest: boolean;
  onboardingIncomplete: boolean;
};

const STATUS_COPY: Record<
  PanelView["status"],
  { badge: string; heading: string; lead: string }
> = {
  unverified: {
    badge: VERIFICATION_STATUS_UNVERIFIED,
    heading: VERIFICATION_HEADING_UNVERIFIED,
    lead: VERIFICATION_UNVERIFIED_LEAD,
  },
  pending: {
    badge: VERIFICATION_STATUS_PENDING,
    heading: VERIFICATION_HEADING_PENDING,
    lead: VERIFICATION_PENDING_LEAD,
  },
  verified: {
    badge: VERIFICATION_STATUS_VERIFIED,
    heading: VERIFICATION_HEADING_VERIFIED,
    lead: VERIFICATION_VERIFIED_LEAD,
  },
  rejected: {
    badge: VERIFICATION_STATUS_REJECTED,
    heading: VERIFICATION_HEADING_REJECTED,
    lead: VERIFICATION_REJECTED_LEAD,
  },
  revoked: {
    badge: VERIFICATION_STATUS_REVOKED,
    heading: VERIFICATION_HEADING_REVOKED,
    lead: VERIFICATION_REVOKED_LEAD,
  },
};

export function VerificationStatePanel({
  view,
  requestedAt,
  reviewedAt,
  canRequest,
  onboardingIncomplete,
}: VerificationStatePanelProps) {
  const copy = STATUS_COPY[view.status];
  const showReason = view.reviewReason !== null;
  const showRequested =
    requestedAt !== null &&
    (view.status === "pending" || view.status === "rejected");
  const showReviewed =
    reviewedAt !== null &&
    (view.status === "verified" ||
      view.status === "rejected" ||
      view.status === "revoked");
  const showDetails = showReason || showRequested || showReviewed;
  const profileActionLabel =
    view.status === "rejected"
      ? "Edit employer profile"
      : "Review employer profile";
  const showProfileAction = view.status !== "verified";

  return (
    <section className={styles.panel} aria-labelledby="verification-heading">
      <p
        className={styles.statusBadge}
        data-status={view.status}
        id="verification-status"
        role="status"
        aria-label={copy.badge}
      >
        {copy.badge}
      </p>
      <h2 className={styles.stateHeading} id="verification-heading">
        {copy.heading}
      </h2>
      <p className={styles.lead}>{copy.lead}</p>

      {onboardingIncomplete && view.status === "unverified" ? (
        <p className={styles.warning}>{VERIFICATION_INCOMPLETE_EMPLOYER}</p>
      ) : null}

      {showDetails ? (
        <dl className={styles.detailList}>
          {showReason ? (
            <div>
              <dt>Reason</dt>
              <dd>{view.reviewReason}</dd>
            </div>
          ) : null}
          {showRequested ? (
            <div>
              <dt>Requested</dt>
              <dd>{requestedAt}</dd>
            </div>
          ) : null}
          {showReviewed ? (
            <div>
              <dt>Reviewed</dt>
              <dd>{reviewedAt}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {view.status === "revoked" ? (
        <p className={styles.warning}>{VERIFICATION_REVOKED_NO_RESUBMIT}</p>
      ) : null}

      {showProfileAction ? (
        <p className={styles.actions}>
          <Link className={styles.linkButton} href="/employer/onboarding">
            {profileActionLabel}
          </Link>
        </p>
      ) : null}

      {canRequest && view.status === "unverified" ? (
        <VerificationRequestForm
          submitLabel="Request verification"
          pendingLabel="Requesting…"
        />
      ) : null}

      {canRequest && view.status === "rejected" ? (
        <VerificationRequestForm
          submitLabel="Resubmit verification"
          pendingLabel="Resubmitting…"
        />
      ) : null}
    </section>
  );
}

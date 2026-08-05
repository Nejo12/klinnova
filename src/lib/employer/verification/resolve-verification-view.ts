export type VerificationViewState =
  | { kind: "redirect"; href: string }
  | {
      kind: "panel";
      status: "unverified" | "pending" | "verified" | "rejected" | "revoked";
      requestedAt: string | null;
      reviewedAt: string | null;
      reviewReason: string | null;
      canRequest: boolean;
    };

export function resolveVerificationView(options: {
  hasProfile: boolean;
  onboardingCompleted: boolean;
  verificationState: string | null;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  verificationReviewReason: string | null;
}): VerificationViewState {
  if (!options.hasProfile) {
    return { kind: "redirect", href: "/employer/onboarding" };
  }

  const status = normalizeStatus(options.verificationState);

  return {
    kind: "panel",
    status,
    requestedAt: options.verificationRequestedAt,
    reviewedAt: options.verificationReviewedAt,
    reviewReason: options.verificationReviewReason,
    canRequest:
      options.onboardingCompleted &&
      (status === "unverified" || status === "rejected"),
  };
}

function normalizeStatus(
  value: string | null,
): "unverified" | "pending" | "verified" | "rejected" | "revoked" {
  if (
    value === "pending" ||
    value === "verified" ||
    value === "rejected" ||
    value === "revoked"
  ) {
    return value;
  }
  return "unverified";
}

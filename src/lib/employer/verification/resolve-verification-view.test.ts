import { describe, expect, it } from "vitest";

import { resolveVerificationView } from "@/lib/employer/verification/resolve-verification-view";

const base = {
  hasProfile: true,
  onboardingCompleted: true,
  verificationState: "unverified",
  verificationRequestedAt: null,
  verificationReviewedAt: null,
  verificationReviewReason: null,
};

describe("resolveVerificationView", () => {
  it("redirects to onboarding when no employer profile exists", () => {
    expect(resolveVerificationView({ ...base, hasProfile: false })).toEqual({
      kind: "redirect",
      href: "/employer/onboarding",
    });
  });

  it("shows unverified panel and allows request when onboarding is complete", () => {
    const view = resolveVerificationView(base);
    expect(view).toMatchObject({
      kind: "panel",
      status: "unverified",
      canRequest: true,
    });
  });

  it("disables request when onboarding is incomplete", () => {
    const view = resolveVerificationView({
      ...base,
      onboardingCompleted: false,
    });
    expect(view).toMatchObject({ status: "unverified", canRequest: false });
  });

  it("shows pending panel without a request action", () => {
    const view = resolveVerificationView({
      ...base,
      verificationState: "pending",
      verificationRequestedAt: "2026-08-05T10:00:00Z",
    });
    expect(view).toMatchObject({
      status: "pending",
      canRequest: false,
      requestedAt: "2026-08-05T10:00:00Z",
    });
  });

  it("shows verified panel without a request action", () => {
    const view = resolveVerificationView({
      ...base,
      verificationState: "verified",
      verificationReviewedAt: "2026-08-06T10:00:00Z",
    });
    expect(view).toMatchObject({ status: "verified", canRequest: false });
  });

  it("allows resubmission when rejected and onboarding remains complete", () => {
    const view = resolveVerificationView({
      ...base,
      verificationState: "rejected",
      verificationReviewReason: "Profile details need review",
    });
    expect(view).toMatchObject({
      status: "rejected",
      canRequest: true,
      reviewReason: "Profile details need review",
    });
  });

  it("never allows resubmission when revoked", () => {
    const view = resolveVerificationView({
      ...base,
      verificationState: "revoked",
      verificationReviewReason: "Trust concern",
    });
    expect(view).toMatchObject({ status: "revoked", canRequest: false });
  });

  it("falls back to unverified for an unrecognized state", () => {
    const view = resolveVerificationView({
      ...base,
      verificationState: "unexpected",
    });
    expect(view).toMatchObject({ status: "unverified" });
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VerificationStatePanel } from "@/components/employer-verification/verification-state-panel";
import type { VerificationViewState } from "@/lib/employer/verification/resolve-verification-view";

function panel(
  overrides: Partial<Extract<VerificationViewState, { kind: "panel" }>> = {},
): Extract<VerificationViewState, { kind: "panel" }> {
  return {
    kind: "panel",
    status: "unverified",
    requestedAt: null,
    reviewedAt: null,
    reviewReason: null,
    canRequest: true,
    ...overrides,
  };
}

describe("VerificationStatePanel", () => {
  it("shows unverified copy, profile review, and Request verification when allowed", () => {
    render(
      <VerificationStatePanel
        view={panel({ canRequest: true })}
        requestedAt={null}
        reviewedAt={null}
        canRequest={true}
        onboardingIncomplete={false}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Not requested" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verification has not been requested",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review employer profile" }),
    ).toHaveAttribute("href", "/employer/onboarding");
    expect(
      screen.getByRole("button", { name: "Request verification" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Finish employer onboarding before requesting verification.",
      ),
    ).toBeNull();
  });

  it("explains incomplete onboarding and hides Request verification when it is not allowed", () => {
    render(
      <VerificationStatePanel
        view={panel({ canRequest: false })}
        requestedAt={null}
        reviewedAt={null}
        canRequest={false}
        onboardingIncomplete={true}
      />,
    );

    expect(
      screen.getByText(
        "Finish employer onboarding before requesting verification.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request verification" }),
    ).toBeNull();
  });

  it("shows pending review with a real requested timestamp and no resubmit", () => {
    render(
      <VerificationStatePanel
        view={panel({ status: "pending", canRequest: false })}
        requestedAt="1 Aug 2026, 02:00"
        reviewedAt={null}
        canRequest={false}
        onboardingIncomplete={false}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Pending review" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your verification request is being reviewed",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("1 Aug 2026, 02:00")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Resubmit|Request verification/ }),
    ).toBeNull();
  });

  it("shows a calm verified state with reviewed timestamp and no request control", () => {
    render(
      <VerificationStatePanel
        view={panel({ status: "verified", canRequest: false })}
        requestedAt={null}
        reviewedAt="1 Jan 2026, 01:00"
        canRequest={false}
        onboardingIncomplete={false}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Verified" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByText("1 Jan 2026, 01:00")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows rejected recovery with a real reason and Resubmit when allowed", () => {
    render(
      <VerificationStatePanel
        view={panel({
          status: "rejected",
          canRequest: true,
          reviewReason: "Profile details need review",
        })}
        requestedAt={null}
        reviewedAt={null}
        canRequest={true}
        onboardingIncomplete={false}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Not approved" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verification was not approved",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByText("Profile details need review")).toBeInTheDocument();
    expect(
      screen.queryByText("Company information could not be confirmed."),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Edit employer profile" }),
    ).toHaveAttribute("href", "/employer/onboarding");
    expect(
      screen.getByRole("button", { name: "Resubmit verification" }),
    ).toBeInTheDocument();
  });

  it("omits a rejected reason when none is present", () => {
    render(
      <VerificationStatePanel
        view={panel({
          status: "rejected",
          canRequest: true,
          reviewReason: null,
        })}
        requestedAt={null}
        reviewedAt={null}
        canRequest={true}
        onboardingIncomplete={false}
      />,
    );

    expect(screen.queryByText("Reason")).toBeNull();
  });

  it("shows revoked as distinct from rejected, with no resubmit", () => {
    render(
      <VerificationStatePanel
        view={panel({
          status: "revoked",
          canRequest: false,
          reviewReason: "Trust concern",
        })}
        requestedAt={null}
        reviewedAt="6 Aug 2026, 12:00"
        canRequest={false}
        onboardingIncomplete={false}
      />,
    );

    expect(screen.getByRole("status", { name: "Revoked" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verification withdrawn",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Trust concern")).toBeInTheDocument();
    expect(
      screen.getByText(/Direct resubmission is not available after revocation/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review employer profile" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Resubmit verification" }),
    ).toBeNull();
    expect(screen.queryByText("Not approved")).toBeNull();
  });

  it("hides Request verification when the employer is restricted even if unverified", () => {
    render(
      <VerificationStatePanel
        view={panel({ status: "unverified", canRequest: true })}
        requestedAt={null}
        reviewedAt={null}
        canRequest={false}
        onboardingIncomplete={false}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Not requested" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request verification" }),
    ).toBeNull();
  });

  it("hides Resubmit verification when restricted even if rejected", () => {
    render(
      <VerificationStatePanel
        view={panel({ status: "rejected", canRequest: true })}
        requestedAt={null}
        reviewedAt={null}
        canRequest={false}
        onboardingIncomplete={false}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Not approved" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Resubmit verification" }),
    ).toBeNull();
    expect(screen.queryByText("Revoked")).toBeNull();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateApplicationsPageHeader } from "@/components/candidate-applications/candidate-applications-page-header";

describe("CandidateApplicationsPageHeader", () => {
  it("renders an Applications link marked as the current page", () => {
    render(<CandidateApplicationsPageHeader showEmployerNav={false} />);
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/candidate/applications",
    );
  });

  it("hides the employer/candidate capability switcher for a candidate-only account", () => {
    render(<CandidateApplicationsPageHeader showEmployerNav={false} />);
    expect(screen.queryByRole("link", { name: "Employer" })).toBeNull();
  });

  it("shows the capability switcher for a dual-capability account", () => {
    render(<CandidateApplicationsPageHeader showEmployerNav />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Workspace and account: Candidate",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Employer" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Account spaces" }),
    ).toBeNull();
  });

  it("also exposes Matches, Profile, and Account (M5.1 Unit B coherent nav)", () => {
    render(<CandidateApplicationsPageHeader showEmployerNav={false} />);

    expect(screen.getByRole("link", { name: "Matches" })).toHaveAttribute(
      "href",
      "/candidate/matches",
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=review",
    );
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/candidate/account",
    );
  });
});

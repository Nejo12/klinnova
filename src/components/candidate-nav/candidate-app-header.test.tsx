import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateAppHeader } from "@/components/candidate-nav/candidate-app-header";

describe("CandidateAppHeader (M5.1 Unit B)", () => {
  it("renders the brand link, the candidate nav, and hides the capability switcher for a candidate-only account", () => {
    render(<CandidateAppHeader current="matches" showEmployerNav={false} />);

    expect(screen.getByRole("link", { name: "Klinnova" })).toHaveAttribute(
      "href",
      "/candidate",
    );
    expect(screen.getByRole("link", { name: "Matches" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "Employer" })).toBeNull();
  });

  it("shows the capability switcher for a dual-capability account", () => {
    render(<CandidateAppHeader showEmployerNav />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Workspace and account: Candidate",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Employer" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Candidate")).toHaveLength(2);
    expect(
      screen.queryByRole("navigation", { name: "Account spaces" }),
    ).toBeNull();
  });

  it("supports a custom brand href (matches page failure state)", () => {
    render(<CandidateAppHeader showEmployerNav={false} brandHref="/" />);

    expect(screen.getByRole("link", { name: "Klinnova" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

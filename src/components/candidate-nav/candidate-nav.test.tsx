import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateNav } from "@/components/candidate-nav/candidate-nav";

describe("CandidateNav (M5.1 Unit B)", () => {
  it("renders all four destinations with the correct hrefs", () => {
    render(<CandidateNav />);

    expect(screen.getByRole("link", { name: "Matches" })).toHaveAttribute(
      "href",
      "/candidate/matches",
    );
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "href",
      "/candidate/applications",
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

  it("marks only the current destination with aria-current", () => {
    render(<CandidateNav current="applications" />);

    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Matches" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Profile" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Account" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks no destination current when current is omitted (e.g. candidate home, job detail)", () => {
    render(<CandidateNav />);

    for (const name of ["Matches", "Applications", "Profile", "Account"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });

  it("does not render sign-out as a nav destination", () => {
    render(<CandidateNav current="account" />);

    expect(
      screen.queryByRole("link", { name: /log out/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /log out/i }),
    ).not.toBeInTheDocument();
  });

  it("is a labelled navigation landmark", () => {
    render(<CandidateNav />);
    expect(
      screen.getByRole("navigation", { name: "Candidate" }),
    ).toBeInTheDocument();
  });
});

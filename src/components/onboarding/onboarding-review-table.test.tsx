import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingReviewTable } from "@/components/onboarding/onboarding-review-table";

const profile = {
  germanComfort: "basic",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 30,
  jobCategories: ["cleaning", "logistics"],
  availableFrom: "2026-09-01",
  employmentTypes: ["part_time"],
  shiftPreferences: ["morning", "weekend"],
};

describe("OnboardingReviewTable", () => {
  it("renders all 6 group labels including employment types and shifts", () => {
    render(<OnboardingReviewTable profile={profile} languages={[]} />);

    expect(
      screen.getByText("Languages and German comfort"),
    ).toBeInTheDocument();
    expect(screen.getByText("Work authorisation")).toBeInTheDocument();
    expect(screen.getByText("Berlin and travel time")).toBeInTheDocument();
    expect(screen.getByText("Job categories")).toBeInTheDocument();
    expect(screen.getByText("Earliest availability")).toBeInTheDocument();
    expect(screen.getByText("Employment types and shifts")).toBeInTheDocument();
  });

  it("never renders a district — location value contains only Berlin", () => {
    render(<OnboardingReviewTable profile={profile} languages={[]} />);

    const table = screen.getByRole("table");
    const locationRow = within(table).getByText(/Berlin and travel time/);

    expect(locationRow.textContent).not.toMatch(
      /wedding|mitte|kreuzberg|neuk[oö]lln/i,
    );
  });

  it("renders an Edit link for each group with correct hrefs", () => {
    render(<OnboardingReviewTable profile={profile} languages={[]} />);

    // Check specific hrefs for each group
    const editLinks = screen.getAllByRole("link", { name: /^Edit /i });
    expect(editLinks.length).toBe(6);

    expect(editLinks[0]).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=languages",
    );
    expect(editLinks[1]).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=work_authorisation",
    );
    expect(editLinks[2]).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=location",
    );
    expect(editLinks[3]).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=categories",
    );
    expect(editLinks[4]).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=availability",
    );
    expect(editLinks[5]).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=employment",
    );
  });

  it("gives each Edit link a distinguishing accessible name tied to its row", () => {
    render(<OnboardingReviewTable profile={profile} languages={[]} />);

    expect(
      screen.getByRole("link", { name: "Edit Languages and German comfort" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=languages");
    expect(
      screen.getByRole("link", { name: "Edit Work authorisation" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=work_authorisation");
  });

  it("exposes each row label as a row header (th scope=row)", () => {
    render(<OnboardingReviewTable profile={profile} languages={[]} />);

    expect(
      screen.getByRole("rowheader", { name: "Languages and German comfort" }),
    ).toBeInTheDocument();
  });
});

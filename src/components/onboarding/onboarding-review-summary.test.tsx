import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { OnboardingReviewSummary } from "@/components/onboarding/onboarding-review-summary";

const profile = {
  germanComfort: "basic",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 30,
  jobCategories: ["cleaning", "logistics"],
  availableFrom: "2026-09-20",
  employmentTypes: ["part_time"],
  shiftPreferences: ["morning", "weekend"],
};

describe("OnboardingReviewSummary", () => {
  it("renders six semantic label/value groups with direct edit routes", () => {
    render(<OnboardingReviewSummary profile={profile} languages={[]} />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByRole("term")).toHaveLength(6);
    expect(screen.getAllByRole("definition")).toHaveLength(6);
    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Work preferences")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Languages: Edit" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=languages");
    expect(
      screen.getByRole("link", { name: "Work preferences: Edit" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=employment");
  });

  it("uses the existing EN/DE message architecture for new review labels", () => {
    document.documentElement.dataset.locale = "de";

    render(
      <LocaleProvider>
        <OnboardingReviewSummary profile={profile} languages={[]} />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("region", { name: "Gespeichertes Profil" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Arbeitserlaubnis")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Arbeitswünsche: Bearbeiten" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=employment");

    document.documentElement.dataset.locale = "en";
  });
});

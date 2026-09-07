import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingReview } from "@/components/onboarding/onboarding-review";
import type { OnboardingProgress } from "@/lib/onboarding/progress";

vi.mock("@/components/onboarding/complete-onboarding-form", () => ({
  CompleteOnboardingForm: () => <button type="submit">Complete profile</button>,
}));

const completeProfile = {
  germanComfort: "basic",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 30,
  jobCategories: ["cleaning", "logistics"],
  availableFrom: "2026-09-20",
  employmentTypes: ["part_time"],
  shiftPreferences: ["morning", "weekend"],
};

const completeProgress: OnboardingProgress = {
  completeGroups: [
    "languages",
    "work_authorisation",
    "location",
    "categories",
    "availability",
    "employment",
  ],
  incompleteGroups: [],
  firstIncompleteGroup: null,
  completeCount: 6,
  totalGroups: 6,
  essentialsValid: true,
};

describe("OnboardingReview", () => {
  it("shows the ready state, saved profile and one dominant matching action", () => {
    render(
      <OnboardingReview
        onboardingCompleted
        progress={completeProgress}
        profile={completeProfile}
        languages={[{ languageCode: "en", proficiency: "native" }]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Review your profile" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready for matching")).toBeInTheDocument();
    expect(screen.getByText("6 of 6 essentials saved")).toBeInTheDocument();
    expect(screen.getByText(/English \(Native\)/)).toBeInTheDocument();
    expect(screen.getByText("Cleaning, Logistics")).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Saved profile" });
    expect(within(summary).getAllByRole("term")).toHaveLength(6);
    expect(
      within(summary).getAllByRole("link", { name: /: Edit$/ }),
    ).toHaveLength(6);
    expect(
      screen.getByRole("link", { name: "View matching jobs" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=languages",
    );

    expect(
      screen.queryByText(/Completion stays server-controlled/i),
    ).toBeNull();
    expect(screen.queryByText(/Updating answers can clear/i)).toBeNull();
    expect(screen.queryByText(/progress is saved/i)).toBeNull();
  });

  it("keeps the explicit server completion step concise", () => {
    render(
      <OnboardingReview
        onboardingCompleted={false}
        progress={completeProgress}
        profile={completeProfile}
        languages={[{ languageCode: "en", proficiency: "native" }]}
      />,
    );

    expect(screen.getByText("Ready to complete")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Complete profile" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ready for matching")).toBeNull();
    expect(screen.queryByText(/server checks/i)).toBeNull();
    expect(screen.queryByText(/After you confirm/i)).toBeNull();
  });

  it("shows actionable missing essentials and the first continue route", () => {
    render(
      <OnboardingReview
        onboardingCompleted={false}
        progress={{
          completeGroups: ["languages", "categories"],
          incompleteGroups: ["work_authorisation", "availability"],
          firstIncompleteGroup: "work_authorisation",
          completeCount: 2,
          totalGroups: 6,
          essentialsValid: false,
        }}
        profile={{
          ...completeProfile,
          workAuthorisationDeclared: null,
          availableFrom: null,
        }}
        languages={[{ languageCode: "en", proficiency: "native" }]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Finish your profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 essentials still need an answer."),
    ).toBeInTheDocument();
    expect(screen.getByText("Still needed")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Work authorisation" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=work_authorisation");
    expect(screen.getByRole("link", { name: "Availability" })).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=availability",
    );
    expect(
      screen.getByRole("link", { name: "Continue profile" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=work_authorisation");
    expect(screen.queryByText("Ready for matching")).toBeNull();
    expect(
      screen.queryByText(/Progress is saved after each section/i),
    ).toBeNull();
  });
});

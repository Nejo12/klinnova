import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateProfileSummary } from "@/components/candidate-profile/candidate-profile-summary";

const profile = {
  germanComfort: "basic",
  workAuthorisationDeclared: true,
  city: "Berlin",
  travelRadiusMinutes: 45,
  jobCategories: ["cleaning"],
  availableFrom: "2026-10-05",
  employmentTypes: ["part_time"],
  shiftPreferences: ["daytime"],
};

const languages = [
  {
    languageCode: "en",
    proficiency: "basic",
  },
];

const progress = {
  completeGroups: [
    "languages",
    "work_authorisation",
    "location",
    "categories",
    "availability",
    "employment",
  ] as const,
  incompleteGroups: [],
  firstIncompleteGroup: null,
  completeCount: 6,
  totalGroups: 6,
  essentialsValid: true,
};

describe("CandidateProfileSummary", () => {
  it("shows identity, readiness and existing saved matching data", () => {
    render(
      <CandidateProfileSummary
        displayName="Ada Candidate"
        profile={profile}
        languages={languages}
        progress={progress}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Ada Candidate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AC")).toBeInTheDocument();
    expect(screen.getByText("Profile ready")).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText(/Part time/)).toBeInTheDocument();
    expect(screen.getByText(/Daytime/)).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();
    expect(screen.getByText(/Basic German/)).toBeInTheDocument();
    expect(screen.getByText(/Berlin/)).toBeInTheDocument();
    expect(screen.getByText(/45 minutes/)).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("keeps editing and account administration as separate destinations", () => {
    render(
      <CandidateProfileSummary
        displayName="Ada Candidate"
        profile={profile}
        languages={languages}
        progress={progress}
      />,
    );

    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=review",
    );
    expect(
      screen.getByRole("link", { name: "Account and security" }),
    ).toHaveAttribute("href", "/candidate/account");
  });
});

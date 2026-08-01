import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingReview } from "@/components/onboarding/onboarding-review";

describe("OnboardingReview", () => {
  it("shows ready copy without job matches when essentials are valid", () => {
    render(
      <OnboardingReview
        displayName="Ada"
        progress={{
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
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /Essentials look complete, Ada/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No job matches are shown here/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /jobs?/i })).toBeNull();
  });

  it("lists incomplete sections when essentials are not valid", () => {
    render(
      <OnboardingReview
        displayName="Ada"
        progress={{
          completeGroups: ["languages"],
          incompleteGroups: ["work_authorisation", "location"],
          firstIncompleteGroup: "work_authorisation",
          completeCount: 1,
          totalGroups: 6,
          essentialsValid: false,
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Work authorisation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue onboarding" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=work_authorisation");
  });
});

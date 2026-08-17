import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingProgressNav } from "@/components/onboarding/onboarding-progress";
import { ONBOARDING_GROUP_LABELS } from "@/lib/onboarding/allow-lists";
import type { OnboardingProgress } from "@/lib/onboarding/progress";

const baseProgress: OnboardingProgress = {
  completeGroups: ["languages", "work_authorisation"],
  incompleteGroups: ["location", "categories", "availability", "employment"],
  firstIncompleteGroup: "location",
  completeCount: 2,
  totalGroups: 6,
  essentialsValid: true,
};

describe("OnboardingProgressNav", () => {
  it("exposes a nav landmark labelled Onboarding progress", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    expect(
      screen.getByRole("navigation", { name: "Onboarding progress" }),
    ).toBeInTheDocument();
  });

  it("renders all six onboarding groups as list items with their real labels", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const nav = screen.getByRole("navigation", { name: "Onboarding progress" });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(6);

    for (const label of Object.values(ONBOARDING_GROUP_LABELS)) {
      expect(within(nav).getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it("marks the current group with aria-current=step and Current state/marker", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const currentLink = screen.getByRole("link", {
      name: /Current.*Berlin and travel time/,
    });
    expect(currentLink).toHaveAttribute("aria-current", "step");
    expect(currentLink).toHaveAttribute("data-state", "current");
  });

  it("does not mark non-current groups with aria-current", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const completeLink = screen.getByRole("link", {
      name: /Saved.*Languages and German comfort/,
    });
    expect(completeLink).not.toHaveAttribute("aria-current");
    expect(completeLink).toHaveAttribute("data-state", "complete");

    const upcomingLink = screen.getByRole("link", {
      name: /Next.*Job categories/,
    });
    expect(upcomingLink).not.toHaveAttribute("aria-current");
    expect(upcomingLink).toHaveAttribute("data-state", "upcoming");
  });

  it("shows the X of Y sections saved caption", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    expect(screen.getByText("2 of 6 sections saved")).toBeInTheDocument();
  });

  it("gives complete, current, and upcoming steps distinct marker text (never color alone)", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const nav = screen.getByRole("navigation", { name: "Onboarding progress" });
    expect(within(nav).getAllByText("Saved")).toHaveLength(2);
    expect(within(nav).getAllByText("Current")).toHaveLength(1);
    expect(within(nav).getAllByText("Next")).toHaveLength(3);
  });

  it("links each item to the correct onboarding group href", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const link = screen.getByRole("link", {
      name: /Current.*Berlin and travel time/,
    });
    expect(link).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=location",
    );
  });

  it("marks no group as current when current is 'review'", () => {
    render(<OnboardingProgressNav progress={baseProgress} current="review" />);

    const nav = screen.getByRole("navigation", { name: "Onboarding progress" });
    expect(within(nav).queryByText("Current")).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { current: "step" }),
    ).not.toBeInTheDocument();
  });
});

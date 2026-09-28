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

    const nav = screen.getByRole("navigation", {
      name: "Onboarding progress",
    });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(6);

    for (const label of Object.values(ONBOARDING_GROUP_LABELS)) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
  });

  it("shows a localized Step N of 6 primary progress label", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    // location is the third onboarding group.
    expect(screen.getByText("Step 3 of 6")).toBeInTheDocument();
  });

  it("renders the Nova Progress primitive with the completed-group value", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "2");
    expect(progressBar).toHaveAttribute("aria-valuemax", "6");
  });

  it("marks the current group with aria-current=step", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const currentLink = screen.getByRole("link", {
      name: "Berlin and travel time",
    });
    expect(currentLink).toHaveAttribute("aria-current", "step");
    expect(currentLink).toHaveAttribute("data-state", "current");
  });

  it("does not mark non-current groups with aria-current", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const completeLink = screen.getByRole("link", {
      name: "Languages and German comfort: Edit",
    });
    expect(completeLink).not.toHaveAttribute("aria-current");
    expect(completeLink).toHaveAttribute("data-state", "complete");

    const upcomingLink = screen.getByRole("link", {
      name: "Job categories",
    });
    expect(upcomingLink).not.toHaveAttribute("aria-current");
    expect(upcomingLink).toHaveAttribute("data-state", "upcoming");
  });

  it("removes the old SAVED/CURRENT/NEXT marker text", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const nav = screen.getByRole("navigation", {
      name: "Onboarding progress",
    });
    expect(within(nav).queryByText("Saved")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Current")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Next")).not.toBeInTheDocument();
  });

  it("gives completed groups a non-color cue (checkmark) and an Edit affordance", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const completeLink = screen.getByRole("link", {
      name: "Languages and German comfort: Edit",
    });
    expect(within(completeLink).getByText("✓")).toBeInTheDocument();
    expect(within(completeLink).getByText("Edit")).toBeInTheDocument();
    expect(within(completeLink).getByText("Completed")).toBeInTheDocument();
  });

  it("shows a plain step number (not a checkmark) for current and upcoming groups", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const currentLink = screen.getByRole("link", {
      name: "Berlin and travel time",
    });
    expect(within(currentLink).getByText("3")).toBeInTheDocument();

    const upcomingLink = screen.getByRole("link", {
      name: "Job categories",
    });
    expect(within(upcomingLink).getByText("4")).toBeInTheDocument();
  });

  it("keeps every group directly navigable, including future groups", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const upcomingLink = screen.getByRole("link", { name: "Job categories" });
    expect(upcomingLink).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=categories",
    );
  });

  it("links each item to the correct onboarding group href", () => {
    render(
      <OnboardingProgressNav progress={baseProgress} current="location" />,
    );

    const link = screen.getByRole("link", { name: "Berlin and travel time" });
    expect(link).toHaveAttribute(
      "href",
      "/candidate/onboarding?group=location",
    );
  });

  it("marks no group as current when current is 'review'", () => {
    render(<OnboardingProgressNav progress={baseProgress} current="review" />);

    const nav = screen.getByRole("navigation", {
      name: "Onboarding progress",
    });
    expect(
      within(nav).queryByRole("link", { current: "step" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Step 6 of 6")).toBeInTheDocument();
  });
});

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Homepage } from "@/components/homepage/homepage";

describe("Homepage", () => {
  it("renders sections in a single-h1 heading order with the old prototype copy gone", () => {
    render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 1 }),
    ).toHaveLength(1);

    const headingNames = screen
      .getAllByRole("heading", { level: 2 })
      .map((el) => el.textContent);
    expect(headingNames).toEqual([
      "Made for how Berlin works",
      "You never wonder where it went",
      "Open in Berlin right now",
      "Reach people who can start",
      "Working now, in Berlin first",
    ]);

    expect(
      screen.queryByText(/Candidate experience/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Employer and admin/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/How progress will feel/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/View employer and admin/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Workspace layout/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Desktop structure from the large breakpoint/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Candidate registration is available\. Essential onboarding follows/,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Matching arrives in a later step/),
    ).not.toBeInTheDocument();
  });

  it("keeps the legal footer links present", () => {
    render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      within(footer).getByRole("link", { name: "Impressum" }),
    ).toHaveAttribute("href", "/impressum");
  });
});

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateShell } from "@/components/candidate-shell";

describe("CandidateShell", () => {
  it("renders the candidate preview with progress and employer link", () => {
    render(<CandidateShell />);

    expect(
      screen.getByRole("heading", { level: 1, name: "One step closer." }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /This is a shell preview of the candidate surface\. Registration and matching are not available yet\./,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "How progress will feel",
      }),
    ).toBeInTheDocument();

    const progress = screen.getByRole("navigation", {
      name: "Example candidate progress",
    });
    const steps = within(progress).getAllByRole("listitem");

    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Tell us what you can do");
    expect(steps[0]).toHaveTextContent("Current");
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(steps[1]).toHaveTextContent("See suitable work");
    expect(steps[1]).toHaveTextContent("Upcoming");
    expect(steps[1]).not.toHaveAttribute("aria-current");
    expect(steps[2]).toHaveTextContent("Apply");
    expect(steps[2]).toHaveTextContent("Upcoming");
    expect(steps[2]).not.toHaveAttribute("aria-current");

    const employerLink = screen.getByRole("link", {
      name: "View employer and admin preview",
    });
    expect(employerLink).toHaveAttribute("href", "#employer-admin-experience");
  });
});

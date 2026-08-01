import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateShell } from "@/components/candidate-shell";

describe("CandidateShell", () => {
  it("renders the candidate preview with auth links and employer preview", () => {
    render(<CandidateShell />);

    expect(
      screen.getByRole("heading", { level: 1, name: "One step closer." }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );

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
    expect(steps[0]).toHaveAttribute("aria-current", "step");

    const employerLink = screen.getByRole("link", {
      name: "View employer and admin preview",
    });
    expect(employerLink).toHaveAttribute("href", "#employer-admin-experience");
  });
});

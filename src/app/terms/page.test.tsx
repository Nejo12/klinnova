import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage from "@/app/terms/page";

describe("TermsPage", () => {
  it("renders one h1 and the shared draft/legal-review-required warning", () => {
    render(<TermsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText("Draft — legal review required"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/)).toBeInTheDocument();
  });

  it("does not claim legal approval or attorney review", () => {
    render(<TermsPage />);
    const text = document.body.textContent ?? "";

    expect(text).not.toMatch(/legally binding contract reviewed by counsel/i);
    expect(text).not.toMatch(/attorney-approved/i);
  });

  it("includes the shared legal footer", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("navigation", { name: "Legal" }),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage from "@/app/terms/page";

describe("TermsPage", () => {
  it("renders one h1 without the obsolete founder-verification notice", () => {
    render(<TermsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.queryByText("Draft — founder verification required"),
    ).not.toBeInTheDocument();
  });

  it("includes beta liability and German governing-law wording without counsel-approval claims", () => {
    render(<TermsPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/EUR 100/);
    expect(text).toMatch(/Federal Republic of Germany/);
    expect(text).toContain("support@klinnova.com");
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

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ImpressumPage from "@/app/impressum/page";

describe("ImpressumPage", () => {
  it("renders one h1 and the shared draft/legal-review-required warning", () => {
    render(<ImpressumPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Impressum" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText("Draft — legal review required"),
    ).toBeInTheDocument();
  });

  it("uses only [TO COMPLETE]/[IF APPLICABLE] placeholders, never fabricated identity data", () => {
    render(<ImpressumPage />);
    const text = document.body.textContent ?? "";

    expect(text).toContain("[TO COMPLETE]");
    // No plausible German company-register number, VAT ID, phone number, or
    // street address has been fabricated.
    expect(text).not.toMatch(/HRB \d+/);
    expect(text).not.toMatch(/DE\d{9}/);
    expect(text).not.toMatch(/\+49[\s\d]{6,}/);
    expect(text).not.toMatch(/\d{5}\s+Berlin/);
  });

  it("includes the shared legal footer", () => {
    render(<ImpressumPage />);
    expect(
      screen.getByRole("navigation", { name: "Legal" }),
    ).toBeInTheDocument();
  });
});

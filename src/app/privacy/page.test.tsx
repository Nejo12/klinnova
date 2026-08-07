import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("renders one h1 and the shared draft/legal-review-required warning", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText("Draft — legal review required"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/)).toBeInTheDocument();
  });

  it("does not claim GDPR compliance, legal approval, or regulatory compliance", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).not.toMatch(/GDPR[- ]compliant/i);
    expect(text).not.toMatch(/legally approved/i);
    expect(text).not.toMatch(/reviewed by (our|an) attorney/i);
  });

  it("does not fabricate a company registration or VAT number", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).not.toMatch(/HRB \d+/);
    expect(text).not.toMatch(/DE\d{9}/);
  });

  it("includes the shared legal footer", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("navigation", { name: "Legal" }),
    ).toBeInTheDocument();
  });
});

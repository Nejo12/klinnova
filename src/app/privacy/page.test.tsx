import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("renders one h1 and the shared founder-verification notice", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText("Draft — founder verification required"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Privacy Notice/)).toBeInTheDocument();
  });

  it("discloses Preview Sentry and Production unwired status without compliance claims", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/Sentry/i);
    expect(text).toMatch(/Preview/i);
    expect(text).toMatch(/Production/i);
    expect(text).toContain("support@klinnova.com");
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

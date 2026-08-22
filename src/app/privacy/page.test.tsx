import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("renders one h1 without the obsolete founder-verification notice", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.queryByText("Draft — founder verification required"),
    ).not.toBeInTheDocument();
  });

  it("discloses Preview Sentry and intentional Production-off status without compliance claims", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/Sentry/i);
    expect(text).toMatch(/Preview/i);
    expect(text).toMatch(/Production/i);
    expect(text).toMatch(/intentionally not enabled for Cohort A/i);
    expect(text).toContain("support@klinnova.com");
    expect(text).not.toMatch(/GDPR[- ]compliant/i);
    expect(text).not.toMatch(/legally approved/i);
    expect(text).not.toMatch(/reviewed by (our|an) attorney/i);
  });

  it("describes configured Production transactional mail without the obsolete unavailable warning", () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? "";

    expect(text).toMatch(/Resend/i);
    expect(text).toMatch(/configured Production mail flows/i);
    expect(text).not.toMatch(/automated product email may be unavailable/i);
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

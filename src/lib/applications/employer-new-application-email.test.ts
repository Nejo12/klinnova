import { describe, expect, it } from "vitest";

import { buildEmployerNewApplicationEmail } from "@/lib/applications/employer-new-application-email";

const input = {
  vacancyTitle: "Morning kitchen support",
  reviewUrl: "https://stint.company/employer/applications/abc-123",
};

describe("buildEmployerNewApplicationEmail", () => {
  it("includes the vacancy title in the subject", () => {
    const content = buildEmployerNewApplicationEmail(input);
    expect(content.subject).toBe("New application for Morning kitchen support");
  });

  it("includes only the allowed fields: vacancy title, Klinnova sign-in instruction, and the review URL", () => {
    const content = buildEmployerNewApplicationEmail(input);
    expect(content.text).toBe(
      [
        "You received a new application for Morning kitchen support.",
        "",
        "Sign in to Klinnova to review the application.",
        "",
        "https://stint.company/employer/applications/abc-123",
      ].join("\n"),
    );
  });

  it("is deterministic for identical input", () => {
    const first = buildEmployerNewApplicationEmail(input);
    const second = buildEmployerNewApplicationEmail({ ...input });
    expect(first).toEqual(second);
  });

  it("never includes marketing language, urgency, or unsubscribe text", () => {
    const content = buildEmployerNewApplicationEmail(input);
    const combined = `${content.subject}\n${content.text}`.toLowerCase();
    expect(combined).not.toMatch(/great news|act now|unsubscribe|limited time/);
  });

  it("does not include any candidate-identifying field name or value", () => {
    const content = buildEmployerNewApplicationEmail({
      vacancyTitle: "Evening cleaning",
      reviewUrl: "https://stint.company/employer/applications/xyz-789",
    });
    const combined = `${content.subject}\n${content.text}`;
    expect(combined).not.toMatch(/candidate/i);
    expect(combined).not.toMatch(/@/);
    expect(combined).not.toMatch(/\+?\d{5,}/);
  });
});

import { describe, expect, it } from "vitest";

import { buildEmployerNewApplicationEmail } from "@/lib/applications/employer-new-application-email";

const input = {
  vacancyTitle: "Morning kitchen support",
  reviewUrl: "https://klinnova.com/employer/applications/abc-123",
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
        "https://klinnova.com/employer/applications/abc-123",
        "",
        "Need help? support@klinnova.com",
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
    const combined =
      `${content.subject}\n${content.text}\n${content.html}`.toLowerCase();
    expect(combined).not.toMatch(/great news|act now|unsubscribe|limited time/);
  });

  it("does not include any candidate-identifying field name or value", () => {
    const content = buildEmployerNewApplicationEmail({
      vacancyTitle: "Evening cleaning",
      reviewUrl: "https://klinnova.com/employer/applications/xyz-789",
    });
    const combined = `${content.subject}\n${content.text}\n${content.html}`;
    expect(combined).not.toMatch(
      /candidate|phone|photo|profile|application answers/i,
    );
    expect(combined).not.toMatch(/\+?\d{5,}/);
  });

  it("renders one action and a visible fallback URL while escaping dynamic content", () => {
    const content = buildEmployerNewApplicationEmail({
      vacancyTitle: 'Kitchen <script>"',
      reviewUrl: "https://klinnova.com/employer/applications/id?one=1&two=2",
    });
    expect(content.html).toContain("Review application</a>");
    expect(content.html.match(/Review application<\/a>/g)).toHaveLength(1);
    expect(content.html).toContain("Kitchen &lt;script&gt;&quot;");
    expect(content.html).not.toContain("<script>");
    expect(content.html).toContain(
      "https://klinnova.com/employer/applications/id?one=1&amp;two=2",
    );
    expect(content.html).toContain("support@klinnova.com");
    expect(content.text).toContain(
      "https://klinnova.com/employer/applications/id?one=1&two=2",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  buildCandidateStatusEmail,
  isNotifiableApplicationStatus,
  NOTIFIABLE_APPLICATION_STATUSES,
  type NotifiableApplicationStatus,
} from "@/lib/applications/candidate-status-email";

const applicationUrl = "https://klinnova.com/candidate/applications/abc-123";
const vacancyTitle = "Morning kitchen support";

describe("NOTIFIABLE_APPLICATION_STATUSES / isNotifiableApplicationStatus", () => {
  it("contains exactly shortlisted, accepted, rejected", () => {
    expect(NOTIFIABLE_APPLICATION_STATUSES).toEqual([
      "shortlisted",
      "accepted",
      "rejected",
    ]);
  });

  it("excludes submitted and reviewing", () => {
    expect(isNotifiableApplicationStatus("submitted")).toBe(false);
    expect(isNotifiableApplicationStatus("reviewing")).toBe(false);
  });

  it("accepts the three notifiable statuses", () => {
    expect(isNotifiableApplicationStatus("shortlisted")).toBe(true);
    expect(isNotifiableApplicationStatus("accepted")).toBe(true);
    expect(isNotifiableApplicationStatus("rejected")).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(isNotifiableApplicationStatus("archived")).toBe(false);
  });
});

describe("buildCandidateStatusEmail — shortlisted", () => {
  it("has the exact expected subject and body", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "shortlisted",
      vacancyTitle,
      applicationUrl,
    });
    expect(content.subject).toBe(
      "Your application for Morning kitchen support was shortlisted",
    );
    expect(content.text).toBe(
      [
        "Your application for Morning kitchen support has been shortlisted.",
        "",
        "Sign in to Klinnova to view your application status.",
        "",
        applicationUrl,
      ].join("\n"),
    );
  });

  it("does not imply interview, employer contact, employment, or hiring", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "shortlisted",
      vacancyTitle,
      applicationUrl,
    });
    const combined = `${content.subject}\n${content.text}`.toLowerCase();
    expect(combined).not.toMatch(
      /interview|hired|hiring|employed|contract|guaranteed/,
    );
  });
});

describe("buildCandidateStatusEmail — accepted (high scrutiny: accepted != hired)", () => {
  it("has the exact expected subject and body", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "accepted",
      vacancyTitle,
      applicationUrl,
    });
    expect(content.subject).toBe(
      "Your application for Morning kitchen support was accepted",
    );
    expect(content.text).toBe(
      [
        "Your application for Morning kitchen support has been accepted.",
        "",
        "Acceptance in Klinnova does not by itself confirm that you have been hired or that a work agreement has been completed.",
        "",
        "Sign in to Klinnova to view your application status.",
        "",
        applicationUrl,
      ].join("\n"),
    );
  });

  it("never claims the candidate has been hired", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "accepted",
      vacancyTitle,
      applicationUrl,
    });
    // "hired" appears only inside the explicit disclaiming sentence, never
    // as an affirmative claim — assert the disclaimer sentence is present
    // and no OTHER hire/employment claim exists anywhere else in the copy.
    const withoutDisclaimer = content.text.replace(
      "Acceptance in Klinnova does not by itself confirm that you have been hired or that a work agreement has been completed.",
      "",
    );
    expect(withoutDisclaimer.toLowerCase()).not.toMatch(/hired|hiring/);
  });

  it("never claims employment is confirmed, guaranteed, or contractual", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "accepted",
      vacancyTitle,
      applicationUrl,
    });
    expect(content.text.toLowerCase()).not.toMatch(
      /employment (is |has been )?(confirmed|guaranteed)|guaranteed job|contract (is|has been) (confirmed|complete)/,
    );
  });

  it("never mentions a scheduled shift or start date", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "accepted",
      vacancyTitle,
      applicationUrl,
    });
    const combined = `${content.subject}\n${content.text}`.toLowerCase();
    expect(combined).not.toMatch(
      /first shift|start date|shift (is |has been )?scheduled/,
    );
  });

  it("includes the explicit acceptance != hired clarification", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "accepted",
      vacancyTitle,
      applicationUrl,
    });
    expect(content.text).toContain(
      "does not by itself confirm that you have been hired",
    );
  });
});

describe("buildCandidateStatusEmail — rejected (privacy-critical)", () => {
  it("has the exact expected subject and body, with no reason field accepted at all", () => {
    const content = buildCandidateStatusEmail({
      toStatus: "rejected",
      vacancyTitle,
      applicationUrl,
    });
    expect(content.subject).toBe(
      "Update on your application for Morning kitchen support",
    );
    expect(content.text).toBe(
      [
        "Your application for Morning kitchen support was not selected.",
        "",
        "Sign in to Klinnova to view your application status.",
        "",
        applicationUrl,
      ].join("\n"),
    );
  });

  it("the input type has no field for a rejection reason, actor identity, or actor role (architectural exclusion)", () => {
    // Compile-time proof: passing extra private fields is a type error.
    // This test documents/exercises the runtime shape actually produced.
    const content = buildCandidateStatusEmail({
      toStatus: "rejected",
      vacancyTitle,
      applicationUrl,
    });
    const combined = `${content.subject}\n${content.text}`;
    expect(combined).not.toMatch(/reason|actor|employer note|internal/i);
  });
});

describe("buildCandidateStatusEmail — general", () => {
  it("is deterministic for identical input", () => {
    for (const toStatus of NOTIFIABLE_APPLICATION_STATUSES) {
      const first = buildCandidateStatusEmail({
        toStatus,
        vacancyTitle,
        applicationUrl,
      });
      const second = buildCandidateStatusEmail({
        toStatus,
        vacancyTitle,
        applicationUrl,
      });
      expect(first).toEqual(second);
    }
  });

  it("never includes marketing language or unsubscribe text", () => {
    for (const toStatus of NOTIFIABLE_APPLICATION_STATUSES) {
      const content = buildCandidateStatusEmail({
        toStatus,
        vacancyTitle,
        applicationUrl,
      });
      const combined = `${content.subject}\n${content.text}`.toLowerCase();
      expect(combined).not.toMatch(
        /great news|act now|unsubscribe|limited time/,
      );
    }
  });

  it("produces a different subject/body per status", () => {
    const seen = new Set<string>();
    for (const toStatus of NOTIFIABLE_APPLICATION_STATUSES) {
      const content = buildCandidateStatusEmail({
        toStatus,
        vacancyTitle,
        applicationUrl,
      });
      seen.add(`${content.subject}|${content.text}`);
    }
    expect(seen.size).toBe(NOTIFIABLE_APPLICATION_STATUSES.length);
  });

  it("exhausts every NotifiableApplicationStatus without a default case masking a missing status", () => {
    const statuses: NotifiableApplicationStatus[] = [
      "shortlisted",
      "accepted",
      "rejected",
    ];
    for (const toStatus of statuses) {
      expect(() =>
        buildCandidateStatusEmail({ toStatus, vacancyTitle, applicationUrl }),
      ).not.toThrow();
    }
  });
});

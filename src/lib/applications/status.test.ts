import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUS_CODES,
  applicationStatusLabel,
  applicationStatusSchema,
  isApplicationStatus,
} from "@/lib/applications/status";

describe("application status contract (candidate + employer shared)", () => {
  it("matches the database's five-value vocabulary exactly", () => {
    expect(APPLICATION_STATUS_CODES).toEqual([
      "submitted",
      "reviewing",
      "shortlisted",
      "accepted",
      "rejected",
    ]);
  });

  it("has an exhaustive, distinct label for every status", () => {
    const labels = APPLICATION_STATUS_CODES.map((status) =>
      applicationStatusLabel(status),
    );
    expect(new Set(labels).size).toBe(APPLICATION_STATUS_CODES.length);
    expect(labels).toEqual([
      "Submitted",
      "In review",
      "Shortlisted",
      "Accepted",
      "Rejected",
    ]);
  });

  it("accepts every canonical status via the Zod schema", () => {
    for (const status of APPLICATION_STATUS_CODES) {
      expect(applicationStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects any value outside the canonical vocabulary, with no fallback", () => {
    expect(applicationStatusSchema.safeParse("pending").success).toBe(false);
    expect(applicationStatusSchema.safeParse("").success).toBe(false);
    expect(applicationStatusSchema.safeParse(null).success).toBe(false);
    expect(applicationStatusSchema.safeParse(undefined).success).toBe(false);
  });

  it("isApplicationStatus narrows only known statuses", () => {
    expect(isApplicationStatus("accepted")).toBe(true);
    expect(isApplicationStatus("withdrawn")).toBe(false);
  });
});

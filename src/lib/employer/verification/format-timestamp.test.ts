import { describe, expect, it } from "vitest";

import { formatVerificationTimestamp } from "@/lib/employer/verification/format-timestamp";

describe("formatVerificationTimestamp", () => {
  it("renders UTC timestamps in Berlin summer time", () => {
    expect(formatVerificationTimestamp("2026-08-01T00:00:00Z")).toBe(
      "1 Aug 2026, 02:00",
    );
  });

  it("renders UTC timestamps in Berlin winter time", () => {
    expect(formatVerificationTimestamp("2026-01-01T00:00:00Z")).toBe(
      "1 Jan 2026, 01:00",
    );
  });

  it("returns null for missing or invalid values", () => {
    expect(formatVerificationTimestamp(null)).toBeNull();
    expect(formatVerificationTimestamp("not-a-date")).toBeNull();
  });
});

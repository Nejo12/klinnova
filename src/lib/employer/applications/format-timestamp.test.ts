import { describe, expect, it } from "vitest";

import { formatApplicationTimestamp } from "@/lib/employer/applications/format-timestamp";

describe("formatApplicationTimestamp", () => {
  it("renders UTC timestamps in Berlin summer time", () => {
    expect(formatApplicationTimestamp("2026-08-01T00:00:00Z")).toBe(
      "1 Aug 2026, 02:00",
    );
  });

  it("renders UTC timestamps in Berlin winter time", () => {
    expect(formatApplicationTimestamp("2026-01-01T00:00:00Z")).toBe(
      "1 Jan 2026, 01:00",
    );
  });

  it("returns malformed input unchanged", () => {
    expect(formatApplicationTimestamp("not-a-date")).toBe("not-a-date");
  });
});

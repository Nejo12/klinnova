import { describe, expect, it } from "vitest";

import {
  OUTCOME_TYPE_CODES,
  berlinNoonIsoForDate,
  computeOccurredAtIso,
  outcomeTypeLabel,
} from "@/lib/applications/outcome-type";

describe("OUTCOME_TYPE_CODES / outcomeTypeLabel", () => {
  it("allows exactly interview_completed and hired — no scheduling state", () => {
    expect(OUTCOME_TYPE_CODES).toEqual(["interview_completed", "hired"]);
  });

  it("labels interview_completed as 'Interview completed', never 'Interview set'", () => {
    expect(outcomeTypeLabel("interview_completed")).toBe("Interview completed");
  });

  it("labels hired as 'Hired'", () => {
    expect(outcomeTypeLabel("hired")).toBe("Hired");
  });
});

describe("berlinNoonIsoForDate", () => {
  it("resolves noon CET (UTC+1) in winter", () => {
    expect(berlinNoonIsoForDate("2026-01-15")).toBe("2026-01-15T11:00:00.000Z");
  });

  it("resolves noon CEST (UTC+2) in summer", () => {
    expect(berlinNoonIsoForDate("2026-08-05")).toBe("2026-08-05T10:00:00.000Z");
  });

  it("resolves correctly across the DST transition", () => {
    expect(berlinNoonIsoForDate("2026-03-29")).toBe("2026-03-29T10:00:00.000Z");
  });
});

describe("computeOccurredAtIso", () => {
  const now = new Date("2026-08-10T10:00:00.000Z");

  it("uses the real current instant for today — never a manufactured noon", () => {
    const result = computeOccurredAtIso("2026-08-10", "2026-08-10", now);
    expect(result).toEqual({ ok: true, occurredAtIso: now.toISOString() });
  });

  it("does not put 'today' in the future relative to now, unlike a fixed noon-UTC conversion would for a morning submission", () => {
    // A 09:00 UTC submission with a naive "noon UTC" conversion would be 3h
    // in the future — exactly the bug flagged in review. The real-instant
    // rule sidesteps it entirely.
    const morningNow = new Date("2026-08-10T09:00:00.000Z");
    const result = computeOccurredAtIso("2026-08-10", "2026-08-10", morningNow);
    expect(result).toEqual({
      ok: true,
      occurredAtIso: morningNow.toISOString(),
    });
  });

  it("converts a past date to 12:00 Europe/Berlin for that date", () => {
    const result = computeOccurredAtIso("2026-08-05", "2026-08-10", now);
    expect(result).toEqual({
      ok: true,
      occurredAtIso: "2026-08-05T10:00:00.000Z",
    });
  });

  it("rejects a future date before any RPC call would happen", () => {
    const result = computeOccurredAtIso("2026-08-11", "2026-08-10", now);
    expect(result).toEqual({ ok: false, reason: "future_date" });
  });
});

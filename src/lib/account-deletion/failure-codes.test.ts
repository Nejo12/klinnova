import { describe, expect, it } from "vitest";

import {
  DELETION_FAILURE_CODES,
  normalizeFailureCode,
} from "@/lib/account-deletion/failure-codes";

describe("normalizeFailureCode", () => {
  it("passes through every accepted code unchanged", () => {
    for (const code of DELETION_FAILURE_CODES) {
      expect(normalizeFailureCode(code)).toBe(code);
    }
  });

  it("normalizes any unrecognized value to unknown", () => {
    expect(normalizeFailureCode("raw postgres error: constraint")).toBe(
      "unknown",
    );
    expect(normalizeFailureCode("")).toBe("unknown");
    expect(normalizeFailureCode("DOMAIN_SCRUB_FAILED")).toBe("unknown");
  });
});

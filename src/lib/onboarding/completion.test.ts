import { describe, expect, it } from "vitest";

import { completeOnboardingResultSchema } from "@/lib/onboarding/completion";

describe("completeOnboardingResultSchema", () => {
  it("accepts completed and incomplete RPC payloads", () => {
    expect(
      completeOnboardingResultSchema.parse({
        status: "completed",
        already_complete: false,
      }),
    ).toEqual({ status: "completed", already_complete: false });

    expect(
      completeOnboardingResultSchema.parse({
        status: "incomplete",
        first_incomplete_group: "languages",
      }),
    ).toEqual({
      status: "incomplete",
      first_incomplete_group: "languages",
    });
  });

  it("rejects unknown groups and statuses", () => {
    expect(
      completeOnboardingResultSchema.safeParse({
        status: "incomplete",
        first_incomplete_group: "review",
      }).success,
    ).toBe(false);

    expect(
      completeOnboardingResultSchema.safeParse({ status: "ok" }).success,
    ).toBe(false);
  });
});

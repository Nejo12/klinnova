import { describe, expect, it } from "vitest";

import {
  transitionApplicationRpcResultSchema,
  transitionFormSchema,
} from "@/lib/employer/applications/schemas";

const applicationId = "11111111-1111-4111-8111-111111111111";

describe("transitionApplicationRpcResultSchema", () => {
  it("accepts every documented result discriminant", () => {
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "updated",
        application_id: applicationId,
        previous_status: "submitted",
        current_status: "reviewing",
        occurred_at: "2026-08-06T00:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "already_in_state",
        application_id: applicationId,
        current_status: "reviewing",
      }).success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "invalid_transition",
      }).success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({ result: "unavailable" })
        .success,
    ).toBe(true);
    expect(
      transitionApplicationRpcResultSchema.safeParse({
        result: "employer_unavailable",
      }).success,
    ).toBe(true);
  });

  it("rejects an unrecognised discriminant", () => {
    expect(
      transitionApplicationRpcResultSchema.safeParse({ result: "ok" }).success,
    ).toBe(false);
  });
});

describe("transitionFormSchema", () => {
  it("normalizes a blank reason to null", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "reviewing",
      reason: "   ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reason).toBeNull();
  });

  it("trims a non-blank reason for UX only — server remains authoritative", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "rejected",
      reason: "  Not a fit  ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reason).toBe("Not a fit");
  });

  it("rejects a reason over 1000 characters", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "rejected",
      reason: "x".repeat(1001),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed application id", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId: "not-a-uuid",
      targetStatus: "reviewing",
      reason: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown target status", () => {
    const parsed = transitionFormSchema.safeParse({
      applicationId,
      targetStatus: "archived",
      reason: "",
    });
    expect(parsed.success).toBe(false);
  });
});

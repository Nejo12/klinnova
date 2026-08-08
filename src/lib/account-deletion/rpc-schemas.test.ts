import { describe, expect, it } from "vitest";

import {
  cancelAccountDeletionResultSchema,
  claimDeletionRequestResultSchema,
  processDeletionDomainScrubResultSchema,
  reclaimStaleDeletionRequestResultSchema,
  recordDeletionAuthEvidenceResultSchema,
  recordDeletionFailureResultSchema,
  requestAccountDeletionResultSchema,
} from "@/lib/account-deletion/rpc-schemas";

describe("requestAccountDeletionResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      requestAccountDeletionResultSchema.safeParse({ status: "unavailable" })
        .success,
    ).toBe(true);
    expect(
      requestAccountDeletionResultSchema.safeParse({
        status: "already_completed",
      }).success,
    ).toBe(true);
    expect(
      requestAccountDeletionResultSchema.safeParse({
        status: "existing_pending",
        request_id: "req-1",
      }).success,
    ).toBe(true);
    expect(
      requestAccountDeletionResultSchema.safeParse({
        status: "already_processing",
        request_id: "req-1",
      }).success,
    ).toBe(true);
    expect(
      requestAccountDeletionResultSchema.safeParse({
        status: "created",
        request_id: "req-1",
      }).success,
    ).toBe(true);
  });

  it("rejects an unrecognized status", () => {
    expect(
      requestAccountDeletionResultSchema.safeParse({ status: "bogus" }).success,
    ).toBe(false);
  });
});

describe("cancelAccountDeletionResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      cancelAccountDeletionResultSchema.safeParse({ status: "unavailable" })
        .success,
    ).toBe(true);
    expect(
      cancelAccountDeletionResultSchema.safeParse({
        status: "not_cancellable",
      }).success,
    ).toBe(true);
    expect(
      cancelAccountDeletionResultSchema.safeParse({
        status: "cancelled",
        request_id: "req-1",
      }).success,
    ).toBe(true);
  });
});

describe("claimDeletionRequestResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      claimDeletionRequestResultSchema.safeParse({ status: "not_found" })
        .success,
    ).toBe(true);
    expect(
      claimDeletionRequestResultSchema.safeParse({
        status: "no_op",
        current_status: "processing",
      }).success,
    ).toBe(true);
    expect(
      claimDeletionRequestResultSchema.safeParse({
        status: "claimed",
        request_id: "req-1",
        user_id: "user-1",
      }).success,
    ).toBe(true);
  });
});

describe("reclaimStaleDeletionRequestResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      reclaimStaleDeletionRequestResultSchema.safeParse({
        status: "not_found",
      }).success,
    ).toBe(true);
    expect(
      reclaimStaleDeletionRequestResultSchema.safeParse({ status: "no_op" })
        .success,
    ).toBe(true);
    expect(
      reclaimStaleDeletionRequestResultSchema.safeParse({
        status: "reclaimed",
        request_id: "req-1",
        user_id: "user-1",
      }).success,
    ).toBe(true);
  });

  it("rejects an unrecognized status", () => {
    expect(
      reclaimStaleDeletionRequestResultSchema.safeParse({ status: "bogus" })
        .success,
    ).toBe(false);
  });
});

describe("processDeletionDomainScrubResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      processDeletionDomainScrubResultSchema.safeParse({
        status: "unavailable",
      }).success,
    ).toBe(true);
    expect(
      processDeletionDomainScrubResultSchema.safeParse({
        status: "already_scrubbed",
        request_id: "req-1",
      }).success,
    ).toBe(true);
    expect(
      processDeletionDomainScrubResultSchema.safeParse({
        status: "scrubbed",
        request_id: "req-1",
      }).success,
    ).toBe(true);
  });
});

describe("recordDeletionAuthEvidenceResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      recordDeletionAuthEvidenceResultSchema.safeParse({
        status: "unavailable",
      }).success,
    ).toBe(true);
    expect(
      recordDeletionAuthEvidenceResultSchema.safeParse({
        status: "completed",
        request_id: "req-1",
      }).success,
    ).toBe(true);
  });
});

describe("recordDeletionFailureResultSchema", () => {
  it("accepts every documented status", () => {
    expect(
      recordDeletionFailureResultSchema.safeParse({ status: "no_op" }).success,
    ).toBe(true);
    expect(
      recordDeletionFailureResultSchema.safeParse({
        status: "failed",
        request_id: "req-1",
      }).success,
    ).toBe(true);
  });
});

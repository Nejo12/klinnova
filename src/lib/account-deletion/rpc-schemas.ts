import { z } from "zod";

/**
 * Runtime validation for the `jsonb`-typed results of the D-081 deletion
 * RPCs. Generated database types only know these return `Json`; every
 * result is parsed against its exact accepted shape (see
 * supabase/migrations/20260807220000_account_deletion_tombstone_and_request_contract.sql)
 * before the application trusts any field.
 */

export const requestAccountDeletionResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("already_completed") }),
    z.object({ status: z.literal("existing_pending"), request_id: z.string() }),
    z.object({
      status: z.literal("already_processing"),
      request_id: z.string(),
    }),
    z.object({ status: z.literal("created"), request_id: z.string() }),
  ],
);

export type RequestAccountDeletionResult = z.infer<
  typeof requestAccountDeletionResultSchema
>;

export const cancelAccountDeletionResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("not_cancellable") }),
    z.object({ status: z.literal("cancelled"), request_id: z.string() }),
  ],
);

export type CancelAccountDeletionResult = z.infer<
  typeof cancelAccountDeletionResultSchema
>;

export const claimDeletionRequestResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_found") }),
  z.object({ status: z.literal("no_op"), current_status: z.string() }),
  z.object({
    status: z.literal("claimed"),
    request_id: z.string(),
    user_id: z.string(),
  }),
]);

export type ClaimDeletionRequestResult = z.infer<
  typeof claimDeletionRequestResultSchema
>;

/**
 * D-090 stranded-processing recovery result. Minimal by design (matching
 * the accepted decision's "keep response data minimal" guidance) — no_op
 * covers both "not processing" and "processing but the lease is still
 * fresh" without exposing timestamps the runtime does not need.
 */
export const reclaimStaleDeletionRequestResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("not_found") }),
    z.object({ status: z.literal("no_op") }),
    z.object({
      status: z.literal("reclaimed"),
      request_id: z.string(),
      user_id: z.string(),
    }),
  ],
);

export type ReclaimStaleDeletionRequestResult = z.infer<
  typeof reclaimStaleDeletionRequestResultSchema
>;

export const processDeletionDomainScrubResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("already_scrubbed"), request_id: z.string() }),
    z.object({ status: z.literal("scrubbed"), request_id: z.string() }),
  ],
);

export type ProcessDeletionDomainScrubResult = z.infer<
  typeof processDeletionDomainScrubResultSchema
>;

export const recordDeletionAuthEvidenceResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("completed"), request_id: z.string() }),
  ],
);

export type RecordDeletionAuthEvidenceResult = z.infer<
  typeof recordDeletionAuthEvidenceResultSchema
>;

export const recordDeletionFailureResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("no_op") }),
    z.object({ status: z.literal("failed"), request_id: z.string() }),
  ],
);

export type RecordDeletionFailureResult = z.infer<
  typeof recordDeletionFailureResultSchema
>;

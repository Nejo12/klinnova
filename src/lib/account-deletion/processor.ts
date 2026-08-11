import "server-only";

import * as Sentry from "@sentry/nextjs";

import { createPrivilegedDeletionClient } from "@/lib/account-deletion/privileged-supabase";
import {
  claimDeletionRequestResultSchema,
  processDeletionDomainScrubResultSchema,
  reclaimStaleDeletionRequestResultSchema,
  recordDeletionAuthEvidenceResultSchema,
} from "@/lib/account-deletion/rpc-schemas";
import {
  normalizeFailureCode,
  type DeletionFailureCode,
} from "@/lib/account-deletion/failure-codes";

export type ProcessDeletionResult =
  | { kind: "completed" }
  | { kind: "processing" }
  | { kind: "not_found" }
  | { kind: "failed"; failureCode: DeletionFailureCode };

type PrivilegedClient = ReturnType<typeof createPrivilegedDeletionClient>;

/**
 * Best-effort failure recording. If this itself fails or is interrupted,
 * the request may be left in `processing` with no evidence — nothing
 * short of a process crash mid-flight reaches this branch, since every
 * step above is already wrapped. This is no longer an unrecoverable
 * state: D-090's `processing_lease_started_at` makes the request eligible
 * for explicit privileged reconciliation (`reconcileAccountDeletionRequest`
 * → `_reclaim_stale_deletion_request`) once its lease exceeds the
 * database's fixed staleness threshold.
 */
async function recordFailure(
  client: PrivilegedClient,
  requestId: string,
  code: DeletionFailureCode,
): Promise<void> {
  await client
    .rpc("_record_deletion_failure", {
      p_request_id: requestId,
      // Defense in depth: normalized again here even though the database
      // itself independently normalizes against the same fixed allow-list
      // (deletion_requests_failure_code_chk) — this call site is never
      // handed anything but one of our own fixed literals, but the
      // normalization stays the single choke point in front of the RPC.
      p_failure_code: normalizeFailureCode(code),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

/**
 * D-081 phases 4-6: Auth soft-delete, independent verification, durable
 * evidence. Shared by both the ordinary processing entry point and
 * reconciliation — every step is idempotent (confirmed against the local
 * Supabase stack: `deleteUser(id, true)` on an already soft-deleted user
 * succeeds without error; `getUserById` reliably reports `deleted_at`).
 */
async function runAuthDeletionTail(
  client: PrivilegedClient,
  requestId: string,
  userId: string,
): Promise<ProcessDeletionResult> {
  const deleted = await client.auth.admin.deleteUser(userId, true);
  if (deleted.error !== null) {
    await recordFailure(client, requestId, "auth_delete_failed");
    return { kind: "failed", failureCode: "auth_delete_failed" };
  }

  const verified = await client.auth.admin.getUserById(userId);
  if (verified.error !== null || verified.data.user?.deleted_at == null) {
    await recordFailure(client, requestId, "auth_verification_failed");
    return { kind: "failed", failureCode: "auth_verification_failed" };
  }

  const evidence = await client.rpc("_record_deletion_auth_evidence", {
    p_request_id: requestId,
  });
  if (evidence.error !== null) {
    await recordFailure(client, requestId, "auth_evidence_failed");
    return { kind: "failed", failureCode: "auth_evidence_failed" };
  }

  const parsedEvidence = recordDeletionAuthEvidenceResultSchema.safeParse(
    evidence.data,
  );
  if (!parsedEvidence.success || parsedEvidence.data.status !== "completed") {
    await recordFailure(client, requestId, "auth_evidence_failed");
    return { kind: "failed", failureCode: "auth_evidence_failed" };
  }

  return { kind: "completed" };
}

/** D-081 phases 2-3: domain anonymization, idempotent when already scrubbed. */
async function runDomainScrub(
  client: PrivilegedClient,
  requestId: string,
): Promise<
  { ok: true } | { kind: "failed"; failureCode: DeletionFailureCode }
> {
  const scrub = await client.rpc("_process_deletion_domain_scrub", {
    p_request_id: requestId,
  });
  if (scrub.error !== null) {
    await recordFailure(client, requestId, "domain_scrub_failed");
    return { kind: "failed", failureCode: "domain_scrub_failed" };
  }

  const parsedScrub = processDeletionDomainScrubResultSchema.safeParse(
    scrub.data,
  );
  if (
    !parsedScrub.success ||
    (parsedScrub.data.status !== "scrubbed" &&
      parsedScrub.data.status !== "already_scrubbed")
  ) {
    await recordFailure(client, requestId, "domain_scrub_failed");
    return { kind: "failed", failureCode: "domain_scrub_failed" };
  }

  return { ok: true };
}

async function runClaimedProcessing(
  client: PrivilegedClient,
  requestId: string,
  userId: string,
): Promise<ProcessDeletionResult> {
  const scrubbed = await runDomainScrub(client, requestId);
  if ("kind" in scrubbed) {
    return scrubbed;
  }

  return runAuthDeletionTail(client, requestId, userId);
}

/**
 * D-090 stranded-processing recovery. Only ever invoked from the
 * privileged reconciliation path — ordinary self-service processing must
 * never attempt this and must keep returning its existing generic
 * "processing" result for an in-flight request. The database owns the
 * fixed staleness threshold; this function passes only the request id,
 * never a caller-selectable interval/timeout/user id.
 */
async function reclaimStale(
  client: PrivilegedClient,
  requestId: string,
): Promise<ProcessDeletionResult> {
  const reclaimed = await client.rpc("_reclaim_stale_deletion_request", {
    p_request_id: requestId,
  });
  if (reclaimed.error !== null) {
    return { kind: "processing" };
  }

  const parsedReclaim = reclaimStaleDeletionRequestResultSchema.safeParse(
    reclaimed.data,
  );
  if (!parsedReclaim.success) {
    return { kind: "processing" };
  }

  if (parsedReclaim.data.status === "not_found") {
    return { kind: "not_found" };
  }

  if (parsedReclaim.data.status === "no_op") {
    // Either the lease is still fresh (an actively in-flight, non-crashed
    // processor) or the row is no longer processing — either way, nothing
    // to reclaim right now.
    return { kind: "processing" };
  }

  return runClaimedProcessing(
    client,
    parsedReclaim.data.request_id,
    parsedReclaim.data.user_id,
  );
}

/**
 * D-081/D-085 phase 1 + dispatch. Accepts only a `deletion_requests.id` —
 * never a candidate/employer/user id. The target Auth user is derived
 * exclusively from the row `_claim_deletion_request` (or, when
 * `allowStaleReclaim` is set, `_reclaim_stale_deletion_request`) returns.
 */
async function claimAndProcess(
  requestId: string,
  options: { allowStaleReclaim: boolean },
): Promise<ProcessDeletionResult> {
  let client: PrivilegedClient;
  try {
    client = createPrivilegedDeletionClient();
  } catch (error) {
    // Configuration failure (e.g. missing service-role secret) — nothing
    // was claimed, so there is no in-flight row to mark failed. Fails
    // closed as a generic result rather than crashing the caller. Reported
    // to Sentry (M5.1 Unit G, G4) because this catch converts the
    // exception into a typed result rather than rethrowing it, so
    // automatic Sentry capture would otherwise never see it — the error
    // itself is never logged/rendered anywhere else, and Sentry's own
    // beforeSend scrubber (src/lib/observability/sentry-scrub.ts) strips
    // any secret-shaped text from its message before it leaves the app.
    Sentry.captureException(error);
    return { kind: "failed", failureCode: "unknown" };
  }

  const claimed = await client.rpc("_claim_deletion_request", {
    p_request_id: requestId,
  });
  if (claimed.error !== null) {
    // Nothing was claimed; the request (if it exists) remains pending/failed
    // and safely retryable later. No failure is recorded here — there is
    // no in-flight `processing` row to mark.
    return { kind: "failed", failureCode: "unknown" };
  }

  const parsedClaim = claimDeletionRequestResultSchema.safeParse(claimed.data);
  if (!parsedClaim.success) {
    return { kind: "failed", failureCode: "unknown" };
  }

  if (parsedClaim.data.status === "not_found") {
    return { kind: "not_found" };
  }

  if (parsedClaim.data.status === "no_op") {
    if (parsedClaim.data.current_status === "completed") {
      return { kind: "completed" };
    }
    if (
      parsedClaim.data.current_status === "processing" &&
      options.allowStaleReclaim
    ) {
      return reclaimStale(client, requestId);
    }
    return { kind: "processing" };
  }

  return runClaimedProcessing(
    client,
    parsedClaim.data.request_id,
    parsedClaim.data.user_id,
  );
}

/**
 * Self-service entry point: called once, immediately after
 * `request_account_deletion()` returns a request id (created, or an
 * existing pending/processing request). Accepts only that request id.
 * Never attempts stale-processing recovery — an in-flight request always
 * reports the existing generic "processing" result here.
 */
export async function processAccountDeletionRequest(
  requestId: string,
): Promise<ProcessDeletionResult> {
  return claimAndProcess(requestId, { allowStaleReclaim: false });
}

/**
 * Manual, privileged reconciliation (D-081/D-090). Accepts only a request
 * id, never a user id — the target identity is derived exclusively from
 * the claimed/reclaimed request row, exactly like
 * `processAccountDeletionRequest`. Not reachable from any route or Server
 * Action; invoked only from tests and documented as an internal
 * maintenance primitive for local operator/proof use (PR 8.5). Never
 * requires the deleted user's own Auth session. Covers two cases: (1) the
 * existing D-081 "Auth soft-delete succeeded but durable evidence write
 * failed" case, reachable via the ordinary claim path once
 * `_record_deletion_failure` has transitioned the row back to `failed`;
 * (2) the D-090 stranded-processing case, where a crash left the row at
 * `processing` with no failure ever recorded — recovered via
 * `_reclaim_stale_deletion_request` once its fixed lease threshold has
 * elapsed. In both cases, and for every request this function processes,
 * Auth deletion is independently re-verified via `getUserById(...)
 * .deleted_at` before `_record_deletion_auth_evidence` is ever called —
 * evidence is never written merely because `domain_scrubbed_at` exists.
 */
export async function reconcileAccountDeletionRequest(
  requestId: string,
): Promise<ProcessDeletionResult> {
  return claimAndProcess(requestId, { allowStaleReclaim: true });
}

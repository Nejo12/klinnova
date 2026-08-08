import { beforeEach, describe, expect, it, vi } from "vitest";

const createPrivilegedDeletionClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/account-deletion/privileged-supabase", () => ({
  createPrivilegedDeletionClient,
}));

type RpcCall = { name: string; args: unknown };

function makeClient(options: {
  claim?: { data: unknown; error: unknown };
  reclaim?: { data: unknown; error: unknown };
  scrub?: { data: unknown; error: unknown };
  evidence?: { data: unknown; error: unknown };
  failure?: { data: unknown; error: unknown };
  deleteUser?: { data: unknown; error: unknown };
  getUserById?: { data: unknown; error: unknown };
}) {
  const calls: RpcCall[] = [];

  const claim = options.claim ?? {
    data: { status: "not_found" },
    error: null,
  };
  const reclaim = options.reclaim ?? {
    data: { status: "no_op" },
    error: null,
  };
  const scrub = options.scrub ?? {
    data: { status: "scrubbed", request_id: "req-1" },
    error: null,
  };
  const evidence = options.evidence ?? {
    data: { status: "completed", request_id: "req-1" },
    error: null,
  };
  const failure = options.failure ?? {
    data: { status: "failed" },
    error: null,
  };
  const deleteUser = options.deleteUser ?? { data: { user: {} }, error: null };
  const getUserById =
    options.getUserById ??
    ({
      data: { user: { id: "user-1", deleted_at: "2026-08-08T00:00:00Z" } },
      error: null,
    } as const);

  const rpc = vi.fn((name: string, args: unknown) => {
    calls.push({ name, args });
    if (name === "_claim_deletion_request") return Promise.resolve(claim);
    if (name === "_reclaim_stale_deletion_request")
      return Promise.resolve(reclaim);
    if (name === "_process_deletion_domain_scrub")
      return Promise.resolve(scrub);
    if (name === "_record_deletion_auth_evidence")
      return Promise.resolve(evidence);
    if (name === "_record_deletion_failure") return Promise.resolve(failure);
    throw new Error(`unexpected rpc: ${name}`);
  });

  const deleteUserMock = vi.fn(() => {
    calls.push({ name: "auth.admin.deleteUser", args: undefined });
    return Promise.resolve(deleteUser);
  });
  const getUserByIdMock = vi.fn(() => {
    calls.push({ name: "auth.admin.getUserById", args: undefined });
    return Promise.resolve(getUserById);
  });

  const client = {
    rpc,
    auth: {
      admin: { deleteUser: deleteUserMock, getUserById: getUserByIdMock },
    },
  };

  return { client, calls, rpc, deleteUserMock, getUserByIdMock };
}

beforeEach(() => {
  createPrivilegedDeletionClient.mockReset();
});

describe("processAccountDeletionRequest", () => {
  it("calls the privileged claim RPC with only the request id", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc } = makeClient({
      claim: { data: { status: "not_found" }, error: null },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    await processAccountDeletionRequest("req-1");

    expect(rpc).toHaveBeenCalledWith("_claim_deletion_request", {
      p_request_id: "req-1",
    });
  });

  it("returns not_found when the request does not exist", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client } = makeClient({
      claim: { data: { status: "not_found" }, error: null },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "not_found" });
  });

  it("returns processing when claim no-ops on an in-flight request", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client } = makeClient({
      claim: {
        data: { status: "no_op", current_status: "processing" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "processing" });
  });

  it("returns completed when claim no-ops on an already-completed request", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, deleteUserMock } = makeClient({
      claim: {
        data: { status: "no_op", current_status: "completed" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "completed" });
    // Already-completed requests must never re-run destructive processing.
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("returns failed/unknown when the claim RPC itself errors, without recording a failure (nothing was claimed)", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc } = makeClient({
      claim: { data: null, error: { message: "connection reset" } },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "failed", failureCode: "unknown" });
    expect(rpc).not.toHaveBeenCalledWith(
      "_record_deletion_failure",
      expect.anything(),
    );
  });

  it("fails closed as a generic result, without crashing, when the privileged client itself cannot be constructed", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    createPrivilegedDeletionClient.mockImplementation(() => {
      throw new Error(
        "Invalid environment configuration:\n- SUPABASE_SERVICE_ROLE_KEY: Required",
      );
    });

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "failed", failureCode: "unknown" });
  });

  it("records domain_scrub_failed and never calls Auth delete when scrub fails", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc, deleteUserMock } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      scrub: { data: null, error: { message: "constraint violation" } },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({
      kind: "failed",
      failureCode: "domain_scrub_failed",
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("_record_deletion_failure", {
      p_request_id: "req-1",
      p_failure_code: "domain_scrub_failed",
    });
  });

  it("records auth_delete_failed when Auth soft-delete errors", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc, getUserByIdMock } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      deleteUser: { data: null, error: { message: "network error" } },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({
      kind: "failed",
      failureCode: "auth_delete_failed",
    });
    expect(getUserByIdMock).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("_record_deletion_failure", {
      p_request_id: "req-1",
      p_failure_code: "auth_delete_failed",
    });
  });

  it("records auth_verification_failed when getUserById errors", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      getUserById: { data: null, error: { message: "user_not_found" } },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({
      kind: "failed",
      failureCode: "auth_verification_failed",
    });
    expect(rpc).toHaveBeenCalledWith("_record_deletion_failure", {
      p_request_id: "req-1",
      p_failure_code: "auth_verification_failed",
    });
  });

  it("records auth_verification_failed when getUserById succeeds but deleted_at is not set", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      getUserById: {
        data: { user: { id: "user-1", deleted_at: null } },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({
      kind: "failed",
      failureCode: "auth_verification_failed",
    });
  });

  it("records auth_evidence_failed when the evidence RPC errors", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      evidence: { data: null, error: { message: "constraint violation" } },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({
      kind: "failed",
      failureCode: "auth_evidence_failed",
    });
    expect(rpc).toHaveBeenCalledWith("_record_deletion_failure", {
      p_request_id: "req-1",
      p_failure_code: "auth_evidence_failed",
    });
  });

  it("never persists a raw error message as a failure code", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      scrub: {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    await processAccountDeletionRequest("req-1");

    const failureCall = rpc.mock.calls.find(
      (call) => call[0] === "_record_deletion_failure",
    );
    expect(failureCall?.[1]).toEqual({
      p_request_id: "req-1",
      p_failure_code: "domain_scrub_failed",
    });
    const allCodes = [
      "domain_scrub_failed",
      "auth_delete_failed",
      "auth_verification_failed",
      "auth_evidence_failed",
      "unknown",
    ];
    expect(allCodes).toContain(
      (failureCall?.[1] as { p_failure_code: string }).p_failure_code,
    );
  });

  it("runs the full sequence in order on success: claim, scrub, deleteUser, getUserById, evidence", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, calls } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "completed" });

    expect(calls.map((call) => call.name)).toEqual([
      "_claim_deletion_request",
      "_process_deletion_domain_scrub",
      "auth.admin.deleteUser",
      "auth.admin.getUserById",
      "_record_deletion_auth_evidence",
    ]);
  });

  it("treats an idempotent already-scrubbed domain result as success, not failure", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      scrub: {
        data: { status: "already_scrubbed", request_id: "req-1" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "completed" });
  });

  it("succeeds when Auth was already soft-deleted (idempotent deleteUser + getUserById already shows deleted_at)", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      deleteUser: { data: { user: {} }, error: null },
      getUserById: {
        data: { user: { id: "user-1", deleted_at: "2026-08-01T00:00:00Z" } },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "completed" });
  });

  it("is idempotent across repeated invocation with the same request id", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, deleteUserMock } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const first = await processAccountDeletionRequest("req-1");
    expect(first).toEqual({ kind: "completed" });
    expect(deleteUserMock).toHaveBeenCalledTimes(1);

    // A second invocation with the same request id re-claims (still
    // returns "claimed" in this mock since we did not model the DB's own
    // status transition) — deleteUser is idempotent when called again.
    const second = await processAccountDeletionRequest("req-1");
    expect(second).toEqual({ kind: "completed" });
  });

  it("never attempts stale-processing recovery — a fresh or stuck processing request always returns the generic processing result", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc } = makeClient({
      claim: {
        data: { status: "no_op", current_status: "processing" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await processAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "processing" });
    expect(rpc).not.toHaveBeenCalledWith(
      "_reclaim_stale_deletion_request",
      expect.anything(),
    );
  });
});

describe("reconcileAccountDeletionRequest", () => {
  it("accepts only a request id and derives the target user solely from the claimed request", async () => {
    const { reconcileAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    const { client, rpc, deleteUserMock } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await reconcileAccountDeletionRequest("req-1");

    expect(result).toEqual({ kind: "completed" });
    expect(rpc).toHaveBeenCalledWith("_claim_deletion_request", {
      p_request_id: "req-1",
    });
    expect(deleteUserMock).toHaveBeenCalledWith("user-1", true);
  });

  it("completes the Auth-succeeded/evidence-write-failed case without requiring the deleted user's own session", async () => {
    const { reconcileAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    // The request was already marked 'failed' with auth_evidence_failed by
    // a prior processAccountDeletionRequest run; reconciliation re-claims
    // it (claim accepts 'failed'), finds the domain already scrubbed, finds
    // Auth already soft-deleted (idempotent deleteUser + deleted_at set),
    // and completes by recording evidence.
    const { client } = makeClient({
      claim: {
        data: { status: "claimed", request_id: "req-1", user_id: "user-1" },
        error: null,
      },
      scrub: {
        data: { status: "already_scrubbed", request_id: "req-1" },
        error: null,
      },
      getUserById: {
        data: { user: { id: "user-1", deleted_at: "2026-08-01T00:00:00Z" } },
        error: null,
      },
    });
    createPrivilegedDeletionClient.mockReturnValue(client);

    const result = await reconcileAccountDeletionRequest("req-1");
    expect(result).toEqual({ kind: "completed" });
  });

  it("never accepts a second argument for a caller-supplied user id", async () => {
    const { reconcileAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    expect(reconcileAccountDeletionRequest).toHaveLength(1);
  });

  describe("D-090 stranded-processing recovery", () => {
    it("attempts a stale reclaim when claim reports an in-flight processing request", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, rpc } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: { data: { status: "no_op" }, error: null },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      await reconcileAccountDeletionRequest("req-1");

      expect(rpc).toHaveBeenCalledWith("_reclaim_stale_deletion_request", {
        p_request_id: "req-1",
      });
    });

    it("returns processing (not a failure) when the reclaim itself no-ops because the lease is still fresh", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, deleteUserMock } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: { data: { status: "no_op" }, error: null },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      const result = await reconcileAccountDeletionRequest("req-1");
      expect(result).toEqual({ kind: "processing" });
      expect(deleteUserMock).not.toHaveBeenCalled();
    });

    it("returns not_found when the reclaim reports the request no longer exists", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: { data: { status: "not_found" }, error: null },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      const result = await reconcileAccountDeletionRequest("req-1");
      expect(result).toEqual({ kind: "not_found" });
    });

    it("uses the reclaim's persisted user_id (never a caller-supplied one) to resume domain processing on success", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, rpc, deleteUserMock } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: {
          data: {
            status: "reclaimed",
            request_id: "req-1",
            user_id: "reclaimed-user-1",
          },
          error: null,
        },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      const result = await reconcileAccountDeletionRequest("req-1");

      expect(result).toEqual({ kind: "completed" });
      expect(rpc).toHaveBeenCalledWith("_process_deletion_domain_scrub", {
        p_request_id: "req-1",
      });
      expect(deleteUserMock).toHaveBeenCalledWith("reclaimed-user-1", true);
    });

    it("stranded before scrub: reclaim success runs domain scrub normally, then completes the full sequence", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, calls } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: {
          data: {
            status: "reclaimed",
            request_id: "req-1",
            user_id: "user-1",
          },
          error: null,
        },
        scrub: {
          data: { status: "scrubbed", request_id: "req-1" },
          error: null,
        },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      const result = await reconcileAccountDeletionRequest("req-1");
      expect(result).toEqual({ kind: "completed" });
      expect(calls.map((call) => call.name)).toEqual([
        "_claim_deletion_request",
        "_reclaim_stale_deletion_request",
        "_process_deletion_domain_scrub",
        "auth.admin.deleteUser",
        "auth.admin.getUserById",
        "_record_deletion_auth_evidence",
      ]);
    });

    it("stranded after scrub but before Auth delete: reclaim success treats the already-scrubbed domain as idempotent and still performs Auth deletion", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, deleteUserMock } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: {
          data: {
            status: "reclaimed",
            request_id: "req-1",
            user_id: "user-1",
          },
          error: null,
        },
        scrub: {
          data: { status: "already_scrubbed", request_id: "req-1" },
          error: null,
        },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      const result = await reconcileAccountDeletionRequest("req-1");
      expect(result).toEqual({ kind: "completed" });
      expect(deleteUserMock).toHaveBeenCalledTimes(1);
    });

    it("Auth already soft-deleted: still independently verifies via getUserById before recording evidence — never infers deletion from domain_scrubbed_at alone", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, calls, getUserByIdMock } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: {
          data: {
            status: "reclaimed",
            request_id: "req-1",
            user_id: "user-1",
          },
          error: null,
        },
        scrub: {
          data: { status: "already_scrubbed", request_id: "req-1" },
          error: null,
        },
        getUserById: {
          data: { user: { id: "user-1", deleted_at: "2026-08-01T00:00:00Z" } },
          error: null,
        },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      const result = await reconcileAccountDeletionRequest("req-1");
      expect(result).toEqual({ kind: "completed" });
      expect(getUserByIdMock).toHaveBeenCalledTimes(1);

      const evidenceIndex = calls.findIndex(
        (call) => call.name === "_record_deletion_auth_evidence",
      );
      const verifyIndex = calls.findIndex(
        (call) => call.name === "auth.admin.getUserById",
      );
      expect(verifyIndex).toBeGreaterThanOrEqual(0);
      expect(evidenceIndex).toBeGreaterThan(verifyIndex);
    });

    it("never records evidence merely because domain_scrubbed_at exists — Auth deletion is still attempted even when the domain was already scrubbed", async () => {
      const { reconcileAccountDeletionRequest } =
        await import("@/lib/account-deletion/processor");
      const { client, deleteUserMock, rpc } = makeClient({
        claim: {
          data: { status: "no_op", current_status: "processing" },
          error: null,
        },
        reclaim: {
          data: {
            status: "reclaimed",
            request_id: "req-1",
            user_id: "user-1",
          },
          error: null,
        },
        scrub: {
          data: { status: "already_scrubbed", request_id: "req-1" },
          error: null,
        },
      });
      createPrivilegedDeletionClient.mockReturnValue(client);

      await reconcileAccountDeletionRequest("req-1");

      expect(deleteUserMock).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith("_record_deletion_auth_evidence", {
        p_request_id: "req-1",
      });
    });
  });
});

describe("processAccountDeletionRequest signature", () => {
  it("accepts exactly one argument (the request id)", async () => {
    const { processAccountDeletionRequest } =
      await import("@/lib/account-deletion/processor");
    expect(processAccountDeletionRequest).toHaveLength(1);
  });
});

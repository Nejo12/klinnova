import { beforeEach, describe, expect, it, vi } from "vitest";

const processAccountDeletionRequest = vi.hoisted(() => vi.fn());

vi.mock("@/lib/account-deletion/processor", () => ({
  processAccountDeletionRequest,
}));

function makeClient(options: {
  request?: { data: unknown; error: unknown };
  cancel?: { data: unknown; error: unknown };
}) {
  const request = options.request ?? {
    data: { status: "unavailable" },
    error: null,
  };
  const cancel = options.cancel ?? {
    data: { status: "unavailable" },
    error: null,
  };

  const rpc = vi.fn((name: string) => {
    if (name === "request_account_deletion") return Promise.resolve(request);
    if (name === "cancel_account_deletion_request")
      return Promise.resolve(cancel);
    throw new Error(`unexpected rpc: ${name}`);
  });

  return { rpc };
}

beforeEach(() => {
  processAccountDeletionRequest.mockReset();
});

describe("confirmAccountDeletion", () => {
  it("calls request_account_deletion with no arguments (self-scoped, no caller target)", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: { data: { status: "unavailable" }, error: null },
    });

    await confirmAccountDeletion(client as never);

    expect(client.rpc).toHaveBeenCalledWith("request_account_deletion");
    expect(client.rpc).not.toHaveBeenCalledWith(
      "request_account_deletion",
      expect.anything(),
    );
  });

  it("returns unauthenticated when the RPC call errors", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: { data: null, error: { message: "jwt expired" } },
    });

    const result = await confirmAccountDeletion(client as never);
    expect(result).toEqual({ status: "unauthenticated" });
    expect(processAccountDeletionRequest).not.toHaveBeenCalled();
  });

  it("returns unavailable without invoking the processor when no profile exists", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: { data: { status: "unavailable" }, error: null },
    });

    const result = await confirmAccountDeletion(client as never);
    expect(result).toEqual({ status: "unavailable" });
    expect(processAccountDeletionRequest).not.toHaveBeenCalled();
  });

  it("returns completed without invoking the processor when already completed", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: { data: { status: "already_completed" }, error: null },
    });

    const result = await confirmAccountDeletion(client as never);
    expect(result).toEqual({ status: "completed" });
    expect(processAccountDeletionRequest).not.toHaveBeenCalled();
  });

  it("hands the server-derived request id from a freshly created request to the processor", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: {
        data: { status: "created", request_id: "req-created-1" },
        error: null,
      },
    });
    processAccountDeletionRequest.mockResolvedValue({ kind: "completed" });

    const result = await confirmAccountDeletion(client as never);

    expect(processAccountDeletionRequest).toHaveBeenCalledWith("req-created-1");
    expect(result).toEqual({ status: "completed" });
  });

  it("hands the existing pending request id to the processor rather than creating a duplicate", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: {
        data: { status: "existing_pending", request_id: "req-existing-1" },
        error: null,
      },
    });
    processAccountDeletionRequest.mockResolvedValue({ kind: "completed" });

    await confirmAccountDeletion(client as never);

    expect(processAccountDeletionRequest).toHaveBeenCalledWith(
      "req-existing-1",
    );
  });

  it("maps a processor failure result to a generic failure outcome", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: {
        data: { status: "created", request_id: "req-1" },
        error: null,
      },
    });
    processAccountDeletionRequest.mockResolvedValue({
      kind: "failed",
      failureCode: "domain_scrub_failed",
    });

    const result = await confirmAccountDeletion(client as never);
    expect(result).toEqual({ status: "failure" });
  });

  it("maps a processor 'processing' result to a processing outcome", async () => {
    const { confirmAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      request: {
        data: { status: "already_processing", request_id: "req-1" },
        error: null,
      },
    });
    processAccountDeletionRequest.mockResolvedValue({ kind: "processing" });

    const result = await confirmAccountDeletion(client as never);
    expect(result).toEqual({ status: "processing" });
  });
});

describe("cancelPendingAccountDeletion", () => {
  it("calls cancel_account_deletion_request with no arguments", async () => {
    const { cancelPendingAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      cancel: { data: { status: "not_cancellable" }, error: null },
    });

    await cancelPendingAccountDeletion(client as never);

    expect(client.rpc).toHaveBeenCalledWith("cancel_account_deletion_request");
  });

  it("returns cancelled when a pending request is cancelled", async () => {
    const { cancelPendingAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      cancel: {
        data: { status: "cancelled", request_id: "req-1" },
        error: null,
      },
    });

    const result = await cancelPendingAccountDeletion(client as never);
    expect(result).toEqual({ status: "cancelled" });
  });

  it("returns not_cancellable when nothing pending exists (blind attempt, DB-driven result)", async () => {
    const { cancelPendingAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      cancel: { data: { status: "not_cancellable" }, error: null },
    });

    const result = await cancelPendingAccountDeletion(client as never);
    expect(result).toEqual({ status: "not_cancellable" });
  });

  it("returns unauthenticated when the RPC call errors", async () => {
    const { cancelPendingAccountDeletion } =
      await import("@/lib/account-deletion/self-service");
    const client = makeClient({
      cancel: { data: null, error: { message: "jwt expired" } },
    });

    const result = await cancelPendingAccountDeletion(client as never);
    expect(result).toEqual({ status: "unauthenticated" });
  });
});

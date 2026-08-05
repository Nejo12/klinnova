import { describe, expect, it, vi } from "vitest";

import { requireActiveOperator } from "@/lib/internal/verification/operator-gate";

function makeClient(options: {
  getUser: { data: { user: { id: string } | null }; error: unknown };
  rpc: { data: unknown; error: unknown };
}) {
  const rpc = vi.fn().mockResolvedValue(options.rpc);
  return {
    auth: { getUser: vi.fn().mockResolvedValue(options.getUser) },
    rpc,
  };
}

describe("requireActiveOperator", () => {
  it("denies when there is no session user", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: null },
      rpc: { data: true, error: null },
    });

    const result = await requireActiveOperator(client as never);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("denies an authenticated non-operator without querying the operator table", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "user-1" } }, error: null },
      rpc: { data: false, error: null },
    });

    const result = await requireActiveOperator(client as never);

    expect(result).toEqual({ ok: false, reason: "not_operator" });
    expect(client.rpc).toHaveBeenCalledWith(
      "is_current_user_verification_operator",
    );
    expect(client.rpc.mock.calls[0]?.length).toBe(1);
  });

  it("denies an inactive operator (RPC itself returns false)", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "user-2" } }, error: null },
      rpc: { data: false, error: null },
    });

    const result = await requireActiveOperator(client as never);

    expect(result.ok).toBe(false);
  });

  it("allows an active operator", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "operator-1" } }, error: null },
      rpc: { data: true, error: null },
    });

    const result = await requireActiveOperator(client as never);

    expect(result).toEqual(
      expect.objectContaining({ ok: true, userId: "operator-1" }),
    );
  });

  it("treats a transport error from the RPC as failed, not authorized", async () => {
    const client = makeClient({
      getUser: { data: { user: { id: "user-3" } }, error: null },
      rpc: { data: null, error: { message: "connection reset" } },
    });

    const result = await requireActiveOperator(client as never);

    expect(result).toEqual({ ok: false, reason: "failed" });
  });
});

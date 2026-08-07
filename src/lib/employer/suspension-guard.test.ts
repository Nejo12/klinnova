import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadCurrentEmployerSuspensionStatus } from "@/lib/employer/suspension-guard";

describe("loadCurrentEmployerSuspensionStatus", () => {
  const getUser = vi.fn();
  const rpc = vi.fn();

  beforeEach(() => {
    getUser.mockReset();
    rpc.mockReset();
  });

  function client() {
    return { auth: { getUser }, rpc } as never;
  }

  it("returns unauthenticated without calling the RPC", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await loadCurrentEmployerSuspensionStatus(client());

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls is_current_employer_suspended with no arguments", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: false, error: null });

    await loadCurrentEmployerSuspensionStatus(client());

    expect(rpc).toHaveBeenCalledWith("is_current_employer_suspended");
    expect(rpc.mock.calls[0]).toHaveLength(1);
  });

  it("returns suspended: true for a true RPC result", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: true, error: null });

    const result = await loadCurrentEmployerSuspensionStatus(client());

    expect(result).toEqual({ ok: true, suspended: true });
  });

  it("returns suspended: false for a false RPC result", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: false, error: null });

    const result = await loadCurrentEmployerSuspensionStatus(client());

    expect(result).toEqual({ ok: true, suspended: false });
  });

  it("maps a transport error to failed", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await loadCurrentEmployerSuspensionStatus(client());

    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("maps a non-boolean payload to failed", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: { unexpected: "shape" }, error: null });

    const result = await loadCurrentEmployerSuspensionStatus(client());

    expect(result).toEqual({ ok: false, reason: "failed" });
  });
});

import { describe, expect, it, vi } from "vitest";

import { resolveCurrentExportAccount } from "@/lib/account-export/current-account";

function makeClient(options: {
  getUser: { data: { user: unknown }; error: unknown };
  isDeleted?: { data: unknown; error: unknown };
}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue(options.getUser) },
    rpc: vi
      .fn()
      .mockResolvedValue(options.isDeleted ?? { data: false, error: null }),
  };
}

describe("resolveCurrentExportAccount", () => {
  it("returns unauthenticated when there is no session user", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: null },
    });
    const result = await resolveCurrentExportAccount(client as never);
    expect(result.kind).toBe("unauthenticated");
  });

  it("returns unauthenticated when getUser errors", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: new Error("boom") },
    });
    const result = await resolveCurrentExportAccount(client as never);
    expect(result.kind).toBe("unauthenticated");
  });

  it("checks the whole-account deleted gate via _is_current_stint_account_deleted", async () => {
    const client = makeClient({
      getUser: {
        data: {
          user: {
            id: "u-1",
            email: "u@example.test",
            created_at: "2026-01-01T00:00:00Z",
          },
        },
        error: null,
      },
      isDeleted: { data: true, error: null },
    });
    const result = await resolveCurrentExportAccount(client as never);
    expect(result.kind).toBe("deleted");
    expect(client.rpc).toHaveBeenCalledWith(
      "_is_current_stint_account_deleted",
    );
  });

  it("returns ready with exactly email/created_at for an active account", async () => {
    const client = makeClient({
      getUser: {
        data: {
          user: {
            id: "u-1",
            email: "u@example.test",
            created_at: "2026-01-01T00:00:00Z",
            last_sign_in_at: "2026-08-08T00:00:00Z",
            phone: "+49 30 0000000",
            user_metadata: { anything: "here" },
            app_metadata: { provider: "email" },
          },
        },
        error: null,
      },
    });
    const result = await resolveCurrentExportAccount(client as never);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.account).toEqual({
      email: "u@example.test",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.account).not.toHaveProperty("last_sign_in_at");
    expect(result.account).not.toHaveProperty("phone");
    expect(result.account).not.toHaveProperty("user_metadata");
    expect(result.account).not.toHaveProperty("app_metadata");
    expect(result.account).not.toHaveProperty("id");
  });
});

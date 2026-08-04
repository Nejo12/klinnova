import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureEmployerProfile } from "@/lib/employer/ensure-employer-profile";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("ensureEmployerProfile", () => {
  const getUser = vi.fn();
  const maybeSingle = vi.fn();
  const insert = vi.fn();
  const update = vi.fn();
  const eq = vi.fn();
  const select = vi.fn();
  const from = vi.fn();

  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
    insert.mockReset();
    update.mockReset();
    eq.mockReset();
    select.mockReset();
    from.mockReset();

    select.mockReturnValue({ eq: () => ({ maybeSingle }) });
    update.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    from.mockReturnValue({ select, insert, update });
  });

  function client(): SupabaseClient<Database> {
    return {
      auth: { getUser },
      from,
    } as unknown as SupabaseClient<Database>;
  }

  it("rejects unauthenticated callers", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await ensureEmployerProfile(client(), "private");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });

  it("inserts with session user id only", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", user_metadata: {} } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    insert.mockResolvedValue({ error: null });

    const result = await ensureEmployerProfile(client(), "organisation");
    expect(result).toEqual({
      ok: true,
      created: true,
      userId: "user-1",
      employerType: "organisation",
    });
    expect(insert).toHaveBeenCalledWith({
      id: "user-1",
      employer_type: "organisation",
    });
  });

  it("maps type-lock update failures", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        employer_type: "private",
        onboarding_completed_at: "2026-08-01T00:00:00Z",
      },
      error: null,
    });
    update.mockReturnValue({
      eq: () =>
        Promise.resolve({
          error: {
            code: "23514",
            message: "employer_type_locked_completed",
          },
        }),
    });

    const result = await ensureEmployerProfile(client(), "organisation");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("type_locked");
    }
  });
});

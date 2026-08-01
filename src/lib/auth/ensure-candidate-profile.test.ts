import { describe, expect, it, vi } from "vitest";

import {
  ensureCandidateProfile,
  resolveDisplayName,
} from "@/lib/auth/ensure-candidate-profile";
import type { Database } from "@/types/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type InsertPayload = {
  id: string;
  display_name: string;
};

function mockClient(options: {
  user: User | null;
  existing: { id: string; display_name: string } | null;
  insertError?: { code: string; message: string } | null;
  raced?: { id: string; display_name: string } | null;
}): {
  client: SupabaseClient<Database>;
  insertMock: ReturnType<typeof vi.fn>;
} {
  let selectCount = 0;
  const maybeSingle = vi.fn().mockImplementation(async () => {
    selectCount += 1;
    if (selectCount === 1) {
      return { data: options.existing, error: null };
    }
    return { data: options.raced ?? options.existing, error: null };
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const insertMock = vi.fn().mockResolvedValue({
    error: options.insertError ?? null,
  });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.user === null ? { message: "missing" } : null,
      }),
    },
    from: vi.fn(() => ({
      select,
      insert: insertMock,
    })),
  } as unknown as SupabaseClient<Database>;

  return { client, insertMock };
}

function user(overrides?: Partial<User>): User {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "ada@example.com",
    user_metadata: { display_name: "Ada" },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

describe("ensureCandidateProfile", () => {
  it("fails when unauthenticated", async () => {
    const { client } = mockClient({ user: null, existing: null });
    const result = await ensureCandidateProfile(client);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });

  it("returns existing profile without insert", async () => {
    const { client, insertMock } = mockClient({
      user: user(),
      existing: {
        id: "11111111-1111-1111-1111-111111111111",
        display_name: "Existing Ada",
      },
    });

    const result = await ensureCandidateProfile(client);
    expect(result).toMatchObject({
      ok: true,
      created: false,
      displayName: "Existing Ada",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates a missing profile without server-owned columns", async () => {
    const { client, insertMock } = mockClient({ user: user(), existing: null });
    const result = await ensureCandidateProfile(client);

    expect(result).toMatchObject({
      ok: true,
      created: true,
      displayName: "Ada",
    });
    const payload = insertMock.mock.calls[0]?.[0] as InsertPayload;
    expect(payload).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      display_name: "Ada",
    });
    expect(payload).not.toHaveProperty("onboarding_completed_at");
    expect(payload).not.toHaveProperty("work_authorisation_declared_at");
  });

  it("tolerates duplicate-key races", async () => {
    const { client } = mockClient({
      user: user(),
      existing: null,
      insertError: { code: "23505", message: "duplicate" },
      raced: {
        id: "11111111-1111-1111-1111-111111111111",
        display_name: "Ada",
      },
    });

    const result = await ensureCandidateProfile(client);
    expect(result).toMatchObject({ ok: true, created: false });
  });

  it("fails safely when display-name metadata is missing", async () => {
    const { client } = mockClient({
      user: user({ user_metadata: {} }),
      existing: null,
    });
    const result = await ensureCandidateProfile(client);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("profile");
    }
  });
});

describe("resolveDisplayName", () => {
  it("reads metadata display_name only", () => {
    expect(resolveDisplayName({ display_name: "Ada" })).toBe("Ada");
    expect(resolveDisplayName({})).toBeNull();
  });
});

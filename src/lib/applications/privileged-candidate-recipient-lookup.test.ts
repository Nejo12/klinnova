import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validApplicationId = "11111111-1111-1111-1111-111111111111";
const validCandidateId = "22222222-2222-2222-2222-222222222222";
const validCandidateEmail = "candidate@example.com";

type MaybeSingleResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function buildSupabaseMock(options: {
  applicationResult: MaybeSingleResult<{
    candidate_id: string;
    vacancy_snapshot: unknown;
  }>;
  getUserByIdResult: {
    data: { user: { email?: string } | null };
    error: { message: string } | null;
  };
}) {
  const maybeSingle = vi.fn().mockResolvedValue(options.applicationResult);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const getUserById = vi.fn().mockResolvedValue(options.getUserByIdResult);

  return {
    client: { from, auth: { admin: { getUserById } } },
    from,
    select,
    eq,
    maybeSingle,
    getUserById,
  };
}

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
  }),
}));

async function loadModule() {
  return import("@/lib/applications/privileged-candidate-recipient-lookup");
}

describe("resolveCandidateRecipientForApplication", () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  afterEach(() => {
    if (originalServiceRoleKey === undefined) {
      Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }
  });

  it("returns lookup_failed without calling Supabase when the service-role key is missing", async () => {
    Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result.status).toBe("lookup_failed");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("does not leak the service-role key value in a lookup_failed message", async () => {
    Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(JSON.stringify(result)).not.toContain("test-service-role-key");
  });

  it("returns ready with the candidate email and canonical (snapshot) vacancy title on success", async () => {
    const mock = buildSupabaseMock({
      applicationResult: {
        data: {
          candidate_id: validCandidateId,
          vacancy_snapshot: { title: "Morning kitchen support" },
        },
        error: null,
      },
      getUserByIdResult: {
        data: { user: { email: validCandidateEmail } },
        error: null,
      },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result).toEqual({
      status: "ready",
      candidateEmail: validCandidateEmail,
      recipientUserId: validCandidateId,
      vacancyTitle: "Morning kitchen support",
    });
    expect(mock.eq).toHaveBeenCalledWith("id", validApplicationId);
    expect(mock.getUserById).toHaveBeenCalledWith(validCandidateId);
  });

  it("returns application_not_found when no application row exists", async () => {
    const mock = buildSupabaseMock({
      applicationResult: { data: null, error: null },
      getUserByIdResult: { data: { user: null }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result).toEqual({ status: "application_not_found" });
    expect(mock.getUserById).not.toHaveBeenCalled();
  });

  it("returns lookup_failed when the application query errors", async () => {
    const mock = buildSupabaseMock({
      applicationResult: { data: null, error: { message: "db error" } },
      getUserByIdResult: { data: { user: null }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result.status).toBe("lookup_failed");
  });

  it("returns lookup_failed when the vacancy snapshot is malformed (missing title)", async () => {
    const mock = buildSupabaseMock({
      applicationResult: {
        data: { candidate_id: validCandidateId, vacancy_snapshot: {} },
        error: null,
      },
      getUserByIdResult: { data: { user: null }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result.status).toBe("lookup_failed");
    expect(mock.getUserById).not.toHaveBeenCalled();
  });

  it("returns candidate_not_found when getUserById errors", async () => {
    const mock = buildSupabaseMock({
      applicationResult: {
        data: {
          candidate_id: validCandidateId,
          vacancy_snapshot: { title: "Morning kitchen support" },
        },
        error: null,
      },
      getUserByIdResult: {
        data: { user: null },
        error: { message: "not found" },
      },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result).toEqual({ status: "candidate_not_found" });
  });

  it("returns candidate_not_found when the auth user has no email", async () => {
    const mock = buildSupabaseMock({
      applicationResult: {
        data: {
          candidate_id: validCandidateId,
          vacancy_snapshot: { title: "Morning kitchen support" },
        },
        error: null,
      },
      getUserByIdResult: { data: { user: {} }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveCandidateRecipientForApplication } = await loadModule();
    const result =
      await resolveCandidateRecipientForApplication(validApplicationId);

    expect(result).toEqual({ status: "candidate_not_found" });
  });
});

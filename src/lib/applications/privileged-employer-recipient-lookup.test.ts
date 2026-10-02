import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validVacancyId = "11111111-1111-1111-1111-111111111111";
const validEmployerProfileId = "22222222-2222-2222-2222-222222222222";
const validEmployerEmail = "employer@example.com";

type MaybeSingleResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function buildSupabaseMock(options: {
  vacancyResult: MaybeSingleResult<{
    title: string;
    employer_profile_id: string | null;
  }>;
  getUserByIdResult: {
    data: { user: { email?: string } | null };
    error: { message: string } | null;
  };
}) {
  const maybeSingle = vi.fn().mockResolvedValue(options.vacancyResult);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const getUserById = vi.fn().mockResolvedValue(options.getUserByIdResult);

  return {
    client: {
      from,
      auth: { admin: { getUserById } },
    },
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
  return import("@/lib/applications/privileged-employer-recipient-lookup");
}

describe("resolveEmployerRecipientForVacancy", () => {
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

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result.status).toBe("lookup_failed");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("does not leak the service-role key value in a lookup_failed message", async () => {
    Reflect.deleteProperty(process.env, "SUPABASE_SERVICE_ROLE_KEY");

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(JSON.stringify(result)).not.toContain("test-service-role-key");
  });

  it("returns ready with the employer email and canonical vacancy title on success", async () => {
    const mock = buildSupabaseMock({
      vacancyResult: {
        data: {
          title: "Morning kitchen support",
          employer_profile_id: validEmployerProfileId,
        },
        error: null,
      },
      getUserByIdResult: {
        data: { user: { email: validEmployerEmail } },
        error: null,
      },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result).toEqual({
      status: "ready",
      employerEmail: validEmployerEmail,
      recipientUserId: validEmployerProfileId,
      vacancyTitle: "Morning kitchen support",
    });
    expect(mock.eq).toHaveBeenCalledWith("id", validVacancyId);
    expect(mock.getUserById).toHaveBeenCalledWith(validEmployerProfileId);
  });

  it("returns vacancy_not_found when no vacancy row exists", async () => {
    const mock = buildSupabaseMock({
      vacancyResult: { data: null, error: null },
      getUserByIdResult: { data: { user: null }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result).toEqual({ status: "vacancy_not_found" });
    expect(mock.getUserById).not.toHaveBeenCalled();
  });

  it("returns vacancy_not_found when the vacancy has no employer_profile_id (seed vacancy)", async () => {
    const mock = buildSupabaseMock({
      vacancyResult: {
        data: { title: "Demo vacancy", employer_profile_id: null },
        error: null,
      },
      getUserByIdResult: { data: { user: null }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result).toEqual({ status: "vacancy_not_found" });
    expect(mock.getUserById).not.toHaveBeenCalled();
  });

  it("returns lookup_failed when the vacancy query errors", async () => {
    const mock = buildSupabaseMock({
      vacancyResult: { data: null, error: { message: "db error" } },
      getUserByIdResult: { data: { user: null }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result.status).toBe("lookup_failed");
  });

  it("returns employer_not_found when getUserById errors", async () => {
    const mock = buildSupabaseMock({
      vacancyResult: {
        data: {
          title: "Morning kitchen support",
          employer_profile_id: validEmployerProfileId,
        },
        error: null,
      },
      getUserByIdResult: {
        data: { user: null },
        error: { message: "not found" },
      },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result).toEqual({ status: "employer_not_found" });
  });

  it("returns employer_not_found when the auth user has no email", async () => {
    const mock = buildSupabaseMock({
      vacancyResult: {
        data: {
          title: "Morning kitchen support",
          employer_profile_id: validEmployerProfileId,
        },
        error: null,
      },
      getUserByIdResult: { data: { user: {} }, error: null },
    });
    createClientMock.mockReturnValue(mock.client);

    const { resolveEmployerRecipientForVacancy } = await loadModule();
    const result = await resolveEmployerRecipientForVacancy(validVacancyId);

    expect(result).toEqual({ status: "employer_not_found" });
  });
});

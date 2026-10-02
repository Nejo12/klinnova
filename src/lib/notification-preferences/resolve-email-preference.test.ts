import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { createClient, maybeSingle, eq, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn();
  eq.mockReturnValue({ eq, maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return {
    createClient: vi.fn().mockReturnValue({ from }),
    maybeSingle,
    eq,
    select,
    from,
  };
});
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  }),
}));
import { resolveRecipientEmailPreference } from "./resolve-email-preference";
describe("server-only recipient Email preference", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  });
  it.each([
    "candidate_application_updates",
    "employer_new_applicants",
  ] as const)("defaults missing %s to enabled", async (category) => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(
      await resolveRecipientEmailPreference(
        "22222222-2222-4222-8222-222222222222",
        category,
      ),
    ).toBe(true);
    expect(from).toHaveBeenCalledWith("notification_preferences");
    expect(eq).toHaveBeenCalledWith(
      "user_id",
      "22222222-2222-4222-8222-222222222222",
    );
    expect(eq).toHaveBeenCalledWith("category", category);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-service-role-key",
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    );
  });
  it.each([true, false])("resolves explicit %s", async (email_enabled) => {
    maybeSingle.mockResolvedValue({ data: { email_enabled }, error: null });
    expect(
      await resolveRecipientEmailPreference(
        "22222222-2222-4222-8222-222222222222",
        "candidate_application_updates",
      ),
    ).toBe(email_enabled);
  });
  it.each([
    { data: null, error: { message: "failed" } },
    { data: { email_enabled: "false" }, error: null },
  ])("fails closed on database or validation failure", async (result) => {
    maybeSingle.mockResolvedValue(result);
    expect(
      await resolveRecipientEmailPreference(
        "22222222-2222-4222-8222-222222222222",
        "candidate_application_updates",
      ),
    ).toBe(null);
  });
  it("never falls back to publishable credentials", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(
      await resolveRecipientEmailPreference(
        "22222222-2222-4222-8222-222222222222",
        "employer_new_applicants",
      ),
    ).toBe(null);
    expect(createClient).not.toHaveBeenCalled();
  });
});

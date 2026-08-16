import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.hoisted(() => vi.fn());
const signInWithPassword = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const ensureCandidateProfile = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { signUp, signInWithPassword, signOut },
  })),
}));

vi.mock("@/lib/auth/ensure-candidate-profile", () => ({
  ensureCandidateProfile,
}));

vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));

vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
    NEXT_PUBLIC_SITE_URL: "https://stint.company",
  }),
}));

import { loginAction, logoutAction, registerAction } from "@/app/auth/actions";
import { AUTH_CHECK_EMAIL, AUTH_GENERIC_FAILURE } from "@/lib/auth/messages";

function form(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("registerAction", () => {
  beforeEach(() => {
    signUp.mockReset();
    ensureCandidateProfile.mockReset();
    loadAccountCapabilities.mockReset();
    redirect.mockClear();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: false,
      hasEmployerProfile: false,
    });
  });

  it("maps validation failures", async () => {
    const state = await registerAction(
      { error: null, message: null },
      form({
        displayName: "",
        email: "ada@example.com",
        password: "password123",
      }),
    );
    expect(state.error).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("signs up with redirect URL and returns check-email when no session", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    const state = await registerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        email: "Ada@Example.com",
        password: "password123",
      }),
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
      options: {
        data: { display_name: "Ada" },
        emailRedirectTo: "https://stint.company/auth/confirm?next=",
      },
    });
    expect(state).toEqual({ error: null, message: AUTH_CHECK_EMAIL });
    expect(ensureCandidateProfile).not.toHaveBeenCalled();
  });

  it("preserves employer next through confirmation email", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    await registerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        email: "ada@example.com",
        password: "password123",
        next: "/employer/onboarding",
      }),
    );

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo:
            "https://stint.company/auth/confirm?next=%2Femployer%2Fonboarding",
        }),
      }),
    );
  });

  it("ensures profile and redirects when a session is returned", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "t" } },
      error: null,
    });
    ensureCandidateProfile.mockResolvedValue({
      ok: true,
      created: true,
      userId: "u1",
      displayName: "Ada",
    });

    await expect(
      registerAction(
        { error: null, message: null },
        form({
          displayName: "Ada",
          email: "ada@example.com",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/candidate");
    expect(ensureCandidateProfile).toHaveBeenCalled();
  });

  it("does not ensure candidate profile for employer intent sessions", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "t" } },
      error: null,
    });

    await expect(
      registerAction(
        { error: null, message: null },
        form({
          displayName: "Ada",
          email: "ada@example.com",
          password: "password123",
          next: "/employer/onboarding",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/employer/onboarding");
    expect(ensureCandidateProfile).not.toHaveBeenCalled();
  });

  it("maps signup errors generically", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    const state = await registerAction(
      { error: null, message: null },
      form({
        displayName: "Ada",
        email: "ada@example.com",
        password: "password123",
      }),
    );
    expect(state).toEqual({ error: AUTH_GENERIC_FAILURE, message: null });
  });
});

describe("loginAction", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    ensureCandidateProfile.mockReset();
    loadAccountCapabilities.mockReset();
    redirect.mockClear();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });
  });

  it("maps invalid credentials generically", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const state = await loginAction(
      { error: null, message: null },
      form({ email: "ada@example.com", password: "wrong-password", next: "" }),
    );
    expect(state).toEqual({ error: AUTH_GENERIC_FAILURE, message: null });
  });

  it("rejects unsafe next and uses capability routing", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "t" } },
      error: null,
    });
    ensureCandidateProfile.mockResolvedValue({
      ok: true,
      created: false,
      userId: "u1",
      displayName: "Ada",
    });

    await expect(
      loginAction(
        { error: null, message: null },
        form({
          email: "ada@example.com",
          password: "password123",
          next: "//evil.example",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/candidate");
  });

  it("skips candidate ensure for employer next", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "t" } },
      error: null,
    });

    await expect(
      loginAction(
        { error: null, message: null },
        form({
          email: "ada@example.com",
          password: "password123",
          next: "/employer",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/employer");
    expect(ensureCandidateProfile).not.toHaveBeenCalled();
  });

  it("sends dual-capability users without intent to role choice", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "t" } },
      error: null,
    });
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });

    await expect(
      loginAction(
        { error: null, message: null },
        form({
          email: "ada@example.com",
          password: "password123",
          next: "",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/account/choose");
    expect(ensureCandidateProfile).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  it("signs out and redirects home", async () => {
    signOut.mockResolvedValue({ error: null });
    await expect(logoutAction()).rejects.toThrow("REDIRECT:/");
    expect(signOut).toHaveBeenCalled();
  });
});

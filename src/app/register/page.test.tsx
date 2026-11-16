import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { translate, type MessageKey } from "@/lib/i18n/messages";

const { getUser, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/components/auth/register-form", () => ({
  RegisterForm: () => <form aria-label="register form" />,
}));
vi.mock("@/components/public-shared/public-footer", () => ({
  PublicFooter: () => null,
}));

import RegisterPage from "./page";

describe("RegisterPage", () => {
  beforeEach(() => {
    getUser.mockReset();
    redirect.mockClear();
  });

  it("shows six saved groups, resume/edit, and jobs link to anonymous visitors", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<LocaleProvider>{await RegisterPage()}</LocaleProvider>);

    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByText(/come back later and edit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/confirm your email/i)).not.toHaveLength(0);
    expect(
      screen.getByText(/does not guarantee a job, an interview or a match/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse available jobs first" }),
    ).toHaveAttribute("href", "/jobs");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByText(/commute|minutes|travel-based/i)).toBeNull();
  });

  it("still redirects signed-in users", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    await expect(RegisterPage()).rejects.toThrow("redirect:/candidate");
  });

  it("has EN and DE copy for every new key", () => {
    const keys = [
      "page.register.guideHeading",
      "page.register.guideIntro",
      "page.register.guideSave",
      "page.register.guideOutcome",
      "page.register.guideBrowse",
      "candidate.matches.emptyProfileNote",
      "candidate.matches.emptyBrowseHeading",
      "candidate.matches.emptyBrowseBody",
      "candidate.matches.emptyBrowseAction",
    ] satisfies MessageKey[];
    for (const key of keys) {
      expect(translate("en", key).length).toBeGreaterThan(0);
      expect(translate("de", key)).not.toBe(translate("en", key));
    }
  });
});

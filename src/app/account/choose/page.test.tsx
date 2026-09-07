import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const readActiveWorkspace = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser },
  }),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/workspace/active-workspace.server", () => ({
  readActiveWorkspace,
}));

import AccountChoosePage from "@/app/account/choose/page";

describe("AccountChoosePage", () => {
  beforeEach(() => {
    redirect.mockClear();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });
    readActiveWorkspace.mockResolvedValue(null);
  });

  it("is only a fallback when a dual account has no active workspace", async () => {
    render(await AccountChoosePage());

    expect(
      screen.getByRole("heading", { name: "Choose where to continue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue as candidate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue as employer" }),
    ).toBeInTheDocument();
  });

  it("bypasses the chooser when the dual account preference is known", async () => {
    readActiveWorkspace.mockResolvedValue("employer");

    await expect(AccountChoosePage()).rejects.toThrow("REDIRECT:/employer");
  });

  it("routes a single-capability account directly", async () => {
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });

    await expect(AccountChoosePage()).rejects.toThrow("REDIRECT:/candidate");
    expect(readActiveWorkspace).not.toHaveBeenCalled();
  });
});

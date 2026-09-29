import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({ auth: { getUser } }),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));

import EmployerAccountPage from "@/app/employer/account/page";

describe("EmployerAccountPage", () => {
  beforeEach(() => {
    getUser
      .mockReset()
      .mockResolvedValue({ data: { user: { id: "fixture-employer" } } });
    loadAccountCapabilities.mockReset().mockResolvedValue({
      hasEmployerProfile: true,
      hasCandidateProfile: false,
    });
  });

  it("shows appearance, export, deletion link and session security without requesting either action", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(await EmployerAccountPage());

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Account and preferences",
        }),
      ).toBeVisible();
      expect(screen.getByRole("group", { name: "Appearance" })).toBeVisible();
      expect(screen.getByRole("group", { name: "Language" })).toBeVisible();
      expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
      expect(
        screen.getByRole("link", { name: "Download employer data" }),
      ).toHaveAttribute("href", "/employer/account/export");
      expect(
        screen.getByRole("link", { name: "Delete my Klinnova account" }),
      ).toHaveAttribute("href", "/employer/account/delete");
      expect(
        screen.getByRole("heading", { name: "Session security" }),
      ).toBeVisible();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("gates the account page to a signed-in employer", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(EmployerAccountPage()).rejects.toThrow(
      "REDIRECT:/login?next=/employer/account",
    );

    loadAccountCapabilities.mockResolvedValueOnce({
      hasEmployerProfile: false,
      hasCandidateProfile: true,
    });
    await expect(EmployerAccountPage()).rejects.toThrow(
      "REDIRECT:/employer/onboarding",
    );
  });
});

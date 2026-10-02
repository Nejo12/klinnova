import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { load, redirect } = vi.hoisted(() => ({
  load: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error("REDIRECT:" + url);
  }),
}));
vi.mock("next/navigation", () => ({ redirect, usePathname: () => null }));
vi.mock("@/lib/notification-preferences/current-preference", () => ({
  loadCurrentEmailPreference: load,
}));
vi.mock("./actions", () => ({ saveCandidateEmailPreference: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "fixture" } } }) },
  }),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities: async () => ({
    hasCandidateProfile: true,
    hasEmployerProfile: true,
  }),
}));
vi.mock("@/lib/auth/load-candidate-display-name", () => ({
  loadCandidateDisplayName: async () => "Fixture",
}));
import Page from "./page";
describe("candidate notification preferences page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    load.mockResolvedValue({ status: "ready", enabled: false });
  });
  it("loads its own category and renders persisted OFF", async () => {
    render(await Page());
    expect(load).toHaveBeenCalledWith("candidate_application_updates");
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Candidate notification preferences",
    );
  });
  it.each(["unauthenticated", "unavailable"])("gates %s", async (status) => {
    load.mockResolvedValue({ status });
    await expect(Page()).rejects.toThrow(
      status === "unauthenticated"
        ? "REDIRECT:/login?next=/candidate/account/notifications"
        : "REDIRECT:/candidate/onboarding",
    );
  });
  it("shows load errors without enabling changes", async () => {
    load.mockResolvedValue({ status: "failure" });
    render(await Page());
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

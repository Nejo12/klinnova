import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const readActiveWorkspace = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser },
  }),
}));
vi.mock("@/lib/public-jobs/load-public-vacancies", () => ({
  loadPublicVacancies: vi.fn().mockResolvedValue({
    ok: true,
    vacancies: [],
  }),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/workspace/active-workspace.server", () => ({
  readActiveWorkspace,
}));

import HomePage from "@/app/page";

describe("HomePage session shell", () => {
  beforeEach(() => {
    getUser.mockReset();
    loadAccountCapabilities.mockReset();
    readActiveWorkspace.mockReset();
  });

  it("keeps anonymous actions for an anonymous visitor", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(await HomePage());
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("never presents a valid candidate session as logged out", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });
    readActiveWorkspace.mockResolvedValue(null);
    render(await HomePage());
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Create account" })).toBeNull();
    expect(screen.queryByText(/Create (your|an employer) account/)).toBeNull();
    expect(screen.getAllByRole("link", { name: "Dashboard" })).not.toHaveLength(
      0,
    );
    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/candidate");
    }
  });

  it("uses the stored active workspace for a dual-capability session", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });
    readActiveWorkspace.mockResolvedValue("employer");
    render(await HomePage());
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByText("Employer")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/employer");
    }
  });
});

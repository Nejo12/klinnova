import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser },
  }),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("next/navigation", () => ({ redirect, usePathname: () => null }));

import CandidateAccountPage from "@/app/candidate/account/page";

describe("CandidateAccountPage (M5.1 Unit B)", () => {
  beforeEach(() => {
    getUser.mockReset();
    loadAccountCapabilities.mockReset();
    redirect.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: "cand-1" } } });
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });
  });

  it("redirects unauthenticated visitors to login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await CandidateAccountPage();

    expect(redirect).toHaveBeenCalledWith("/login?next=/candidate/account");
  });

  it("exposes export, delete, and sign-out without any destructive action firing merely by rendering", async () => {
    render(await CandidateAccountPage());

    expect(
      screen.getByRole("link", { name: "Notification preferences" }),
    ).toHaveAttribute("href", "/candidate/account/notifications");
    const exportLink = screen.getByRole("link", {
      name: "Download candidate data",
    });
    expect(exportLink).toHaveAttribute("href", "/candidate/account/export");

    const deleteLink = screen.getByRole("link", {
      name: "Delete my Klinnova account",
    });
    expect(deleteLink).toHaveAttribute("href", "/candidate/account/delete");

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();

    // Rendering the hub must never itself submit the deletion form — there
    // is no deletion form on this page at all, only a link to it.
    expect(
      screen.queryByRole("checkbox", { name: /permanently delete/i }),
    ).not.toBeInTheDocument();
  });

  it("marks Account as the current nav destination", async () => {
    render(await CandidateAccountPage());

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not render a duplicate appearance preferences section", async () => {
    render(await CandidateAccountPage());

    expect(
      screen.queryByRole("region", { name: "Appearance settings" }),
    ).not.toBeInTheDocument();
  });

  it("shows the capability switcher for a dual-capability account", async () => {
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });

    render(await CandidateAccountPage());

    fireEvent.click(
      screen.getByRole("button", {
        name: "Workspace and account: Candidate",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Employer" }),
    ).toBeInTheDocument();
  });
});

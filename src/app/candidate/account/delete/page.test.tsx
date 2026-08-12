import { render, screen } from "@testing-library/react";
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
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/app/candidate/account/delete/actions", () => ({
  cancelCandidateAccountDeletionAction: vi.fn(),
  confirmCandidateAccountDeletionAction: vi.fn(),
}));

import CandidateDeleteAccountPage from "@/app/candidate/account/delete/page";

describe("CandidateDeleteAccountPage (M5.1 Unit B)", () => {
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

    await CandidateDeleteAccountPage();

    expect(redirect).toHaveBeenCalledWith(
      "/login?next=/candidate/account/delete",
    );
  });

  it("renders the coherent candidate nav above the shared, unmodified delete panel — reachable, not auto-triggered", async () => {
    render(await CandidateDeleteAccountPage());

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("heading", { name: "Delete my Klinnova account" }),
    ).toBeInTheDocument();
    // The confirm button requires the acknowledgement checkbox first —
    // navigating here alone must never itself delete anything.
    expect(
      screen.getByRole("button", { name: "Delete my account" }),
    ).toBeDisabled();
  });
});

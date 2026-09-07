import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser },
  }),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities: vi.fn(),
}));
vi.mock("@/lib/workspace/active-workspace.server", () => ({
  readActiveWorkspace: vi.fn().mockResolvedValue(null),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage (M5.1 Unit C)", () => {
  it("exposes a discoverable Forgot password link for an unauthenticated visitor", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});

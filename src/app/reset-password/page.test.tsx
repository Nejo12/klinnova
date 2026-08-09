import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser },
  }),
}));

import ResetPasswordPage from "@/app/reset-password/page";

describe("ResetPasswordPage (M5.1 Unit C)", () => {
  it("shows the safe invalid/expired state with a retry link when there is no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    render(await ResetPasswordPage());

    expect(
      screen.getByText(/invalid or has expired\. request a new one/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request another reset" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("does not expose raw Supabase error text in the invalid state", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    render(await ResetPasswordPage());

    expect(document.body.textContent ?? "").not.toMatch(
      /otp|token_hash|supabase|jwt/i,
    );
  });

  it("shows the set-new-password form when a session exists", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    render(await ResetPasswordPage());

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
  });
});

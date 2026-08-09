import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AuthErrorPage from "@/app/auth/error/page";

describe("AuthErrorPage (M5.1 Unit C: reason=recovery)", () => {
  it("shows a recovery-specific message and a link to request another reset, not sign-in/register", async () => {
    render(
      await AuthErrorPage({
        searchParams: Promise.resolve({ reason: "recovery" }),
      }),
    );

    expect(
      screen.getByText(/invalid or has expired\. request a new one/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request another reset" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("does not expose raw Supabase error text", async () => {
    render(
      await AuthErrorPage({
        searchParams: Promise.resolve({ reason: "recovery" }),
      }),
    );
    expect(document.body.textContent ?? "").not.toMatch(
      /otp|token_hash|supabase|jwt/i,
    );
  });

  it("preserves the default confirmation-failure message for other reasons", async () => {
    render(await AuthErrorPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});

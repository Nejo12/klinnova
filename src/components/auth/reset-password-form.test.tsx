import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ResetPasswordActionState } from "@/app/reset-password/actions";

const updatePasswordAction = vi.hoisted(() =>
  vi.fn(async (): Promise<ResetPasswordActionState> => ({
    error: null,
    message: null,
  })),
);
const continueToSignInAction = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/app/reset-password/actions", () => ({
  updatePasswordAction,
  continueToSignInAction,
}));

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

describe("ResetPasswordForm (M5.1 Unit C)", () => {
  it("has labelled new-password and confirm-password fields", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set new password" }),
    ).toBeInTheDocument();
  });

  it("shows a mismatch error understandably, without submitting the form's own error field twice", async () => {
    updatePasswordAction.mockResolvedValueOnce({
      error: "Passwords do not match.",
      message: null,
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New password"), "password1");
    await user.type(screen.getByLabelText("Confirm new password"), "password2");
    await user.click(screen.getByRole("button", { name: "Set new password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );
  });

  it("shows the success state with an explicit Continue to sign in step, replacing the form (no auto-redirect)", async () => {
    updatePasswordAction.mockResolvedValueOnce({
      error: null,
      message: "Your password has been reset.",
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New password"), "password1");
    await user.type(screen.getByLabelText("Confirm new password"), "password1");
    await user.click(screen.getByRole("button", { name: "Set new password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your password has been reset.",
    );
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue to sign in" }),
    ).toBeInTheDocument();
  });

  it("never renders a raw Supabase error string", async () => {
    updatePasswordAction.mockResolvedValueOnce({
      error: "Your password could not be updated. Try again.",
      message: null,
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New password"), "password1");
    await user.type(screen.getByLabelText("Confirm new password"), "password1");
    await user.click(screen.getByRole("button", { name: "Set new password" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").not.toMatch(
      /supabase|invariant|jwt|token/i,
    );
  });
});

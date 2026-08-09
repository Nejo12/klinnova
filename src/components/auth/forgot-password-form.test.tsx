import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ForgotPasswordActionState } from "@/app/forgot-password/actions";

const requestPasswordResetAction = vi.hoisted(() =>
  vi.fn(async (): Promise<ForgotPasswordActionState> => ({
    error: null,
    message: null,
  })),
);

vi.mock("@/app/forgot-password/actions", () => ({
  requestPasswordResetAction,
}));

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

describe("ForgotPasswordForm (M5.1 Unit C)", () => {
  it("has a labelled email field and submit button", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset instructions" }),
    ).toBeInTheDocument();
  });

  it("shows the generic success message after submit, replacing the form", async () => {
    requestPasswordResetAction.mockResolvedValueOnce({
      error: null,
      message:
        "If an account exists for that email, we've sent password reset instructions.",
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(
      screen.getByRole("button", { name: "Send reset instructions" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /if an account exists/i,
    );
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows a field-level error without a generic success message on invalid input", async () => {
    requestPasswordResetAction.mockResolvedValueOnce({
      error: "Enter a valid email address.",
      message: null,
    });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.click(
      screen.getByRole("button", { name: "Send reset instructions" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );
  });
});

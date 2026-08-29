import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EmployerVerificationActionState } from "@/app/employer/verification/actions";

const requestEmployerVerificationAction = vi.hoisted(() =>
  vi.fn(async (): Promise<EmployerVerificationActionState> => ({
    error: null,
    message: null,
  })),
);

vi.mock("@/app/employer/verification/actions", () => ({
  requestEmployerVerificationAction,
}));

import { VerificationRequestForm } from "@/components/employer-verification/verification-request-form";

describe("VerificationRequestForm", () => {
  it("shows a server failure accessibly without changing the submit action", async () => {
    const user = userEvent.setup();
    requestEmployerVerificationAction.mockResolvedValueOnce({
      error:
        "Verification cannot be requested from the current status. Refresh the page and try again.",
      message: null,
    });

    render(
      <VerificationRequestForm
        submitLabel="Request verification"
        pendingLabel="Requesting…"
      />,
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: /I confirm that the information in my employer profile/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Request verification" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verification cannot be requested from the current status",
    );
    expect(
      screen.getByRole("button", { name: "Request verification" }),
    ).toBeEnabled();
  });
});

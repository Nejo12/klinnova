import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

import ErrorBoundary from "@/app/error";
import {
  ERROR_BOUNDARY_BODY,
  ERROR_BOUNDARY_HEADING,
  ERROR_BOUNDARY_RETRY_LABEL,
} from "@/lib/observability/messages";

describe("ErrorBoundary (src/app/error.tsx)", () => {
  beforeEach(() => {
    captureException.mockReset();
  });

  it("reports the thrown error to Sentry on mount", () => {
    const error = new Error("boom");
    render(<ErrorBoundary error={error} reset={vi.fn()} />);

    expect(captureException).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("renders a generic message — never the raw error text", () => {
    const error = new Error(
      "leaked internal detail: postgresql://user:pw@host/db",
    );
    render(<ErrorBoundary error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: ERROR_BOUNDARY_HEADING }),
    ).toBeVisible();
    expect(screen.getByText(ERROR_BOUNDARY_BODY)).toBeVisible();
    expect(screen.queryByText(/postgresql:\/\//)).not.toBeInTheDocument();
  });

  it("calls reset() when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);

    await user.click(
      screen.getByRole("button", { name: ERROR_BOUNDARY_RETRY_LABEL }),
    );

    expect(reset).toHaveBeenCalledOnce();
  });
});

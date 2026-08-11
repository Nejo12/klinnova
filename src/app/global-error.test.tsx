import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

import GlobalError from "@/app/global-error";
import {
  GLOBAL_ERROR_BODY,
  GLOBAL_ERROR_HEADING,
  GLOBAL_ERROR_RELOAD_LABEL,
} from "@/lib/observability/messages";

describe("GlobalError (src/app/global-error.tsx)", () => {
  beforeEach(() => {
    captureException.mockReset();
  });

  it("reports the thrown error to Sentry on mount", () => {
    const error = new Error("catastrophic boom");
    render(<GlobalError error={error} reset={vi.fn()} />);

    expect(captureException).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("renders a generic message — never the raw error text", () => {
    const error = new Error("leaked internal detail: sb_secret_abcXYZ123");
    render(<GlobalError error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: GLOBAL_ERROR_HEADING }),
    ).toBeVisible();
    expect(screen.getByText(GLOBAL_ERROR_BODY)).toBeVisible();
    expect(screen.queryByText(/sb_secret_/)).not.toBeInTheDocument();
  });

  it("calls reset() when the reload button is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<GlobalError error={new Error("boom")} reset={reset} />);

    await user.click(
      screen.getByRole("button", { name: GLOBAL_ERROR_RELOAD_LABEL }),
    );

    expect(reset).toHaveBeenCalledOnce();
  });
});

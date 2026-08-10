import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { VoidOutcomeActionState } from "@/lib/employer/applications/outcome-action-state";

const actionMock = vi.hoisted(() =>
  vi.fn(
    async (
      _prev: VoidOutcomeActionState,
      _formData: FormData,
    ): Promise<VoidOutcomeActionState> => ({ kind: "failure" }),
  ),
);

vi.mock("@/app/employer/applications/[applicationId]/outcome-actions", () => ({
  recordApplicationOutcomeAction: vi.fn(async () => ({ kind: "failure" })),
  voidApplicationOutcomeAction: actionMock,
}));

import { VoidOutcomeButton } from "@/components/employer-applications/void-outcome-button";

const applicationId = "11111111-1111-4111-8111-111111111111";
const outcomeEventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("VoidOutcomeButton", () => {
  it("has no free-text reason field — D-M5-22 has no void reason", () => {
    render(
      <VoidOutcomeButton
        applicationId={applicationId}
        outcomeEventId={outcomeEventId}
      />,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("submits only the application id and outcome event id", async () => {
    const user = userEvent.setup();
    render(
      <VoidOutcomeButton
        applicationId={applicationId}
        outcomeEventId={outcomeEventId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Void" }));

    expect(actionMock).toHaveBeenCalled();
    const formData = actionMock.mock.calls[0]?.[1];
    expect(formData?.get("applicationId")).toBe(applicationId);
    expect(formData?.get("outcomeEventId")).toBe(outcomeEventId);
    expect(Array.from(formData?.keys() ?? [])).toHaveLength(2);
  });
});

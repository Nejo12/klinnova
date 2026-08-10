import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RecordOutcomeActionState } from "@/lib/employer/applications/outcome-action-state";

const actionMock = vi.hoisted(() =>
  vi.fn(
    async (
      _prev: RecordOutcomeActionState,
      _formData: FormData,
    ): Promise<RecordOutcomeActionState> => ({ kind: "failure" }),
  ),
);

vi.mock("@/app/employer/applications/[applicationId]/outcome-actions", () => ({
  recordApplicationOutcomeAction: actionMock,
  voidApplicationOutcomeAction: vi.fn(async () => ({ kind: "failure" })),
}));

import { RecordOutcomeForm } from "@/components/employer-applications/record-outcome-form";

const applicationId = "11111111-1111-4111-8111-111111111111";
const todayIso = "2026-08-10";

describe("RecordOutcomeForm", () => {
  it("offers exactly two outcome options — never a scheduling/'Interview set' option", () => {
    render(
      <RecordOutcomeForm applicationId={applicationId} todayIso={todayIso} />,
    );

    const select = screen.getByLabelText("Outcome");
    const options = Array.from(select.querySelectorAll("option")).map(
      (option) => option.getAttribute("value"),
    );
    expect(options).toEqual(["interview_completed", "hired"]);
    expect(
      screen.queryByText(/interview set|scheduled|invitation/i),
    ).toBeNull();
  });

  it("renders human labels, never the raw database codes", () => {
    render(
      <RecordOutcomeForm applicationId={applicationId} todayIso={todayIso} />,
    );
    expect(screen.getByText("Interview completed")).toBeInTheDocument();
    expect(screen.getByText("Hired")).toBeInTheDocument();
  });

  it("defaults the date input to today and caps it at today", () => {
    render(
      <RecordOutcomeForm applicationId={applicationId} todayIso={todayIso} />,
    );
    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.value).toBe(todayIso);
    expect(dateInput.max).toBe(todayIso);
  });

  it("submits the application id, chosen outcome type, and chosen date", async () => {
    const user = userEvent.setup();
    render(
      <RecordOutcomeForm applicationId={applicationId} todayIso={todayIso} />,
    );

    await user.selectOptions(screen.getByLabelText("Outcome"), "hired");
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-08-05");
    await user.click(screen.getByRole("button", { name: "Record outcome" }));

    expect(actionMock).toHaveBeenCalled();
    const formData = actionMock.mock.calls[0]?.[1];
    expect(formData?.get("applicationId")).toBe(applicationId);
    expect(formData?.get("outcomeType")).toBe("hired");
    expect(formData?.get("occurredAtDate")).toBe("2026-08-05");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/employer/applications/[applicationId]/outcome-actions", () => ({
  recordApplicationOutcomeAction: vi.fn(async () => ({ kind: "failure" })),
  voidApplicationOutcomeAction: vi.fn(async () => ({ kind: "failure" })),
}));

import { ApplicationOutcomeHistory } from "@/components/employer-applications/application-outcome-history";
import type { EmployerOutcomeEventRow } from "@/lib/employer/applications/schemas";

const applicationId = "11111111-1111-4111-8111-111111111111";

const activeEvent: EmployerOutcomeEventRow = {
  outcome_event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  outcome_type: "interview_completed",
  occurred_at: "2026-08-01T09:00:00Z",
  recorded_at: "2026-08-01T09:05:00Z",
  voided_at: null,
};

const voidedEvent: EmployerOutcomeEventRow = {
  outcome_event_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  outcome_type: "hired",
  occurred_at: "2026-08-05T09:00:00Z",
  recorded_at: "2026-08-05T09:05:00Z",
  voided_at: "2026-08-06T10:00:00Z",
};

describe("ApplicationOutcomeHistory", () => {
  it("shows an empty-state message when there are no outcome events", () => {
    render(
      <ApplicationOutcomeHistory applicationId={applicationId} outcomes={[]} />,
    );
    expect(
      screen.getByText("No interview or hire events recorded yet."),
    ).toBeInTheDocument();
  });

  it("shows a fail-soft notice on a load failure, not a page-breaking error", () => {
    render(
      <ApplicationOutcomeHistory
        applicationId={applicationId}
        outcomes={null}
      />,
    );
    expect(
      screen.getByText("Could not load outcome history."),
    ).toBeInTheDocument();
  });

  it("renders both active and voided events, with human labels", () => {
    render(
      <ApplicationOutcomeHistory
        applicationId={applicationId}
        outcomes={[activeEvent, voidedEvent]}
      />,
    );
    expect(screen.getByText("Interview completed")).toBeInTheDocument();
    expect(screen.getByText(/Hired.*Voided/)).toBeInTheDocument();
  });

  it("shows a void control for an active event but not for an already-voided one", () => {
    render(
      <ApplicationOutcomeHistory
        applicationId={applicationId}
        outcomes={[activeEvent, voidedEvent]}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Void" })).toHaveLength(1);
  });

  it("never renders recorded_by, voided_by, or any actor identity", () => {
    render(
      <ApplicationOutcomeHistory
        applicationId={applicationId}
        outcomes={[activeEvent, voidedEvent]}
      />,
    );
    expect(screen.queryByText(/actor/i)).toBeNull();
    expect(screen.queryByText(/recorded by|voided by/i)).toBeNull();
  });
});

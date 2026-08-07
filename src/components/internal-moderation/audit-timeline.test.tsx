import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuditTimeline } from "@/components/internal-moderation/audit-timeline";
import type { EmployerAuditEvent } from "@/lib/internal/moderation/load-employer-moderation";

describe("AuditTimeline", () => {
  it("renders the human-readable label for every known event type", () => {
    const events: EmployerAuditEvent[] = [
      {
        eventType: "employer_suspended",
        occurredAt: "2026-08-05T00:00:00Z",
        reason: "Fraud",
      },
      {
        eventType: "employer_unsuspended",
        occurredAt: "2026-08-06T00:00:00Z",
        reason: null,
      },
      {
        eventType: "vacancy_moderated",
        occurredAt: "2026-08-05T00:00:00Z",
        reason: "Misleading",
      },
      {
        eventType: "vacancy_restored",
        occurredAt: "2026-08-06T00:00:00Z",
        reason: null,
      },
      {
        eventType: "verification_approved",
        occurredAt: "2026-08-01T00:00:00Z",
        reason: null,
      },
      {
        eventType: "verification_rejected",
        occurredAt: "2026-08-02T00:00:00Z",
        reason: "Incomplete",
      },
      {
        eventType: "verification_revoked",
        occurredAt: "2026-08-03T00:00:00Z",
        reason: "Compliance",
      },
    ];

    render(<AuditTimeline events={events} />);

    expect(screen.getByText("Employer suspended")).toBeInTheDocument();
    expect(screen.getByText("Employer unsuspended")).toBeInTheDocument();
    expect(screen.getByText("Vacancy moderated")).toBeInTheDocument();
    expect(screen.getByText("Vacancy restored")).toBeInTheDocument();
    expect(screen.getByText("Verification approved")).toBeInTheDocument();
    expect(screen.getByText("Verification rejected")).toBeInTheDocument();
    expect(screen.getByText("Verification revoked")).toBeInTheDocument();
  });

  it("renders the operator-authored reason when present", () => {
    render(
      <AuditTimeline
        events={[
          {
            eventType: "employer_suspended",
            occurredAt: "2026-08-05T00:00:00Z",
            reason: "Fraudulent postings reported by candidates",
          },
        ]}
      />,
    );

    expect(
      screen.getByText("Fraudulent postings reported by candidates"),
    ).toBeInTheDocument();
  });

  it("renders no reason text for a restorative event", () => {
    render(
      <AuditTimeline
        events={[
          {
            eventType: "employer_unsuspended",
            occurredAt: "2026-08-06T00:00:00Z",
            reason: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Employer unsuspended")).toBeInTheDocument();
  });

  it("renders an empty state with no events", () => {
    render(<AuditTimeline events={[]} />);

    expect(screen.getByText(/no recorded events/i)).toBeInTheDocument();
  });

  it("never renders actor_user_id or a raw event_type string", () => {
    render(
      <AuditTimeline
        events={[
          {
            eventType: "employer_suspended",
            occurredAt: "2026-08-05T00:00:00Z",
            reason: "Fraud",
          },
        ]}
      />,
    );

    expect(screen.queryByText("employer_suspended")).not.toBeInTheDocument();
    expect(screen.queryByText(/actor/i)).not.toBeInTheDocument();
  });

  it("throws for an event type outside the closed enum, rather than rendering a raw value", () => {
    const badEvents = [
      {
        eventType: "employer_deleted",
        occurredAt: "2026-08-05T00:00:00Z",
        reason: null,
      },
    ] as unknown as EmployerAuditEvent[];

    expect(() => render(<AuditTimeline events={badEvents} />)).toThrow();
  });
});

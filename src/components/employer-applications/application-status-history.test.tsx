import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationStatusHistory } from "@/components/employer-applications/application-status-history";

describe("ApplicationStatusHistory", () => {
  it("renders the initial event as a single Submitted entry, not null → submitted", () => {
    render(
      <ApplicationStatusHistory
        entries={[
          {
            from_status: null,
            to_status: "submitted",
            reason: null,
            occurred_at: "2026-08-01T00:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.queryByText(/null/i)).toBeNull();
  });

  it("renders a from → to transition with its label pair", () => {
    render(
      <ApplicationStatusHistory
        entries={[
          {
            from_status: "submitted",
            to_status: "reviewing",
            reason: null,
            occurred_at: "2026-08-02T00:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Submitted → In review")).toBeInTheDocument();
  });

  it("renders a reason only when present, and never renders actor identity", () => {
    render(
      <ApplicationStatusHistory
        entries={[
          {
            from_status: "shortlisted",
            to_status: "rejected",
            reason: "Not a fit",
            occurred_at: "2026-08-03T00:00:00Z",
          },
          {
            from_status: "submitted",
            to_status: "reviewing",
            reason: null,
            occurred_at: "2026-08-02T00:00:00Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Reason: Not a fit")).toBeInTheDocument();
    expect(screen.queryByText(/actor/i)).toBeNull();
  });
});

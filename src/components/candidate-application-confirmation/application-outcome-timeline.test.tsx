import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationOutcomeTimeline } from "@/components/candidate-application-confirmation/application-outcome-timeline";
import type { CandidateApplicationOutcomeEntry } from "@/lib/applications/load-candidate-application-outcomes";

const outcomes: CandidateApplicationOutcomeEntry[] = [
  { outcome_type: "interview_completed", occurred_at: "2026-08-01T09:00:00Z" },
  { outcome_type: "hired", occurred_at: "2026-08-05T09:00:00Z" },
];

describe("ApplicationOutcomeTimeline", () => {
  it("renders human labels for each active outcome, in RPC order", () => {
    render(<ApplicationOutcomeTimeline outcomes={outcomes} />);
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Interview and hire updates",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    const items = Array.from(section?.querySelectorAll("li") ?? []).map(
      (item) => item.textContent,
    );
    expect(items[0]).toMatch(/Interview completed/);
    expect(items[1]).toMatch(/Hired/);
  });

  it("never renders 'Interview set' or any scheduling language", () => {
    render(<ApplicationOutcomeTimeline outcomes={outcomes} />);
    expect(
      screen.queryByText(/interview set|scheduled|invitation/i),
    ).toBeNull();
  });

  it("never renders an outcome event id, recorded/voided metadata, or actor identity", () => {
    render(<ApplicationOutcomeTimeline outcomes={outcomes} />);
    expect(screen.queryByText(/actor/i)).toBeNull();
    expect(screen.queryByText(/recorded|voided/i)).toBeNull();
  });
});

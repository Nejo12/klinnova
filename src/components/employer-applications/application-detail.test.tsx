import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/employer/applications/[applicationId]/transition-actions",
  () => ({
    transitionEmployerApplicationAction: vi.fn(async () => ({
      kind: "failure",
    })),
  }),
);

vi.mock("@/app/employer/applications/[applicationId]/outcome-actions", () => ({
  recordApplicationOutcomeAction: vi.fn(async () => ({ kind: "failure" })),
  voidApplicationOutcomeAction: vi.fn(async () => ({ kind: "failure" })),
}));

import { ApplicationDetail } from "@/components/employer-applications/application-detail";
import type { EmployerApplicationDetailReady } from "@/lib/employer/applications/load-employer-application";

const TODAY_ISO = "2026-08-10";

type LiveDetail = Extract<
  EmployerApplicationDetailReady,
  { candidate_deleted: false }
>;
type DeletedDetail = Extract<
  EmployerApplicationDetailReady,
  { candidate_deleted: true }
>;

function buildApplication(overrides: Partial<LiveDetail> = {}): LiveDetail {
  return {
    status: "ready",
    candidate_deleted: false,
    application_id: "11111111-1111-4111-8111-111111111111",
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    vacancy_title: "Morning kitchen support",
    submitted_at: "2026-08-01T00:00:00Z",
    current_status: "submitted",
    candidate_display_name: "J. Doe",
    matched_job_category: "hospitality",
    german_comfort: "basic",
    languages: [{ language_code: "en", proficiency: "proficient" }],
    work_authorisation_declared: true,
    available_from: "2026-09-01",
    employment_types: ["full_time"],
    shift_preferences: ["morning"],
    allowed_transitions: ["reviewing", "shortlisted", "accepted", "rejected"],
    status_history: [
      {
        from_status: null,
        to_status: "submitted",
        reason: null,
        occurred_at: "2026-08-01T00:00:00Z",
      },
    ],
    ...overrides,
  };
}

function buildDeletedApplication(
  overrides: Partial<DeletedDetail> = {},
): DeletedDetail {
  return {
    status: "ready",
    candidate_deleted: true,
    application_id: "11111111-1111-4111-8111-111111111111",
    vacancy_id: "22222222-2222-4222-8222-222222222222",
    vacancy_title: "Morning kitchen support",
    submitted_at: "2026-08-01T00:00:00Z",
    current_status: "submitted",
    candidate_display_name: "Deleted candidate",
    allowed_transitions: [],
    status_history: [
      {
        from_status: null,
        to_status: "submitted",
        reason: null,
        occurred_at: "2026-08-01T00:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("ApplicationDetail", () => {
  it("renders applicant fields with neutral work-authorisation wording", () => {
    render(
      <ApplicationDetail
        application={buildApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );

    expect(screen.getByText("J. Doe")).toBeInTheDocument();
    expect(screen.getByText("Declared")).toBeInTheDocument();
    expect(
      screen.queryByText(
        /legally authorized|visa verified|work permit confirmed/i,
      ),
    ).toBeNull();
  });

  it("shows 'Not declared' for a false work-authorisation declaration", () => {
    render(
      <ApplicationDetail
        application={buildApplication({ work_authorisation_declared: false })}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.getByText("Not declared")).toBeInTheDocument();
  });

  it("renders the vacancy section with title, submitted time, and current status", () => {
    render(
      <ApplicationDetail
        application={buildApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.getByText("Morning kitchen support")).toBeInTheDocument();
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
  });

  it("never renders candidate id, auth id, or actor identity", () => {
    render(
      <ApplicationDetail
        application={buildApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.queryByText(/actor/i)).toBeNull();
    expect(
      screen.queryByText("11111111-1111-4111-8111-111111111111"),
    ).toBeNull();
  });

  it("renders discrete status-action buttons (not a dropdown) for an application with allowed transitions", () => {
    render(
      <ApplicationDetail
        application={buildApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    const statusSection = screen
      .getByRole("heading", { level: 2, name: "Status" })
      .closest("section");
    expect(statusSection?.querySelector("select")).toBeNull();
    expect(
      within(statusSection as HTMLElement).getByRole("button", {
        name: "Start reviewing",
      }),
    ).toBeInTheDocument();
    expect(
      within(statusSection as HTMLElement).getByRole("button", {
        name: "Reject application",
      }),
    ).toBeInTheDocument();
  });

  it("renders a terminal message with no transition form when there are no allowed transitions", () => {
    render(
      <ApplicationDetail
        application={buildApplication({
          current_status: "accepted",
          allowed_transitions: [],
        })}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.getByText(/status is final/i)).toBeInTheDocument();
    // Scoped to the Status section specifically — a second, unrelated
    // combobox (outcome type) is always present regardless of transition
    // state (M5.1 Unit E).
    const statusSection = screen
      .getByRole("heading", { level: 2, name: "Status" })
      .closest("section");
    expect(statusSection?.querySelector("select")).toBeNull();
  });

  it("shows a neutral deleted-candidate state with no fabricated attributes", () => {
    render(
      <ApplicationDetail
        application={buildDeletedApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.getByText("Deleted candidate")).toBeInTheDocument();
    expect(
      screen.getByText("Candidate data has been removed."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Matched category")).toBeNull();
    expect(screen.queryByText("German comfort")).toBeNull();
    expect(screen.queryByText("Languages")).toBeNull();
    expect(screen.queryByText("Work permission")).toBeNull();
    expect(screen.queryByText("Employment types")).toBeNull();
    expect(screen.queryByText("Availability")).toBeNull();
  });

  it("still renders the vacancy section and status history for a deleted candidate's preserved application", () => {
    render(
      <ApplicationDetail
        application={buildDeletedApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.getByText("Morning kitchen support")).toBeInTheDocument();
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
  });

  it("renders no transition controls for a deleted candidate's application (D-087)", () => {
    render(
      <ApplicationDetail
        application={buildDeletedApplication()}
        outcomes={[]}
        todayIso={TODAY_ISO}
      />,
    );
    expect(screen.getByText(/status is final/i)).toBeInTheDocument();
    const statusSection = screen
      .getByRole("heading", { level: 2, name: "Status" })
      .closest("section");
    expect(statusSection?.querySelector("select")).toBeNull();
    expect(screen.queryByRole("button", { name: /update status/i })).toBeNull();
  });
});

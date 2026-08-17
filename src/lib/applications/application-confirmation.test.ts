import { describe, expect, it } from "vitest";

import {
  APPLICATION_CONFIRMATION_HEADING,
  APPLICATION_STATUS_SUBMITTED_LABEL,
  buildApplicationConfirmation,
} from "@/lib/applications/application-confirmation";
import { applicationStatusLabel } from "@/lib/applications/status";
import type {
  CandidateSnapshotV1,
  VacancySnapshotV1,
} from "@/lib/applications/snapshot-schemas";

const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";
const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const candidate = {
  display_name: "Ada Candidate",
  job_category: "hospitality",
  german_comfort: "basic",
  languages: [{ language_code: "en", proficiency: "conversational" }],
  work_authorisation_declared: true,
  available_from: "2026-08-04",
  employment_types: ["part_time", "mini_job"],
  shift_preferences: ["morning", "daytime"],
} satisfies CandidateSnapshotV1;

const vacancy = {
  vacancy_id: VACANCY_ID,
  title: "Demo vacancy — Morning kitchen support",
  employer_display_name: "Demo Berlin Work Co",
  source: "seed",
  demo_label: "Demo vacancy",
  city: "Berlin",
  job_category: "hospitality",
  employment_types: ["part_time", "mini_job"],
  shift_requirements: ["morning", "daytime"],
  german_requirement: "basic",
  language_requirements: [{ language_code: "en", min_proficiency: "basic" }],
  available_from: null,
} satisfies VacancySnapshotV1;

describe("buildApplicationConfirmation", () => {
  it("maps factual confirmation fields from snapshots only", () => {
    const confirmation = buildApplicationConfirmation({
      applicationId: APPLICATION_ID,
      status: "submitted",
      submittedAt: "2026-08-03T14:30:00.000Z",
      candidate,
      vacancy,
    });

    expect(confirmation).not.toBeNull();
    expect(confirmation?.statusLabel).toBe(APPLICATION_STATUS_SUBMITTED_LABEL);
    expect(confirmation?.submittedAtLabel).toBe("3 August 2026, 14:30 UTC");
    expect(confirmation?.vacancyTitle).toBe(
      "Demo vacancy — Morning kitchen support",
    );
    expect(confirmation?.employerDisplayName).toBe("Demo Berlin Work Co");
    expect(confirmation?.demoLabel).toBe("Demo vacancy");
    expect(confirmation?.city).toBe("Berlin");
    expect(confirmation?.candidateDisplayName).toBe("Ada Candidate");
    expect(confirmation?.candidateWorkAuthorisationLabel).toBe("Yes");
    expect(confirmation?.vacancyAvailableFromLabel).toBe("Flexible start");
    expect(APPLICATION_CONFIRMATION_HEADING).toBe("Application submitted");

    const serialized = JSON.stringify({
      ...confirmation,
      applicationId: undefined,
    });
    expect(serialized).not.toMatch(/email|phone|cv|salary|reason/i);
    expect(serialized).not.toContain(APPLICATION_ID);
    expect(confirmation?.applicationId).toBe(APPLICATION_ID);
  });

  it("reflects the current status label, not a hardcoded Submitted (regression: PR 6.2 status transitions)", () => {
    expect(
      buildApplicationConfirmation({
        applicationId: APPLICATION_ID,
        status: "reviewing",
        submittedAt: "2026-08-03T14:30:00.000Z",
        candidate,
        vacancy,
      })?.statusLabel,
    ).toBe("In review");

    expect(
      buildApplicationConfirmation({
        applicationId: APPLICATION_ID,
        status: "shortlisted",
        submittedAt: "2026-08-03T14:30:00.000Z",
        candidate,
        vacancy,
      })?.statusLabel,
    ).toBe("Shortlisted");

    expect(
      buildApplicationConfirmation({
        applicationId: APPLICATION_ID,
        status: "accepted",
        submittedAt: "2026-08-03T14:30:00.000Z",
        candidate,
        vacancy,
      })?.statusLabel,
    ).toBe("Accepted");

    expect(
      buildApplicationConfirmation({
        applicationId: APPLICATION_ID,
        status: "rejected",
        submittedAt: "2026-08-03T14:30:00.000Z",
        candidate,
        vacancy,
      })?.statusLabel,
    ).toBe("Not selected");
  });

  it("renders rejected as the candidate-facing 'Not selected' label, distinct from the unchanged canonical label (regression: candidate detail/timeline consistency)", () => {
    const rejected = buildApplicationConfirmation({
      applicationId: APPLICATION_ID,
      status: "rejected",
      submittedAt: "2026-08-03T14:30:00.000Z",
      candidate,
      vacancy,
    });

    expect(rejected?.status).toBe("rejected");
    expect(rejected?.statusLabel).toBe("Not selected");
    // The canonical application-status enum and its own label function are
    // untouched — "Not selected" is candidate-surface presentation only.
    expect(applicationStatusLabel("rejected")).toBe("Rejected");
  });

  it("maps a real employer vacancy snapshot (source: employer, demo_label: null) — regression for the demo_label bug", () => {
    const realEmployerVacancy = {
      ...vacancy,
      source: "employer",
      demo_label: null,
    } satisfies VacancySnapshotV1;

    const confirmation = buildApplicationConfirmation({
      applicationId: APPLICATION_ID,
      status: "submitted",
      submittedAt: "2026-08-03T14:30:00.000Z",
      candidate,
      vacancy: realEmployerVacancy,
    });

    expect(confirmation).not.toBeNull();
    expect(confirmation?.demoLabel).toBeNull();
  });
});

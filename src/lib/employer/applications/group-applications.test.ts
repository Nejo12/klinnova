import { describe, expect, it } from "vitest";

import { groupEmployerApplications } from "@/lib/employer/applications/group-applications";
import type { EmployerApplicationListRow } from "@/lib/employer/applications/schemas";

function row(
  overrides: Partial<
    Extract<EmployerApplicationListRow, { candidate_deleted: false }>
  >,
): EmployerApplicationListRow {
  return {
    candidate_deleted: false,
    application_id: "3abcdfa3-23d1-4c97-a69d-38e9fd8b88a0",
    vacancy_id: "c0212eb5-5fbb-407c-9fb9-cb5c200f378d",
    vacancy_title: "Reinigungskraft",
    candidate_display_name: "A. Khoury",
    job_category: "cleaning",
    german_comfort: "basic",
    available_from: "2026-09-01",
    current_status: "submitted",
    submitted_at: "2026-08-15T00:00:00Z",
    updated_at: "2026-08-15T00:00:00Z",
    employer_seen_at: null,
    ...overrides,
  };
}

describe("groupEmployerApplications", () => {
  it("puts unseen rows in needsReview regardless of status", () => {
    const rows = [
      row({
        application_id: "1781db6f-fa00-4ccd-9100-6c5cddda696c",
        current_status: "submitted",
        employer_seen_at: null,
      }),
      row({
        application_id: "4928258f-4e56-406f-8f2c-7e66a91fc447",
        current_status: "accepted",
        employer_seen_at: null,
      }),
    ];
    const { needsReview } = groupEmployerApplications(rows);
    expect(needsReview.map((r) => r.application_id)).toEqual([
      "1781db6f-fa00-4ccd-9100-6c5cddda696c",
      "4928258f-4e56-406f-8f2c-7e66a91fc447",
    ]);
  });

  it("excludes seen rows from needsReview", () => {
    const rows = [
      row({
        application_id: "1781db6f-fa00-4ccd-9100-6c5cddda696c",
        current_status: "submitted",
        employer_seen_at: "2026-08-16T00:00:00Z",
      }),
    ];
    const { needsReview } = groupEmployerApplications(rows);
    expect(needsReview).toHaveLength(0);
  });

  it("splits open vs decided purely on current_status", () => {
    const rows = [
      row({
        application_id: "1781db6f-fa00-4ccd-9100-6c5cddda696c",
        current_status: "reviewing",
        employer_seen_at: "2026-08-16T00:00:00Z",
      }),
      row({
        application_id: "4928258f-4e56-406f-8f2c-7e66a91fc447",
        current_status: "rejected",
        employer_seen_at: "2026-08-16T00:00:00Z",
      }),
    ];
    const { open, decided } = groupEmployerApplications(rows);
    expect(open).toHaveLength(1);
    expect(decided).toHaveLength(1);
  });

  it("treats submitted/reviewing/shortlisted as open", () => {
    const rows = (["submitted", "reviewing", "shortlisted"] as const).map(
      (current_status, index) =>
        row({
          application_id: [
            "1781db6f-fa00-4ccd-9100-6c5cddda696c",
            "4928258f-4e56-406f-8f2c-7e66a91fc447",
            "83f71a20-4ee3-4b3e-b6ce-90d88977b639",
          ][index],
          current_status,
          employer_seen_at: "2026-08-16T00:00:00Z",
        }),
    );
    const { open, decided } = groupEmployerApplications(rows);
    expect(open).toHaveLength(3);
    expect(decided).toHaveLength(0);
  });

  it("treats accepted/rejected as decided", () => {
    const rows = (["accepted", "rejected"] as const).map(
      (current_status, index) =>
        row({
          application_id: [
            "1781db6f-fa00-4ccd-9100-6c5cddda696c",
            "4928258f-4e56-406f-8f2c-7e66a91fc447",
          ][index],
          current_status,
          employer_seen_at: "2026-08-16T00:00:00Z",
        }),
    );
    const { open, decided } = groupEmployerApplications(rows);
    expect(open).toHaveLength(0);
    expect(decided).toHaveLength(2);
  });

  it("never drops a row — every row appears in exactly one of open/decided, plus needsReview if unseen", () => {
    const rows = [
      row({ current_status: "shortlisted", employer_seen_at: null }),
    ];
    const { needsReview, open, decided } = groupEmployerApplications(rows);
    expect(needsReview).toHaveLength(1);
    expect(open).toHaveLength(1);
    expect(decided).toHaveLength(0);
  });

  it("lets an unseen row appear in both needsReview and its status group (not mutually exclusive)", () => {
    const rows = [
      row({
        application_id: "1781db6f-fa00-4ccd-9100-6c5cddda696c",
        current_status: "accepted",
        employer_seen_at: null,
      }),
    ];
    const { needsReview, decided } = groupEmployerApplications(rows);
    expect(needsReview.map((r) => r.application_id)).toEqual([
      "1781db6f-fa00-4ccd-9100-6c5cddda696c",
    ]);
    expect(decided.map((r) => r.application_id)).toEqual([
      "1781db6f-fa00-4ccd-9100-6c5cddda696c",
    ]);
  });

  it("returns empty groups for an empty input", () => {
    const { needsReview, open, decided } = groupEmployerApplications([]);
    expect(needsReview).toEqual([]);
    expect(open).toEqual([]);
    expect(decided).toEqual([]);
  });

  it("groups a deleted-candidate row the same as any other row", () => {
    const deletedRow: EmployerApplicationListRow = {
      candidate_deleted: true,
      application_id: "1781db6f-fa00-4ccd-9100-6c5cddda696c",
      vacancy_id: "c0212eb5-5fbb-407c-9fb9-cb5c200f378d",
      vacancy_title: "Reinigungskraft",
      candidate_display_name: "Deleted candidate",
      job_category: null,
      german_comfort: null,
      available_from: null,
      current_status: "rejected",
      submitted_at: "2026-08-15T00:00:00Z",
      updated_at: "2026-08-15T00:00:00Z",
      employer_seen_at: null,
    };
    const { needsReview, decided } = groupEmployerApplications([deletedRow]);
    expect(needsReview).toHaveLength(1);
    expect(decided).toHaveLength(1);
  });
});

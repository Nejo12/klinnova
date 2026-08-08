import { describe, expect, it } from "vitest";

import {
  candidateDeletedSnapshotV1Schema,
  candidateLiveSnapshotV1Schema,
  candidateSnapshotV1Schema,
  isCandidateSnapshotDeleted,
  parseApplicationSnapshots,
} from "@/lib/applications/snapshot-schemas";

const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";
const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const validCandidate = {
  display_name: "Ada Candidate",
  job_category: "hospitality",
  german_comfort: "basic",
  languages: [{ language_code: "en", proficiency: "conversational" }],
  work_authorisation_declared: true,
  available_from: "2026-08-04",
  employment_types: ["part_time"],
  shift_preferences: ["morning"],
};

const validVacancy = {
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
  language_requirements: [],
  available_from: null,
};

const validRow = {
  id: APPLICATION_ID,
  status: "submitted",
  submitted_at: "2026-08-03T10:00:00.000Z",
  snapshot_version: 1,
  candidate_snapshot: validCandidate,
  vacancy_snapshot: validVacancy,
};

describe("parseApplicationSnapshots", () => {
  it("accepts a valid version 1 application row", () => {
    const parsed = parseApplicationSnapshots(validRow);
    expect(parsed.ok).toBe(true);
    if (parsed.ok && !isCandidateSnapshotDeleted(parsed.candidate)) {
      expect(parsed.candidate.display_name).toBe("Ada Candidate");
      expect(parsed.vacancy.title).toBe(
        "Demo vacancy — Morning kitchen support",
      );
      expect(parsed.row.snapshot_version).toBe(1);
    }
  });

  it("rejects unsupported snapshot versions", () => {
    expect(
      parseApplicationSnapshots({ ...validRow, snapshot_version: 2 }),
    ).toEqual({ ok: false, reason: "unsupported_version" });
  });

  it("rejects non-object snapshots and missing required keys", () => {
    expect(
      parseApplicationSnapshots({
        ...validRow,
        candidate_snapshot: null,
      }),
    ).toEqual({ ok: false, reason: "malformed" });

    expect(
      parseApplicationSnapshots({
        ...validRow,
        vacancy_snapshot: "not-an-object",
      }),
    ).toEqual({ ok: false, reason: "malformed" });

    expect(
      parseApplicationSnapshots({
        ...validRow,
        candidate_snapshot: { ...validCandidate, display_name: undefined },
      }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects invalid array shapes and language entries", () => {
    expect(
      parseApplicationSnapshots({
        ...validRow,
        candidate_snapshot: {
          ...validCandidate,
          languages: [{ language_code: "en" }],
        },
      }),
    ).toEqual({ ok: false, reason: "malformed" });

    expect(
      parseApplicationSnapshots({
        ...validRow,
        vacancy_snapshot: {
          ...validVacancy,
          language_requirements: [
            { language_code: "xx", min_proficiency: "basic" },
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("accepts a real employer vacancy snapshot (source: employer, demo_label: null) — regression for the demo_label bug", () => {
    const parsed = parseApplicationSnapshots({
      ...validRow,
      vacancy_snapshot: {
        ...validVacancy,
        source: "employer",
        demo_label: null,
      },
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.vacancy.source).toBe("employer");
      expect(parsed.vacancy.demo_label).toBeNull();
    }
  });

  it("rejects an unknown vacancy source", () => {
    expect(
      parseApplicationSnapshots({
        ...validRow,
        vacancy_snapshot: { ...validVacancy, source: "unknown" },
      }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("accepts every non-submitted application status (regression: PR 6.2 status transitions)", () => {
    for (const status of ["reviewing", "shortlisted", "accepted", "rejected"]) {
      const parsed = parseApplicationSnapshots({ ...validRow, status });
      expect(parsed.ok, status).toBe(true);
      if (parsed.ok) {
        expect(parsed.row.status).toBe(status);
      }
    }
  });

  it("rejects an unknown application status", () => {
    expect(
      parseApplicationSnapshots({ ...validRow, status: "archived" }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("allows nullable dates on both snapshots", () => {
    const parsed = parseApplicationSnapshots({
      ...validRow,
      candidate_snapshot: {
        ...validCandidate,
        available_from: null,
      },
      vacancy_snapshot: {
        ...validVacancy,
        available_from: null,
      },
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok && !isCandidateSnapshotDeleted(parsed.candidate)) {
      expect(parsed.candidate.available_from).toBeNull();
      expect(parsed.vacancy.available_from).toBeNull();
    }
  });

  it("still ignores extra keys on the vacancy snapshot without exposing them", () => {
    const parsed = parseApplicationSnapshots({
      ...validRow,
      vacancy_snapshot: { ...validVacancy, phone: "123" },
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(JSON.stringify(parsed.vacancy)).not.toMatch(/phone/i);
    }
  });

  it("rejects a candidate snapshot with an unexpected extra key, rather than silently stripping it (strict, to keep the live/deleted shapes unambiguous)", () => {
    expect(
      parseApplicationSnapshots({
        ...validRow,
        candidate_snapshot: { ...validCandidate, email: "hidden@example.test" },
      }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("parses a D-078 deleted-candidate tombstone snapshot as deleted, not malformed", () => {
    const parsed = parseApplicationSnapshots({
      ...validRow,
      candidate_snapshot: { deleted: true },
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(isCandidateSnapshotDeleted(parsed.candidate)).toBe(true);
    }
  });

  it("does not accidentally treat a deleted marker plus fake live fields as a live snapshot", () => {
    const parsed = parseApplicationSnapshots({
      ...validRow,
      candidate_snapshot: { deleted: true, ...validCandidate },
    });
    // Neither branch matches: the deleted schema is strict (only `deleted`
    // allowed) and the live schema is strict (no `deleted` key allowed) —
    // this must fail outright, never silently resolve to "live".
    expect(parsed.ok).toBe(false);
  });
});

describe("candidate snapshot schema union, directly", () => {
  it("candidateLiveSnapshotV1Schema accepts a real live shape", () => {
    expect(
      candidateLiveSnapshotV1Schema.safeParse(validCandidate).success,
    ).toBe(true);
  });

  it("candidateDeletedSnapshotV1Schema accepts only the minimal tombstone", () => {
    expect(
      candidateDeletedSnapshotV1Schema.safeParse({ deleted: true }).success,
    ).toBe(true);
    expect(
      candidateDeletedSnapshotV1Schema.safeParse({ deleted: false }).success,
    ).toBe(false);
  });

  it("candidateSnapshotV1Schema rejects a live shape carrying a spurious deleted:false key (strict)", () => {
    expect(
      candidateSnapshotV1Schema.safeParse({
        ...validCandidate,
        deleted: false,
      }).success,
    ).toBe(false);
  });

  it("isCandidateSnapshotDeleted narrows correctly for both branches", () => {
    const live = candidateSnapshotV1Schema.parse(validCandidate);
    const deleted = candidateSnapshotV1Schema.parse({ deleted: true });
    expect(isCandidateSnapshotDeleted(live)).toBe(false);
    expect(isCandidateSnapshotDeleted(deleted)).toBe(true);
  });
});

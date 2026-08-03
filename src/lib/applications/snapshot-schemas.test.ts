import { describe, expect, it } from "vitest";

import { parseApplicationSnapshots } from "@/lib/applications/snapshot-schemas";

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
    if (parsed.ok) {
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

  it("allows nullable dates and ignores extra keys without exposing them", () => {
    const parsed = parseApplicationSnapshots({
      ...validRow,
      candidate_snapshot: {
        ...validCandidate,
        available_from: null,
        email: "hidden@example.test",
      },
      vacancy_snapshot: {
        ...validVacancy,
        available_from: null,
        phone: "123",
      },
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.candidate.available_from).toBeNull();
      expect(parsed.vacancy.available_from).toBeNull();
      expect(JSON.stringify(parsed.candidate)).not.toMatch(/email|phone/i);
      expect(JSON.stringify(parsed.vacancy)).not.toMatch(/email|phone/i);
    }
  });
});

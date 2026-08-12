import { describe, expect, it } from "vitest";

import { buildExportHttpResponse } from "@/lib/account-export/export-response";
import type { CandidateAccountExportV1 } from "@/lib/account-export/schemas";

const candidatePayload: CandidateAccountExportV1 = {
  version: 1,
  exported_at: "2026-08-08T00:00:00.000Z",
  account: { email: "a@example.test", created_at: "2026-01-01T00:00:00Z" },
  candidate: {
    display_name: "Ada",
    german_comfort: "basic",
    work_authorisation_declared: true,
    work_authorisation_declared_at: "2026-01-01T00:00:00Z",
    city: "Berlin",
    travel_radius_minutes: 30,
    available_from: "2026-09-01",
    job_categories: ["cleaning"],
    employment_types: ["part_time"],
    shift_preferences: ["morning"],
    onboarding_completed_at: "2026-01-02T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    languages: [],
    applications: [],
  },
};

describe("buildExportHttpResponse", () => {
  it("returns 401 with no-store for unauthenticated, no Content-Disposition", () => {
    const response = buildExportHttpResponse("candidate", {
      kind: "unauthenticated",
    });
    expect(response.status).toBe(401);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers["Content-Disposition"]).toBeUndefined();
    expect(response.headers["Content-Type"]).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("returns 403 with no-store for unavailable (deleted or wrong capability)", () => {
    const response = buildExportHttpResponse("employer", {
      kind: "unavailable",
    });
    expect(response.status).toBe(403);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers["Content-Disposition"]).toBeUndefined();
  });

  it("returns 500 with a generic message for failure, never raw details", () => {
    const response = buildExportHttpResponse("candidate", { kind: "failure" });
    expect(response.status).toBe(500);
    expect(response.body).not.toMatch(/stack|SQL|Postgres|parse error/i);
  });

  it("returns 200 with attachment Content-Disposition and a privacy-safe candidate filename", () => {
    const response = buildExportHttpResponse("candidate", {
      kind: "ok",
      payload: candidatePayload,
    });
    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers["Content-Disposition"]).toBe(
      'attachment; filename="klinnova-candidate-export-2026-08-08.json"',
    );
    expect(response.headers["Cache-Control"]).toBe("no-store");
  });

  it("returns 200 with an employer-specific filename for the employer role", () => {
    const employerPayload = {
      version: 1 as const,
      exported_at: "2026-08-08T00:00:00.000Z",
      account: { email: "e@example.test", created_at: "2026-01-01T00:00:00Z" },
      employer: {
        employer_type: "private" as const,
        display_name: "Employer X",
        berlin_locality: "Mitte",
        phone: null,
        website: null,
        organisation_legal_name: null,
        lawful_hiring_declared: true,
        lawful_hiring_declared_at: "2026-01-01T00:00:00Z",
        onboarding_completed_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        verification_state: "verified" as const,
        verification_requested_at: "2026-01-01T00:00:00Z",
        verification_reviewed_at: "2026-01-01T00:00:00Z",
        verification_attested_at: "2026-01-01T00:00:00Z",
        verification_attestation_version: "v1",
        company: null,
        vacancies: [],
        applications: [],
      },
    };
    const response = buildExportHttpResponse("employer", {
      kind: "ok",
      payload: employerPayload,
    });
    expect(response.headers["Content-Disposition"]).toBe(
      'attachment; filename="klinnova-employer-export-2026-08-08.json"',
    );
  });

  it("never includes email, display name, or an Auth UUID in the filename", () => {
    const response = buildExportHttpResponse("candidate", {
      kind: "ok",
      payload: candidatePayload,
    });
    const disposition = response.headers["Content-Disposition"] ?? "";
    expect(disposition).not.toMatch(/@/);
    expect(disposition).not.toMatch(/Ada/);
    expect(disposition).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("produces valid, parseable JSON with version 1 for a successful export", () => {
    const response = buildExportHttpResponse("candidate", {
      kind: "ok",
      payload: candidatePayload,
    });
    const parsed = JSON.parse(response.body) as { version: number };
    expect(parsed.version).toBe(1);
  });

  it("ends the successful body with a trailing newline", () => {
    const response = buildExportHttpResponse("candidate", {
      kind: "ok",
      payload: candidatePayload,
    });
    expect(response.body.endsWith("\n")).toBe(true);
  });
});

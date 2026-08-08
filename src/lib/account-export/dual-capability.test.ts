import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCandidateAccountExport } from "@/lib/account-export/candidate-export";
import { buildEmployerAccountExport } from "@/lib/account-export/employer-export";

type ChainResult = { data: unknown; error: unknown };

function makeQueryChain(result: ChainResult) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (
      resolve: (value: ChainResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

/**
 * One dual-capability identity (D-047): both a candidate_profiles and an
 * employer_profiles row exist for the same auth.uid(). D-088 requires each
 * role-scoped builder to return only its own role's data regardless.
 */
function makeDualCapabilityClient() {
  const user = {
    id: "dual-1",
    email: "dual@example.test",
    created_at: "2026-01-01T00:00:00Z",
  };

  const tables: Record<string, ChainResult> = {
    candidate_profiles: {
      data: {
        display_name: "candidate-secret-name-8-3b",
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
      },
      error: null,
    },
    candidate_languages: {
      data: [{ language_code: "en", proficiency: "proficient" }],
      error: null,
    },
    applications: { data: [], error: null },
    employer_profiles: {
      data: {
        employer_type: "private",
        display_name: "Employer Dual",
        berlin_locality: "Mitte",
        phone: null,
        website: null,
        organisation_legal_name: null,
        lawful_hiring_declared: true,
        lawful_hiring_declared_at: "2026-01-01T00:00:00Z",
        onboarding_completed_at: "2026-01-02T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        verification_state: "unverified",
        verification_requested_at: null,
        verification_reviewed_at: null,
        verification_attested_at: null,
        verification_attestation_version: null,
      },
      error: null,
    },
    companies: { data: null, error: null },
    vacancies: { data: [], error: null },
    vacancy_language_requirements: { data: [], error: null },
  };

  const from = vi.fn((table: string) => {
    const result = tables[table];
    if (result === undefined) throw new Error(`unexpected table: ${table}`);
    return makeQueryChain(result);
  });

  const rpc = vi.fn((name: string) => {
    if (name === "_is_current_stint_account_deleted") {
      return Promise.resolve({ data: false, error: null });
    }
    if (name === "list_current_employer_export_applications") {
      return Promise.resolve({ data: [], error: null });
    }
    throw new Error(`unexpected rpc: ${name}`);
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from,
    rpc,
  };
}

describe("D-088 dual-capability cross-role isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("candidate export contains only the candidate role, never an employer key or employer data", async () => {
    const client = makeDualCapabilityClient();
    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    expect(result.payload).not.toHaveProperty("employer");
    const serialized = JSON.stringify(result.payload);
    expect(serialized).not.toMatch(/Employer Dual/);
    expect(serialized).not.toMatch(/employer_type/);
    expect(serialized).not.toMatch(/verification_state/);
  });

  it("employer export contains only the employer role, never a candidate key or candidate data", async () => {
    const client = makeDualCapabilityClient();
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    expect(result.payload).not.toHaveProperty("candidate");
    const serialized = JSON.stringify(result.payload);
    expect(serialized).not.toMatch(/candidate-secret-name-8-3b/);
    expect(serialized).not.toMatch(/german_comfort/);
    expect(serialized).not.toMatch(/travel_radius_minutes/);
  });

  it("both exports share the same account.email/created_at — duplication, not leakage", async () => {
    const client = makeDualCapabilityClient();
    const candidateResult = await buildCandidateAccountExport(client as never);
    const employerResult = await buildEmployerAccountExport(client as never);
    expect(candidateResult.kind).toBe("ok");
    expect(employerResult.kind).toBe("ok");
    if (candidateResult.kind !== "ok" || employerResult.kind !== "ok") return;

    expect(candidateResult.payload.account).toEqual({
      email: "dual@example.test",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(employerResult.payload.account).toEqual(
      candidateResult.payload.account,
    );
  });
});

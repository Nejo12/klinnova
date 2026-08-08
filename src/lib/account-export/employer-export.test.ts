import { beforeEach, describe, expect, it, vi } from "vitest";

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

function makeClient(options: {
  getUser?: {
    data: { user: { id: string; email?: string; created_at: string } | null };
    error: unknown;
  };
  isDeleted?: ChainResult;
  employerProfile?: ChainResult;
  company?: ChainResult;
  vacancies?: ChainResult;
  vacancyLanguageRequirements?: ChainResult;
  exportApplications?: ChainResult;
}) {
  const getUser =
    options.getUser ??
    ({
      data: {
        user: {
          id: "emp-1",
          email: "emp@example.test",
          created_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    } as const);

  const isDeleted = options.isDeleted ?? { data: false, error: null };
  const employerProfile = options.employerProfile ?? {
    data: null,
    error: null,
  };
  const company = options.company ?? { data: null, error: null };
  const vacancies = options.vacancies ?? { data: [], error: null };
  const vacancyLanguageRequirements = options.vacancyLanguageRequirements ?? {
    data: [],
    error: null,
  };
  const exportApplications = options.exportApplications ?? {
    data: [],
    error: null,
  };

  const from = vi.fn((table: string) => {
    if (table === "employer_profiles") return makeQueryChain(employerProfile);
    if (table === "companies") return makeQueryChain(company);
    if (table === "vacancies") return makeQueryChain(vacancies);
    if (table === "vacancy_language_requirements")
      return makeQueryChain(vacancyLanguageRequirements);
    throw new Error(`unexpected table: ${table}`);
  });

  const rpc = vi.fn((name: string) => {
    if (name === "_is_current_stint_account_deleted") {
      return Promise.resolve(isDeleted);
    }
    if (name === "list_current_employer_export_applications") {
      return Promise.resolve(exportApplications);
    }
    throw new Error(`unexpected rpc: ${name}`);
  });

  return { auth: { getUser: vi.fn().mockResolvedValue(getUser) }, from, rpc };
}

const employerProfileRow = {
  employer_type: "organisation",
  display_name: "Employer X",
  berlin_locality: "Mitte",
  phone: "+49 30 1234567",
  website: "https://employer-x.example.test",
  organisation_legal_name: "Employer X GmbH",
  lawful_hiring_declared: true,
  lawful_hiring_declared_at: "2026-01-01T00:00:00Z",
  onboarding_completed_at: "2026-01-02T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  verification_state: "verified",
  verification_requested_at: "2026-01-01T00:00:00Z",
  verification_reviewed_at: "2026-01-01T00:00:00Z",
  verification_attested_at: "2026-01-01T00:00:00Z",
  verification_attestation_version: "v1",
};

const vacancyRow = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "Morning kitchen support",
  slug: "morning-kitchen-support",
  summary: "summary",
  description: "description",
  city: "Berlin",
  public_locality: "Mitte",
  job_category: "cleaning",
  employment_types: ["part_time"],
  shift_requirements: ["morning"],
  german_requirement: "basic",
  workplace_type: "private_home",
  work_frequency: "recurring",
  salary_amount_cents: 1800,
  salary_currency: "EUR",
  salary_period: "hourly",
  salary_is_gross: true,
  cv_required: true,
  interview_english_ok: true,
  experience_notes: null,
  available_from: null,
  publication_state: "published",
  source: "employer",
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
  paused_at: null,
  filled_at: null,
  withdrawn_at: null,
  expired_at: null,
  created_at: "2026-07-01T00:00:00Z",
};

describe("buildEmployerAccountExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated when there is no session user", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: null },
    });
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("unauthenticated");
  });

  it("returns unavailable for a deleted account, before any profile read", async () => {
    const client = makeClient({ isDeleted: { data: true, error: null } });
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("unavailable");
    expect(client.from).not.toHaveBeenCalledWith("employer_profiles");
  });

  it("returns unavailable (wrong capability) when no employer profile exists", async () => {
    const client = makeClient({ employerProfile: { data: null, error: null } });
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("unavailable");
  });

  it("returns the exact employer-only export shape, including company and vacancy language requirements", async () => {
    const client = makeClient({
      employerProfile: { data: employerProfileRow, error: null },
      company: {
        data: {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Employer X Co",
          slug: "employer-x-co",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      },
      vacancies: { data: [vacancyRow], error: null },
      vacancyLanguageRequirements: {
        data: [
          {
            vacancy_id: vacancyRow.id,
            language_code: "en",
            min_proficiency: "conversational",
          },
          {
            vacancy_id: vacancyRow.id,
            language_code: "de",
            min_proficiency: "basic",
          },
        ],
        error: null,
      },
      exportApplications: {
        data: [
          {
            application_id: "55555555-5555-4555-8555-555555555555",
            vacancy_id: vacancyRow.id,
            status: "reviewing",
            submitted_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      },
    });

    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    expect(result.payload.version).toBe(1);
    expect(result.payload.employer.display_name).toBe("Employer X");
    expect(result.payload.employer.company).toEqual({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Employer X Co",
      slug: "employer-x-co",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.payload.employer.vacancies).toHaveLength(1);
    expect(result.payload.employer.vacancies[0]?.language_requirements).toEqual(
      [
        { language_code: "de", min_proficiency: "basic" },
        { language_code: "en", min_proficiency: "conversational" },
      ],
    );
    expect(result.payload.employer.applications).toEqual([
      {
        application_id: "55555555-5555-4555-8555-555555555555",
        vacancy_id: vacancyRow.id,
        status: "reviewing",
        submitted_at: "2026-08-01T00:00:00Z",
      },
    ]);
    expect(result.payload).not.toHaveProperty("candidate");
  });

  it("application process rows have exactly four fields — nothing else", async () => {
    const client = makeClient({
      employerProfile: { data: employerProfileRow, error: null },
      exportApplications: {
        data: [
          {
            application_id: "55555555-5555-4555-8555-555555555555",
            vacancy_id: vacancyRow.id,
            status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      },
    });

    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    const [row] = result.payload.employer.applications;
    expect(Object.keys(row ?? {}).sort()).toEqual([
      "application_id",
      "status",
      "submitted_at",
      "vacancy_id",
    ]);
  });

  it("excludes operator/moderation/review fields from the employer profile section", async () => {
    const client = makeClient({
      employerProfile: { data: employerProfileRow, error: null },
    });

    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    expect(result.payload.employer).not.toHaveProperty(
      "verification_reviewed_by",
    );
    expect(result.payload.employer).not.toHaveProperty(
      "verification_review_reason",
    );
    expect(result.payload.employer).not.toHaveProperty("account_deleted_at");
  });

  it("succeeds for a suspended employer (suspension is never checked/gated)", async () => {
    const client = makeClient({
      employerProfile: { data: employerProfileRow, error: null },
    });
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    // No suspension-related table/rpc is ever queried by this builder.
    expect(client.from).not.toHaveBeenCalledWith("employer_suspension");
  });

  it("succeeds for an unverified/revoked employer", async () => {
    const client = makeClient({
      employerProfile: {
        data: { ...employerProfileRow, verification_state: "revoked" },
        error: null,
      },
    });
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.payload.employer.verification_state).toBe("revoked");
  });

  it("preserves the DB-returned (created_at ASC, id ASC) vacancy order in the export", async () => {
    const laterId = "88888888-8888-4888-8888-888888888888";
    const earlierId = "77777777-7777-4777-8777-777777777777";
    const client = makeClient({
      employerProfile: { data: employerProfileRow, error: null },
      vacancies: {
        // Rows are supplied in the exact order the ORDER BY clause would
        // return them (earlier created_at first); the builder must not
        // silently re-sort them differently.
        data: [
          { ...vacancyRow, id: earlierId, created_at: "2026-07-01T00:00:00Z" },
          { ...vacancyRow, id: laterId, created_at: "2026-07-02T00:00:00Z" },
        ],
        error: null,
      },
    });

    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.payload.employer.vacancies.map((v) => v.id)).toEqual([
      earlierId,
      laterId,
    ]);
  });

  // ---------------------------------------------------------------------
  // PART H — mandatory candidate-PII serialized-absence proof
  // ---------------------------------------------------------------------

  it("never serializes candidate PII anywhere in the employer export, even if a malicious/unexpected extra field were present", async () => {
    const client = makeClient({
      employerProfile: { data: employerProfileRow, error: null },
      vacancies: { data: [vacancyRow], error: null },
      exportApplications: {
        data: [
          {
            application_id: "55555555-5555-4555-8555-555555555555",
            vacancy_id: vacancyRow.id,
            status: "reviewing",
            submitted_at: "2026-08-01T00:00:00Z",
            // Simulates a hypothetical future RPC regression that leaks
            // extra fields — the strict schema must strip/reject this.
            candidate_display_name: "candidate-secret-name-8-3b",
            candidate_id: "66666666-6666-4666-8666-666666666666",
          },
        ],
        error: null,
      },
    });

    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    const serialized = JSON.stringify(result.payload);
    expect(serialized).not.toMatch(/candidate-secret-name-8-3b/);
    expect(serialized).not.toMatch(/candidate_id/);
    expect(serialized).not.toMatch(/candidate_display_name/);
    expect(serialized).not.toMatch(/candidate_snapshot/);
    expect(serialized).not.toMatch(/vacancy_snapshot/);
    expect(serialized).not.toMatch(/actor_user_id/);
    expect(serialized).not.toMatch(/verification_reviewed_by/);
    expect(serialized).not.toMatch(/verification_review_reason/);
    expect(serialized).not.toMatch(/moderated_reason/);
  });

  it("fails in a controlled way for malformed persisted employer profile data", async () => {
    const client = makeClient({
      employerProfile: {
        data: { ...employerProfileRow, employer_type: 12345 },
        error: null,
      },
    });
    const result = await buildEmployerAccountExport(client as never);
    expect(result.kind).toBe("failure");
  });
});

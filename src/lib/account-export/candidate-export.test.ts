import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildCandidateAccountExport } from "@/lib/account-export/candidate-export";

type ChainResult = { data: unknown; error: unknown };

/**
 * Minimal thenable query-chain double mirroring the real
 * supabase-js `PostgrestFilterBuilder`: every chain method returns the
 * same object, and the object itself resolves (via `.then`) to the final
 * `{ data, error }` result — so both `await query.eq(...).order(...)` and
 * `await query.eq(...).maybeSingle()` work correctly depending on which
 * call the code under test happens to await last.
 */
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
  candidateProfile?: ChainResult;
  candidateLanguages?: ChainResult;
  applications?: ChainResult;
  history?: Record<string, ChainResult>;
}) {
  const getUser =
    options.getUser ??
    ({
      data: {
        user: {
          id: "cand-1",
          email: "cand@example.test",
          created_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    } as const);

  const isDeleted = options.isDeleted ?? { data: false, error: null };
  const candidateProfile = options.candidateProfile ?? {
    data: null,
    error: null,
  };
  const candidateLanguages = options.candidateLanguages ?? {
    data: [],
    error: null,
  };
  const applications = options.applications ?? { data: [], error: null };
  const history = options.history ?? {};

  const from = vi.fn((table: string) => {
    if (table === "candidate_profiles") return makeQueryChain(candidateProfile);
    if (table === "candidate_languages")
      return makeQueryChain(candidateLanguages);
    if (table === "applications") return makeQueryChain(applications);
    throw new Error(`unexpected table: ${table}`);
  });

  const rpc = vi.fn((name: string, args?: { p_application_id?: string }) => {
    if (name === "_is_current_stint_account_deleted") {
      return Promise.resolve(isDeleted);
    }
    if (name === "list_current_candidate_application_status_history") {
      const key = args?.p_application_id ?? "";
      return Promise.resolve(history[key] ?? { data: [], error: null });
    }
    throw new Error(`unexpected rpc: ${name}`);
  });

  return { auth: { getUser: vi.fn().mockResolvedValue(getUser) }, from, rpc };
}

const liveProfileRow = {
  display_name: "Ada Candidate",
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
};

describe("buildCandidateAccountExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthenticated when there is no session user", async () => {
    const client = makeClient({
      getUser: { data: { user: null }, error: null },
    });
    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("unauthenticated");
  });

  it("returns unavailable for a deleted account, before any profile read", async () => {
    const client = makeClient({ isDeleted: { data: true, error: null } });
    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("unavailable");
    expect(client.from).not.toHaveBeenCalledWith("candidate_profiles");
  });

  it("returns unavailable (wrong capability) when no candidate profile exists", async () => {
    const client = makeClient({
      candidateProfile: { data: null, error: null },
    });
    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("unavailable");
  });

  it("returns the exact candidate-only export shape for a live candidate", async () => {
    const client = makeClient({
      candidateProfile: { data: liveProfileRow, error: null },
      candidateLanguages: {
        data: [
          { language_code: "de", proficiency: "conversational" },
          { language_code: "en", proficiency: "proficient" },
        ],
        error: null,
      },
      applications: { data: [], error: null },
    });

    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    expect(result.payload.version).toBe(1);
    expect(result.payload.account).toEqual({
      email: "cand@example.test",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.payload.candidate.display_name).toBe("Ada Candidate");
    expect(result.payload.candidate.languages).toEqual([
      { language_code: "de", proficiency: "conversational" },
      { language_code: "en", proficiency: "proficient" },
    ]);
    expect(result.payload.candidate.applications).toEqual([]);
    expect(result.payload).not.toHaveProperty("employer");
  });

  it("sorts languages deterministically by language_code ascending", async () => {
    const client = makeClient({
      candidateProfile: { data: liveProfileRow, error: null },
      candidateLanguages: {
        data: [
          { language_code: "en", proficiency: "proficient" },
          { language_code: "ar", proficiency: "basic" },
        ],
        error: null,
      },
    });

    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(
      result.payload.candidate.languages.map((entry) => entry.language_code),
    ).toEqual(["ar", "en"]);
  });

  it("includes candidate_snapshot, a narrow vacancy projection, and candidate-safe history for each application", async () => {
    const candidateSnapshot = {
      display_name: "Ada Candidate",
      job_category: "cleaning",
      german_comfort: "basic",
      languages: [],
      work_authorisation_declared: true,
      available_from: "2026-09-01",
      employment_types: ["part_time"],
      shift_preferences: ["morning"],
    };
    const vacancySnapshot = {
      vacancy_id: "22222222-2222-4222-8222-222222222222",
      title: "Morning kitchen support",
      employer_display_name: "Employer X",
      source: "employer",
      demo_label: null,
      city: "Berlin",
      job_category: "cleaning",
      employment_types: ["part_time"],
      shift_requirements: ["morning"],
      german_requirement: "basic",
      language_requirements: [],
      available_from: null,
    };
    const applicationId = "11111111-1111-4111-8111-111111111111";

    const client = makeClient({
      candidateProfile: { data: liveProfileRow, error: null },
      applications: {
        data: [
          {
            id: applicationId,
            status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
            snapshot_version: 1,
            candidate_snapshot: candidateSnapshot,
            vacancy_snapshot: vacancySnapshot,
          },
        ],
        error: null,
      },
      history: {
        [applicationId]: {
          data: [
            { to_status: "submitted", occurred_at: "2026-08-01T00:00:00Z" },
          ],
          error: null,
        },
      },
    });

    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    const [application] = result.payload.candidate.applications;
    expect(application?.id).toBe(applicationId);
    expect(application?.candidate_snapshot).toEqual(candidateSnapshot);
    expect(application?.vacancy).toEqual(vacancySnapshot);
    expect(application?.status_history).toEqual([
      { to_status: "submitted", occurred_at: "2026-08-01T00:00:00Z" },
    ]);
    expect(application?.status_history[0]).not.toHaveProperty("actor_user_id");
    expect(application?.status_history[0]).not.toHaveProperty("reason");
  });

  it("fails in a controlled way (no crash, no raw parser error) for a malformed persisted snapshot", async () => {
    const client = makeClient({
      candidateProfile: { data: liveProfileRow, error: null },
      applications: {
        data: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
            snapshot_version: 1,
            candidate_snapshot: { not: "a valid snapshot" },
            vacancy_snapshot: { not: "a valid snapshot" },
          },
        ],
        error: null,
      },
    });

    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("failure");
  });

  it("never omits a malformed application silently — the whole export fails, not a partial list", async () => {
    const client = makeClient({
      candidateProfile: { data: liveProfileRow, error: null },
      applications: {
        data: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
            snapshot_version: 1,
            candidate_snapshot: null,
            vacancy_snapshot: null,
          },
        ],
        error: null,
      },
    });

    const result = await buildCandidateAccountExport(client as never);
    expect(result.kind).toBe("failure");
    expect(result).not.toHaveProperty("payload");
  });
});

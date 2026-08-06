import { describe, expect, it, vi } from "vitest";

import { loadCurrentCandidateVacancyDetail } from "@/lib/matching/resolve-current-candidate-vacancy-detail";

const vacancyId = "11111111-1111-4111-8111-111111111111";

const publicRow = {
  vacancy_id: vacancyId,
  title: "Evening cleaner",
  description: "Two hours, weekday evenings.",
  job_category: "cleaning",
  public_locality: "Mitte",
  workplace_type: "private_home",
  work_frequency: "recurring",
  cv_required: false,
  interview_english_ok: true,
  source: "employer",
  employer_type: "private",
  employer_display_name: "Ada Lovelace",
  company_name: null,
  website: "https://example.test",
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
};

type Rpc = { data: unknown; error: unknown };

function makeClient(options: {
  user?: { id: string } | null;
  authError?: unknown;
  match?: Rpc;
  publicVacancy?: Rpc;
  languages?: Rpc;
  application?: { data: unknown; error: unknown };
}) {
  const rpc = vi.fn().mockImplementation((fn: string) => {
    if (fn === "resolve_current_candidate_vacancy_match") {
      return Promise.resolve(
        options.match ?? {
          data: [
            {
              status: "unavailable",
              eligible: null,
              missing_requirements: null,
            },
          ],
          error: null,
        },
      );
    }
    if (fn === "get_effective_public_vacancy") {
      return Promise.resolve(
        options.publicVacancy ?? { data: [publicRow], error: null },
      );
    }
    if (fn === "get_effective_public_vacancy_languages") {
      return Promise.resolve(options.languages ?? { data: [], error: null });
    }
    throw new Error(`unexpected rpc ${fn}`);
  });

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi
          .fn()
          .mockResolvedValue(
            options.application ?? { data: null, error: null },
          ),
      }),
    }),
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options.user === undefined ? { id: "c1" } : options.user,
        },
        error: options.authError ?? null,
      }),
    },
    rpc,
    from,
  } as never;
}

describe("loadCurrentCandidateVacancyDetail", () => {
  it("returns unauthenticated when there is no session", async () => {
    const client = makeClient({ user: null });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "unauthenticated" });
  });

  it("returns unavailable for a malformed UUID without calling any RPC", async () => {
    const client = makeClient({});
    const result = await loadCurrentCandidateVacancyDetail(
      client,
      "not-a-uuid",
    );
    expect(result).toEqual({ status: "unavailable" });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("returns unavailable when the match RPC says unavailable", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "unavailable", eligible: null, missing_requirements: null },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns incomplete when the match RPC says incomplete", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "incomplete", eligible: null, missing_requirements: null },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "incomplete" });
  });

  it("returns ready with eligible=true and empty missing requirements", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "eligible", eligible: true, missing_requirements: [] },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.eligible).toBe(true);
    expect(result.missingRequirements).toEqual([]);
    expect(result.vacancy.vacancyId).toBe(vacancyId);
    expect(result.application).toBeNull();
  });

  it("returns ready with eligible=false and ordered missing requirements", async () => {
    const client = makeClient({
      match: {
        data: [
          {
            status: "ineligible",
            eligible: false,
            missing_requirements: ["category", "german"],
          },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.eligible).toBe(false);
    expect(result.missingRequirements).toEqual(["category", "german"]);
  });

  it("returns unavailable when the public vacancy RPC is inconsistent (zero rows)", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "eligible", eligible: true, missing_requirements: [] },
        ],
        error: null,
      },
      publicVacancy: { data: [], error: null },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns failure on a malformed match status", async () => {
    const client = makeClient({
      match: {
        data: [
          {
            status: "not-a-status",
            eligible: null,
            missing_requirements: null,
          },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns failure on a malformed missing-requirement code", async () => {
    const client = makeClient({
      match: {
        data: [
          {
            status: "ineligible",
            eligible: false,
            missing_requirements: ["not_a_code"],
          },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns failure on a duplicate missing-requirement code", async () => {
    const client = makeClient({
      match: {
        data: [
          {
            status: "ineligible",
            eligible: false,
            missing_requirements: ["category", "category"],
          },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns failure on a match RPC transport error", async () => {
    const client = makeClient({
      match: { data: null, error: { message: "boom" } },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns failure on a language RPC transport error", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "eligible", eligible: true, missing_requirements: [] },
        ],
        error: null,
      },
      languages: { data: null, error: { message: "boom" } },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns ready with zero language rows treated as no requirements", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "eligible", eligible: true, missing_requirements: [] },
        ],
        error: null,
      },
      languages: { data: [], error: null },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.languages).toEqual([]);
  });

  it("returns ready with the owned application when already applied", async () => {
    const client = makeClient({
      match: {
        data: [
          { status: "eligible", eligible: true, missing_requirements: [] },
        ],
        error: null,
      },
      application: {
        data: {
          id: "22222222-2222-4222-8222-222222222222",
          vacancy_id: vacancyId,
          status: "submitted",
          submitted_at: "2026-08-01T00:00:00Z",
        },
        error: null,
      },
    });
    const result = await loadCurrentCandidateVacancyDetail(client, vacancyId);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.application).toEqual({
      applicationId: "22222222-2222-4222-8222-222222222222",
      vacancyId,
      status: "submitted",
      submittedAt: "2026-08-01T00:00:00Z",
    });
  });
});

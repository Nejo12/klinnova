import { describe, expect, it, vi } from "vitest";

import { loadCurrentCandidateMatchesPage } from "@/lib/matching/load-current-candidate-matches-page";

const vacancyId = "11111111-1111-4111-8111-111111111111";

const matchRow = {
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
  eligible: true,
  missing_requirements: [],
};

function makeClient(options: {
  user?: { id: string } | null;
  authError?: unknown;
  profile?: { data: unknown; error: unknown };
  rpc?: { data: unknown; error: unknown };
  applications?: { data: unknown; error: unknown };
}) {
  const rpc = vi
    .fn()
    .mockResolvedValue(options.rpc ?? { data: [matchRow], error: null });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "candidate_profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(
              options.profile ?? {
                data: { onboarding_completed_at: "2026-08-01T00:00:00Z" },
                error: null,
              },
            ),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        in: vi
          .fn()
          .mockResolvedValue(options.applications ?? { data: [], error: null }),
      }),
    };
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

describe("loadCurrentCandidateMatchesPage", () => {
  it("returns unauthenticated when there is no session, without calling the list RPC", async () => {
    const client = makeClient({ user: null });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({ status: "unauthenticated" });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("returns profile_missing without calling the list RPC", async () => {
    const client = makeClient({ profile: { data: null, error: null } });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({ status: "profile_missing" });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("returns incomplete without calling the list RPC", async () => {
    const client = makeClient({
      profile: { data: { onboarding_completed_at: null }, error: null },
    });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({ status: "incomplete" });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("returns failure when the completion guard fails, without calling the list RPC", async () => {
    const client = makeClient({
      profile: { data: null, error: { message: "boom" } },
    });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({ status: "failure" });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("returns failure when the list RPC fails for a complete candidate", async () => {
    const client = makeClient({
      rpc: { data: null, error: { message: "boom" } },
    });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns success with an empty list and no applications lookup for a complete candidate with zero matches", async () => {
    const client = makeClient({ rpc: { data: [], error: null } });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({
      status: "success",
      vacancies: [],
      applicationsByVacancyId: new Map(),
    });
  });

  it("calls the list RPC only for a complete candidate and returns vacancies with an empty applications map", async () => {
    const client = makeClient({});
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).toHaveBeenCalledWith("list_current_candidate_vacancy_matches");
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.vacancies).toHaveLength(1);
    expect(result.vacancies[0]?.vacancyId).toBe(vacancyId);
    expect(result.applicationsByVacancyId.size).toBe(0);
  });

  it("returns failure when the applications lookup errors", async () => {
    const client = makeClient({
      applications: { data: null, error: { message: "boom" } },
    });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result).toEqual({ status: "failure" });
  });

  it("returns success with the owned application mapped by vacancy id", async () => {
    const client = makeClient({
      applications: {
        data: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            vacancy_id: vacancyId,
            status: "submitted",
            submitted_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      },
    });
    const result = await loadCurrentCandidateMatchesPage(client);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.applicationsByVacancyId.get(vacancyId)).toEqual({
      applicationId: "22222222-2222-4222-8222-222222222222",
      vacancyId,
      status: "submitted",
      submittedAt: "2026-08-01T00:00:00Z",
    });
  });
});

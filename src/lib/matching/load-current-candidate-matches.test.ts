import { describe, expect, it, vi } from "vitest";

import { loadCurrentCandidateMatches } from "@/lib/matching/load-current-candidate-matches";

const eligibleRow = {
  vacancy_id: "11111111-1111-4111-8111-111111111111",
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

const secondRow = {
  ...eligibleRow,
  vacancy_id: "22222222-2222-4222-8222-222222222204",
  title: "Warehouse picker",
  source: "seed",
  employer_type: null,
  description: null,
};

function makeClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { rpc } as never;
}

describe("loadCurrentCandidateMatches", () => {
  it("calls list_current_candidate_vacancy_matches with no arguments", async () => {
    const client = makeClient({ data: [eligibleRow], error: null });
    await loadCurrentCandidateMatches(client);
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).toHaveBeenCalledWith("list_current_candidate_vacancy_matches");
  });

  it("preserves RPC order exactly, without re-sorting", async () => {
    const client = makeClient({
      data: [secondRow, eligibleRow],
      error: null,
    });
    const result = await loadCurrentCandidateMatches(client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancies.map((v) => v.vacancyId)).toEqual([
      secondRow.vacancy_id,
      eligibleRow.vacancy_id,
    ]);
  });

  it("maps runtime-nullable seed fields without throwing", async () => {
    const client = makeClient({ data: [secondRow], error: null });
    const result = await loadCurrentCandidateMatches(client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancies[0]?.description).toBeNull();
    expect(result.vacancies[0]?.source).toBe("seed");
  });

  it("returns an empty list for zero rows", async () => {
    const client = makeClient({ data: [], error: null });
    const result = await loadCurrentCandidateMatches(client);
    expect(result).toEqual({ ok: true, vacancies: [] });
  });

  it("fails safely on a transport error", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    const result = await loadCurrentCandidateMatches(client);
    expect(result).toEqual({ ok: false });
  });

  it("fails safely on a malformed whole response", async () => {
    const client = makeClient({ data: { not: "an array" }, error: null });
    const result = await loadCurrentCandidateMatches(client);
    expect(result).toEqual({ ok: false });
  });

  it("fails the complete list when one row is malformed (eligible=false)", async () => {
    const malformed = { ...eligibleRow, eligible: false };
    const client = makeClient({
      data: [eligibleRow, malformed],
      error: null,
    });
    const result = await loadCurrentCandidateMatches(client);
    expect(result).toEqual({ ok: false });
  });

  it("fails the complete list when one row has non-empty missing_requirements", async () => {
    const malformed = { ...eligibleRow, missing_requirements: ["category"] };
    const client = makeClient({
      data: [eligibleRow, malformed],
      error: null,
    });
    const result = await loadCurrentCandidateMatches(client);
    expect(result).toEqual({ ok: false });
  });
});

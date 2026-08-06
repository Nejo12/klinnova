import { describe, expect, it, vi } from "vitest";

import { loadPublicVacancies } from "@/lib/public-jobs/load-public-vacancies";

const employerRow = {
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
};

const seedRow = {
  vacancy_id: "22222222-2222-4222-8222-222222222222",
  title: "Warehouse picker",
  description: null,
  job_category: "warehousing",
  public_locality: null,
  workplace_type: null,
  work_frequency: null,
  cv_required: null,
  interview_english_ok: null,
  source: "seed",
  employer_type: null,
  employer_display_name: "Demo Logistics GmbH",
  company_name: "Demo Logistics GmbH",
  website: null,
  published_at: "2026-08-01T00:00:00Z",
  expires_at: "2026-09-01T00:00:00Z",
};

function makeClient(
  listResult: { data: unknown; error: unknown },
  langBySource?: (id: string) => { data: unknown; error: unknown },
) {
  const rpc = vi
    .fn()
    .mockImplementation((fn: string, args?: { p_vacancy_id: string }) => {
      if (fn === "list_effective_public_vacancies") {
        return Promise.resolve(listResult);
      }
      if (fn === "get_effective_public_vacancy_languages") {
        return Promise.resolve(
          langBySource?.(args?.p_vacancy_id ?? "") ?? { data: [], error: null },
        );
      }
      throw new Error(`unexpected rpc ${fn}`);
    });
  return { rpc } as never;
}

describe("loadPublicVacancies", () => {
  it("calls list_effective_public_vacancies with no arguments and preserves order", async () => {
    const client = makeClient({ data: [employerRow, seedRow], error: null });
    const result = await loadPublicVacancies(client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancies.map((v) => v.vacancy.vacancyId)).toEqual([
      employerRow.vacancy_id,
      seedRow.vacancy_id,
    ]);
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).toHaveBeenCalledWith("list_effective_public_vacancies");
  });

  it("loads languages per vacancy through the narrow language RPC", async () => {
    const client = makeClient({ data: [employerRow], error: null }, () => ({
      data: [{ language_code: "en", min_proficiency: "basic" }],
      error: null,
    }));
    const result = await loadPublicVacancies(client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancies[0]?.languages).toEqual([
      { languageCode: "en", minProficiency: "basic" },
    ]);
  });

  it("maps a runtime-nullable seed row without throwing", async () => {
    const client = makeClient({ data: [seedRow], error: null });
    const result = await loadPublicVacancies(client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancies[0]?.vacancy.description).toBeNull();
    expect(result.vacancies[0]?.vacancy.source).toBe("seed");
  });

  it("drops one malformed row without failing the whole list", async () => {
    const malformed = { ...employerRow, vacancy_id: "not-a-uuid" };
    const client = makeClient({ data: [malformed, seedRow], error: null });
    const result = await loadPublicVacancies(client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vacancies).toHaveLength(1);
    expect(result.vacancies[0]?.vacancy.vacancyId).toBe(seedRow.vacancy_id);
  });

  it("returns empty list for zero rows", async () => {
    const client = makeClient({ data: [], error: null });
    const result = await loadPublicVacancies(client);
    expect(result).toEqual({ ok: true, vacancies: [] });
  });

  it("maps a transport error to ok:false", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    const result = await loadPublicVacancies(client);
    expect(result).toEqual({ ok: false });
  });

  it("maps a non-array RPC payload to ok:false", async () => {
    const client = makeClient({ data: { not: "an array" }, error: null });
    const result = await loadPublicVacancies(client);
    expect(result).toEqual({ ok: false });
  });
});

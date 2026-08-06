import { describe, expect, it, vi } from "vitest";

import { loadPublicVacancyDetail } from "@/lib/public-jobs/load-public-vacancy-detail";

const row = {
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

function makeClient(
  detailResult: { data: unknown; error: unknown },
  langResult: { data: unknown; error: unknown } = { data: [], error: null },
) {
  const rpc = vi.fn().mockImplementation((fn: string) => {
    if (fn === "get_effective_public_vacancy")
      return Promise.resolve(detailResult);
    if (fn === "get_effective_public_vacancy_languages")
      return Promise.resolve(langResult);
    throw new Error(`unexpected rpc ${fn}`);
  });
  return { rpc } as never;
}

describe("loadPublicVacancyDetail", () => {
  it("returns not_found for a malformed UUID without calling the RPC", async () => {
    const client = makeClient({ data: [], error: null });
    const result = await loadPublicVacancyDetail(client, "not-a-uuid");
    expect(result).toEqual({ status: "not_found" });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("returns not_found for zero RPC rows (unknown id / draft / paused / expired / unverified / etc.)", async () => {
    const client = makeClient({ data: [], error: null });
    const result = await loadPublicVacancyDetail(client, row.vacancy_id);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns ready with vacancy and languages for a valid effective-public vacancy", async () => {
    const client = makeClient(
      { data: [row], error: null },
      {
        data: [{ language_code: "en", min_proficiency: "basic" }],
        error: null,
      },
    );
    const result = await loadPublicVacancyDetail(client, row.vacancy_id);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.vacancy.vacancyId).toBe(row.vacancy_id);
    expect(result.languages).toEqual([
      { languageCode: "en", minProficiency: "basic" },
    ]);
  });

  it("returns not_found for a malformed detail row", async () => {
    const client = makeClient({
      data: [{ ...row, vacancy_id: "not-a-uuid" }],
      error: null,
    });
    const result = await loadPublicVacancyDetail(client, row.vacancy_id);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns failure for a transport error", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    const result = await loadPublicVacancyDetail(client, row.vacancy_id);
    expect(result).toEqual({ status: "failure" });
  });

  it("treats zero language rows as a normal empty requirement list, not not_found", async () => {
    const client = makeClient(
      { data: [row], error: null },
      { data: [], error: null },
    );
    const result = await loadPublicVacancyDetail(client, row.vacancy_id);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.languages).toEqual([]);
  });
});

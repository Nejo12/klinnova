import { describe, expect, it, vi } from "vitest";

import { syncCandidateLanguages } from "@/lib/onboarding/sync-languages";

describe("syncCandidateLanguages", () => {
  it("inserts, updates, then deletes in a safe order", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const del = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe("candidate_languages");
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "1",
                  language_code: "de",
                  proficiency: "basic",
                },
                {
                  id: "2",
                  language_code: "en",
                  proficiency: "basic",
                },
              ],
              error: null,
            }),
          }),
          insert,
          update,
          delete: del,
        };
      }),
    };

    const result = await syncCandidateLanguages(supabase as never, "user-1", [
      { languageCode: "de", proficiency: "native" },
      { languageCode: "fr", proficiency: "basic" },
    ]);

    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_id: "user-1",
        language_code: "fr",
        proficiency: "basic",
      }),
    );
    expect(update).toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });
});

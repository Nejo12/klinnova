import { describe, expect, it } from "vitest";

import { matchCandidateToVacancies } from "@/lib/matching/match-candidate-to-vacancies";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";

describe("matchCandidateToVacancies — ordering", () => {
  const candidate = makeCandidate({
    jobCategories: ["hospitality"],
    employmentTypes: ["part_time"],
    shiftPreferences: ["flexible"],
    germanComfort: "comfortable",
  });

  it("orders later publication first", () => {
    const earlier = makeVacancy({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "A role",
      publishedAt: "2026-01-01T00:00:00+00:00",
    });
    const later = makeVacancy({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "B role",
      publishedAt: "2026-06-01T00:00:00+00:00",
    });

    const matches = matchCandidateToVacancies(candidate, [earlier, later]);
    expect(matches.map((match) => match.vacancy.id)).toEqual([
      later.id,
      earlier.id,
    ]);
  });

  it("resolves equal publication by title ascending", () => {
    const publishedAt = "2026-06-01T00:00:00+00:00";
    const zebra = makeVacancy({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Zebra",
      publishedAt,
    });
    const apple = makeVacancy({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "Apple",
      publishedAt,
    });

    const matches = matchCandidateToVacancies(candidate, [zebra, apple]);
    expect(matches.map((match) => match.vacancy.title)).toEqual([
      "Apple",
      "Zebra",
    ]);
  });

  it("resolves equal publication and title by id ascending", () => {
    const publishedAt = "2026-06-01T00:00:00+00:00";
    const title = "Same title";
    const higher = makeVacancy({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title,
      publishedAt,
    });
    const lower = makeVacancy({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title,
      publishedAt,
    });

    const matches = matchCandidateToVacancies(candidate, [higher, lower]);
    expect(matches.map((match) => match.vacancy.id)).toEqual([
      lower.id,
      higher.id,
    ]);
  });

  it("does not mutate the input array", () => {
    const first = makeVacancy({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Later",
      publishedAt: "2026-06-01T00:00:00+00:00",
    });
    const second = makeVacancy({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "Earlier",
      publishedAt: "2026-01-01T00:00:00+00:00",
    });
    const input = [second, first];
    const snapshot = [...input];

    matchCandidateToVacancies(candidate, input);
    expect(input).toEqual(snapshot);
  });

  it("produces identical output across repeated runs", () => {
    const vacancies = [
      makeVacancy({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        title: "C",
        publishedAt: "2026-03-01T00:00:00+00:00",
      }),
      makeVacancy({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "A",
        publishedAt: "2026-03-01T00:00:00+00:00",
      }),
      makeVacancy({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "B",
        publishedAt: "2026-04-01T00:00:00+00:00",
      }),
    ];

    const first = matchCandidateToVacancies(candidate, vacancies);
    const second = matchCandidateToVacancies(candidate, vacancies);
    expect(second).toEqual(first);
  });

  it("returns empty success list when nothing matches", () => {
    expect(
      matchCandidateToVacancies(makeCandidate({ jobCategories: ["moving"] }), [
        makeVacancy({ jobCategory: "hospitality" }),
      ]),
    ).toEqual([]);
  });
});

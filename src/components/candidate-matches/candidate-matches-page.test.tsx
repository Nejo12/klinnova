import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateMatchesPage } from "@/components/candidate-matches/candidate-matches-page";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";
import type { CandidateMatch, MatchReason } from "@/lib/matching/types";

function buildMatch(
  overrides: Parameters<typeof makeVacancy>[0] = {},
  reasonOverrides?: MatchReason[],
): CandidateMatch {
  const match = matchCandidateToVacancy(
    makeCandidate({
      shiftPreferences: ["flexible"],
      germanComfort: "comfortable",
      languages: [
        { languageCode: "en", proficiency: "native" },
        { languageCode: "ar", proficiency: "native" },
      ],
    }),
    makeVacancy({
      title: "Demo vacancy — Morning kitchen support",
      company: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Demo Berlin Work Co",
        slug: "demo-berlin-work-co",
      },
      summary: "Fictional demo hospitality role.",
      availableFrom: null,
      languageRequirements: [{ languageCode: "en", minProficiency: "basic" }],
      ...overrides,
    }),
  );
  if (match === null) {
    throw new Error("Expected fixture match");
  }
  if (reasonOverrides !== undefined) {
    return { ...match, reasons: reasonOverrides };
  }
  return match;
}

describe("CandidateMatchesPage", () => {
  it("renders success matches with labels, demo label, and capped reasons", () => {
    const sevenReasons: MatchReason[] = [
      { code: "category_match", category: "hospitality" },
      { code: "employment_type_match", employmentTypes: ["part_time"] },
      { code: "shift_match", viaFlexible: true },
      { code: "german_requirement_met", germanRequirement: "basic" },
      { code: "additional_languages_met", languageCodes: ["en"] },
      { code: "availability_match", kind: "flexible_start" },
      { code: "berlin_job", city: "Berlin" },
    ];
    const match = buildMatch({}, sevenReasons);

    render(<CandidateMatchesPage status="success" matches={[match]} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Jobs that match your preferences",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(WORK_AUTHORISATION_NOTICE)).toBeInTheDocument();
    expect(screen.getByText("1 matching job")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Demo vacancy — Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Demo vacancy")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.getByText("Part time")).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Basic German")).toBeInTheDocument();
    expect(screen.getByText("Flexible start")).toBeInTheDocument();
    expect(
      screen.getByText("Fictional demo hospitality role."),
    ).toBeInTheDocument();

    const reasonList = screen.getByRole("list", {
      name: /Why this matches/i,
    });
    const reasons = within(reasonList).getAllByRole("listitem");
    expect(reasons).toHaveLength(4);
    expect(reasons[0]).toHaveTextContent(/hospitality preference/i);
    expect(screen.queryByText("category_match")).toBeNull();
    expect(
      screen.getByRole("link", {
        name: "View job: Demo vacancy — Morning kitchen support",
      }),
    ).toHaveAttribute("href", `/candidate/jobs/${match.vacancy.id}`);
    expect(
      screen.queryByRole("link", { name: /apply|submit|save/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /apply|save/i })).toBeNull();
    expect(screen.queryByText(/\d+\s*%|match score|perfect match/i)).toBeNull();
  });

  it("renders fixed available-from copy and plural count", () => {
    const first = buildMatch({
      id: "22222222-2222-4222-8222-222222222201",
      availableFrom: "2026-09-01",
    });
    const second = buildMatch({
      id: "22222222-2222-4222-8222-222222222202",
      title: "Demo vacancy — Second role",
      availableFrom: "2026-10-01",
    });

    render(<CandidateMatchesPage status="success" matches={[first, second]} />);

    expect(screen.getByText("2 matching jobs")).toBeInTheDocument();
    expect(screen.getByText("From 1 September 2026")).toBeInTheDocument();
  });

  it("renders empty state distinctly from failure", () => {
    const { rerender } = render(
      <CandidateMatchesPage status="success" matches={[]} />,
    );

    expect(
      screen.getByRole("heading", {
        name: /No jobs match all of your saved preferences/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Review your saved preferences/i }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=review");
    expect(screen.queryByText(/could not load/i)).toBeNull();

    rerender(<CandidateMatchesPage status="failure" />);
    expect(
      screen.getByRole("heading", { name: /could not load your matches/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/try again later/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Back to candidate home/i }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "Stint" })).toHaveAttribute(
      "href",
      "/",
    );
    const failureLinks = screen.getAllByRole("link");
    expect(
      failureLinks.every((link) => link.getAttribute("href") !== "/candidate"),
    ).toBe(true);
    expect(
      screen.getByRole("link", { name: /Review saved preferences/i }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=review");
    expect(
      screen.getByRole("button", { name: /Log out/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No jobs match/i)).toBeNull();
    expect(screen.queryByText(/supabase|invariant|sql|uuid/i)).toBeNull();
  });

  it("uses positive intro copy without score or ranking language", () => {
    render(<CandidateMatchesPage status="success" matches={[buildMatch()]} />);

    expect(
      screen.getByText(
        "These jobs match all of the preferences currently saved in your profile.",
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(
      /\b(score|ranking|ranked|AI)\b/i,
    );
  });

  it("uses a semantic match list with one accessible detail link per card", () => {
    const match = buildMatch();
    render(<CandidateMatchesPage status="success" matches={[match]} />);

    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThanOrEqual(1);
    const card = screen.getByRole("article");
    const detailLink = within(card).getByRole("link", {
      name: `View job: ${match.vacancy.title}`,
    });
    expect(detailLink).toHaveAttribute(
      "href",
      `/candidate/jobs/${match.vacancy.id}`,
    );
    expect(detailLink).toHaveTextContent("View job");
    expect(within(card).queryAllByRole("link")).toHaveLength(1);
    expect(within(card).queryByRole("button")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  groupVacancies,
  VacancyList,
} from "@/components/employer-vacancies/vacancy-list";
import type { EmployerDraftListItem } from "@/lib/employer/vacancies/load-employer-drafts";
import { VACANCY_EMPTY_LIST } from "@/lib/employer/vacancies/messages";

function buildDraft(
  overrides: Partial<EmployerDraftListItem> = {},
): EmployerDraftListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Glasreiniger",
    jobCategory: "cleaning",
    publicLocality: "Mitte",
    employerType: "private",
    companyName: null,
    publicationState: "draft",
    expiresAt: null,
    isEffectivelyExpired: false,
    updatedAt: "2026-08-15T00:00:00Z",
    ready: false,
    checklist: [],
    pausedAt: null,
    filledAt: null,
    withdrawnAt: null,
    expiredAt: null,
    ...overrides,
  };
}

describe("groupVacancies", () => {
  it("puts published and paused in Live, everything else in Not live", () => {
    const published = buildDraft({ id: "a", publicationState: "published" });
    const paused = buildDraft({ id: "b", publicationState: "paused" });
    const draft = buildDraft({ id: "c", publicationState: "draft" });
    const filled = buildDraft({ id: "d", publicationState: "filled" });
    const expired = buildDraft({ id: "e", publicationState: "expired" });
    const withdrawn = buildDraft({ id: "f", publicationState: "withdrawn" });

    const result = groupVacancies([
      published,
      paused,
      draft,
      filled,
      expired,
      withdrawn,
    ]);

    expect(result.live.map((d) => d.id)).toEqual(["a", "b"]);
    expect(result.notLive.map((d) => d.id)).toEqual(["c", "d", "e", "f"]);
  });

  it("never re-sorts within a group", () => {
    const a = buildDraft({ id: "a", publicationState: "published" });
    const b = buildDraft({ id: "b", publicationState: "paused" });
    expect(groupVacancies([b, a]).live.map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("VacancyList", () => {
  it("shows an empty-state message when there are no vacancies", () => {
    render(<VacancyList drafts={[]} />);
    expect(screen.getByText(VACANCY_EMPTY_LIST)).toBeInTheDocument();
  });

  it("renders the two group headings with their own counts", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({ id: "a", publicationState: "published" }),
          buildDraft({ id: "b", publicationState: "draft" }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Live (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Not live (1)" }),
    ).toBeInTheDocument();
  });

  it("renders no list under a group with zero rows", () => {
    render(
      <VacancyList
        drafts={[buildDraft({ id: "a", publicationState: "draft" })]}
      />,
    );

    const liveHeading = screen.getByRole("heading", {
      level: 2,
      name: "Live (0)",
    });
    expect(liveHeading.parentElement?.querySelector("ul")).toBeNull();
  });

  it("renders a Manage link to the detail route for every row", () => {
    render(
      <VacancyList
        drafts={[buildDraft({ id: "22222222-2222-4222-8222-222222222222" })]}
      />,
    );
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute(
      "href",
      "/employer/vacancies/22222222-2222-4222-8222-222222222222",
    );
  });

  it("never renders a per-vacancy application count", () => {
    render(
      <VacancyList drafts={[buildDraft({ publicationState: "published" })]} />,
    );
    expect(screen.queryByText(/\d+ application/i)).toBeNull();
    expect(screen.queryByText(/\d+ new/i)).toBeNull();
  });

  it("shows no consequence sentence for a published vacancy", () => {
    render(
      <VacancyList drafts={[buildDraft({ publicationState: "published" })]} />,
    );
    // Only the meta list's "Status: Published" line should mention the word.
    expect(screen.getAllByText(/Published/)).toHaveLength(1);
  });

  it("shows the paused consequence sentence", () => {
    render(
      <VacancyList drafts={[buildDraft({ publicationState: "paused" })]} />,
    );
    expect(
      screen.getByText(
        "Not visible to candidates. Existing applications stay open.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the filled consequence sentence using filled_at", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "filled",
            filledAt: "2026-08-10T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("You marked this filled on 10 Aug 2026."),
    ).toBeInTheDocument();
  });

  it("falls back to a dateless filled sentence when filled_at is missing", () => {
    render(
      <VacancyList
        drafts={[buildDraft({ publicationState: "filled", filledAt: null })]}
      />,
    );
    expect(
      screen.getByText("Marked filled. No further action is available."),
    ).toBeInTheDocument();
  });

  it("shows the expired consequence sentence using expired_at", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "expired",
            expiredAt: "2026-08-12T00:00:00Z",
            expiresAt: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("Ran out on 12 Aug 2026 without being filled."),
    ).toBeInTheDocument();
  });

  it("falls back to expires_at when an expired row has no expired_at yet", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "expired",
            expiredAt: null,
            expiresAt: "2026-08-01T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("Ran out on 1 Aug 2026 without being filled."),
    ).toBeInTheDocument();
  });

  it("shows the withdrawn consequence sentence, verified against the real withdraw transition", () => {
    render(
      <VacancyList drafts={[buildDraft({ publicationState: "withdrawn" })]} />,
    );
    // `withdraw` (like `pause`) only ever updates the `vacancies` row in
    // `_transition_employer_vacancy` — it never touches `applications` —
    // so this sentence must not claim applications were withdrawn/removed.
    expect(
      screen.getByText(
        "Not visible to candidates. Existing applications are preserved. No further action is available.",
      ),
    ).toBeInTheDocument();
  });

  it("derives the draft consequence sentence from the real readiness checklist", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "draft",
            ready: false,
            checklist: [
              { id: "salary", label: "Salary (EUR gross)", complete: false },
              {
                id: "work_frequency",
                label: "Work frequency",
                complete: false,
              },
              { id: "title", label: "Title", complete: true },
            ],
          }),
        ]}
      />,
    );
    expect(
      screen.getByText(
        "Salary (EUR gross) and Work frequency still needed before publishing.",
      ),
    ).toBeInTheDocument();
  });

  it("falls back to a generic draft sentence when readiness is unavailable", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "draft",
            ready: null,
            checklist: [],
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("Missing required details before publishing."),
    ).toBeInTheDocument();
  });

  it("shows a ready-to-publish draft sentence when nothing is missing", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "draft",
            ready: true,
            checklist: [{ id: "title", label: "Title", complete: true }],
          }),
        ]}
      />,
    );
    expect(screen.getByText("Ready to publish.")).toBeInTheDocument();
  });
});

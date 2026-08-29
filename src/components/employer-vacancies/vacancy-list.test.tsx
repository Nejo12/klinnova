import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  draftConsequence,
  formatVacancyDate,
  groupVacancies,
  summarizeMissingLabels,
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
    expect(groupVacancies([b, a]).live.map((item) => item.id)).toEqual([
      "b",
      "a",
    ]);

    const draft = buildDraft({ id: "c", publicationState: "draft" });
    const filled = buildDraft({ id: "d", publicationState: "filled" });
    const expired = buildDraft({ id: "e", publicationState: "expired" });
    expect(
      groupVacancies([expired, filled, draft]).notLive.map((item) => item.id),
    ).toEqual(["e", "d", "c"]);
  });
});

describe("VacancyList", () => {
  it("shows an empty-state message when there are no vacancies", () => {
    render(<VacancyList drafts={[]} />);
    expect(screen.getByText(VACANCY_EMPTY_LIST)).toBeInTheDocument();
  });

  it("shows the generic empty state (not verification copy) when verified with no vacancies", () => {
    render(<VacancyList drafts={[]} verificationState="verified" />);
    expect(screen.getByText(VACANCY_EMPTY_LIST)).toBeInTheDocument();
    expect(
      screen.queryByText("Verification not finished"),
    ).not.toBeInTheDocument();
  });

  it("shows the verification-not-finished empty state when unverified with no vacancies", () => {
    render(<VacancyList drafts={[]} verificationState="unverified" />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verification not finished",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You can prepare and save vacancies now. Publishing opens once your company is verified.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue verification" }),
    ).toHaveAttribute("href", "/employer/verification");
    expect(screen.queryByText(VACANCY_EMPTY_LIST)).not.toBeInTheDocument();
  });

  it("shows the verification-not-finished empty state for pending/rejected/revoked, not only unverified", () => {
    render(<VacancyList drafts={[]} verificationState="pending" />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Verification not finished",
      }),
    ).toBeInTheDocument();
  });

  it("falls back to the generic empty state when verificationState was never loaded", () => {
    render(<VacancyList drafts={[]} />);
    expect(
      screen.queryByText("Verification not finished"),
    ).not.toBeInTheDocument();
  });

  it("never shows the verification empty state once there is at least one vacancy", () => {
    render(
      <VacancyList
        drafts={[buildDraft({ publicationState: "draft" })]}
        verificationState="unverified"
      />,
    );
    expect(
      screen.queryByText("Verification not finished"),
    ).not.toBeInTheDocument();
  });

  it("renders exactly one 'Create draft' link when the vacancy list is empty", () => {
    render(<VacancyList drafts={[]} />);
    expect(screen.getAllByRole("link", { name: "Create draft" })).toHaveLength(
      1,
    );
  });

  it("renders the two group headings with in-memory counts", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({ id: "a", publicationState: "published" }),
          buildDraft({ id: "b", publicationState: "draft" }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Live" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Not live" }),
    ).toBeInTheDocument();
    const liveSection = screen.getByRole("region", { name: "Live" });
    const notLiveSection = screen.getByRole("region", { name: "Not live" });
    expect(within(liveSection).getByText("1")).toBeInTheDocument();
    expect(within(notLiveSection).getByText("1")).toBeInTheDocument();
  });

  it("renders no list under a group with zero rows", () => {
    render(
      <VacancyList
        drafts={[buildDraft({ id: "a", publicationState: "draft" })]}
      />,
    );

    const liveHeading = screen.getByRole("heading", {
      level: 2,
      name: "Live",
    });
    expect(liveHeading.closest("section")?.querySelector("ul")).toBeNull();
  });

  it("keeps source order inside Live and Not live in the rendered list", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            id: "paused-first",
            title: "Paused first",
            publicationState: "paused",
          }),
          buildDraft({
            id: "published-second",
            title: "Published second",
            publicationState: "published",
          }),
          buildDraft({
            id: "withdrawn-first",
            title: "Withdrawn first",
            publicationState: "withdrawn",
          }),
          buildDraft({
            id: "draft-second",
            title: "Draft second",
            publicationState: "draft",
          }),
        ]}
      />,
    );

    const liveTitles = within(screen.getByRole("region", { name: "Live" }))
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    const notLiveTitles = within(
      screen.getByRole("region", { name: "Not live" }),
    )
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(liveTitles).toEqual(["Paused first", "Published second"]);
    expect(notLiveTitles).toEqual(["Withdrawn first", "Draft second"]);
  });

  it("renders a Manage link to the detail route for every row", () => {
    render(
      <VacancyList
        drafts={[buildDraft({ id: "22222222-2222-4222-8222-222222222222" })]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Manage Glasreiniger" }),
    ).toHaveAttribute(
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
    expect(screen.getAllByText(/^Published$/)).toHaveLength(1);
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

  it("uses the existing truncation discipline for many missing readiness items", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "draft",
            ready: false,
            checklist: [
              { id: "a", label: "Title", complete: false },
              { id: "b", label: "Job category", complete: false },
              { id: "c", label: "Description", complete: false },
              { id: "d", label: "Salary (EUR gross)", complete: false },
            ],
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("4 required details missing before publishing."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText("Office Cleaner")).toBeNull();
    expect(screen.queryByText("Applications 8")).toBeNull();
  });

  it("shows a published row with expiry, next action, and Manage — not a fake application count", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            title: "Glasreiniger",
            publicationState: "published",
            publicLocality: "Mitte",
            expiresAt: "2026-09-15T00:00:00Z",
            isEffectivelyExpired: false,
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Glasreiniger" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cleaning · Mitte · Private")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Expires 15 Sept 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Next: Pause, mark filled, or withdraw"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Manage Glasreiniger" }),
    ).toHaveAttribute(
      "href",
      "/employer/vacancies/11111111-1111-4111-8111-111111111111",
    );
    expect(screen.queryByText(/Applications/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Delete/ })).toBeNull();
  });

  it("does not show Expires for a published vacancy that is effectively expired", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            publicationState: "published",
            expiresAt: "2026-01-01T00:00:00Z",
            isEffectivelyExpired: true,
          }),
        ]}
      />,
    );
    expect(
      screen.getByText("Published — effectively expired"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Expires/)).toBeNull();
    expect(
      screen.getByText("Next: Refresh expired status or renew"),
    ).toBeInTheDocument();
  });

  it("does not show Expires for paused, draft, filled, expired, or withdrawn rows", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            id: "paused",
            publicationState: "paused",
            expiresAt: "2026-09-15T00:00:00Z",
          }),
          buildDraft({
            id: "draft",
            publicationState: "draft",
            expiresAt: "2026-09-15T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(screen.queryByText(/Expires/)).toBeNull();
  });

  it("keeps paused under Live with the verified not-visible consequence and Edit", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            title: "Kitchen Assistant",
            publicationState: "paused",
          }),
        ]}
      />,
    );

    expect(
      within(screen.getByRole("region", { name: "Live" })).getByText(
        "Kitchen Assistant",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Not visible to candidates. Existing applications stay open.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Next: Resume, mark filled, or withdraw"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Edit Kitchen Assistant" }),
    ).toHaveAttribute(
      "href",
      "/employer/vacancies/11111111-1111-4111-8111-111111111111/edit",
    );
  });

  it("shows Edit and Delete only for drafts, and keeps drafts under Not live", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            title: "Warehouse Helper",
            publicationState: "draft",
            checklist: [{ id: "title", label: "Title", complete: true }],
          }),
        ]}
      />,
    );

    expect(
      within(screen.getByRole("region", { name: "Not live" })).getByText(
        "Warehouse Helper",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Private draft")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Delete Warehouse Helper" }),
    ).toHaveAttribute(
      "href",
      "/employer/vacancies/11111111-1111-4111-8111-111111111111#delete-draft",
    );
  });

  it("shows filled, expired, and withdrawn with truthful actions", () => {
    render(
      <VacancyList
        drafts={[
          buildDraft({
            id: "filled",
            title: "Filled role",
            publicationState: "filled",
            filledAt: "2026-08-10T00:00:00Z",
          }),
          buildDraft({
            id: "expired",
            title: "Expired role",
            publicationState: "expired",
            expiredAt: "2026-08-12T00:00:00Z",
          }),
          buildDraft({
            id: "withdrawn",
            title: "Withdrawn role",
            publicationState: "withdrawn",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Filled")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
    expect(screen.getByText("Next: Renew to draft")).toBeInTheDocument();
    expect(screen.getAllByText("Next: No action available")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /Edit Filled/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Delete Filled/ })).toBeNull();
  });
});

describe("formatVacancyDate", () => {
  it("formats UTC midnights in Europe/Berlin without depending on the server timezone", () => {
    expect(formatVacancyDate("2026-08-10T00:00:00Z")).toBe("10 Aug 2026");
    expect(formatVacancyDate("2026-01-01T00:00:00Z")).toBe("1 Jan 2026");
  });

  it("returns null for missing or invalid values", () => {
    expect(formatVacancyDate(null)).toBeNull();
    expect(formatVacancyDate("not-a-date")).toBeNull();
  });
});

describe("summarizeMissingLabels", () => {
  it("names one, two, or three labels and falls back to a count after that", () => {
    expect(summarizeMissingLabels(["Title"])).toBe("Title");
    expect(summarizeMissingLabels(["Title", "Salary (EUR gross)"])).toBe(
      "Title and Salary (EUR gross)",
    );
    expect(summarizeMissingLabels(["A", "B", "C"])).toBe("A, B, and C");
    expect(summarizeMissingLabels(["A", "B", "C", "D"])).toBe(
      "4 required details",
    );
  });
});

describe("draftConsequence", () => {
  it("uses a single missing field label", () => {
    expect(
      draftConsequence({
        checklist: [
          { id: "salary", label: "Salary (EUR gross)", complete: false },
        ],
      }),
    ).toBe("Salary (EUR gross) still needed before publishing.");
  });
});

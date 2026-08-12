import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateMatchesPage } from "@/components/candidate-matches/candidate-matches-page";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

function buildVacancy(overrides: Partial<PublicVacancy> = {}): PublicVacancy {
  return {
    vacancyId: "11111111-1111-4111-8111-111111111111",
    title: "Demo vacancy — Morning kitchen support",
    description: "Fictional demo hospitality role.",
    jobCategory: "hospitality",
    publicLocality: "Mitte",
    workplaceType: "shop",
    workFrequency: "recurring",
    cvRequired: false,
    interviewEnglishOk: true,
    source: "seed",
    employerDisplayName: "Demo Berlin Work Co",
    companyName: null,
    website: null,
    expiresAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("CandidateMatchesPage", () => {
  it("renders success vacancies with labels, demo label, and no match-reason copy", () => {
    const vacancy = buildVacancy();

    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[vacancy]}
        applicationsByVacancyId={new Map()}
      />,
    );

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
    expect(screen.getByText("Mitte, Berlin")).toBeInTheDocument();
    expect(
      screen.getByText("Fictional demo hospitality role."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/why this matches/i)).toBeNull();
    expect(
      screen.getByRole("link", {
        name: "View job: Demo vacancy — Morning kitchen support",
      }),
    ).toHaveAttribute("href", `/candidate/jobs/${vacancy.vacancyId}`);
    expect(
      screen.queryByRole("link", { name: /apply|submit|save/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /apply|save/i })).toBeNull();
    expect(screen.queryByText(/\d+\s*%|match score|perfect match/i)).toBeNull();
  });

  it("renders plural count for multiple vacancies", () => {
    const first = buildVacancy();
    const second = buildVacancy({
      vacancyId: "22222222-2222-4222-8222-222222222202",
      title: "Demo vacancy — Second role",
    });

    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[first, second]}
        applicationsByVacancyId={new Map()}
      />,
    );

    expect(screen.getByText("2 matching jobs")).toBeInTheDocument();
  });

  it("renders empty state distinctly from failure", () => {
    const { rerender } = render(
      <CandidateMatchesPage
        status="success"
        vacancies={[]}
        applicationsByVacancyId={new Map()}
      />,
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
    expect(screen.getByRole("link", { name: "Klinnova" })).toHaveAttribute(
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
    // M5.1 Unit B: sign-out is no longer a header action on this page —
    // it now lives exclusively on /candidate/account, so it must not
    // reappear here as an accidental primary-navigation destination.
    expect(
      screen.queryByRole("button", { name: /Log out/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No jobs match/i)).toBeNull();
    expect(screen.queryByText(/supabase|invariant|sql|uuid/i)).toBeNull();
  });

  it("uses positive intro copy without score or ranking language", () => {
    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[buildVacancy()]}
        applicationsByVacancyId={new Map()}
      />,
    );

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
    const vacancy = buildVacancy();
    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[vacancy]}
        applicationsByVacancyId={new Map()}
      />,
    );

    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThanOrEqual(1);
    const card = screen.getByRole("article");
    const detailLink = within(card).getByRole("link", {
      name: `View job: ${vacancy.title}`,
    });
    expect(detailLink).toHaveAttribute(
      "href",
      `/candidate/jobs/${vacancy.vacancyId}`,
    );
    expect(detailLink).toHaveTextContent("View job");
    expect(within(card).queryAllByRole("link")).toHaveLength(1);
    expect(within(card).queryByRole("button")).toBeNull();
  });

  it("shows Applied and View application without nesting controls", () => {
    const vacancy = buildVacancy();
    const applicationId = "33333333-3333-4333-8333-333333333301";
    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[vacancy]}
        applicationsByVacancyId={
          new Map([
            [
              vacancy.vacancyId,
              {
                applicationId,
                vacancyId: vacancy.vacancyId,
                status: "submitted",
                submittedAt: "2026-08-03T14:30:00.000Z",
              },
            ],
          ])
        }
      />,
    );

    const card = screen.getByRole("article");
    expect(within(card).getByText("Applied")).toBeInTheDocument();
    const applicationLink = within(card).getByRole("link", {
      name: `View application: ${vacancy.title}`,
    });
    expect(applicationLink).toHaveAttribute(
      "href",
      `/candidate/applications/${applicationId}`,
    );
    expect(
      within(card).getByRole("link", {
        name: `View job: ${vacancy.title}`,
      }),
    ).toBeInTheDocument();
    expect(within(card).queryAllByRole("link")).toHaveLength(2);
    expect(within(card).queryByText(applicationId)).toBeNull();
  });

  it("links to Account rather than exposing the export link directly (M5.1 Unit B)", () => {
    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[]}
        applicationsByVacancyId={new Map()}
      />,
    );

    const accountLink = screen.getByRole("link", { name: "Account" });
    expect(accountLink).toHaveAttribute("href", "/candidate/account");
    expect(
      screen.queryByRole("link", { name: "Download candidate data" }),
    ).not.toBeInTheDocument();
  });

  it("never claims GDPR compliance or legal completeness for the download link", () => {
    render(
      <CandidateMatchesPage
        status="success"
        vacancies={[]}
        applicationsByVacancyId={new Map()}
      />,
    );

    expect(document.body.textContent ?? "").not.toMatch(
      /gdpr|legally required|fully compliant|right to portability/i,
    );
  });
});

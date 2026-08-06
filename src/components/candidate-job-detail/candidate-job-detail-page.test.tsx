import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/candidate-job-detail/application-submit-form", () => ({
  ApplicationSubmitForm: ({ vacancyId }: { vacancyId: string }) => (
    <div data-testid="application-submit-form">{vacancyId}</div>
  ),
}));

import { CandidateJobDetailPage } from "@/components/candidate-job-detail/candidate-job-detail-page";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";
import type {
  PublicVacancy,
  PublicVacancyLanguage,
} from "@/lib/public-jobs/domain";

const vacancy: PublicVacancy = {
  vacancyId: "22222222-2222-4222-8222-222222222201",
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
};

const languages: PublicVacancyLanguage[] = [
  { languageCode: "en", minProficiency: "conversational" },
];

describe("CandidateJobDetailPage", () => {
  it("renders ready eligible detail with a submission mount point", () => {
    render(
      <CandidateJobDetailPage
        status="ready"
        eligible={true}
        missingRequirements={[]}
        vacancy={vacancy}
        languages={languages}
        application={null}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Demo vacancy — Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Demo vacancy")).toBeInTheDocument();
    expect(screen.getByText(WORK_AUTHORISATION_NOTICE)).toBeInTheDocument();
    expect(screen.getByText("Mitte, Berlin")).toBeInTheDocument();
    expect(screen.getByText("Hospitality")).toBeInTheDocument();
    expect(screen.getByText("English — Conversational")).toBeInTheDocument();
    expect(
      screen.getByText("Fictional demo hospitality role."),
    ).toBeInTheDocument();

    expect(screen.getByTestId("application-submit-form")).toHaveTextContent(
      vacancy.vacancyId,
    );
    expect(screen.queryByText(/you don.t currently meet/i)).toBeNull();

    expect(
      screen.getByRole("link", { name: "Back to matches" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(screen.queryByText(/salary|exact address|cv required/i)).toBeNull();
  });

  it("renders ineligible detail with a labelled missing-requirements list and no submit form", () => {
    render(
      <CandidateJobDetailPage
        status="ready"
        eligible={false}
        missingRequirements={["category", "german"]}
        vacancy={vacancy}
        languages={[]}
        application={null}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /you don.t currently meet these requirements/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Preferred job category")).toBeInTheDocument();
    expect(screen.getByText("German level")).toBeInTheDocument();
    expect(screen.queryByText("category")).toBeNull();
    expect(screen.queryByText("german")).toBeNull();
    expect(screen.queryByTestId("application-submit-form")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Review your saved preferences" }),
    ).toHaveAttribute("href", "/candidate/onboarding?group=review");
  });

  it("renders Applied state and View application instead of submit, even when ineligible", () => {
    render(
      <CandidateJobDetailPage
        status="ready"
        eligible={false}
        missingRequirements={["category"]}
        vacancy={vacancy}
        languages={[]}
        application={{
          applicationId: "33333333-3333-4333-8333-333333333301",
          vacancyId: vacancy.vacancyId,
          status: "submitted",
          submittedAt: "2026-08-03T14:30:00.000Z",
        }}
      />,
    );

    expect(screen.getAllByText("Applied").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", {
        name: `View application: ${vacancy.title}`,
      }),
    ).toHaveAttribute(
      "href",
      "/candidate/applications/33333333-3333-4333-8333-333333333301",
    );
    expect(screen.queryByTestId("application-submit-form")).toBeNull();
    expect(screen.queryByText(/you don.t currently meet/i)).toBeNull();
    expect(
      screen.queryByText("33333333-3333-4333-8333-333333333301"),
    ).toBeNull();
  });

  it("renders unavailable state without protected vacancy data", () => {
    render(<CandidateJobDetailPage status="unavailable" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo Berlin Work Co")).toBeNull();
    expect(screen.queryByTestId("application-submit-form")).toBeNull();
  });

  it("renders failure state without protected vacancy data", () => {
    render(<CandidateJobDetailPage status="failure" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo Berlin Work Co")).toBeNull();
  });
});

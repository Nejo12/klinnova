import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/candidate-job-detail/application-submit-form", () => ({
  ApplicationSubmitForm: ({ vacancyId }: { vacancyId: string }) => (
    <div data-testid="application-submit-form">{vacancyId}</div>
  ),
}));

import { CandidateJobDetailPage } from "@/components/candidate-job-detail/candidate-job-detail-page";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";
import type { ApplicationPreview } from "@/lib/applications/application-preview";
import { NO_ADDITIONAL_LANGUAGE_REQUIREMENTS } from "@/lib/applications/messages";
import type { CandidateVacancyDetail } from "@/lib/matching/candidate-vacancy-detail";

const detail: CandidateVacancyDetail = {
  vacancyId: "22222222-2222-4222-8222-222222222201",
  title: "Demo vacancy — Morning kitchen support",
  employerDisplayName: "Demo Berlin Work Co",
  demoLabel: "Demo vacancy",
  city: "Berlin",
  jobCategoryLabel: "Hospitality",
  employmentTypesLabel: "Mini-job and Part time",
  shiftRequirementsLabel: "Daytime and Morning",
  germanRequirementLabel: "Basic German",
  languageRequirements: [
    {
      languageCode: "en",
      languageLabel: "English",
      minProficiencyLabel: "Conversational",
    },
  ],
  availableFromLabel: "Flexible start",
  listedOnLabel: "15 January 2026",
  matchReasons: [
    {
      key: "category_match",
      text: "Matches your hospitality preference",
    },
    { key: "berlin_job", text: "Based in Berlin" },
  ],
};

const preview: ApplicationPreview = {
  vacancyId: detail.vacancyId,
  vacancyTitle: detail.title,
  employerDisplayName: detail.employerDisplayName,
  candidateDisplayName: "Ada Candidate",
  matchedJobCategoryLabel: "Hospitality",
  germanComfortLabel: "I can understand and use some basic German",
  relevantLanguages: [],
  noAdditionalLanguagesLabel: NO_ADDITIONAL_LANGUAGE_REQUIREMENTS,
  workAuthorisationDeclaredLabel: "Yes",
  availableFromLabel: "4 August 2026",
  employmentPreferencesLabel: "Part time",
  shiftPreferencesLabel: "Morning",
};

describe("CandidateJobDetailPage", () => {
  it("renders ready detail with preview and submission mount point", () => {
    render(
      <CandidateJobDetailPage
        status="ready"
        detail={detail}
        preview={preview}
        application={null}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Demo vacancy — Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Demo Berlin Work Co").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Demo vacancy")).toBeInTheDocument();
    expect(
      screen.getAllByText(WORK_AUTHORISATION_NOTICE).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.getAllByText("Hospitality").length).toBeGreaterThan(0);
    expect(screen.getByText("English — Conversational")).toBeInTheDocument();
    expect(screen.getByText("15 January 2026")).toBeInTheDocument();

    const reasonList = screen.getByRole("list", {
      name: /Why this matches/i,
    });
    expect(within(reasonList).getAllByRole("listitem")).toHaveLength(2);

    expect(
      screen.getByRole("heading", { level: 2, name: "Application preview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ada Candidate")).toBeInTheDocument();
    expect(
      screen.getByText(NO_ADDITIONAL_LANGUAGE_REQUIREMENTS),
    ).toBeInTheDocument();
    expect(screen.getByTestId("application-submit-form")).toHaveTextContent(
      detail.vacancyId,
    );

    expect(
      screen.getByRole("link", { name: "Back to matches" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(screen.queryByText(/salary|exact address|cv/i)).toBeNull();
  });

  it("renders Applied state and View application instead of submit", () => {
    render(
      <CandidateJobDetailPage
        status="ready"
        detail={detail}
        preview={preview}
        application={{
          applicationId: "33333333-3333-4333-8333-333333333301",
          vacancyId: detail.vacancyId,
          status: "submitted",
          submittedAt: "2026-08-03T14:30:00.000Z",
        }}
      />,
    );

    expect(screen.getAllByText("Applied").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", {
        name: `View application: ${detail.title}`,
      }),
    ).toHaveAttribute(
      "href",
      "/candidate/applications/33333333-3333-4333-8333-333333333301",
    );
    expect(screen.queryByTestId("application-submit-form")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Application preview" }),
    ).toBeNull();
    expect(
      screen.queryByText("33333333-3333-4333-8333-333333333301"),
    ).toBeNull();
  });

  it("renders unavailable state without protected vacancy data", () => {
    render(
      <CandidateJobDetailPage status="unavailable" reason="unavailable" />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This job is not available",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo Berlin Work Co")).toBeNull();
    expect(screen.queryByTestId("application-submit-form")).toBeNull();
  });
});

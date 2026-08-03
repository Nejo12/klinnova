import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CandidateJobDetailPage } from "@/components/candidate-job-detail/candidate-job-detail-page";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";
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

describe("CandidateJobDetailPage", () => {
  it("renders ready detail with metadata, reasons, and notice", () => {
    render(<CandidateJobDetailPage status="ready" detail={detail} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Demo vacancy — Morning kitchen support",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Demo vacancy")).toBeInTheDocument();
    expect(screen.getByText(WORK_AUTHORISATION_NOTICE)).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.getByText("Hospitality")).toBeInTheDocument();
    expect(screen.getByText("English — Conversational")).toBeInTheDocument();
    expect(screen.getByText("15 January 2026")).toBeInTheDocument();

    const reasonList = screen.getByRole("list", {
      name: /Why this matches/i,
    });
    expect(within(reasonList).getAllByRole("listitem")).toHaveLength(2);

    expect(
      screen.getByRole("link", { name: "Back to matches" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(
      screen.queryByRole("button", { name: /apply|submit|save/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /apply|submit|save|contact/i }),
    ).toBeNull();
    expect(screen.queryByText(/salary|exact address|cv/i)).toBeNull();
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
    expect(
      screen.getByRole("link", { name: "Back to matches" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo Berlin Work Co")).toBeNull();
    expect(
      screen.queryByText("Demo vacancy — Morning kitchen support"),
    ).toBeNull();
  });

  it("renders not_matching state with factual copy", () => {
    render(
      <CandidateJobDetailPage status="unavailable" reason="not_matching" />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This job no longer matches your preferences",
      }),
    ).toBeInTheDocument();
  });
});

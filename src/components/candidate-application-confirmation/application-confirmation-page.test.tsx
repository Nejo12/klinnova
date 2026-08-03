import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationConfirmationPage } from "@/components/candidate-application-confirmation/application-confirmation-page";
import {
  APPLICATION_CONFIRMATION_BODY,
  APPLICATION_CONFIRMATION_HEADING,
  type ApplicationConfirmation,
} from "@/lib/applications/application-confirmation";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";

const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";
const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const confirmation: ApplicationConfirmation = {
  applicationId: APPLICATION_ID,
  statusLabel: "Submitted",
  submittedAtIso: "2026-08-03T14:30:00.000Z",
  submittedAtLabel: "3 August 2026, 14:30 UTC",
  vacancyId: VACANCY_ID,
  vacancyTitle: "Demo vacancy — Morning kitchen support",
  employerDisplayName: "Demo Berlin Work Co",
  demoLabel: "Demo vacancy",
  city: "Berlin",
  vacancyJobCategoryLabel: "Hospitality",
  vacancyEmploymentTypesLabel: "Part time",
  vacancyShiftRequirementsLabel: "Morning",
  vacancyGermanRequirementLabel: "Basic German",
  vacancyLanguageRequirements: [],
  vacancyNoAdditionalLanguagesLabel: "No additional language requirements",
  vacancyAvailableFromLabel: "Flexible start",
  candidateDisplayName: "Ada Candidate",
  candidateMatchedCategoryLabel: "Hospitality",
  candidateGermanComfortLabel: "I can understand and use some basic German",
  candidateLanguages: [],
  candidateNoAdditionalLanguagesLabel: "No additional language requirements",
  candidateWorkAuthorisationLabel: "Yes",
  candidateAvailableFromLabel: "4 August 2026",
  candidateEmploymentPreferencesLabel: "Part time",
  candidateShiftPreferencesLabel: "Morning",
};

describe("ApplicationConfirmationPage", () => {
  it("renders factual confirmation content without the application UUID", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        confirmation={confirmation}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: APPLICATION_CONFIRMATION_HEADING,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(APPLICATION_CONFIRMATION_BODY)).toBeInTheDocument();
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(screen.getByText("3 August 2026, 14:30 UTC")).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Ada Candidate")).toBeInTheDocument();
    expect(screen.getByText(WORK_AUTHORISATION_NOTICE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View job" })).toHaveAttribute(
      "href",
      `/candidate/jobs/${VACANCY_ID}`,
    );
    expect(
      screen.getByRole("link", { name: "Back to matches" }),
    ).toHaveAttribute("href", "/candidate/matches");
    expect(screen.queryByText(APPLICATION_ID)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /withdraw|submit again|edit/i }),
    ).toBeNull();
    expect(screen.queryByText(/employer will|response time/i)).toBeNull();
  });

  it("renders a generic unavailable state", () => {
    render(<ApplicationConfirmationPage status="unavailable" />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Application not available",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo Berlin Work Co")).toBeNull();
  });
});

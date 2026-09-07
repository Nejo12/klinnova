import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationConfirmationPage } from "@/components/candidate-application-confirmation/application-confirmation-page";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import {
  APPLICATION_CONFIRMATION_BODY,
  APPLICATION_CONFIRMATION_HEADING,
  APPLICATION_CONFIRMATION_MARKER,
  type ApplicationConfirmation,
} from "@/lib/applications/application-confirmation";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";

const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";
const VACANCY_ID = "22222222-2222-4222-8222-222222222201";

const confirmation: ApplicationConfirmation = {
  applicationId: APPLICATION_ID,
  status: "submitted" as const,
  statusLabel: "Submitted",
  submittedAtIso: "2026-08-03T14:30:00.000Z",
  submittedAtLabel: "3 August 2026, 14:30 UTC",
  introductionText: "Hello, I would like to apply.",
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

const history = [
  { to_status: "submitted" as const, occurred_at: "2026-08-03T14:35:00.000Z" },
];

describe("ApplicationConfirmationPage", () => {
  it("localizes receipt chrome and structured snapshot values while preserving authored text", () => {
    document.documentElement.dataset.locale = "de";
    document.documentElement.lang = "de";
    const localizedConfirmation: ApplicationConfirmation = {
      ...confirmation,
      vacancyJobCategory: "hospitality",
      vacancyEmploymentTypes: ["part_time"],
      vacancyShiftRequirements: ["morning"],
      vacancyGermanRequirement: "basic",
      vacancyAvailableFrom: null,
      candidateMatchedCategory: "hospitality",
      candidateGermanComfort: "basic",
      candidateWorkAuthorisation: true,
      candidateAvailableFrom: "2026-08-04",
      candidateEmploymentPreferences: ["part_time"],
      candidateShiftPreferences: ["morning"],
    };

    render(
      <LocaleProvider>
        <ApplicationConfirmationPage
          status="ready"
          showEmployerNav={false}
          confirmation={localizedConfirmation}
          history={history}
          outcomes={[]}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Du bist einen Schritt weiter." }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Eingereicht").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gastronomie").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Teilzeit").length).toBeGreaterThan(0);
    expect(
      screen.getByText(confirmation.introductionText ?? ""),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(confirmation.vacancyTitle).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(confirmation.employerDisplayName).length,
    ).toBeGreaterThan(0);

    document.documentElement.dataset.locale = "en";
    document.documentElement.lang = "en";
  });
  it("renders factual confirmation content without the application UUID", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={confirmation}
        history={history}
        outcomes={[]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: APPLICATION_CONFIRMATION_HEADING,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(APPLICATION_CONFIRMATION_MARKER),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Your application for ${confirmation.vacancyTitle} is now with ${confirmation.employerDisplayName}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(APPLICATION_CONFIRMATION_BODY)).toBeInTheDocument();
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(screen.getByText("3 August 2026, 14:30 UTC")).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Ada Candidate")).toBeInTheDocument();
    expect(
      screen.getByText("Hello, I would like to apply."),
    ).toBeInTheDocument();
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
    expect(screen.queryByRole("link", { name: "View application" })).toBeNull();
    expect(screen.queryByText(/employer will|response time/i)).toBeNull();
  });

  it("renders no demo badge for a real employer application (demoLabel: null)", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{ ...confirmation, demoLabel: null }}
        history={history}
        outcomes={[]}
      />,
    );
    expect(screen.queryByText("Demo vacancy")).toBeNull();
  });

  it("renders a non-submitted status label (e.g. after an employer transition)", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{
          ...confirmation,
          status: "reviewing",
          statusLabel: "In review",
        }}
        history={history}
        outcomes={[]}
      />,
    );
    expect(screen.getAllByText("In review").length).toBeGreaterThan(0);
  });

  it("renders the accepted banner when status is accepted, distinct from hired/employment", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{
          ...confirmation,
          status: "accepted",
          statusLabel: "Accepted",
        }}
        history={history}
        outcomes={[]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Application accepted" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/separate from being hired/i)).toBeInTheDocument();
    expect(screen.queryByText(/employer will|response time/i)).toBeNull();
    expect(screen.queryByText(/within \d+ days?/i)).toBeNull();
    expect(screen.queryByText(/contact (us|klinnova)/i)).toBeNull();
  });

  it("does not render the accepted banner for a non-accepted status", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{ ...confirmation, status: "submitted" }}
        history={history}
        outcomes={[]}
      />,
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: "Application accepted" }),
    ).toBeNull();
  });

  it("gates the accepted banner on the real status enum, not statusLabel (regression guard)", () => {
    // statusLabel is always derived from status via applicationStatusLabel in
    // real data, so this pairing never occurs outside a test. It exists to
    // catch a future refactor that accidentally gates on
    // statusLabel === "Accepted" instead of status === "accepted": such an
    // implementation would incorrectly render the banner here, while the
    // real status-based gate correctly does not.
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{
          ...confirmation,
          status: "shortlisted",
          statusLabel: "Accepted",
        }}
        history={history}
        outcomes={[]}
      />,
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: "Application accepted" }),
    ).toBeNull();
  });

  it("renders the status timeline in RPC order, with no from_status, reason, or actor identity", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{
          ...confirmation,
          status: "rejected",
          statusLabel: "Not selected",
        }}
        history={[
          {
            to_status: "submitted",
            occurred_at: "2026-08-03T14:30:00.000Z",
          },
          {
            to_status: "reviewing",
            occurred_at: "2026-08-04T09:00:00.000Z",
          },
          {
            to_status: "rejected",
            occurred_at: "2026-08-05T09:00:00.000Z",
          },
        ]}
        outcomes={[]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Status timeline" }),
    ).toBeInTheDocument();
    const timelineHeading = screen.getByRole("heading", {
      level: 2,
      name: "Status timeline",
    });
    const timelineSection = timelineHeading.closest("section");
    expect(timelineSection).not.toBeNull();
    expect(timelineSection?.textContent).not.toMatch(/→/);
    expect(screen.queryByText(/reason/i)).toBeNull();
    expect(screen.queryByText(/actor/i)).toBeNull();
    const statuses = Array.from(
      timelineSection?.querySelectorAll("li") ?? [],
    ).map((item) => item.textContent);
    expect(statuses[0]).toMatch(/Submitted/);
    expect(statuses[1]).toMatch(/In review/);
    expect(statuses[2]).toMatch(/Not selected/);
    expect(statuses[2]).not.toMatch(/Rejected/);
  });

  it("shows 'Not selected' for a rejected application on both the status field and the timeline (regression: candidate detail/timeline consistency)", () => {
    render(
      <ApplicationConfirmationPage
        status="ready"
        showEmployerNav={false}
        confirmation={{
          ...confirmation,
          status: "rejected",
          statusLabel: "Not selected",
        }}
        history={[
          {
            to_status: "rejected",
            occurred_at: "2026-08-05T09:00:00.000Z",
          },
        ]}
        outcomes={[]}
      />,
    );
    expect(screen.getAllByText("Not selected").length).toBeGreaterThan(0);
    expect(screen.queryByText("Rejected")).toBeNull();
  });

  it("renders a generic unavailable state", () => {
    render(
      <ApplicationConfirmationPage
        status="unavailable"
        showEmployerNav={false}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Application not available",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo Berlin Work Co")).toBeNull();
  });
});

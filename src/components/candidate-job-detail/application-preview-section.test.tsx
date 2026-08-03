import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationPreviewSection } from "@/components/candidate-job-detail/application-preview-section";
import { WORK_AUTHORISATION_NOTICE } from "@/components/candidate-matches/work-authorisation-notice";
import type { ApplicationPreview } from "@/lib/applications/application-preview";
import {
  APPLICATION_SUBMIT_DISCLOSURE,
  NO_ADDITIONAL_LANGUAGE_REQUIREMENTS,
} from "@/lib/applications/messages";

const preview: ApplicationPreview = {
  vacancyId: "22222222-2222-4222-8222-222222222201",
  vacancyTitle: "Demo vacancy — Morning kitchen support",
  employerDisplayName: "Demo Berlin Work Co",
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

describe("ApplicationPreviewSection", () => {
  it("renders approved preview fields with semantic structure", () => {
    render(<ApplicationPreviewSection preview={preview} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Application preview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ada Candidate")).toBeInTheDocument();
    expect(
      screen.getByText("Demo vacancy — Morning kitchen support"),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo Berlin Work Co")).toBeInTheDocument();
    expect(screen.getByText("Hospitality")).toBeInTheDocument();
    expect(
      screen.getByText("I can understand and use some basic German"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(NO_ADDITIONAL_LANGUAGE_REQUIREMENTS),
    ).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("4 August 2026")).toBeInTheDocument();
    expect(screen.getByText("Part time")).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText(WORK_AUTHORISATION_NOTICE)).toBeInTheDocument();

    const section = screen
      .getByRole("heading", { name: "Application preview" })
      .closest("section");
    expect(section).not.toBeNull();
    expect((section as HTMLElement).querySelector("dl")).not.toBeNull();
    expect(
      within(section as HTMLElement).getByText("Your name"),
    ).toBeInTheDocument();

    expect(screen.queryByText(/email|phone|cv|exact address/i)).toBeNull();
    expect(screen.queryByText(APPLICATION_SUBMIT_DISCLOSURE)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("lists vacancy-relevant languages when present", () => {
    render(
      <ApplicationPreviewSection
        preview={{
          ...preview,
          noAdditionalLanguagesLabel: null,
          relevantLanguages: [
            {
              languageCode: "en",
              languageLabel: "English",
              proficiencyLabel: "Conversational",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("English — Conversational")).toBeInTheDocument();
    expect(screen.queryByText(NO_ADDITIONAL_LANGUAGE_REQUIREMENTS)).toBeNull();
  });
});

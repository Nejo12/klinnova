import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const localeState = vi.hoisted(() => ({ current: "en" as "en" | "de" }));
vi.mock("@/components/i18n/locale-provider", () => ({
  useLocale: () => ({ locale: localeState.current, t: (key: string) => key }),
}));

import { ReadinessChecklist } from "@/components/employer-vacancies/readiness-checklist";
import { mapReadinessChecklist } from "@/lib/employer/vacancies/readiness";

describe.each([
  [
    "en",
    "Vacancy details complete",
    "Verification required before publishing",
    "Ready to publish",
  ],
  [
    "de",
    "Stellenangaben vollständig",
    "Verifizierung vor der Veröffentlichung erforderlich",
    "Bereit zur Veröffentlichung",
  ],
] as const)(
  "ReadinessChecklist %s",
  (locale, detailsComplete, verificationCopy, readyCopy) => {
    it("prioritizes missing details and compresses completed checks", () => {
      localeState.current = locale;
      render(
        <ReadinessChecklist
          ready={false}
          checklist={mapReadinessChecklist(["title", "salary", "verification"])}
          continueHref="/employer/vacancies/123/edit"
        />,
      );
      expect(
        screen.getByText(
          locale === "de" ? "2 Angaben fehlen" : "2 details missing",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "de" ? "12 / 15 abgeschlossen" : "12 / 15 complete",
        ),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(
        screen.getByRole("link", {
          name:
            locale === "de"
              ? "Fehlende Angaben ergänzen"
              : "Complete missing details",
        }),
      ).toHaveAttribute("href", "/employer/vacancies/123/edit");
    });

    it("directs a verification-only blocker to verification without claiming readiness", () => {
      localeState.current = locale;
      render(
        <ReadinessChecklist
          ready={false}
          checklist={mapReadinessChecklist(["verification"])}
        />,
      );
      expect(screen.getByText(detailsComplete)).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(verificationCopy)),
      ).toBeInTheDocument();
      expect(screen.queryByText(readyCopy)).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: locale === "de" ? "Zur Verifizierung" : "Go to verification",
        }),
      ).toHaveAttribute("href", "/employer/verification");
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });

    it("shows readiness only when the canonical result is ready", () => {
      localeState.current = locale;
      render(
        <ReadinessChecklist ready checklist={mapReadinessChecklist([])} />,
      );
      expect(screen.getByText(readyCopy)).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "de" ? "15 / 15 abgeschlossen" : "15 / 15 complete",
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", {
          name: locale === "de" ? "Zur Verifizierung" : "Go to verification",
        }),
      ).not.toBeInTheDocument();
    });
  },
);

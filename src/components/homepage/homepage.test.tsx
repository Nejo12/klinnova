import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Homepage } from "@/components/homepage/homepage";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/locale";
import type {
  LoadPublicVacanciesResult,
  PublicVacancyListItem,
} from "@/lib/public-jobs/load-public-vacancies";

function makeItem(id: string, title: string): PublicVacancyListItem {
  return {
    vacancy: {
      vacancyId: id,
      title,
      description: null,
      jobCategory: "cleaning",
      publicLocality: "Neukölln",
      workplaceType: "shop",
      workFrequency: "recurring",
      cvRequired: null,
      interviewEnglishOk: null,
      source: "employer",
      employerDisplayName: "Restaurant Mira",
      companyName: null,
      website: null,
      expiresAt: "2026-09-01T00:00:00Z",
    },
    languages: [],
  };
}

function renderAtLocale(
  locale: Locale,
  jobsResult: LoadPublicVacanciesResult = { ok: true, vacancies: [] },
) {
  document.documentElement.dataset.locale = locale;
  document.documentElement.lang = locale;
  return render(
    <LocaleProvider>
      <Homepage jobsResult={jobsResult} />
    </LocaleProvider>,
  );
}

describe("Homepage", () => {
  beforeEach(() => {
    document.documentElement.dataset.locale = "en";
    document.documentElement.lang = "en";
  });

  it("renders sections in a single-h1 heading order with the old prototype copy gone", () => {
    render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const headingNames = screen
      .getAllByRole("heading", { level: 2 })
      .map((el) => el.textContent);
    expect(headingNames).toEqual([
      "Made for how Berlin works",
      "You never wonder where it went",
      "Open in Berlin right now",
      "Reach people who can start",
      "Common questions",
      "Berlin first",
    ]);

    expect(screen.queryByText(/Candidate experience/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Employer and admin/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/How progress will feel/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/View employer and admin/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Workspace layout/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Desktop structure from the large breakpoint/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Candidate registration is available\. Essential onboarding follows/,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Matching arrives in a later step/),
    ).not.toBeInTheDocument();
  });

  it("renders real vacancy titles as h3, not h2, keeping the section heading order intact", () => {
    const result: LoadPublicVacanciesResult = {
      ok: true,
      vacancies: [
        makeItem("11111111-1111-4111-8111-111111111111", "Küchenhilfe"),
        makeItem("22222222-2222-4222-8222-222222222222", "Lagermitarbeiter"),
      ],
    };
    render(<Homepage jobsResult={result} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Küchenhilfe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Lagermitarbeiter" }),
    ).toBeInTheDocument();

    const headingNames = screen
      .getAllByRole("heading", { level: 2 })
      .map((el) => el.textContent);
    expect(headingNames).toEqual([
      "Made for how Berlin works",
      "You never wonder where it went",
      "Open in Berlin right now",
      "Reach people who can start",
      "Common questions",
      "Berlin first",
    ]);
  });

  it("keeps the legal footer links present", () => {
    render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "Privacy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      within(footer).getByRole("link", { name: "Impressum" }),
    ).toHaveAttribute("href", "/impressum");
  });

  it("renders representative copy from every homepage section in German while preserving source content", () => {
    const result: LoadPublicVacanciesResult = {
      ok: true,
      vacancies: [
        makeItem(
          "11111111-1111-4111-8111-111111111111",
          "Employer-authored vacancy title",
        ),
      ],
    };

    renderAtLocale("de", result);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Jobs, die zu deiner Situation passen. In Berlin.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Klinnova bringt Bewerbende und Arbeitgeber in Berlin zusammen. Sprachniveau, Verfügbarkeit und Standort werden anhand der Anforderungen jeder Stelle geprüft.",
      ),
    ).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Gemacht für den Berliner Arbeitsalltag",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Kategorie, Sprache, Arbeitszeit und Verfügbarkeit — abgestimmt auf dein Profil.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Du weißt immer, wie es weitergeht",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Echte Stellen ansehen: nur veröffentlichte Stellen, mit ihren Anforderungen",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Jetzt offene Stellen in Berlin",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Alle Jobs ansehen" }),
    ).toHaveAttribute("href", "/jobs");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Erreiche Menschen, die anfangen können",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Arbeitgeberprofil anlegen")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Häufige Fragen" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Eingereicht").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Zuerst in Berlin",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Klinnova startet in Berlin. Worauf du dich bewerben kannst, hängt von den Stellen ab, die geprüfte Arbeitgeber veröffentlicht haben.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Employer-authored vacancy title",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Restaurant Mira/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reinigung").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Datenschutz" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
  it("makes no unsupported launch, beta or guarantee claims in either language", () => {
    for (const locale of ["en", "de"] as const) {
      const { container, unmount } = renderAtLocale(locale);
      const text = container.textContent ?? "";
      expect(text).not.toMatch(
        /working now|private beta|jetzt am Start|Nur geprüfte Arbeitgeber|Verified employers only|Jetzt arbeiten|guarantee|garantiert/i,
      );
      unmount();
    }
  });

  it("offers the how-it-works and FAQ anchors with matching targets", () => {
    const { container } = render(
      <Homepage jobsResult={{ ok: true, vacancies: [] }} />,
    );

    expect(container.querySelector("#how-it-works")).not.toBeNull();
    expect(container.querySelector("#faq")).not.toBeNull();
    expect(container.querySelector("#for-candidates")).not.toBeNull();
    expect(container.querySelector("#for-employers")).not.toBeNull();
  });

  it("shows dashboard actions, not sign-up prompts, to an authenticated viewer", () => {
    render(
      <Homepage
        jobsResult={{ ok: true, vacancies: [] }}
        viewer={{ destination: "/employer", workspace: "employer" }}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Create an employer account" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create a candidate account" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "I'm a candidate" }),
    ).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/employer");
    }
  });

  it("keeps empty, failed and populated vacancy states distinct and truthful", () => {
    const empty = render(<Homepage jobsResult={{ ok: true, vacancies: [] }} />);
    expect(
      screen.getByText("No vacancies are open right now — check back soon."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Jobs are temporarily unavailable.")).toBeNull();
    empty.unmount();

    const failed = render(<Homepage jobsResult={{ ok: false }} />);
    expect(
      screen.getByText("Jobs are temporarily unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No vacancies are open/)).toBeNull();
    failed.unmount();

    render(
      <Homepage
        jobsResult={{
          ok: true,
          vacancies: [
            makeItem("11111111-1111-4111-8111-111111111111", "Küchenhilfe"),
          ],
        }}
      />,
    );
    expect(screen.queryByText(/No vacancies are open/)).toBeNull();
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });
});

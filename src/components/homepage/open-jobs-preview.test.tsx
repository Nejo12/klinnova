import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OpenJobsPreview } from "@/components/homepage/open-jobs-preview";
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

describe("OpenJobsPreview", () => {
  it("renders up to three real vacancy cards and a link to /jobs", () => {
    const result: LoadPublicVacanciesResult = {
      ok: true,
      vacancies: [
        makeItem("11111111-1111-4111-8111-111111111111", "Küchenhilfe"),
        makeItem("22222222-2222-4222-8222-222222222222", "Lagermitarbeiter"),
        makeItem("33333333-3333-4333-8333-333333333333", "Reinigungskraft"),
        makeItem("44444444-4444-4444-8444-444444444444", "Servicekraft"),
      ],
    };
    render(<OpenJobsPreview result={result} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Open in Berlin right now",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Küchenhilfe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Lagermitarbeiter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Reinigungskraft" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Servicekraft" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
  });

  it("shows an honest empty message with no fake cards when there are zero vacancies", () => {
    render(<OpenJobsPreview result={{ ok: true, vacancies: [] }} />);

    expect(
      screen.getByText("No vacancies are open right now — check back soon."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all jobs" }),
    ).toBeInTheDocument();
  });

  it("degrades gracefully on load failure without fabricating content", () => {
    render(<OpenJobsPreview result={{ ok: false }} />);

    expect(
      screen.getByText("Jobs are temporarily unavailable."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all jobs" }),
    ).toBeInTheDocument();
  });
});

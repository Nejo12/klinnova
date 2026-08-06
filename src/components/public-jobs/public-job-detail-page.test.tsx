import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicJobDetailPage } from "@/components/public-jobs/public-job-detail-page";
import type { PublicVacancy } from "@/lib/public-jobs/domain";

const baseVacancy: PublicVacancy = {
  vacancyId: "11111111-1111-4111-8111-111111111111",
  title: "Evening cleaner",
  description: "Line one.\n\nLine two.",
  jobCategory: "cleaning",
  publicLocality: "Mitte",
  workplaceType: "private_home",
  workFrequency: "recurring",
  cvRequired: false,
  interviewEnglishOk: true,
  source: "employer",
  employerDisplayName: "Ada Lovelace",
  companyName: null,
  website: "https://example.test",
  expiresAt: "2026-09-01T00:00:00Z",
};

describe("PublicJobDetailPage", () => {
  it("renders title, employer, category, and description paragraphs", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={baseVacancy}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Evening cleaner", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText("Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Line one.")).toBeInTheDocument();
    expect(screen.getByText("Line two.")).toBeInTheDocument();
  });

  it("shows the Demo vacancy label only for source=seed", () => {
    const { rerender } = render(
      <PublicJobDetailPage
        status="ready"
        vacancy={baseVacancy}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(screen.queryByText("Demo vacancy")).not.toBeInTheDocument();

    rerender(
      <PublicJobDetailPage
        status="ready"
        vacancy={{ ...baseVacancy, source: "seed" }}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(screen.getByText("Demo vacancy")).toBeInTheDocument();
  });

  it("omits nullable rows and CV/interview text when null", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={{
          ...baseVacancy,
          publicLocality: null,
          workplaceType: null,
          workFrequency: null,
          cvRequired: null,
          interviewEnglishOk: null,
        }}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(screen.queryByText("Location")).not.toBeInTheDocument();
    expect(screen.queryByText("Workplace")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequency")).not.toBeInTheDocument();
    expect(screen.queryByText("CV")).not.toBeInTheDocument();
    expect(screen.queryByText("Interview")).not.toBeInTheDocument();
  });

  it("renders CV and interview text when present", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={baseVacancy}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(screen.getByText("CV not required")).toBeInTheDocument();
    expect(screen.getByText("Interview can be in English")).toBeInTheDocument();
  });

  it("renders language requirement items", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={baseVacancy}
        languages={[{ languageCode: "en", minProficiency: "basic" }]}
        authenticated={false}
      />,
    );
    expect(screen.getByText(/English — Basic/)).toBeInTheDocument();
  });

  it("renders a safe external website link with target and rel", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={baseVacancy}
        languages={[]}
        authenticated={false}
      />,
    );
    const link = screen.getByRole("link", { name: /Employer website/ });
    expect(link).toHaveAttribute("href", "https://example.test/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render a website link when malformed or null", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={{ ...baseVacancy, website: "javascript:alert(1)" }}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(
      screen.queryByRole("link", { name: /Employer website/ }),
    ).not.toBeInTheDocument();
  });

  it("renders no management controls", () => {
    render(
      <PublicJobDetailPage
        status="ready"
        vacancy={baseVacancy}
        languages={[]}
        authenticated={false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Publish|Pause|Resume|Withdraw/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a generic failure state without vacancy fields", () => {
    render(<PublicJobDetailPage status="failure" />);
    expect(
      screen.getByRole("heading", { name: "Jobs are unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Evening cleaner")).not.toBeInTheDocument();
  });
});

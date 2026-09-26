import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/employer-vacancies/vacancy-lifecycle-actions", () => ({
  VacancyLifecycleActions: () => (
    <section aria-labelledby="lifecycle-actions-heading">
      <h2 id="lifecycle-actions-heading">Lifecycle actions</h2>
    </section>
  ),
}));
vi.mock("@/components/employer-vacancies/delete-draft-form", () => ({
  DeleteDraftForm: () => <section>Delete draft</section>,
}));

import { VacancyDetail } from "@/components/employer-vacancies/vacancy-detail";
import type { EmployerVacancyDetail } from "@/lib/employer/vacancies/load-employer-vacancy";

function buildVacancy(
  overrides: Partial<EmployerVacancyDetail> = {},
): EmployerVacancyDetail {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Glasreiniger",
    jobCategory: "cleaning",
    publicLocality: "Mitte",
    description: "Office cleaning",
    workplaceType: "office",
    workFrequency: "recurring",
    availableFrom: null,
    experienceNotes: null,
    cvRequired: true,
    interviewEnglishOk: true,
    salaryAmountCents: 1600,
    salaryCurrency: "EUR",
    salaryPeriod: "hourly",
    salaryIsGross: true,
    employerType: "private",
    companyName: null,
    updatedAt: "2026-08-15T00:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
    languages: [],
    publicationState: "draft",
    publishedAt: null,
    pausedAt: null,
    filledAt: null,
    withdrawnAt: null,
    expiredAt: null,
    expiresAt: null,
    isEffectivelyExpired: false,
    verificationState: "verified",
    ready: true,
    checklist: [{ id: "title", label: "Title", complete: true }],
    readinessAvailable: true,
    ...overrides,
  };
}

describe("VacancyDetail", () => {
  it("shows readiness before lifecycle actions and details for a ready draft", () => {
    render(<VacancyDetail vacancy={buildVacancy()} />);

    expect(screen.getByText("Private draft")).toBeInTheDocument();
    expect(screen.getByText("Ready to publish")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit vacancy" })).toHaveAttribute(
      "href",
      "/employer/vacancies/22222222-2222-4222-8222-222222222222/edit",
    );
    expect(screen.queryByText(/%/)).toBeNull();

    const readiness = screen.getByRole("region", {
      name: "Publication readiness",
    });
    const actions = screen.getByRole("region", { name: "Lifecycle actions" });
    const titleTerm = screen.getByText("Title", { selector: "dt" });
    expect(
      readiness.compareDocumentPosition(actions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      actions.compareDocumentPosition(titleTerm) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows missing readiness items and a compact completed count, not color alone", () => {
    render(
      <VacancyDetail
        vacancy={buildVacancy({
          ready: false,
          checklist: [
            { id: "title", label: "Title", complete: true },
            { id: "salary", label: "Salary (EUR gross)", complete: false },
          ],
        })}
      />,
    );

    expect(screen.getByText("1 detail missing")).toBeInTheDocument();
    expect(screen.getByText("Salary (EUR gross)")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 complete")).toBeInTheDocument();
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  });

  it("does not offer Edit vacancy when the employer is suspended", () => {
    render(<VacancyDetail vacancy={buildVacancy()} suspended />);

    expect(screen.queryByRole("link", { name: "Edit vacancy" })).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Lifecycle actions" }),
    ).toBeNull();
  });

  it("prioritizes verification without offering Publish for a blocked draft", () => {
    render(
      <VacancyDetail
        vacancy={buildVacancy({
          ready: false,
          verificationState: "unverified",
          checklist: [
            { id: "title", label: "Title", complete: true },
            {
              id: "verification",
              label: "Employer verification",
              complete: false,
            },
          ],
        })}
      />,
    );
    expect(screen.getByText("Vacancy details complete")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to verification" }),
    ).toHaveAttribute("href", "/employer/verification");
    expect(
      screen.queryByRole("region", { name: "Lifecycle actions" }),
    ).not.toBeInTheDocument();
  });
});

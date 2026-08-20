import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerApplication = vi.hoisted(() => vi.fn());
const loadEmployerApplicationOutcomes = vi.hoisted(() => vi.fn());
const loadUnseenApplicationsCount = vi.hoisted(() => vi.fn());
const markEmployerApplicationSeen = vi.hoisted(() => vi.fn());
const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const loadCurrentEmployerSuspensionStatus = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({ id: "supabase" }),
}));
vi.mock("@/lib/employer/applications/load-employer-application", () => ({
  loadEmployerApplication,
}));
vi.mock(
  "@/lib/employer/applications/load-employer-application-outcomes",
  () => ({
    loadEmployerApplicationOutcomes,
  }),
);
vi.mock("@/lib/employer/applications/load-unseen-applications-count", () => ({
  loadUnseenApplicationsCount,
}));
vi.mock("@/lib/employer/applications/mark-employer-application-seen", () => ({
  markEmployerApplicationSeen,
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/employer/suspension-guard", () => ({
  loadCurrentEmployerSuspensionStatus,
}));
vi.mock("@/components/employer-vacancies/employer-vacancy-page-header", () => ({
  EmployerVacancyPageHeader: ({
    showCandidate,
    showEmployer,
    unseenApplicationsCount,
  }: {
    showCandidate: boolean;
    showEmployer: boolean;
    unseenApplicationsCount: number;
  }) => (
    <nav aria-label="Employer nav">
      candidate:{String(showCandidate)} employer:{String(showEmployer)} unseen:
      {unseenApplicationsCount}
    </nav>
  ),
}));
vi.mock("@/components/employer-shared/employer-restricted-notice", () => ({
  EmployerRestrictedNotice: ({ message }: { message: string }) => (
    <p>{message}</p>
  ),
}));
vi.mock("@/components/employer-applications/application-unavailable", () => ({
  ApplicationUnavailable: () => <p>Application unavailable</p>,
}));
vi.mock("@/components/employer-applications/application-detail", () => ({
  ApplicationDetail: ({
    application,
    outcomes,
  }: {
    application: { candidate_display_name: string };
    outcomes: unknown[] | null;
  }) => (
    <section>
      <p>Detail for {application.candidate_display_name}</p>
      <p>outcomes:{outcomes === null ? "null" : outcomes.length}</p>
    </section>
  ),
}));

import EmployerApplicationDetailPage from "@/app/employer/applications/[applicationId]/page";

const applicationId = "11111111-1111-4111-8111-111111111111";

function params() {
  return Promise.resolve({ applicationId });
}

function readyApplication() {
  return {
    ok: true,
    application: {
      candidate_display_name: "Amina Candidate",
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("EmployerApplicationDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    redirect.mockReset();
    loadCurrentEmployerSuspensionStatus.mockReset();
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: false,
    });
    loadEmployerApplication.mockReset();
    loadEmployerApplication.mockResolvedValue(readyApplication());
    markEmployerApplicationSeen.mockReset();
    markEmployerApplicationSeen.mockResolvedValue({ ok: true });
    loadAccountCapabilities.mockReset();
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });
    loadUnseenApplicationsCount.mockReset();
    loadUnseenApplicationsCount.mockResolvedValue(4);
    loadEmployerApplicationOutcomes.mockReset();
    loadEmployerApplicationOutcomes.mockResolvedValue({
      ok: true,
      outcomes: [{ outcome_event_id: "outcome-1" }],
    });
  });

  it("keeps suspension as the first gate and skips application-specific work for suspended employers", async () => {
    loadCurrentEmployerSuspensionStatus.mockResolvedValue({
      ok: true,
      suspended: true,
    });

    render(await EmployerApplicationDetailPage({ params: params() }));

    expect(screen.getByRole("heading", { name: "Application" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Employer nav" }),
    ).toHaveTextContent("unseen:0");
    expect(loadAccountCapabilities).toHaveBeenCalledTimes(1);
    expect(loadEmployerApplication).not.toHaveBeenCalled();
    expect(markEmployerApplicationSeen).not.toHaveBeenCalled();
    expect(loadUnseenApplicationsCount).not.toHaveBeenCalled();
    expect(loadEmployerApplicationOutcomes).not.toHaveBeenCalled();
  });

  it("keeps unavailable handling before post-gate work", async () => {
    loadEmployerApplication.mockResolvedValue({
      ok: false,
      reason: "unavailable",
      error: "This application is not available.",
    });

    render(await EmployerApplicationDetailPage({ params: params() }));

    expect(screen.getByText("Application unavailable")).toBeVisible();
    expect(markEmployerApplicationSeen).not.toHaveBeenCalled();
    expect(loadAccountCapabilities).not.toHaveBeenCalled();
    expect(loadUnseenApplicationsCount).not.toHaveBeenCalled();
    expect(loadEmployerApplicationOutcomes).not.toHaveBeenCalled();
  });

  it("renders the normal detail view with the same capabilities, unseen count, seen acknowledgement, and outcomes data", async () => {
    render(await EmployerApplicationDetailPage({ params: params() }));

    expect(
      screen.getByRole("heading", { name: "Amina Candidate" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Employer nav" }),
    ).toHaveTextContent("candidate:true employer:true unseen:4");
    expect(screen.getByText("Detail for Amina Candidate")).toBeVisible();
    expect(screen.getByText("outcomes:1")).toBeVisible();
    expect(markEmployerApplicationSeen).toHaveBeenCalledWith(
      { id: "supabase" },
      applicationId,
    );
    expect(loadAccountCapabilities).toHaveBeenCalledWith({ id: "supabase" });
    expect(loadUnseenApplicationsCount).toHaveBeenCalledWith({
      id: "supabase",
    });
    expect(loadEmployerApplicationOutcomes).toHaveBeenCalledWith(
      { id: "supabase" },
      applicationId,
    );
  });

  it("loads the unseen count after mark-seen settles to preserve current badge semantics", async () => {
    const markSeen = deferred<{ ok: true }>();
    markEmployerApplicationSeen.mockReturnValue(markSeen.promise);

    const page = EmployerApplicationDetailPage({ params: params() });

    await waitFor(() => {
      expect(markEmployerApplicationSeen).toHaveBeenCalled();
      expect(loadAccountCapabilities).toHaveBeenCalled();
      expect(loadEmployerApplicationOutcomes).toHaveBeenCalled();
    });
    expect(loadUnseenApplicationsCount).not.toHaveBeenCalled();

    markSeen.resolve({ ok: true });
    render(await page);

    expect(loadUnseenApplicationsCount).toHaveBeenCalledWith({
      id: "supabase",
    });
    expect(screen.getByText("Detail for Amina Candidate")).toBeVisible();
  });

  it("keeps mark-seen exceptions fail-soft", async () => {
    markEmployerApplicationSeen.mockRejectedValue(new Error("rpc unavailable"));

    render(await EmployerApplicationDetailPage({ params: params() }));

    expect(screen.getByText("Detail for Amina Candidate")).toBeVisible();
    expect(console.error).toHaveBeenCalledWith(
      "[applications] mark-seen threw unexpectedly",
      {
        applicationId,
        error: "Error: rpc unavailable",
      },
    );
  });

  it("keeps outcome failures fail-soft by rendering the detail with null outcomes", async () => {
    loadEmployerApplicationOutcomes.mockResolvedValue({ ok: false });

    render(await EmployerApplicationDetailPage({ params: params() }));

    expect(screen.getByText("Detail for Amina Candidate")).toBeVisible();
    expect(screen.getByText("outcomes:null")).toBeVisible();
  });
});

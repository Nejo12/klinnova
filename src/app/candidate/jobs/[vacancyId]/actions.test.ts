import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);
const resolveCandidateVacancyMatch = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/matching/resolve-candidate-vacancy-match", () => ({
  resolveCandidateVacancyMatch,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    rpc,
  })),
}));

import { submitCandidateApplicationAction } from "@/app/candidate/jobs/[vacancyId]/actions";
import { initialSubmitCandidateApplicationState } from "@/lib/applications/submit-action-state";
import { makeCandidate, makeVacancy } from "@/lib/matching/test-fixtures";
import { matchCandidateToVacancy } from "@/lib/matching/match-candidate-to-vacancy";

const VACANCY_ID = "22222222-2222-4222-8222-222222222201";
const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";

function form(vacancyId: string): FormData {
  const formData = new FormData();
  formData.set("vacancyId", vacancyId);
  return formData;
}

function readyResolve() {
  const candidate = makeCandidate({
    shiftPreferences: ["morning", "flexible"],
    germanComfort: "comfortable",
  });
  const vacancy = makeVacancy({ id: VACANCY_ID });
  const match = matchCandidateToVacancy(candidate, vacancy);
  if (match === null) {
    throw new Error("Expected ready match");
  }
  return {
    status: "ready" as const,
    match,
    candidate,
    displayName: "Ada",
    workAuthorisationDeclared: true,
  };
}

describe("submitCandidateApplicationAction", () => {
  beforeEach(() => {
    redirect.mockClear();
    resolveCandidateVacancyMatch.mockReset();
    rpc.mockReset();
  });

  it("returns validation_error for malformed vacancy IDs without resolve or RPC", async () => {
    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form("not-a-uuid"),
    );

    expect(state).toEqual({ status: "validation_error" });
    expect(resolveCandidateVacancyMatch).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated callers to login with next", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue({
      status: "unauthenticated",
    });

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow(
      `REDIRECT:/login?next=${encodeURIComponent(`/candidate/jobs/${VACANCY_ID}`)}`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects incomplete candidates and does not call the RPC", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue({ status: "incomplete" });

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow("REDIRECT:/candidate/onboarding");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns unavailable without calling the RPC", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue({ status: "unavailable" });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({ status: "unavailable" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns not_matching from the TypeScript matcher without calling the RPC", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue({ status: "not_matching" });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({ status: "not_matching" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects to confirmation after a successful submitted RPC", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue(readyResolve());
    rpc.mockResolvedValue({
      data: { result: "submitted", application_id: APPLICATION_ID },
      error: null,
    });

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow(`REDIRECT:/candidate/applications/${APPLICATION_ID}`);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("submit_candidate_application", {
      p_vacancy_id: VACANCY_ID,
    });
  });

  it("redirects to the same confirmation after already_applied", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue(readyResolve());
    rpc.mockResolvedValue({
      data: { result: "already_applied", application_id: APPLICATION_ID },
      error: null,
    });

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow(`REDIRECT:/candidate/applications/${APPLICATION_ID}`);
  });

  it("fails safely when a successful RPC omits a valid application id", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue(readyResolve());
    rpc.mockResolvedValue({
      data: { result: "submitted", application_id: "not-a-uuid" },
      error: null,
    });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({ status: "failure" });
  });

  it("redirects when the RPC reports incomplete", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue(readyResolve());
    rpc.mockResolvedValue({
      data: { result: "incomplete" },
      error: null,
    });

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow("REDIRECT:/candidate/onboarding");
  });

  it("maps unavailable RPC results", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue(readyResolve());
    rpc.mockResolvedValue({
      data: { result: "unavailable" },
      error: null,
    });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({ status: "unavailable" });
  });

  it("maps malformed RPC payloads and Supabase errors to safe failure", async () => {
    resolveCandidateVacancyMatch.mockResolvedValue(readyResolve());
    rpc.mockResolvedValueOnce({
      data: { result: "not_matching" },
      error: null,
    });

    expect(
      await submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).toEqual({ status: "failure" });

    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied for table applications" },
    });

    const failure = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );
    expect(failure).toEqual({ status: "failure" });
    expect(JSON.stringify(failure)).not.toMatch(/permission denied|postgres/i);
  });

  it("does not invent not_matching as an RPC code and skips service-role paths", () => {
    expect(submitCandidateApplicationAction.toString()).not.toMatch(
      /service.?role/i,
    );
    expect(submitCandidateApplicationAction.toString()).not.toMatch(
      /candidateId|candidate_snapshot|vacancy_snapshot/,
    );
  });

  it("rechecks current match resolution before every RPC call", async () => {
    resolveCandidateVacancyMatch.mockResolvedValueOnce({
      status: "not_matching",
    });
    await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );
    expect(rpc).not.toHaveBeenCalled();

    resolveCandidateVacancyMatch.mockResolvedValueOnce(readyResolve());
    rpc.mockResolvedValue({
      data: { result: "submitted", application_id: APPLICATION_ID },
      error: null,
    });
    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow(`REDIRECT:/candidate/applications/${APPLICATION_ID}`);
    expect(resolveCandidateVacancyMatch).toHaveBeenLastCalledWith(VACANCY_ID);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

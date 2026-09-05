import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);
const getUser = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const notifyEmployerOfNewApplication = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ status: "sent", providerMessageId: "test-id" }),
);

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    rpc,
  })),
}));

vi.mock("@/lib/applications/notify-employer-new-application", () => ({
  notifyEmployerOfNewApplication,
}));

import { submitCandidateApplicationAction } from "@/app/candidate/jobs/[vacancyId]/actions";
import { initialSubmitCandidateApplicationState } from "@/lib/applications/submit-action-state";

const VACANCY_ID = "22222222-2222-4222-8222-222222222201";
const APPLICATION_ID = "33333333-3333-4333-8333-333333333301";

function form(vacancyId: string, introductionText = ""): FormData {
  const formData = new FormData();
  formData.set("vacancyId", vacancyId);
  formData.set("introductionText", introductionText);
  return formData;
}

function authed() {
  getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
}

describe("submitCandidateApplicationAction", () => {
  beforeEach(() => {
    redirect.mockClear();
    getUser.mockReset();
    rpc.mockReset();
    notifyEmployerOfNewApplication.mockReset();
    notifyEmployerOfNewApplication.mockResolvedValue({
      status: "sent",
      providerMessageId: "test-id",
    });
  });

  it("returns validation_error for malformed vacancy IDs without an auth check or RPC", async () => {
    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form("not-a-uuid"),
    );

    expect(state).toEqual({ status: "validation_error" });
    expect(getUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated callers to login with next", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

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

  it("redirects on an auth session error", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "boom" },
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

  it("redirects to confirmation after a successful submitted RPC", async () => {
    authed();
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
      p_introduction_text: "",
      p_vacancy_id: VACANCY_ID,
    });
    expect(notifyEmployerOfNewApplication).toHaveBeenCalledTimes(1);
    expect(notifyEmployerOfNewApplication).toHaveBeenCalledWith({
      applicationId: APPLICATION_ID,
      vacancyId: VACANCY_ID,
    });
  });

  it("passes the trimmed final introduction to the authoritative RPC", async () => {
    authed();
    rpc.mockResolvedValue({
      data: { result: "submitted", application_id: APPLICATION_ID },
      error: null,
    });

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID, "  Candidate-authored text.  "),
      ),
    ).rejects.toThrow(`REDIRECT:/candidate/applications/${APPLICATION_ID}`);

    expect(rpc).toHaveBeenCalledWith("submit_candidate_application", {
      p_introduction_text: "Candidate-authored text.",
      p_vacancy_id: VACANCY_ID,
    });
  });

  it("rejects an introduction over 1,000 trimmed characters before auth", async () => {
    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID, "x".repeat(1_001)),
    );

    expect(state).toEqual({ status: "validation_error" });
    expect(getUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps the RPC validation guard to a safe validation state", async () => {
    authed();
    rpc.mockResolvedValue({
      data: { result: "validation_error" },
      error: null,
    });

    expect(
      await submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID, "Valid client input"),
      ),
    ).toEqual({ status: "validation_error" });
  });

  it("redirects to the same confirmation after already_applied, without notifying the employer (N2: no false new-application email for a non-new row)", async () => {
    authed();
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
    expect(notifyEmployerOfNewApplication).not.toHaveBeenCalled();
  });

  it("still redirects successfully when employer notification rejects (N2: mail failure never turns a persisted application into a failure)", async () => {
    authed();
    rpc.mockResolvedValue({
      data: { result: "submitted", application_id: APPLICATION_ID },
      error: null,
    });
    notifyEmployerOfNewApplication.mockRejectedValue(
      new Error("provider unreachable"),
    );

    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow(`REDIRECT:/candidate/applications/${APPLICATION_ID}`);
    expect(notifyEmployerOfNewApplication).toHaveBeenCalledTimes(1);
  });

  it("does not attempt employer notification for incomplete, unavailable, or ineligible RPC results", async () => {
    authed();

    rpc.mockResolvedValueOnce({ data: { result: "incomplete" }, error: null });
    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow("REDIRECT:/candidate/onboarding");

    rpc.mockResolvedValueOnce({ data: { result: "unavailable" }, error: null });
    await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    rpc.mockResolvedValueOnce({
      data: { result: "ineligible", missing_requirements: ["category"] },
      error: null,
    });
    await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(notifyEmployerOfNewApplication).not.toHaveBeenCalled();
  });

  it("does not attempt employer notification when the RPC call itself errors", async () => {
    authed();
    rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({ status: "failure" });
    expect(notifyEmployerOfNewApplication).not.toHaveBeenCalled();
  });

  it("fails safely when a successful RPC omits a valid application id", async () => {
    authed();
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
    authed();
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
    authed();
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

  it("maps ineligible RPC results with ordered missing requirements", async () => {
    authed();
    rpc.mockResolvedValue({
      data: {
        result: "ineligible",
        missing_requirements: ["category", "german"],
      },
      error: null,
    });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({
      status: "ineligible",
      missingRequirements: ["category", "german"],
    });
  });

  it("fails safely on a duplicate missing-requirement code in an ineligible result", async () => {
    authed();
    rpc.mockResolvedValue({
      data: {
        result: "ineligible",
        missing_requirements: ["category", "category"],
      },
      error: null,
    });

    const state = await submitCandidateApplicationAction(
      initialSubmitCandidateApplicationState,
      form(VACANCY_ID),
    );

    expect(state).toEqual({ status: "failure" });
  });

  it("maps malformed RPC payloads and Supabase errors to safe failure", async () => {
    authed();
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

  it("does not invent not_matching as an RPC code and skips service-role or matcher paths", () => {
    expect(submitCandidateApplicationAction.toString()).not.toMatch(
      /service.?role/i,
    );
    expect(submitCandidateApplicationAction.toString()).not.toMatch(
      /candidateId|candidate_snapshot|vacancy_snapshot|resolveCandidateVacancyMatch|matchCandidateToVacancy/,
    );
  });

  it("rechecks the session before every RPC call", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(
      submitCandidateApplicationAction(
        initialSubmitCandidateApplicationState,
        form(VACANCY_ID),
      ),
    ).rejects.toThrow(/^REDIRECT:\/login/);
    expect(rpc).not.toHaveBeenCalled();

    authed();
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
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

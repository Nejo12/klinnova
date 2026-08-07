import { beforeEach, describe, expect, it, vi } from "vitest";

const loadCandidateCompletionStatus = vi.hoisted(() => vi.fn());
const orderTwo = vi.hoisted(() => vi.fn());

vi.mock("@/lib/onboarding/candidate-completion-status", () => ({
  loadCandidateCompletionStatus,
}));

import { loadCandidateApplicationInventory } from "@/lib/applications/load-candidate-application-inventory";

function makeClient() {
  const orderOne = vi.fn(() => ({ order: orderTwo }));
  const select = vi.fn(() => ({ order: orderOne }));
  const from = vi.fn(() => ({ select }));
  return { from, auth: { getUser: vi.fn() } };
}

const vacancySnapshot = {
  vacancy_id: "22222222-2222-4222-8222-222222222222",
  title: "Morning kitchen support",
  employer_display_name: "Demo Berlin Work Co",
  source: "seed",
  demo_label: "Demo vacancy",
  city: "Berlin",
  job_category: "hospitality",
  employment_types: ["part_time"],
  shift_requirements: ["morning"],
  german_requirement: "basic",
  language_requirements: [],
  available_from: null,
};

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  vacancy_id: "22222222-2222-4222-8222-222222222222",
  status: "submitted",
  submitted_at: "2026-08-01T00:00:00Z",
  snapshot_version: 1,
  vacancy_snapshot: vacancySnapshot,
};

describe("loadCandidateApplicationInventory", () => {
  beforeEach(() => {
    loadCandidateCompletionStatus.mockReset();
    orderTwo.mockReset();
  });

  it("denies an unauthenticated caller without querying applications", async () => {
    loadCandidateCompletionStatus.mockResolvedValue({
      status: "unauthenticated",
    });
    const result = await loadCandidateApplicationInventory(
      makeClient() as never,
    );
    expect(result).toEqual({ status: "unauthenticated" });
    expect(orderTwo).not.toHaveBeenCalled();
  });

  it("denies an incomplete candidate without querying applications", async () => {
    loadCandidateCompletionStatus.mockResolvedValue({ status: "incomplete" });
    const result = await loadCandidateApplicationInventory(
      makeClient() as never,
    );
    expect(result).toEqual({ status: "incomplete" });
    expect(orderTwo).not.toHaveBeenCalled();
  });

  it("selects only from applications, ordered submitted_at desc, id asc, no caller-supplied candidate id", async () => {
    loadCandidateCompletionStatus.mockResolvedValue({ status: "complete" });
    orderTwo.mockResolvedValue({ data: [row], error: null });
    const client = makeClient();

    await loadCandidateApplicationInventory(client as never);

    expect(client.from).toHaveBeenCalledWith("applications");
    const selectCall = client.from.mock.results[0]?.value.select.mock
      .calls[0]?.[0] as string;
    expect(selectCall).toMatch(/\bid\b/);
    expect(selectCall).toMatch(/vacancy_id/);
    expect(selectCall).toMatch(/\bstatus\b/);
    expect(selectCall).toMatch(/submitted_at/);
    expect(selectCall).toMatch(/vacancy_snapshot/);
    expect(selectCall).not.toMatch(/candidate_id/);
    expect(selectCall).not.toMatch(/candidate_snapshot/);
  });

  it("preserves the query's own row order and never re-sorts", async () => {
    loadCandidateCompletionStatus.mockResolvedValue({ status: "complete" });
    const rowB = { ...row, id: "33333333-3333-4333-8333-333333333333" };
    orderTwo.mockResolvedValue({ data: [row, rowB], error: null });

    const result = await loadCandidateApplicationInventory(
      makeClient() as never,
    );

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.applications.map((a) => a.id)).toEqual([row.id, rowB.id]);
    }
  });

  it("fails closed on a malformed row (whole response fails, not a partial list)", async () => {
    loadCandidateCompletionStatus.mockResolvedValue({ status: "complete" });
    orderTwo.mockResolvedValue({
      data: [{ ...row, status: "archived" }],
      error: null,
    });

    const result = await loadCandidateApplicationInventory(
      makeClient() as never,
    );
    expect(result.status).toBe("failure");
  });

  it("normalizes a transport error without leaking raw details", async () => {
    loadCandidateCompletionStatus.mockResolvedValue({ status: "complete" });
    orderTwo.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table applications" },
    });

    const result = await loadCandidateApplicationInventory(
      makeClient() as never,
    );
    expect(result).toEqual({ status: "failure" });
  });
});

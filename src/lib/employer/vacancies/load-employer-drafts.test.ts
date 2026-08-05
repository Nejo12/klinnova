import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEmployerProfile = vi.hoisted(() => vi.fn());
const orderTwo = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/employer/load-employer", () => ({
  loadEmployerProfile,
}));

import { loadEmployerDrafts } from "@/lib/employer/vacancies/load-employer-drafts";

function makeClient() {
  const orderOne = vi.fn(() => ({ order: orderTwo }));
  const eqOwner = vi.fn(() => ({ order: orderOne }));
  const eqSource = vi.fn(() => ({ eq: eqOwner }));
  const select = vi.fn(() => ({ eq: eqSource }));
  const from = vi.fn(() => ({ select }));

  return {
    from,
    rpc,
    auth: { getUser: vi.fn() },
  };
}

const completedProfile = {
  ok: true as const,
  userId: "emp-1",
  data: {
    id: "emp-1",
    employerType: "private" as const,
    displayName: "Ada",
    berlinLocality: "Mitte",
    phone: null,
    website: null,
    organisationLegalName: null,
    lawfulHiringDeclared: true,
    verificationState: "verified",
    onboardingCompletedAt: "2026-08-01T00:00:00Z",
    company: null,
    typeLocked: true,
  },
};

describe("loadEmployerDrafts", () => {
  beforeEach(() => {
    loadEmployerProfile.mockReset();
    orderTwo.mockReset();
    rpc.mockReset();
    loadEmployerProfile.mockResolvedValue(completedProfile);
  });

  it("lists rows across every lifecycle state, not only draft", async () => {
    orderTwo.mockResolvedValue({
      data: [
        {
          id: "row-draft",
          title: "Draft role",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-04T00:00:00Z",
          source: "employer",
          publication_state: "draft",
          expires_at: null,
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
        {
          id: "row-published",
          title: "Published role",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-04T00:00:00Z",
          source: "employer",
          publication_state: "published",
          expires_at: "2026-09-03T00:00:00Z",
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
        {
          id: "row-withdrawn",
          title: "Withdrawn role",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-04T00:00:00Z",
          source: "employer",
          publication_state: "withdrawn",
          expires_at: null,
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
      ],
      error: null,
    });
    rpc.mockResolvedValue({
      data: { status: "ok", ready: false, missing: ["salary"] },
      error: null,
    });

    const result = await loadEmployerDrafts(makeClient() as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.drafts.map((d) => d.publicationState)).toEqual([
      "draft",
      "published",
      "withdrawn",
    ]);
  });

  it("only calls the readiness RPC for draft-state rows", async () => {
    orderTwo.mockResolvedValue({
      data: [
        {
          id: "row-draft",
          title: "Draft role",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-04T00:00:00Z",
          source: "employer",
          publication_state: "draft",
          expires_at: null,
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
        {
          id: "row-filled",
          title: "Filled role",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-04T00:00:00Z",
          source: "employer",
          publication_state: "filled",
          expires_at: null,
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
      ],
      error: null,
    });
    rpc.mockResolvedValue({
      data: { status: "ok", ready: true, missing: [] },
      error: null,
    });

    const result = await loadEmployerDrafts(makeClient() as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("employer_vacancy_draft_readiness", {
      p_vacancy_id: "row-draft",
    });
    const filled = result.drafts.find((d) => d.id === "row-filled");
    expect(filled?.ready).toBeNull();
  });

  it("marks a published row with an elapsed expiry as effectively expired", async () => {
    orderTwo.mockResolvedValue({
      data: [
        {
          id: "row-expired-public",
          title: "Stale published role",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-04T00:00:00Z",
          source: "employer",
          publication_state: "published",
          expires_at: "2026-01-01T00:00:00Z",
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
      ],
      error: null,
    });

    const result = await loadEmployerDrafts(makeClient() as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.drafts[0]?.isEffectivelyExpired).toBe(true);
  });
});

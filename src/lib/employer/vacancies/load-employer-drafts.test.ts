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

const draftId = "11111111-1111-4111-8111-111111111111";
const secondDraftId = "22222222-2222-4222-8222-222222222222";
const thirdDraftId = "33333333-3333-4333-8333-333333333333";
const filledId = "44444444-4444-4444-8444-444444444444";

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
          id: draftId,
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
          id: draftId,
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
          id: filledId,
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
    expect(rpc).toHaveBeenCalledWith("employer_vacancy_drafts_readiness", {
      p_vacancy_ids: [draftId],
    });
    const filled = result.drafts.find((d) => d.id === filledId);
    expect(filled?.ready).toBeNull();
  });

  it("batches every draft-state row into one readiness RPC", async () => {
    orderTwo.mockResolvedValue({
      data: [
        {
          id: draftId,
          title: "Draft A",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-05T00:00:00Z",
          source: "employer",
          publication_state: "draft",
          expires_at: null,
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
        {
          id: secondDraftId,
          title: "Draft B",
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
          id: thirdDraftId,
          title: "Draft C",
          job_category: "cleaning",
          public_locality: "Mitte",
          updated_at: "2026-08-03T00:00:00Z",
          source: "employer",
          publication_state: "draft",
          expires_at: null,
          employer_profile_id: "emp-1",
          company_id: null,
          companies: null,
        },
      ],
      error: null,
    });
    rpc.mockResolvedValue({
      data: [
        { vacancy_id: draftId, ready: false, missing: ["salary"] },
        { vacancy_id: secondDraftId, ready: true, missing: [] },
        { vacancy_id: thirdDraftId, ready: false, missing: ["languages"] },
      ],
      error: null,
    });

    const result = await loadEmployerDrafts(makeClient() as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("employer_vacancy_drafts_readiness", {
      p_vacancy_ids: [draftId, secondDraftId, thirdDraftId],
    });
    expect(result.drafts.map((draft) => draft.id)).toEqual([
      draftId,
      secondDraftId,
      thirdDraftId,
    ]);
    expect(result.drafts.map((draft) => draft.ready)).toEqual([
      false,
      true,
      false,
    ]);
    expect(
      result.drafts[0]?.checklist.find((item) => item.id === "salary")
        ?.complete,
    ).toBe(false);
  });

  it("does not call readiness when there are zero draft-state rows", async () => {
    orderTwo.mockResolvedValue({
      data: [
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
      ],
      error: null,
    });

    const result = await loadEmployerDrafts(makeClient() as never);

    expect(result.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
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

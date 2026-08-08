import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const confirmAccountDeletion = vi.hoisted(() => vi.fn());
const cancelPendingAccountDeletion = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { signOut },
  })),
}));

vi.mock("@/lib/account-deletion/self-service", () => ({
  confirmAccountDeletion,
  cancelPendingAccountDeletion,
}));

import {
  cancelCandidateAccountDeletionAction,
  confirmCandidateAccountDeletionAction,
} from "@/app/candidate/account/delete/actions";

describe("confirmCandidateAccountDeletionAction", () => {
  beforeEach(() => {
    signOut.mockClear();
    confirmAccountDeletion.mockReset();
  });

  it("never signs out itself — session teardown is a separate, explicit follow-up step so the success message can render first", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "completed" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "completed" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("propagates a processing outcome unchanged", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "processing" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "processing" });
  });

  it("propagates a failure outcome unchanged", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "failure" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "failure" });
  });
});

describe("cancelCandidateAccountDeletionAction", () => {
  beforeEach(() => {
    cancelPendingAccountDeletion.mockReset();
  });

  it("returns the cancellation outcome unchanged", async () => {
    cancelPendingAccountDeletion.mockResolvedValue({ status: "cancelled" });

    const result = await cancelCandidateAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "cancelled" });
  });
});

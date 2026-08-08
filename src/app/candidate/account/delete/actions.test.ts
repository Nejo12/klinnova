import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const createServerSupabaseClient = vi.hoisted(() =>
  vi.fn(async () => ({
    auth: { signOut },
  })),
);
const confirmAccountDeletion = vi.hoisted(() => vi.fn());
const cancelPendingAccountDeletion = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

vi.mock("@/lib/account-deletion/self-service", () => ({
  confirmAccountDeletion,
  cancelPendingAccountDeletion,
}));

import {
  cancelCandidateAccountDeletionAction,
  confirmCandidateAccountDeletionAction,
} from "@/app/candidate/account/delete/actions";

function confirmedFormData(): FormData {
  const formData = new FormData();
  formData.set("confirmAccountDeletion", "yes");
  return formData;
}

describe("confirmCandidateAccountDeletionAction", () => {
  beforeEach(() => {
    signOut.mockClear();
    createServerSupabaseClient.mockClear();
    confirmAccountDeletion.mockReset();
  });

  it("denies deletion when the confirmation field is missing — never reaches the Supabase client or the self-service RPC", async () => {
    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "confirmation_required" });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(confirmAccountDeletion).not.toHaveBeenCalled();
  });

  it("denies deletion when the confirmation field has the wrong value — never reaches the Supabase client or the self-service RPC", async () => {
    const formData = new FormData();
    formData.set("confirmAccountDeletion", "true");

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      formData,
    );

    expect(result).toEqual({ status: "confirmation_required" });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(confirmAccountDeletion).not.toHaveBeenCalled();
  });

  it("proceeds with the normal deletion flow when the exact confirmation value is present", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "processing" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      confirmedFormData(),
    );

    expect(result).toEqual({ status: "processing" });
    expect(confirmAccountDeletion).toHaveBeenCalledTimes(1);
  });

  it("never signs out itself — session teardown is a separate, explicit follow-up step so the success message can render first", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "completed" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      confirmedFormData(),
    );

    expect(result).toEqual({ status: "completed" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("propagates a processing outcome unchanged", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "processing" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      confirmedFormData(),
    );

    expect(result).toEqual({ status: "processing" });
  });

  it("propagates a failure outcome unchanged", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "failure" });

    const result = await confirmCandidateAccountDeletionAction(
      { status: "idle" },
      confirmedFormData(),
    );

    expect(result).toEqual({ status: "failure" });
  });
});

describe("cancelCandidateAccountDeletionAction", () => {
  beforeEach(() => {
    cancelPendingAccountDeletion.mockReset();
  });

  it("returns the cancellation outcome unchanged, with no destructive-confirmation requirement", async () => {
    cancelPendingAccountDeletion.mockResolvedValue({ status: "cancelled" });

    const result = await cancelCandidateAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "cancelled" });
  });
});

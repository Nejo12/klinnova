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
  cancelEmployerAccountDeletionAction,
  confirmEmployerAccountDeletionAction,
} from "@/app/employer/account/delete/actions";

describe("confirmEmployerAccountDeletionAction", () => {
  beforeEach(() => {
    signOut.mockClear();
    confirmAccountDeletion.mockReset();
  });

  it("never signs out itself — session teardown is a separate, explicit follow-up step so the success message can render first", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "completed" });

    const result = await confirmEmployerAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "completed" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("propagates an unavailable outcome unchanged", async () => {
    confirmAccountDeletion.mockResolvedValue({ status: "unavailable" });

    const result = await confirmEmployerAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "unavailable" });
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("cancelEmployerAccountDeletionAction", () => {
  beforeEach(() => {
    cancelPendingAccountDeletion.mockReset();
  });

  it("returns the cancellation outcome unchanged", async () => {
    cancelPendingAccountDeletion.mockResolvedValue({
      status: "not_cancellable",
    });

    const result = await cancelEmployerAccountDeletionAction(
      { status: "idle" },
      new FormData(),
    );

    expect(result).toEqual({ status: "not_cancellable" });
  });
});

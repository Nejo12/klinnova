import { beforeEach, describe, expect, it, vi } from "vitest";
const { save, revalidatePath } = vi.hoisted(() => ({
  save: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/notification-preferences/current-preference", () => ({
  saveCurrentEmailPreference: save,
}));
import { saveCandidateEmailPreference } from "./actions";
describe("candidate preference action", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([true, false])("fixes role/category for %s", async (enabled) => {
    save.mockResolvedValue({ status: "saved", enabled });
    expect(await saveCandidateEmailPreference(enabled)).toEqual({
      status: "saved",
      enabled,
    });
    expect(save).toHaveBeenCalledWith("candidate_application_updates", enabled);
    expect(revalidatePath).toHaveBeenCalledWith(
      "/candidate/account/notifications",
    );
  });
  it("does not revalidate or claim success on denied/failed persistence", async () => {
    save.mockResolvedValue({ status: "failure" });
    expect(await saveCandidateEmailPreference(false)).toEqual({
      status: "failure",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

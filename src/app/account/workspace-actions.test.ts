import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAccountCapabilities = vi.hoisted(() => vi.fn());
const writeActiveWorkspace = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/employer/load-capabilities", () => ({
  loadAccountCapabilities,
}));
vi.mock("@/lib/workspace/active-workspace.server", () => ({
  writeActiveWorkspace,
}));

import { activateWorkspaceAction } from "@/app/account/workspace-actions";

function form(workspace: string): FormData {
  const data = new FormData();
  data.set("workspace", workspace);
  return data;
}

describe("activateWorkspaceAction", () => {
  beforeEach(() => {
    redirect.mockClear();
    writeActiveWorkspace.mockReset();
    loadAccountCapabilities.mockReset();
  });

  it("switches a dual account by changing only browser-local presentation state", async () => {
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });

    await expect(activateWorkspaceAction(form("employer"))).rejects.toThrow(
      "REDIRECT:/employer",
    );
    expect(writeActiveWorkspace).toHaveBeenCalledWith("employer");
  });

  it("routes an explicit missing employer capability to its existing onboarding", async () => {
    loadAccountCapabilities.mockResolvedValue({
      hasCandidateProfile: true,
      hasEmployerProfile: false,
    });

    await expect(activateWorkspaceAction(form("employer"))).rejects.toThrow(
      "REDIRECT:/employer/onboarding",
    );
    expect(writeActiveWorkspace).toHaveBeenCalledWith("employer");
  });

  it("rejects unknown workspace values before persistence", async () => {
    await expect(activateWorkspaceAction(form("admin"))).rejects.toThrow(
      "REDIRECT:/account/choose",
    );
    expect(writeActiveWorkspace).not.toHaveBeenCalled();
    expect(loadAccountCapabilities).not.toHaveBeenCalled();
  });

  it("does not persist when capability loading cannot confirm a session", async () => {
    loadAccountCapabilities.mockResolvedValue(null);

    await expect(activateWorkspaceAction(form("candidate"))).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(writeActiveWorkspace).not.toHaveBeenCalled();
  });
});

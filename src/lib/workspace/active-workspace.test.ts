import { describe, expect, it } from "vitest";

import {
  isActiveWorkspace,
  resolveActiveWorkspace,
  workspaceHref,
} from "@/lib/workspace/active-workspace";

describe("active workspace", () => {
  it("accepts only the two presentation workspaces", () => {
    expect(isActiveWorkspace("candidate")).toBe(true);
    expect(isActiveWorkspace("employer")).toBe(true);
    expect(isActiveWorkspace("admin")).toBe(false);
  });

  it("uses a dual-capability preference without changing capabilities", () => {
    const capabilities = {
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    };

    expect(
      resolveActiveWorkspace({ capabilities, preference: "candidate" }),
    ).toBe("candidate");
    expect(
      resolveActiveWorkspace({ capabilities, preference: "employer" }),
    ).toBe("employer");
    expect(capabilities).toEqual({
      hasCandidateProfile: true,
      hasEmployerProfile: true,
    });
  });

  it("ignores a stale preference that is not backed by a profile", () => {
    expect(
      resolveActiveWorkspace({
        capabilities: {
          hasCandidateProfile: true,
          hasEmployerProfile: false,
        },
        preference: "employer",
      }),
    ).toBe("candidate");
  });

  it("leaves an unresolved dual account for the legacy chooser", () => {
    expect(
      resolveActiveWorkspace({
        capabilities: {
          hasCandidateProfile: true,
          hasEmployerProfile: true,
        },
        preference: null,
      }),
    ).toBeNull();
  });

  it("maps workspaces to their bounded product roots", () => {
    expect(workspaceHref("candidate")).toBe("/candidate");
    expect(workspaceHref("employer")).toBe("/employer");
  });
});

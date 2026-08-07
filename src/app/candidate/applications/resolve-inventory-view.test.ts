import { describe, expect, it } from "vitest";

import { resolveInventoryPageView } from "@/app/candidate/applications/resolve-inventory-view";

describe("resolveInventoryPageView", () => {
  it("redirects unauthenticated to login with a safe next", () => {
    expect(resolveInventoryPageView({ status: "unauthenticated" })).toEqual({
      kind: "redirect",
      href: "/login?next=/candidate/applications",
    });
  });

  it("redirects a missing profile to a generic auth error", () => {
    expect(resolveInventoryPageView({ status: "profile_missing" })).toEqual({
      kind: "redirect",
      href: "/auth/error?reason=profile",
    });
  });

  it("redirects an incomplete candidate to onboarding", () => {
    expect(resolveInventoryPageView({ status: "incomplete" })).toEqual({
      kind: "redirect",
      href: "/candidate/onboarding",
    });
  });

  it("resolves success with the applications array unchanged", () => {
    const applications = [{ id: "a" }] as never;
    expect(resolveInventoryPageView({ status: "ready", applications })).toEqual(
      { kind: "success", applications },
    );
  });

  it("resolves failure to a failure view", () => {
    expect(resolveInventoryPageView({ status: "failure" })).toEqual({
      kind: "failure",
    });
  });
});

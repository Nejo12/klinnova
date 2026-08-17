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
    const applications = [{ id: "a", status: "submitted" }] as never;
    expect(resolveInventoryPageView({ status: "ready", applications })).toEqual(
      {
        kind: "success",
        applications,
        active: applications,
        closed: [],
      },
    );
  });

  it("splits mixed-status applications into active/closed, preserving order", () => {
    const submitted = { id: "a", status: "submitted" };
    const reviewing = { id: "b", status: "reviewing" };
    const shortlisted = { id: "c", status: "shortlisted" };
    const accepted = { id: "d", status: "accepted" };
    const rejected = { id: "e", status: "rejected" };
    const applications = [
      submitted,
      accepted,
      reviewing,
      rejected,
      shortlisted,
    ] as never;

    expect(resolveInventoryPageView({ status: "ready", applications })).toEqual(
      {
        kind: "success",
        applications,
        active: [submitted, reviewing, shortlisted],
        closed: [accepted, rejected],
      },
    );
  });

  it("resolves failure to a failure view", () => {
    expect(resolveInventoryPageView({ status: "failure" })).toEqual({
      kind: "failure",
    });
  });
});

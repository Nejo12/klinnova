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

  it("splits mixed-status applications into active/closed, preserving true input order (not canonical status rank)", () => {
    const submitted = { id: "a", status: "submitted" };
    const reviewing = { id: "b", status: "reviewing" };
    const shortlisted = { id: "c", status: "shortlisted" };
    const accepted = { id: "d", status: "accepted" };
    const rejected = { id: "e", status: "rejected" };
    // Deliberately inverted relative to canonical status rank within each
    // group (shortlisted before submitted/reviewing; rejected before
    // accepted), so a buggy implementation that grouped by iterating
    // ACTIVE_STATUSES/CLOSED in canonical order (rather than a true
    // order-preserving filter over the input array) would produce a
    // different, wrong result here.
    const applications = [
      shortlisted,
      rejected,
      submitted,
      accepted,
      reviewing,
    ] as never;

    expect(resolveInventoryPageView({ status: "ready", applications })).toEqual(
      {
        kind: "success",
        applications,
        active: [shortlisted, submitted, reviewing],
        closed: [rejected, accepted],
      },
    );
  });

  it("resolves failure to a failure view", () => {
    expect(resolveInventoryPageView({ status: "failure" })).toEqual({
      kind: "failure",
    });
  });
});

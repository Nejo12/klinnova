import { describe, expect, it } from "vitest";

import { parseApplicationListFilters } from "@/lib/employer/applications/parse-list-filters";

const vacancyId = "22222222-2222-4222-8222-222222222222";

describe("parseApplicationListFilters", () => {
  it("returns no filters for an empty query", () => {
    expect(parseApplicationListFilters({})).toEqual({
      vacancyId: null,
      status: null,
    });
  });

  it("accepts a valid vacancy id and status", () => {
    expect(
      parseApplicationListFilters({ vacancy: vacancyId, status: "reviewing" }),
    ).toEqual({ vacancyId, status: "reviewing" });
  });

  it("normalizes a malformed vacancy id to no filter, never crashing", () => {
    expect(
      parseApplicationListFilters({
        vacancy: "not-a-uuid",
        status: "reviewing",
      }),
    ).toEqual({ vacancyId: null, status: "reviewing" });
  });

  it("normalizes an unknown status to no filter", () => {
    expect(
      parseApplicationListFilters({ vacancy: vacancyId, status: "archived" }),
    ).toEqual({ vacancyId, status: null });
  });

  it("takes the first value when a query param repeats", () => {
    expect(
      parseApplicationListFilters({ status: ["reviewing", "accepted"] }),
    ).toEqual({ vacancyId: null, status: "reviewing" });
  });

  it("never throws on unexpected input shapes", () => {
    expect(() =>
      parseApplicationListFilters({ vacancy: "", status: "" }),
    ).not.toThrow();
  });
});

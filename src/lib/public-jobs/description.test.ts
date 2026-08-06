import { describe, expect, it } from "vitest";

import { splitDescriptionParagraphs } from "@/lib/public-jobs/description";

describe("splitDescriptionParagraphs", () => {
  it("splits multi-paragraph input on blank lines", () => {
    expect(splitDescriptionParagraphs("First.\n\nSecond.")).toEqual([
      "First.",
      "Second.",
    ]);
  });

  it("returns a single-item array for single-paragraph input", () => {
    expect(splitDescriptionParagraphs("Only one paragraph.")).toEqual([
      "Only one paragraph.",
    ]);
  });

  it("trims leading and trailing blank lines", () => {
    expect(splitDescriptionParagraphs("\n\nFirst.\n\n")).toEqual(["First."]);
  });

  it("returns an empty array for all-blank input", () => {
    expect(splitDescriptionParagraphs("\n\n   \n\n")).toEqual([]);
  });
});

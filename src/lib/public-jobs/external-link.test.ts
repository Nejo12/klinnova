import { describe, expect, it } from "vitest";

import { safeExternalHref } from "@/lib/public-jobs/external-link";

describe("safeExternalHref", () => {
  it("returns null for null input", () => {
    expect(safeExternalHref(null)).toBeNull();
  });

  it("accepts a valid https URL", () => {
    expect(safeExternalHref("https://example.test")).toBe(
      "https://example.test/",
    );
  });

  it("accepts a valid http URL", () => {
    expect(safeExternalHref("http://example.test")).toBe(
      "http://example.test/",
    );
  });

  it("rejects a javascript: scheme", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
  });

  it("rejects a mailto: scheme", () => {
    expect(safeExternalHref("mailto:someone@example.test")).toBeNull();
  });

  it("rejects a garbage string", () => {
    expect(safeExternalHref("not a url")).toBeNull();
  });

  it("rejects a protocol-relative URL", () => {
    expect(safeExternalHref("//evil.example")).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const tokensCss = readFileSync(
  path.join(process.cwd(), "src/styles/tokens.css"),
  "utf-8",
);

function readDeclaration(property: string): string {
  const match = tokensCss.match(new RegExp(`--${property}:\\s*([^;]+);`, "s"));
  const value = match?.[1];
  if (value === undefined) {
    throw new Error(`--${property} not declared in tokens.css`);
  }
  return value.replace(/\s+/g, " ").trim();
}

function hasDeclaration(property: string): boolean {
  return new RegExp(`--${property}:`).test(tokensCss);
}

describe("KDS-TM2.1 font stack", () => {
  test("--font-family-ui leads with the native system stack", () => {
    const value = readDeclaration("font-family-ui");
    expect(value.startsWith("-apple-system")).toBe(true);
    expect(value).toContain("BlinkMacSystemFont");
    expect(value).toContain('"Segoe UI"');
  });

  test("--font-family-ui never references Inter", () => {
    const value = readDeclaration("font-family-ui");
    expect(value).not.toMatch(/\bInter\b/);
  });

  test("--font-family-mono is unchanged", () => {
    const value = readDeclaration("font-family-mono");
    expect(value).toBe(
      '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    );
  });
});

describe("KDS-TM2.1 typography weights", () => {
  test("400/500/600 remain the principal weights and 700 remains available", () => {
    expect(readDeclaration("font-weight-regular")).toBe("400");
    expect(readDeclaration("font-weight-medium")).toBe("500");
    expect(readDeclaration("font-weight-semibold")).toBe("600");
    expect(readDeclaration("font-weight-bold")).toBe("700");
  });
});

describe("KDS-TM2.1 semantic typography roles", () => {
  const roles = [
    "display",
    "heading",
    "subheading",
    "body",
    "body-supporting",
    "label",
    "caption",
  ];

  test.each(roles)("--type-%s-* resolves through primitive tokens", (role) => {
    const size = readDeclaration(`type-${role}-size`);
    const lineHeight = readDeclaration(`type-${role}-line-height`);
    const weight = readDeclaration(`type-${role}-weight`);
    const tracking = readDeclaration(`type-${role}-tracking`);

    for (const value of [size, lineHeight, weight, tracking]) {
      expect(value.startsWith("var(--")).toBe(true);
    }
  });
});

describe("KDS-TM2.1 motion tokens", () => {
  test("semantic duration hierarchy matches the approved values", () => {
    expect(readDeclaration("duration-instant")).toBe("80ms");
    expect(readDeclaration("duration-fast")).toBe("160ms");
    expect(readDeclaration("duration-standard")).toBe("240ms");
    expect(readDeclaration("duration-deliberate")).toBe("380ms");
  });

  test("obsolete duration names are not present", () => {
    expect(hasDeclaration("duration-normal")).toBe(false);
    expect(hasDeclaration("duration-slow")).toBe(false);
  });

  test("easing curves are unchanged", () => {
    expect(readDeclaration("ease-standard")).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(readDeclaration("ease-enter")).toBe("cubic-bezier(0, 0, 0.2, 1)");
    expect(readDeclaration("ease-exit")).toBe("cubic-bezier(0.4, 0, 1, 1)");
  });
});

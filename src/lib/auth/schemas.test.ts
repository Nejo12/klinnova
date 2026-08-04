import { describe, expect, it } from "vitest";

import {
  loginSchema,
  parseInternalNextPath,
  registerSchema,
  safeNextPath,
} from "@/lib/auth/schemas";

describe("registerSchema", () => {
  it("accepts valid registration input and lowercases email", () => {
    const parsed = registerSchema.safeParse({
      displayName: " Ada ",
      email: "Ada@Example.COM",
      password: "password123",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBe("Ada");
      expect(parsed.data.email).toBe("ada@example.com");
    }
  });

  it("rejects empty display name", () => {
    expect(
      registerSchema.safeParse({
        displayName: "   ",
        email: "ada@example.com",
        password: "password123",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Ada",
        email: "not-an-email",
        password: "password123",
      }).success,
    ).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Ada",
        email: "ada@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(
      loginSchema.safeParse({
        email: "ada@example.com",
        password: "",
      }).success,
    ).toBe(false);
  });
});

describe("parseInternalNextPath", () => {
  it("returns null for empty or unsafe values", () => {
    expect(parseInternalNextPath("")).toBeNull();
    expect(parseInternalNextPath(null)).toBeNull();
    expect(parseInternalNextPath("//evil.example")).toBeNull();
    expect(parseInternalNextPath("https://evil.example")).toBeNull();
  });

  it("returns employer and candidate relative paths", () => {
    expect(parseInternalNextPath("/employer/onboarding")).toBe(
      "/employer/onboarding",
    );
    expect(parseInternalNextPath("/candidate")).toBe("/candidate");
  });
});

describe("safeNextPath", () => {
  it("allows relative candidate paths", () => {
    expect(safeNextPath("/candidate")).toBe("/candidate");
    expect(safeNextPath("/candidate/settings")).toBe("/candidate/settings");
  });

  it("rejects protocol-relative, absolute, and encoded external forms", () => {
    expect(safeNextPath("//evil.example")).toBe("/candidate");
    expect(safeNextPath("https://evil.example")).toBe("/candidate");
    expect(safeNextPath("/%2f%2fevil.example")).toBe("/candidate");
    expect(safeNextPath("")).toBe("/candidate");
    expect(safeNextPath(null)).toBe("/candidate");
  });
});

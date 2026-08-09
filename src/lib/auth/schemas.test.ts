import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  parseInternalNextPath,
  registerSchema,
  resetPasswordSchema,
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

describe("forgotPasswordSchema (M5.1 Unit C)", () => {
  it("accepts a valid email and lowercases it", () => {
    const parsed = forgotPasswordSchema.safeParse({
      email: "Ada@Example.COM",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ada@example.com");
    }
  });

  it("rejects an invalid email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema (M5.1 Unit C)", () => {
  it("accepts matching passwords at the minimum length", () => {
    const parsed = resetPasswordSchema.safeParse({
      password: "password1",
      confirmPassword: "password1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects mismatched passwords, attributed to confirmPassword", () => {
    const parsed = resetPasswordSchema.safeParse({
      password: "password1",
      confirmPassword: "password2",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "short1",
        confirmPassword: "short1",
      }).success,
    ).toBe(false);
  });

  it("rejects a password longer than 72 characters", () => {
    const long = "a".repeat(73);
    expect(
      resetPasswordSchema.safeParse({
        password: long,
        confirmPassword: long,
      }).success,
    ).toBe(false);
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

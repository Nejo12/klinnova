import { z } from "zod";

/** Display name: required, trimmed, app-level length cap (docs/17). */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name.")
  .max(80, "Display name must be 80 characters or fewer.");

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(255)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Safe internal redirect: relative path only.
 * Rejects scheme-bearing, protocol-relative, and encoded external forms.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (value === undefined || value === null || value.length === 0) {
    return "/candidate";
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/candidate";
  }

  if (!decoded.startsWith("/")) {
    return "/candidate";
  }
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return "/candidate";
  }
  if (decoded.includes("://") || decoded.includes("\\")) {
    return "/candidate";
  }
  if (/[\u0000-\u001f\u007f]/.test(decoded)) {
    return "/candidate";
  }

  return decoded;
}

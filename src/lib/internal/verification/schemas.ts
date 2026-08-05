import { z } from "zod";

export const employerProfileIdSchema = z
  .string()
  .uuid("Invalid employer profile.");

const booleanFromForm = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean"
      ? value
      : value === "true" || value === "on" || value === "1",
  );

export const approveVerificationFormSchema = z.object({
  employerProfileId: employerProfileIdSchema,
  confirmApprove: booleanFromForm.refine((value) => value === true, {
    message: "Confirm before approving this request.",
  }),
});

export const rejectVerificationFormSchema = z.object({
  employerProfileId: employerProfileIdSchema,
  reason: z
    .string()
    .trim()
    .min(1, "Enter a rejection reason.")
    .max(500, "Rejection reason is too long."),
  confirmReject: booleanFromForm.refine((value) => value === true, {
    message: "Confirm before rejecting this request.",
  }),
});

export const approveVerificationRpcResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      employer_profile_id: z.string().uuid(),
    }),
    z.object({ status: z.literal("unauthenticated") }),
    z.object({ status: z.literal("forbidden") }),
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("incomplete") }),
    z.object({ status: z.literal("invalid_state") }),
  ],
);

export const rejectVerificationRpcResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      employer_profile_id: z.string().uuid(),
    }),
    z.object({ status: z.literal("unauthenticated") }),
    z.object({ status: z.literal("forbidden") }),
    z.object({ status: z.literal("validation_error") }),
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("invalid_state") }),
  ],
);

const employerTypeSchema = z.enum(["private", "organisation"]);

/**
 * `RETURNS TABLE` functions are not reliably typed for nullability by
 * `supabase gen types` (see generated `database.ts`, which claims every
 * column is non-null). company_name, website, berlin_locality,
 * display_name, verification_reviewed_at, and verification_review_reason
 * are genuinely nullable in the underlying employer_profiles/companies
 * columns, so this schema — not the generated type — is the nullability
 * source of truth for these two RPCs.
 */
export const pendingVerificationRowSchema = z.object({
  employer_profile_id: z.string().uuid(),
  employer_type: employerTypeSchema,
  display_name: z.string().nullable(),
  company_name: z.string().nullable(),
  website: z.string().nullable(),
  onboarding_completed: z.boolean(),
  verification_state: z.literal("pending"),
  verification_requested_at: z.string(),
  verification_attested_at: z.string(),
  verification_attestation_version: z.string(),
});

export const pendingVerificationListSchema = z.array(
  pendingVerificationRowSchema,
);

export const verificationReviewRowSchema = z.object({
  employer_profile_id: z.string().uuid(),
  employer_type: employerTypeSchema,
  display_name: z.string().nullable(),
  company_name: z.string().nullable(),
  website: z.string().nullable(),
  berlin_locality: z.string().nullable(),
  onboarding_completed: z.boolean(),
  verification_state: z.enum(["pending", "verified", "rejected"]),
  verification_requested_at: z.string(),
  verification_attested_at: z.string(),
  verification_attestation_version: z.string(),
  verification_reviewed_at: z.string().nullable(),
  verification_review_reason: z.string().nullable(),
});

export const verificationReviewListSchema = z.array(
  verificationReviewRowSchema,
);

export type PendingVerificationRpcRow = z.infer<
  typeof pendingVerificationRowSchema
>;
export type VerificationReviewRpcRow = z.infer<
  typeof verificationReviewRowSchema
>;

import { z } from "zod";

export const employerTypeSchema = z.enum(["private", "organisation"], {
  error: "Choose whether you hire as a private person or an organisation.",
});

export type EmployerType = z.infer<typeof employerTypeSchema>;

const optionalTrimmed = z
  .string()
  .trim()
  .max(120, "Must be 120 characters or fewer.")
  .optional()
  .transform((value) =>
    value === undefined || value.length === 0 ? null : value,
  );

const requiredTrimmed = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const phoneSchema = z
  .string()
  .trim()
  .max(40, "Phone must be 40 characters or fewer.")
  .regex(/^[\d+\s()./-]*$/, "Enter a valid phone number.")
  .optional()
  .transform((value) =>
    value === undefined || value.length === 0 ? null : value,
  );

export const websiteSchema = z
  .string()
  .trim()
  .max(255, "Website must be 255 characters or fewer.")
  .refine(
    (value) =>
      value.length === 0 ||
      /^https?:\/\/[^\s]+$/i.test(value) ||
      /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(value),
    "Enter a valid website address.",
  )
  .optional()
  .transform((value) => {
    if (value === undefined || value.length === 0) {
      return null;
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    return `https://${value}`;
  });

/** URL-safe company slug matching nonempty trimmed uniqueness in companies.slug. */
export const companySlugSchema = z
  .string()
  .trim()
  .min(2, "Enter a company slug.")
  .max(80, "Company slug must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens only.",
  );

export const selectEmployerTypeSchema = z.object({
  employerType: employerTypeSchema,
});

export const privateEmployerProfileSchema = z.object({
  displayName: requiredTrimmed("a display name", 80),
  berlinLocality: requiredTrimmed("a Berlin locality", 120),
  phone: phoneSchema,
  website: websiteSchema,
  lawfulHiringDeclared: z
    .enum(["yes", "no"])
    .optional()
    .transform((value) => value === "yes"),
});

export const organisationEmployerProfileSchema = z.object({
  displayName: requiredTrimmed("a display name", 80),
  organisationLegalName: requiredTrimmed("the organisation legal name", 160),
  berlinLocality: requiredTrimmed("a Berlin locality", 120),
  companyName: requiredTrimmed("a company name", 160),
  companySlug: companySlugSchema,
  phone: phoneSchema,
  website: websiteSchema,
  lawfulHiringDeclared: z
    .enum(["yes", "no"])
    .optional()
    .transform((value) => value === "yes"),
});

export const completeEmployerOnboardingResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("unauthenticated") }),
    z.object({ status: z.literal("missing_profile") }),
    z.object({
      status: z.literal("incomplete"),
      first_incomplete_reason: z.string(),
    }),
    z.object({
      status: z.literal("completed"),
      already_complete: z.boolean(),
    }),
  ],
);

export const bootstrapOrganisationResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("unauthenticated") }),
    z.object({ status: z.literal("validation_error") }),
    z.object({ status: z.literal("conflict_private_completed") }),
    z.object({ status: z.literal("conflict_private_with_company") }),
    z.object({ status: z.literal("conflict_unique") }),
    z.object({ status: z.literal("conflict_check") }),
    z.object({
      status: z.literal("ok"),
      employer_id: z.string().uuid(),
      company_id: z.string().uuid(),
    }),
  ],
);

export type PrivateEmployerProfileInput = z.infer<
  typeof privateEmployerProfileSchema
>;
export type OrganisationEmployerProfileInput = z.infer<
  typeof organisationEmployerProfileSchema
>;

/** Unused helper kept for optional partial locality saves in tests. */
export const optionalLocalitySchema = optionalTrimmed;

import { z } from "zod";

export const employerProfileIdSchema = z
  .string()
  .uuid("Invalid employer profile.");

export const vacancyIdSchema = z.string().uuid("Invalid vacancy.");

const employerTypeSchema = z.enum(["private", "organisation"]);

const verificationStateSchema = z.enum([
  "unverified",
  "pending",
  "verified",
  "rejected",
  "revoked",
]);

const publicationStateSchema = z.enum([
  "draft",
  "published",
  "paused",
  "filled",
  "expired",
  "withdrawn",
]);

export const auditEventTypeSchema = z.enum([
  "employer_suspended",
  "employer_unsuspended",
  "vacancy_moderated",
  "vacancy_restored",
  "verification_approved",
  "verification_rejected",
  "verification_revoked",
]);

/**
 * `RETURNS TABLE` nullability is not reliably typed by `supabase gen types`
 * (every column claims non-null) — this schema, not the generated type, is
 * the nullability source of truth, matching the existing
 * `internal/verification/schemas.ts` convention.
 */
export const operatorEmployerListRowSchema = z.object({
  employer_profile_id: z.string().uuid(),
  employer_type: employerTypeSchema,
  display_name: z.string().nullable(),
  company_name: z.string().nullable(),
  onboarding_completed: z.boolean(),
  verification_state: verificationStateSchema,
  suspended: z.boolean(),
  suspended_at: z.string().nullable(),
  created_at: z.string(),
});

export const operatorEmployerListSchema = z.array(
  operatorEmployerListRowSchema,
);

const auditEventItemSchema = z.object({
  event_type: auditEventTypeSchema,
  occurred_at: z.string(),
  reason: z.string().nullable(),
});

export const employerModerationStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({
    status: z.literal("ready"),
    employer_profile_id: z.string().uuid(),
    employer_type: employerTypeSchema,
    display_name: z.string().nullable(),
    company_name: z.string().nullable(),
    onboarding_completed: z.boolean(),
    verification_state: verificationStateSchema,
    suspended: z.boolean(),
    suspended_at: z.string().nullable(),
    suspended_reason: z.string().nullable(),
    audit_events: z.array(auditEventItemSchema),
  }),
]);

export const operatorVacancyListRowSchema = z.object({
  vacancy_id: z.string().uuid(),
  title: z.string(),
  publication_state: publicationStateSchema,
  moderated: z.boolean(),
  moderated_at: z.string().nullable(),
  published_at: z.string().nullable(),
});

export const operatorVacancyListSchema = z.array(operatorVacancyListRowSchema);

export const vacancyModerationStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({
    status: z.literal("ready"),
    vacancy_id: z.string().uuid(),
    title: z.string(),
    employer_profile_id: z.string().uuid(),
    publication_state: publicationStateSchema,
    moderated: z.boolean(),
    moderated_at: z.string().nullable(),
    moderated_reason: z.string().nullable(),
    audit_events: z.array(auditEventItemSchema),
  }),
]);

// ---------------------------------------------------------------------------
// Write RPC result contracts
// ---------------------------------------------------------------------------

export const suspendEmployerRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), employer_profile_id: z.string().uuid() }),
  z.object({
    status: z.literal("already_in_state"),
    employer_profile_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("validation_error") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const unsuspendEmployerRpcResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    employer_profile_id: z.string().uuid(),
  }),
  z.object({
    status: z.literal("already_in_state"),
    employer_profile_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const moderateVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({
    status: z.literal("already_in_state"),
    vacancy_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("validation_error") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const restoreVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({
    status: z.literal("already_in_state"),
    vacancy_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("forbidden") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const revokeVerificationRpcResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      employer_profile_id: z.string().uuid(),
      paused_vacancy_count: z.number(),
    }),
    z.object({ status: z.literal("unauthenticated") }),
    z.object({ status: z.literal("forbidden") }),
    z.object({ status: z.literal("validation_error") }),
    z.object({ status: z.literal("unavailable") }),
    z.object({ status: z.literal("invalid_state") }),
  ],
);

// ---------------------------------------------------------------------------
// Form schemas
// ---------------------------------------------------------------------------

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Enter a reason.")
  .max(500, "Reason is too long.");

const booleanFromForm = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean"
      ? value
      : value === "true" || value === "on" || value === "1",
  );

const confirmSchema = (message: string) =>
  booleanFromForm.refine((value) => value === true, { message });

export const suspendEmployerFormSchema = z.object({
  employerProfileId: employerProfileIdSchema,
  reason: reasonSchema,
  confirmSuspend: confirmSchema("Confirm before suspending this employer."),
});

export const unsuspendEmployerFormSchema = z.object({
  employerProfileId: employerProfileIdSchema,
  confirmUnsuspend: confirmSchema("Confirm before unsuspending this employer."),
});

export const revokeVerificationFormSchema = z.object({
  employerProfileId: employerProfileIdSchema,
  reason: reasonSchema,
  confirmRevoke: confirmSchema("Confirm before revoking verification."),
});

export const moderateVacancyFormSchema = z.object({
  vacancyId: vacancyIdSchema,
  reason: reasonSchema,
  confirmModerate: confirmSchema("Confirm before moderating this vacancy."),
});

export const restoreVacancyFormSchema = z.object({
  vacancyId: vacancyIdSchema,
  confirmRestore: confirmSchema("Confirm before restoring this vacancy."),
});

export type OperatorEmployerListRow = z.infer<
  typeof operatorEmployerListRowSchema
>;
export type EmployerModerationStatus = z.infer<
  typeof employerModerationStatusSchema
>;
export type OperatorVacancyListRow = z.infer<
  typeof operatorVacancyListRowSchema
>;
export type VacancyModerationStatus = z.infer<
  typeof vacancyModerationStatusSchema
>;
export type AuditEventType = z.infer<typeof auditEventTypeSchema>;

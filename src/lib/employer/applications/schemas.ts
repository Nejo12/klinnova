import { z } from "zod";

import { applicationStatusSchema } from "@/lib/employer/applications/status";
import { isValidIsoCalendarDate } from "@/lib/matching/rules";
import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  SHIFT_PREFERENCE_CODES,
} from "@/lib/onboarding/allow-lists";

const isoCalendarDateSchema = z
  .string()
  .refine(isValidIsoCalendarDate, { message: "Invalid ISO calendar date" });

const languageSnapshotSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

// ---------------------------------------------------------------------------
// list_current_employer_applications — whole-response-fails-on-malformed-row.
// Field names/order match the generated Functions["list_current_employer_applications"]
// Returns shape exactly (src/types/database.ts); no widening.
// ---------------------------------------------------------------------------

export const employerApplicationListRowSchema = z.object({
  application_id: z.string().uuid(),
  vacancy_id: z.string().uuid(),
  vacancy_title: z.string().min(1),
  candidate_display_name: z.string().min(1),
  job_category: z.enum(JOB_CATEGORY_CODES),
  german_comfort: z.enum(GERMAN_COMFORT_CODES),
  available_from: isoCalendarDateSchema.nullable(),
  current_status: applicationStatusSchema,
  submitted_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const employerApplicationListSchema = z.array(
  employerApplicationListRowSchema,
);

export type EmployerApplicationListRow = z.infer<
  typeof employerApplicationListRowSchema
>;

// ---------------------------------------------------------------------------
// get_current_employer_application. The database's allowed_transitions array
// is authoritative (D-070) — this schema validates only that each element is
// a known status and that the array contains no duplicates. It never
// recomputes the transition matrix.
// ---------------------------------------------------------------------------

const allowedTransitionsSchema = z
  .array(applicationStatusSchema)
  .superRefine((values, ctx) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate transition target.",
          path: [index],
        });
      }
      seen.add(value);
    });
  });

const statusHistoryEntrySchema = z.object({
  from_status: applicationStatusSchema.nullable(),
  to_status: applicationStatusSchema,
  reason: z.string().nullable(),
  occurred_at: z.string().min(1),
});

export const employerApplicationDetailSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    application_id: z.string().uuid(),
    vacancy_id: z.string().uuid(),
    vacancy_title: z.string().min(1),
    submitted_at: z.string().min(1),
    current_status: applicationStatusSchema,
    candidate_display_name: z.string().min(1),
    matched_job_category: z.enum(JOB_CATEGORY_CODES),
    german_comfort: z.enum(GERMAN_COMFORT_CODES),
    languages: z.array(languageSnapshotSchema),
    work_authorisation_declared: z.boolean(),
    available_from: isoCalendarDateSchema.nullable(),
    employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)),
    shift_preferences: z.array(z.enum(SHIFT_PREFERENCE_CODES)),
    allowed_transitions: allowedTransitionsSchema,
    status_history: z.array(statusHistoryEntrySchema),
  }),
  z.object({ status: z.literal("unavailable") }),
]);

export type EmployerApplicationDetail = z.infer<
  typeof employerApplicationDetailSchema
>;

export type EmployerApplicationStatusHistoryEntry = z.infer<
  typeof statusHistoryEntrySchema
>;

// ---------------------------------------------------------------------------
// transition_current_employer_application_status result. Discriminant is
// `result`, not `status` — distinct from every vacancy-lifecycle RPC result.
// ---------------------------------------------------------------------------

export const transitionApplicationRpcResultSchema = z.discriminatedUnion(
  "result",
  [
    z.object({
      result: z.literal("updated"),
      application_id: z.string().uuid(),
      previous_status: applicationStatusSchema,
      current_status: applicationStatusSchema,
      occurred_at: z.string().min(1),
    }),
    z.object({
      result: z.literal("already_in_state"),
      application_id: z.string().uuid(),
      current_status: applicationStatusSchema,
    }),
    z.object({ result: z.literal("invalid_transition") }),
    z.object({ result: z.literal("unavailable") }),
    z.object({ result: z.literal("employer_unavailable") }),
  ],
);

// ---------------------------------------------------------------------------
// Form-facing schemas.
// ---------------------------------------------------------------------------

export const applicationIdSchema = z.string().uuid("Invalid application.");

export const applicationListFilterSchema = z.object({
  vacancyId: z.string().uuid().nullable(),
  status: applicationStatusSchema.nullable(),
});

export type ApplicationListFilter = z.infer<typeof applicationListFilterSchema>;

const optionalReason = z
  .string()
  .trim()
  .max(1000, "Reason is too long.")
  .transform((value) => (value.length === 0 ? null : value));

export const transitionFormSchema = z.object({
  applicationId: applicationIdSchema,
  targetStatus: applicationStatusSchema,
  reason: optionalReason,
});

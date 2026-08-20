import { z } from "zod";

import {
  SALARY_PERIOD_CODES,
  type SalaryPeriodCode,
  SHIFT_REQUIREMENT_CODES,
  WORK_FREQUENCY_CODES,
  WORKPLACE_TYPE_CODES,
} from "@/lib/employer/vacancies/allow-lists";
import { eurStringToCents } from "@/lib/employer/vacancies/salary";
import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
} from "@/lib/onboarding/allow-lists";
import { isValidIsoCalendarDate } from "@/lib/matching/rules";

const trimmedNonEmpty = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "This value is too long.")
    .transform((value) => (value.length === 0 ? null : value));

const optionalIsoDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .refine(
    (value) => value === null || isValidIsoCalendarDate(value),
    "Enter a valid date.",
  );

const optionalEnum = <T extends string>(codes: readonly [T, ...T[]]) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value.length === 0) {
        return;
      }
      if (!(codes as readonly string[]).includes(value)) {
        ctx.addIssue({
          code: "custom",
          message: "Choose a valid option.",
        });
      }
    })
    .transform((value) => {
      if (value.length === 0) {
        return null;
      }
      return value as T;
    });

/**
 * A radio group's "no value chosen yet" state is an empty string (missing
 * FormData key) or `undefined` (key omitted from a direct object, as in
 * tests) — never a legitimate "unset" domain value, since every real radio
 * group always has a default-checked option. Both collapse to `fallback`,
 * matching the RPC's own server-side default.
 */
const enumWithDefault = <T extends string>(
  codes: readonly [T, ...T[]],
  fallback: T,
) =>
  z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length === 0 ? fallback : trimmed;
    })
    .pipe(z.enum(codes));

const optionalUniqueArrayEnum = <T extends string>(
  codes: readonly [T, ...T[]],
) =>
  z
    .array(z.enum(codes))
    .superRefine((values, ctx) => {
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          message: "Remove duplicate selections.",
        });
      }
    })
    .default([]);

const booleanFromForm = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    return value === "true" || value === "on" || value === "1";
  });

const optionalBooleanFromForm = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    if (typeof value === "boolean") {
      return value;
    }
    return value === "true" || value === "on" || value === "1";
  });

export type ParsedSalaryFields = {
  clearSalary: boolean;
  salaryAmountCents: number | null;
  salaryPeriod: SalaryPeriodCode | null;
};

export function parseSalaryFields(input: {
  salaryAmountEur: string;
  salaryPeriod: string;
  clearSalary: boolean;
}):
  | { ok: true; value: ParsedSalaryFields }
  | { ok: false; fieldErrors: Record<string, string> } {
  if (input.clearSalary) {
    return {
      ok: true,
      value: {
        clearSalary: true,
        salaryAmountCents: null,
        salaryPeriod: null,
      },
    };
  }

  const amount = input.salaryAmountEur.trim();
  const period = input.salaryPeriod.trim();

  if (amount.length === 0 && period.length === 0) {
    return {
      ok: true,
      value: {
        clearSalary: false,
        salaryAmountCents: null,
        salaryPeriod: null,
      },
    };
  }

  const fieldErrors: Record<string, string> = {};

  if (amount.length === 0) {
    fieldErrors.salaryAmountEur = "Enter a salary amount, or clear salary.";
  } else {
    const cents = eurStringToCents(amount);
    if (!cents.ok) {
      fieldErrors.salaryAmountEur = cents.error;
    }
  }

  if (!(SALARY_PERIOD_CODES as readonly string[]).includes(period)) {
    fieldErrors.salaryPeriod = "Choose a salary period.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const cents = eurStringToCents(amount);
  if (!cents.ok) {
    return {
      ok: false,
      fieldErrors: { salaryAmountEur: cents.error },
    };
  }

  return {
    ok: true,
    value: {
      clearSalary: false,
      salaryAmountCents: cents.cents,
      salaryPeriod: period as SalaryPeriodCode,
    },
  };
}

export const vacancyIdSchema = z.string().uuid("Invalid vacancy.");

export const languageRequirementRowSchema = z.object({
  languageCode: z.enum(LANGUAGE_CODES, {
    error: "Choose a language from the list.",
  }),
  minProficiency: z.enum(LANGUAGE_PROFICIENCY_CODES, {
    error: "Choose a proficiency from the list.",
  }),
});

export const languageRequirementsSchema = z
  .array(languageRequirementRowSchema)
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      if (seen.has(row.languageCode)) {
        ctx.addIssue({
          code: "custom",
          message: "Each language can appear only once.",
          path: [index, "languageCode"],
        });
      }
      seen.add(row.languageCode);
    }
  });

export const createDraftVacancyFormSchema = z.object({
  title: trimmedNonEmpty("Title", 120),
  jobCategory: z.enum(JOB_CATEGORY_CODES, {
    error: "Choose a job category.",
  }),
  publicLocality: trimmedNonEmpty("Berlin public locality", 120),
  description: optionalTrimmed(5000),
  workplaceType: optionalEnum(WORKPLACE_TYPE_CODES),
  workFrequency: optionalEnum(WORK_FREQUENCY_CODES),
  availableFrom: optionalIsoDate,
  experienceNotes: optionalTrimmed(2000),
  germanRequirement: enumWithDefault(GERMAN_COMFORT_CODES, "none"),
  cvRequired: optionalBooleanFromForm,
  interviewEnglishOk: optionalBooleanFromForm,
  employmentTypes: optionalUniqueArrayEnum(EMPLOYMENT_TYPE_CODES),
  shiftRequirements: optionalUniqueArrayEnum(SHIFT_REQUIREMENT_CODES),
  salaryAmountEur: z.string().default(""),
  salaryPeriod: z.string().default(""),
  clearSalary: z.boolean().default(false),
});

export const updateDraftVacancyFormSchema = z.object({
  vacancyId: vacancyIdSchema,
  title: trimmedNonEmpty("Title", 120),
  jobCategory: z.enum(JOB_CATEGORY_CODES, {
    error: "Choose a job category.",
  }),
  publicLocality: trimmedNonEmpty("Berlin public locality", 120),
  description: optionalTrimmed(5000),
  workplaceType: optionalEnum(WORKPLACE_TYPE_CODES),
  workFrequency: optionalEnum(WORK_FREQUENCY_CODES),
  availableFrom: optionalIsoDate,
  clearAvailableFrom: z.boolean().default(false),
  experienceNotes: optionalTrimmed(2000),
  germanRequirement: enumWithDefault(GERMAN_COMFORT_CODES, "none"),
  cvRequired: booleanFromForm,
  interviewEnglishOk: booleanFromForm,
  employmentTypes: optionalUniqueArrayEnum(EMPLOYMENT_TYPE_CODES),
  shiftRequirements: optionalUniqueArrayEnum(SHIFT_REQUIREMENT_CODES),
  salaryAmountEur: z.string().default(""),
  salaryPeriod: z.string().default(""),
  clearSalary: z.boolean().default(false),
});

export const replaceDraftLanguagesSchema = z.object({
  vacancyId: vacancyIdSchema,
  languages: languageRequirementsSchema,
});

export const deleteDraftVacancySchema = z.object({
  vacancyId: vacancyIdSchema,
  confirmTitle: z.string().trim().min(1, "Confirm the draft title to delete."),
});

export const createDraftRpcResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    vacancy_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("validation_error") }),
  z.object({ status: z.literal("missing_profile") }),
  z.object({ status: z.literal("incomplete_employer") }),
  z.object({ status: z.literal("missing_company") }),
  z.object({ status: z.literal("conflict_check") }),
  z.object({ status: z.literal("conflict_unique") }),
]);

export const updateDraftRpcResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    vacancy_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("conflict_check") }),
]);

export const replaceLanguagesRpcResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    vacancy_id: z.string().uuid(),
    language_count: z.number().int().nonnegative(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("validation_error") }),
  z.object({ status: z.literal("conflict_check") }),
  z.object({ status: z.literal("conflict_unique") }),
]);

export const deleteDraftRpcResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    vacancy_id: z.string().uuid(),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("not_deletable") }),
]);

export const readinessRpcResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    ready: z.boolean(),
    missing: z.array(z.string()),
  }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const bulkReadinessRpcRowSchema = z.object({
  vacancy_id: vacancyIdSchema,
  ready: z.boolean(),
  missing: z.array(z.string()),
});

export const bulkReadinessRpcResultSchema = z.array(bulkReadinessRpcRowSchema);

export type LanguageRequirementRow = z.infer<
  typeof languageRequirementRowSchema
>;

// ---------------------------------------------------------------------------
// PR 5.4 — vacancy lifecycle (publish/pause/resume/fill/withdraw/materialize/
// renew). One form/result schema per RPC, matching the exact status literals
// in supabase/migrations/20260805110000_verification_and_vacancy_publication.sql.
// The caller supplies only a vacancy id — never state, timestamps, owner, or
// expiry.
// ---------------------------------------------------------------------------

export const vacancyLifecycleFormSchema = z.object({
  vacancyId: vacancyIdSchema,
});

const confirmedBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean"
      ? value
      : value === "true" || value === "on" || value === "1",
  )
  .refine((value) => value === true, {
    message: "Confirm before continuing.",
  });

/**
 * Consequential lifecycle transitions (publish/pause/resume/fill/withdraw/
 * renew) require an explicit, server-validated confirmation — not just a
 * disabled submit button. `materialize_employer_vacancy_expiry` is
 * idempotent and non-destructive, so it uses the plain
 * `vacancyLifecycleFormSchema` above without a confirmation field.
 */
export const vacancyLifecycleConfirmFormSchema = z.object({
  vacancyId: vacancyIdSchema,
  confirmed: confirmedBoolean,
});

export const publishVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("invalid_state") }),
  z.object({
    status: z.literal("incomplete"),
    missing: z.array(z.string()),
  }),
]);

export const pauseVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("invalid_state") }),
]);

export const resumeVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("invalid_state") }),
  z.object({
    status: z.literal("incomplete"),
    missing: z.array(z.string()),
  }),
]);

export const fillVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("invalid_state") }),
]);

export const withdrawVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("invalid_state") }),
]);

export const materializeExpiryRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const renewVacancyRpcResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), vacancy_id: z.string().uuid() }),
  z.object({ status: z.literal("unauthenticated") }),
  z.object({ status: z.literal("unavailable") }),
  z.object({ status: z.literal("invalid_state") }),
]);

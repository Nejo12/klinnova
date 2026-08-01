import { z } from "zod";

import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  SHIFT_PREFERENCE_CODES,
  TRAVEL_TIME_MINUTES,
  uniqueOrdered,
} from "@/lib/onboarding/allow-lists";

function uniqueArraySchema<T extends string>(
  codes: readonly [T, ...T[]],
  emptyMessage: string,
) {
  return z
    .array(z.enum(codes))
    .superRefine((values, ctx) => {
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          message: "Remove duplicate selections.",
        });
      }
    })
    .transform((values) => uniqueOrdered(values))
    .pipe(
      z.array(z.enum(codes)).min(1, {
        message: emptyMessage,
      }),
    );
}

export const languagesGroupSchema = z.object({
  germanComfort: z.enum(GERMAN_COMFORT_CODES, {
    error: "Choose how comfortable you are using German.",
  }),
  languages: z
    .array(
      z.object({
        languageCode: z.enum(LANGUAGE_CODES, {
          error: "Choose a language from the list.",
        }),
        proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES, {
          error: "Choose a proficiency level.",
        }),
      }),
    )
    .min(1, { message: "Add at least one language." })
    .superRefine((entries, ctx) => {
      const codes = entries.map((entry) => entry.languageCode);
      if (new Set(codes).size !== codes.length) {
        ctx.addIssue({
          code: "custom",
          message: "Each language can only be listed once.",
          path: ["languages"],
        });
      }
    }),
});

export type LanguagesGroupInput = z.infer<typeof languagesGroupSchema>;

/** Partial save for languages group: German comfort alone is allowed mid-flow. */
export const languagesGroupSaveSchema = z.object({
  germanComfort: z.enum(GERMAN_COMFORT_CODES, {
    error: "Choose how comfortable you are using German.",
  }),
  languages: z
    .array(
      z.object({
        languageCode: z.enum(LANGUAGE_CODES),
        proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
      }),
    )
    .superRefine((entries, ctx) => {
      const codes = entries.map((entry) => entry.languageCode);
      if (new Set(codes).size !== codes.length) {
        ctx.addIssue({
          code: "custom",
          message: "Each language can only be listed once.",
          path: ["languages"],
        });
      }
    }),
});

export const workAuthorisationGroupSchema = z.object({
  /**
   * `true` = Yes; `false` = Not sure (keeps profile incomplete; not a legal finding).
   */
  workAuthorisationDeclared: z.enum(["yes", "not_sure"], {
    error: "Choose an option to continue.",
  }),
});

export type WorkAuthorisationGroupInput = z.infer<
  typeof workAuthorisationGroupSchema
>;

export const locationGroupSchema = z.object({
  city: z.literal("Berlin"),
  travelRadiusMinutes: z.coerce
    .number()
    .refine(
      (value): value is (typeof TRAVEL_TIME_MINUTES)[number] =>
        (TRAVEL_TIME_MINUTES as readonly number[]).includes(value),
      { message: "Choose a maximum one-way travel time." },
    ),
});

export type LocationGroupInput = z.infer<typeof locationGroupSchema>;

export const categoriesGroupSchema = z.object({
  jobCategories: uniqueArraySchema(
    JOB_CATEGORY_CODES,
    "Choose at least one job category.",
  ),
});

export type CategoriesGroupInput = z.infer<typeof categoriesGroupSchema>;

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Enter a valid date." });

/** Berlin calendar day as YYYY-MM-DD (UTC date parts for “today” boundary). */
export function berlinTodayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error("Could not resolve Berlin calendar date.");
  }
  return `${year}-${month}-${day}`;
}

export const availabilityGroupSchema = z.object({
  availableFrom: dateStringSchema.superRefine((value, ctx) => {
    const today = berlinTodayIso();
    if (value < today) {
      ctx.addIssue({
        code: "custom",
        message: "Choose today or a future date.",
      });
    }
  }),
});

export type AvailabilityGroupInput = z.infer<typeof availabilityGroupSchema>;

export const employmentGroupSchema = z.object({
  employmentTypes: uniqueArraySchema(
    EMPLOYMENT_TYPE_CODES,
    "Choose at least one employment type.",
  ),
  shiftPreferences: uniqueArraySchema(
    SHIFT_PREFERENCE_CODES,
    "Choose at least one shift preference.",
  ),
});

export type EmploymentGroupInput = z.infer<typeof employmentGroupSchema>;

export function mapWorkAuthorisationToBoolean(
  value: WorkAuthorisationGroupInput["workAuthorisationDeclared"],
): boolean {
  return value === "yes";
}

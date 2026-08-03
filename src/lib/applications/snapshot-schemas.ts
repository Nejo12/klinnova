import { z } from "zod";

import {
  EMPLOYMENT_TYPE_CODES,
  GERMAN_COMFORT_CODES,
  JOB_CATEGORY_CODES,
  LANGUAGE_CODES,
  LANGUAGE_PROFICIENCY_CODES,
  SHIFT_PREFERENCE_CODES,
} from "@/lib/onboarding/allow-lists";
import { CONCRETE_SHIFT_CODES } from "@/lib/matching/concrete-shifts";
import { isValidIsoCalendarDate } from "@/lib/matching/rules";

export const APPLICATION_SNAPSHOT_VERSION = 1 as const;

const isoCalendarDateSchema = z
  .string()
  .refine(isValidIsoCalendarDate, { message: "Invalid ISO calendar date" });

const concreteShiftSchema = z.enum(CONCRETE_SHIFT_CODES);

const candidateLanguageSnapshotSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

const vacancyLanguageRequirementSnapshotSchema = z.object({
  language_code: z.enum(LANGUAGE_CODES),
  min_proficiency: z.enum(LANGUAGE_PROFICIENCY_CODES),
});

/** Accepted candidate_snapshot shape for snapshot_version = 1. */
export const candidateSnapshotV1Schema = z.object({
  display_name: z.string().min(1),
  job_category: z.enum(JOB_CATEGORY_CODES),
  german_comfort: z.enum(GERMAN_COMFORT_CODES),
  languages: z.array(candidateLanguageSnapshotSchema),
  work_authorisation_declared: z.boolean(),
  available_from: isoCalendarDateSchema.nullable(),
  employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)).min(1),
  shift_preferences: z.array(z.enum(SHIFT_PREFERENCE_CODES)).min(1),
});

/** Accepted vacancy_snapshot shape for snapshot_version = 1. */
export const vacancySnapshotV1Schema = z.object({
  vacancy_id: z.string().uuid(),
  title: z.string().min(1),
  employer_display_name: z.string().min(1),
  source: z.literal("seed"),
  demo_label: z.literal("Demo vacancy"),
  city: z.literal("Berlin"),
  job_category: z.enum(JOB_CATEGORY_CODES),
  employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)).min(1),
  shift_requirements: z.array(concreteShiftSchema).min(1),
  german_requirement: z.enum(GERMAN_COMFORT_CODES),
  language_requirements: z.array(vacancyLanguageRequirementSnapshotSchema),
  available_from: isoCalendarDateSchema.nullable(),
});

export const applicationConfirmationRowSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("submitted"),
  submitted_at: z.string().min(1),
  snapshot_version: z.literal(APPLICATION_SNAPSHOT_VERSION),
  candidate_snapshot: z.unknown(),
  vacancy_snapshot: z.unknown(),
});

export type CandidateSnapshotV1 = z.infer<typeof candidateSnapshotV1Schema>;
export type VacancySnapshotV1 = z.infer<typeof vacancySnapshotV1Schema>;
export type ApplicationConfirmationRow = z.infer<
  typeof applicationConfirmationRowSchema
>;

export type ParseApplicationSnapshotsResult =
  | {
      ok: true;
      candidate: CandidateSnapshotV1;
      vacancy: VacancySnapshotV1;
      row: ApplicationConfirmationRow;
    }
  | { ok: false; reason: "unsupported_version" | "malformed" };

/**
 * Validate an applications row and both v1 snapshots.
 * Rejects unsupported versions and malformed JSON without partial success.
 */
export function parseApplicationSnapshots(
  row: unknown,
): ParseApplicationSnapshotsResult {
  if (
    typeof row === "object" &&
    row !== null &&
    "snapshot_version" in row &&
    typeof (row as { snapshot_version: unknown }).snapshot_version ===
      "number" &&
    (row as { snapshot_version: number }).snapshot_version !==
      APPLICATION_SNAPSHOT_VERSION
  ) {
    return { ok: false, reason: "unsupported_version" };
  }

  const parsedRow = applicationConfirmationRowSchema.safeParse(row);
  if (!parsedRow.success) {
    return { ok: false, reason: "malformed" };
  }

  if (
    typeof parsedRow.data.candidate_snapshot !== "object" ||
    parsedRow.data.candidate_snapshot === null ||
    Array.isArray(parsedRow.data.candidate_snapshot) ||
    typeof parsedRow.data.vacancy_snapshot !== "object" ||
    parsedRow.data.vacancy_snapshot === null ||
    Array.isArray(parsedRow.data.vacancy_snapshot)
  ) {
    return { ok: false, reason: "malformed" };
  }

  const candidate = candidateSnapshotV1Schema.safeParse(
    parsedRow.data.candidate_snapshot,
  );
  const vacancy = vacancySnapshotV1Schema.safeParse(
    parsedRow.data.vacancy_snapshot,
  );

  if (!candidate.success || !vacancy.success) {
    return { ok: false, reason: "malformed" };
  }

  return {
    ok: true,
    candidate: candidate.data,
    vacancy: vacancy.data,
    row: parsedRow.data,
  };
}

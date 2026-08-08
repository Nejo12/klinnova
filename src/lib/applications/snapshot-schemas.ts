import { z } from "zod";

import { applicationStatusSchema } from "@/lib/applications/status";
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

/**
 * Accepted candidate_snapshot shape for snapshot_version = 1 — a candidate
 * who has not deleted their account. All fields are the candidate's own
 * user-provided data as it existed at submission time.
 */
export const candidateLiveSnapshotV1Schema = z
  .object({
    display_name: z.string().min(1),
    job_category: z.enum(JOB_CATEGORY_CODES),
    german_comfort: z.enum(GERMAN_COMFORT_CODES),
    languages: z.array(candidateLanguageSnapshotSchema),
    work_authorisation_declared: z.boolean(),
    available_from: isoCalendarDateSchema.nullable(),
    employment_types: z.array(z.enum(EMPLOYMENT_TYPE_CODES)).min(1),
    shift_preferences: z.array(z.enum(SHIFT_PREFERENCE_CODES)).min(1),
  })
  .strict();

/**
 * D-078 deleted-candidate tombstone shape. Deliberately minimal — no
 * candidate attribute (job_category, german_comfort, languages,
 * employment_types, shift_preferences, available_from,
 * work_authorisation_declared, display_name) is fabricated or preserved.
 * `applications.snapshot_version` stays 1; this shape does not need its
 * own version key.
 */
export const candidateDeletedSnapshotV1Schema = z
  .object({
    deleted: z.literal(true),
  })
  .strict();

/**
 * Accepted candidate_snapshot shape for snapshot_version = 1 — either a
 * live candidate's own data, or the deleted-candidate tombstone. Both
 * branches are `.strict()`, so an object combining `deleted: true` with
 * live-looking fields (or vice versa) matches neither branch and fails to
 * parse — it is never silently accepted as a live snapshot.
 */
export const candidateSnapshotV1Schema = z.union([
  candidateDeletedSnapshotV1Schema,
  candidateLiveSnapshotV1Schema,
]);

/** True when a parsed candidate snapshot is the deleted-account tombstone. */
export function isCandidateSnapshotDeleted(
  candidate: CandidateSnapshotV1,
): candidate is CandidateDeletedSnapshotV1 {
  return "deleted" in candidate && candidate.deleted === true;
}

/**
 * Accepted vacancy_snapshot shape for snapshot_version = 1.
 *
 * `source`/`demo_label` were originally seed-only literals; a real employer
 * vacancy stores `source: "employer"` and `demo_label: null` (see
 * `submit_candidate_application` in
 * supabase/migrations/20260806000000_candidate_eligibility_contract.sql,
 * which sets `demo_label` to `'Demo vacancy'` only `when vacancy.source =
 * 'seed'`). The stricter seed-only schema caused every real employer
 * application's confirmation/detail page to fail parsing and render
 * "Application not available" — fixed here to accept both sources.
 */
export const vacancySnapshotV1Schema = z.object({
  vacancy_id: z.string().uuid(),
  title: z.string().min(1),
  employer_display_name: z.string().min(1),
  source: z.enum(["seed", "employer"]),
  demo_label: z.literal("Demo vacancy").nullable(),
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
  status: applicationStatusSchema,
  submitted_at: z.string().min(1),
  snapshot_version: z.literal(APPLICATION_SNAPSHOT_VERSION),
  candidate_snapshot: z.unknown(),
  vacancy_snapshot: z.unknown(),
});

/**
 * Candidate application inventory row (`/candidate/applications`). Reuses
 * the same strict `vacancySnapshotV1Schema` the confirmation route
 * validates against — inventory only reads `title`/`employer_display_name`/
 * `city` from it, but validating the whole snapshot keeps a single source
 * of truth for "what a valid frozen vacancy snapshot looks like" rather
 * than a second, narrower, driftable schema.
 */
export const applicationInventoryRowSchema = z.object({
  id: z.string().uuid(),
  vacancy_id: z.string().uuid(),
  status: applicationStatusSchema,
  submitted_at: z.string().min(1),
  snapshot_version: z.literal(APPLICATION_SNAPSHOT_VERSION),
  vacancy_snapshot: vacancySnapshotV1Schema,
});

export const applicationInventorySchema = z.array(
  applicationInventoryRowSchema,
);

export type ApplicationInventoryRow = z.infer<
  typeof applicationInventoryRowSchema
>;

export type CandidateLiveSnapshotV1 = z.infer<
  typeof candidateLiveSnapshotV1Schema
>;
export type CandidateDeletedSnapshotV1 = z.infer<
  typeof candidateDeletedSnapshotV1Schema
>;
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

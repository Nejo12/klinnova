import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  isCandidateSnapshotDeleted,
  parseApplicationSnapshots,
} from "@/lib/applications/snapshot-schemas";
import { applicationStatusSchema } from "@/lib/applications/status";
import type { Database } from "@/types/database";

import { resolveCurrentExportAccount } from "./current-account";
import {
  ACCOUNT_EXPORT_VERSION,
  candidateAccountExportV1Schema,
  type CandidateAccountExportV1,
} from "./schemas";

export type CandidateAccountExportResult =
  | { kind: "unauthenticated" }
  /** Deleted account, or an authenticated identity with no candidate capability — deliberately indistinguishable. */
  | { kind: "unavailable" }
  | { kind: "failure" }
  | { kind: "ok"; payload: CandidateAccountExportV1 };

const candidateProfileRowSchema = z.object({
  display_name: z.string().min(1),
  german_comfort: z.string().nullable(),
  work_authorisation_declared: z.boolean().nullable(),
  work_authorisation_declared_at: z.string().nullable(),
  city: z.string().nullable(),
  travel_radius_minutes: z.number().int().nullable(),
  available_from: z.string().nullable(),
  job_categories: z.array(z.string()),
  employment_types: z.array(z.string()),
  shift_preferences: z.array(z.string()),
  onboarding_completed_at: z.string().nullable(),
  created_at: z.string().min(1),
});

const candidateLanguageRowSchema = z.object({
  language_code: z.string(),
  proficiency: z.string(),
});

const candidateApplicationRowSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  submitted_at: z.string().min(1),
  snapshot_version: z.number(),
  candidate_snapshot: z.unknown(),
  vacancy_snapshot: z.unknown(),
});

const candidateHistoryRowSchema = z.object({
  to_status: applicationStatusSchema,
  occurred_at: z.string().min(1),
});

/**
 * Own-data candidate account export (D-077/D-088). No new DB RPC/migration
 * — profile/languages/applications are read under the existing
 * `candidate_profiles_select_own`/`candidate_languages_select_own`/
 * `applications_select_own` RLS policies (already `not
 * _is_current_candidate_deleted()`-gated, on top of the explicit
 * whole-account gate this function checks first); status history reuses
 * the existing `list_current_candidate_application_status_history` RPC,
 * once per application, matching the application-detail page's own
 * established call pattern. Never touches `employer_profiles`,
 * `companies`, or `vacancies` — only `application.vacancy_snapshot`
 * (already the candidate's own historical, narrow, public-safe
 * projection).
 */
export async function buildCandidateAccountExport(
  supabase: SupabaseClient<Database>,
): Promise<CandidateAccountExportResult> {
  const account = await resolveCurrentExportAccount(supabase);

  if (account.kind === "unauthenticated") {
    return { kind: "unauthenticated" };
  }
  if (account.kind === "deleted") {
    return { kind: "unavailable" };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("candidate_profiles")
    .select(
      "display_name, german_comfort, work_authorisation_declared, work_authorisation_declared_at, city, travel_radius_minutes, available_from, job_categories, employment_types, shift_preferences, onboarding_completed_at, created_at",
    )
    .eq("id", account.userId)
    .maybeSingle();

  if (profileError !== null) {
    return { kind: "failure" };
  }
  if (profileRow === null) {
    return { kind: "unavailable" };
  }

  const parsedProfile = candidateProfileRowSchema.safeParse(profileRow);
  if (!parsedProfile.success) {
    return { kind: "failure" };
  }

  const { data: languageRows, error: languagesError } = await supabase
    .from("candidate_languages")
    .select("language_code, proficiency")
    .eq("candidate_id", account.userId)
    .order("language_code", { ascending: true });

  if (languagesError !== null || languageRows === null) {
    return { kind: "failure" };
  }

  const parsedLanguages = z
    .array(candidateLanguageRowSchema)
    .safeParse(languageRows);
  if (!parsedLanguages.success) {
    return { kind: "failure" };
  }

  const { data: applicationRows, error: applicationsError } = await supabase
    .from("applications")
    .select(
      "id, status, submitted_at, snapshot_version, candidate_snapshot, vacancy_snapshot",
    )
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true });

  if (applicationsError !== null || applicationRows === null) {
    return { kind: "failure" };
  }

  const parsedApplicationRows = z
    .array(candidateApplicationRowSchema)
    .safeParse(applicationRows);
  if (!parsedApplicationRows.success) {
    return { kind: "failure" };
  }

  const applications: CandidateAccountExportV1["candidate"]["applications"] =
    [];

  for (const row of parsedApplicationRows.data) {
    const parsedSnapshots = parseApplicationSnapshots(row);
    if (!parsedSnapshots.ok) {
      return { kind: "failure" };
    }
    if (isCandidateSnapshotDeleted(parsedSnapshots.candidate)) {
      // An active, non-deleted exporting candidate's own application must
      // never carry the deleted-candidate tombstone snapshot — this would
      // be an inconsistent persisted state, not a legitimate export.
      return { kind: "failure" };
    }

    const { data: historyRows, error: historyError } = await supabase.rpc(
      "list_current_candidate_application_status_history",
      { p_application_id: row.id },
    );
    if (historyError !== null || historyRows === null) {
      return { kind: "failure" };
    }
    const parsedHistory = z
      .array(candidateHistoryRowSchema)
      .safeParse(historyRows);
    if (!parsedHistory.success) {
      return { kind: "failure" };
    }

    applications.push({
      id: row.id,
      status: parsedSnapshots.row.status,
      submitted_at: row.submitted_at,
      candidate_snapshot: parsedSnapshots.candidate,
      vacancy: parsedSnapshots.vacancy,
      status_history: [...parsedHistory.data]
        .sort((left, right) =>
          left.occurred_at.localeCompare(right.occurred_at),
        )
        .map((entry) => ({
          to_status: entry.to_status,
          occurred_at: entry.occurred_at,
        })),
    });
  }

  const payload = candidateAccountExportV1Schema.safeParse({
    version: ACCOUNT_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    account: account.account,
    candidate: {
      display_name: parsedProfile.data.display_name,
      german_comfort: parsedProfile.data.german_comfort,
      work_authorisation_declared:
        parsedProfile.data.work_authorisation_declared,
      work_authorisation_declared_at:
        parsedProfile.data.work_authorisation_declared_at,
      city: parsedProfile.data.city,
      travel_radius_minutes: parsedProfile.data.travel_radius_minutes,
      available_from: parsedProfile.data.available_from,
      job_categories: parsedProfile.data.job_categories,
      employment_types: parsedProfile.data.employment_types,
      shift_preferences: parsedProfile.data.shift_preferences,
      onboarding_completed_at: parsedProfile.data.onboarding_completed_at,
      created_at: parsedProfile.data.created_at,
      languages: [...parsedLanguages.data].sort((left, right) =>
        left.language_code.localeCompare(right.language_code),
      ),
      applications,
    },
  });

  if (!payload.success) {
    return { kind: "failure" };
  }

  return { kind: "ok", payload: payload.data };
}

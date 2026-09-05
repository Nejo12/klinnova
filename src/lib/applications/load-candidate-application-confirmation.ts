import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  buildApplicationConfirmation,
  type ApplicationConfirmation,
} from "@/lib/applications/application-confirmation";
import {
  isCandidateSnapshotDeleted,
  parseApplicationSnapshots,
} from "@/lib/applications/snapshot-schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const applicationIdSchema = z.string().uuid();
const introductionRowSchema = z.object({
  introduction_text: z.string().max(1_000).nullable(),
});

export type LoadCandidateApplicationConfirmationResult =
  | { status: "unauthenticated" }
  | { status: "unavailable" }
  | { status: "ready"; confirmation: ApplicationConfirmation }
  | { status: "failure" };

export type CandidateApplicationConfirmationDataAccess = {
  getUserId: () => Promise<string | null>;
  loadOwnedApplicationById: (
    applicationId: string,
  ) => Promise<
    { ok: true; row: unknown } | { ok: false; reason: "missing" | "error" }
  >;
};

export function createSupabaseCandidateApplicationConfirmationDataAccess(
  supabase: SupabaseClient<Database>,
): CandidateApplicationConfirmationDataAccess {
  return {
    async getUserId() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error !== null || user === null) {
        return null;
      }
      return user.id;
    },

    async loadOwnedApplicationById(applicationId) {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, submitted_at, introduction_text, snapshot_version, candidate_snapshot, vacancy_snapshot",
        )
        .eq("id", applicationId)
        .maybeSingle();

      if (error !== null) {
        return { ok: false, reason: "error" };
      }
      if (data === null) {
        return { ok: false, reason: "missing" };
      }
      return { ok: true, row: data };
    },
  };
}

/**
 * Historical confirmation loader.
 * Ownership comes from Auth + candidate-own SELECT RLS.
 * Does not require onboarding completion, current vacancy, or matcher.
 */
export async function loadCandidateApplicationConfirmation(
  applicationId: string,
  dataAccess?: CandidateApplicationConfirmationDataAccess,
): Promise<LoadCandidateApplicationConfirmationResult> {
  const parsedId = applicationIdSchema.safeParse(applicationId);
  if (!parsedId.success) {
    return { status: "unavailable" };
  }

  const access =
    dataAccess ??
    createSupabaseCandidateApplicationConfirmationDataAccess(
      await createServerSupabaseClient(),
    );

  const userId = await access.getUserId();
  if (userId === null) {
    return { status: "unauthenticated" };
  }

  const applicationResult = await access.loadOwnedApplicationById(
    parsedId.data,
  );
  if (!applicationResult.ok) {
    return applicationResult.reason === "missing"
      ? { status: "unavailable" }
      : { status: "failure" };
  }

  const parsed = parseApplicationSnapshots(applicationResult.row);
  const introductionRow = introductionRowSchema.safeParse(
    applicationResult.row,
  );
  if (!parsed.ok || !introductionRow.success) {
    return { status: "unavailable" };
  }

  // A deleted candidate's own confirmation page is unreachable in practice
  // (the D-080 database gate blocks their own reads before this loader is
  // ever called), but the snapshot type is a union — narrow explicitly
  // rather than assuming.
  if (isCandidateSnapshotDeleted(parsed.candidate)) {
    return { status: "unavailable" };
  }

  const confirmation = buildApplicationConfirmation({
    applicationId: parsed.row.id,
    status: parsed.row.status,
    submittedAt: parsed.row.submitted_at,
    introductionText: introductionRow.data.introduction_text,
    candidate: parsed.candidate,
    vacancy: parsed.vacancy,
  });

  if (confirmation === null) {
    return { status: "unavailable" };
  }

  return { status: "ready", confirmation };
}

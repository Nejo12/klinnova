import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { formatEnvError } from "@/lib/env/format-error";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

const privilegedEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const vacancySnapshotTitleSchema = z.object({ title: z.string().min(1) });

export type CandidateRecipientLookupResult =
  | {
      status: "ready";
      candidateEmail: string;
      vacancyTitle: string;
      recipientUserId: string;
    }
  | { status: "application_not_found" }
  | { status: "candidate_not_found" }
  | { status: "lookup_failed"; message: string };

/**
 * N3 privileged lookup, isolated to this module (mirrors N2's
 * `privileged-employer-recipient-lookup.ts`, itself mirroring
 * `src/lib/account-deletion/privileged-supabase.ts` — never exported
 * outside this module, `notify-candidate-status-change.ts` is the only
 * intended caller). `candidate_profiles.id` is 1:1 `auth.users.id`
 * (`applications.candidate_id` references `candidate_profiles.id`, and the
 * `applications_select_own` RLS policy already confirms it equals
 * `auth.uid()`), so resolving the candidate's address requires
 * `auth.admin.getUserById`, which requires the service-role key. The
 * vacancy title comes from `applications.vacancy_snapshot` — the same
 * immutable, RPC-built-at-submission-time snapshot the candidate's own
 * confirmation page already reads (`load-candidate-application-confirmation.ts`)
 * — not a live re-read of `vacancies`, and never client-supplied text.
 */
export async function resolveCandidateRecipientForApplication(
  applicationId: string,
): Promise<CandidateRecipientLookupResult> {
  const parsedEnv = privilegedEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsedEnv.success) {
    return {
      status: "lookup_failed",
      message: formatEnvError(parsedEnv.error),
    };
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const client = createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data: application, error: applicationError } = await client
    .from("applications")
    .select("candidate_id, vacancy_snapshot")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError !== null) {
    return { status: "lookup_failed", message: "application lookup failed" };
  }
  if (application === null) {
    return { status: "application_not_found" };
  }

  const parsedSnapshot = vacancySnapshotTitleSchema.safeParse(
    application.vacancy_snapshot,
  );
  if (!parsedSnapshot.success) {
    return { status: "lookup_failed", message: "malformed vacancy snapshot" };
  }

  const { data: userResult, error: userError } =
    await client.auth.admin.getUserById(application.candidate_id);

  if (userError !== null || userResult.user === null) {
    return { status: "candidate_not_found" };
  }

  const email = userResult.user.email;
  if (email === undefined || email.length === 0) {
    return { status: "candidate_not_found" };
  }

  return {
    status: "ready",
    candidateEmail: email,
    recipientUserId: application.candidate_id,
    vacancyTitle: parsedSnapshot.data.title,
  };
}

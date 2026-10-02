import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { formatEnvError } from "@/lib/env/format-error";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

const privilegedEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type EmployerRecipientLookupResult =
  | {
      status: "ready";
      employerEmail: string;
      vacancyTitle: string;
      recipientUserId: string;
    }
  | { status: "vacancy_not_found" }
  | { status: "employer_not_found" }
  | { status: "lookup_failed"; message: string };

/**
 * N2 privileged lookup, isolated to this module (mirrors
 * `src/lib/account-deletion/privileged-supabase.ts`'s scoping — never
 * exported outside this module, `notify-employer-new-application.ts` is the
 * only intended caller). `employer_profiles.id` is 1:1 `auth.users.id`
 * (D-047); there is no email column on `employer_profiles`, so resolving
 * the owning employer's address requires `auth.admin.getUserById`, which in
 * turn requires the service-role key. The vacancy `title` read here comes
 * from the canonical `vacancies` row (service-role bypasses candidate RLS,
 * which does not generally expose employer-owned rows to a candidate
 * session) — never from client-supplied display text.
 */
export async function resolveEmployerRecipientForVacancy(
  vacancyId: string,
): Promise<EmployerRecipientLookupResult> {
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

  const { data: vacancy, error: vacancyError } = await client
    .from("vacancies")
    .select("title, employer_profile_id")
    .eq("id", vacancyId)
    .maybeSingle();

  if (vacancyError !== null) {
    return { status: "lookup_failed", message: "vacancy lookup failed" };
  }
  if (vacancy === null || vacancy.employer_profile_id === null) {
    return { status: "vacancy_not_found" };
  }

  const { data: userResult, error: userError } =
    await client.auth.admin.getUserById(vacancy.employer_profile_id);

  if (userError !== null || userResult.user === null) {
    return { status: "employer_not_found" };
  }

  const email = userResult.user.email;
  if (email === undefined || email.length === 0) {
    return { status: "employer_not_found" };
  }

  return {
    status: "ready",
    employerEmail: email,
    recipientUserId: vacancy.employer_profile_id,
    vacancyTitle: vacancy.title,
  };
}

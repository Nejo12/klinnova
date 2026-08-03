import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client } from "pg";

const LOCAL_DATABASE_URL =
  process.env.STINT_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * User-scoped publishable-key client for approved local proof boundaries.
 * Never uses a service-role key.
 */
export function createLocalUserClient(
  supabaseUrl: string,
  publishableKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signInLocalUser(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error !== null || data.user === null) {
    throw new Error(`local sign-in failed: ${error?.message ?? "no user"}`);
  }
  return data.user.id;
}

export async function countOwnedApplicationsForVacancy(
  client: SupabaseClient,
  vacancyId: string,
): Promise<number> {
  const { data, error } = await client
    .from("applications")
    .select("id")
    .eq("vacancy_id", vacancyId);
  if (error !== null) {
    throw new Error(`application count failed: ${error.message}`);
  }
  return data?.length ?? 0;
}

export async function loadOwnedApplicationIdsForVacancy(
  client: SupabaseClient,
  vacancyId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("applications")
    .select("id")
    .eq("vacancy_id", vacancyId);
  if (error !== null) {
    throw new Error(`application load failed: ${error.message}`);
  }
  return (data ?? []).map((row) => row.id);
}

/**
 * Duplicate submission through the authenticated RPC (approved local boundary).
 * Expects `already_applied` for an existing candidate/vacancy pair.
 */
export async function submitDuplicateApplicationRpc(
  client: SupabaseClient,
  vacancyId: string,
): Promise<{ result: string; application_id: string | null }> {
  const { data, error } = await client.rpc("submit_candidate_application", {
    p_vacancy_id: vacancyId,
  });
  if (error !== null || data === null || typeof data !== "object") {
    throw new Error(`duplicate RPC failed: ${error?.message ?? "empty"}`);
  }
  const payload = data as {
    result?: unknown;
    application_id?: unknown;
  };
  return {
    result: typeof payload.result === "string" ? payload.result : "",
    application_id:
      typeof payload.application_id === "string"
        ? payload.application_id
        : null,
  };
}

/**
 * Local-only Postgres client for historical vacancy mutation proof.
 * Rejects non-local connection strings.
 */
export async function withLocalPostgres<T>(
  run: (client: Client) => Promise<T>,
): Promise<T> {
  if (!/127\.0\.0\.1|localhost/.test(LOCAL_DATABASE_URL)) {
    throw new Error("local Postgres proof requires a localhost database URL");
  }
  const client = new Client({ connectionString: LOCAL_DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

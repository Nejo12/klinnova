import { Client } from "pg";

/**
 * Local-only direct-Postgres boundary for proof scripts. Mirrors the same
 * localhost-only pattern already accepted for E2E fixture provisioning
 * (`e2e/helpers/local-application-proof.ts`'s `withLocalPostgres`) — kept as
 * a separate, small implementation here rather than a cross-directory
 * import because `tsconfig.scripts.json` scopes proof tooling to
 * `src/lib/proof/**` and `scripts/**` only, and proof scripts are a
 * distinct execution context from Playwright's test runtime.
 *
 * Connecting as the local `postgres` role bypasses RLS by design — this is
 * required to produce an authoritative pilot-wide count (every candidate,
 * every employer), not one candidate's/employer's own RLS-visible rows.
 * That is safe only because the connection target is hard-restricted to
 * localhost below; it is never used against a hosted database.
 */
const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export function resolveLocalDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const candidate = env.STINT_DATABASE_URL ?? DEFAULT_LOCAL_DATABASE_URL;
  let hostname: string;
  try {
    hostname = new URL(candidate).hostname.toLowerCase();
  } catch {
    throw new Error(
      "Local proof requires a parseable Postgres connection string.",
    );
  }
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error(
      "Local proof requires a localhost Postgres connection string (127.0.0.1 or localhost).",
    );
  }
  return candidate;
}

const BEGIN_READ_ONLY_SNAPSHOT =
  "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY";

/**
 * Runs `run` inside one `REPEATABLE READ READ ONLY` Postgres transaction so
 * every query the callback issues observes the identical database snapshot
 * — required for a multi-query measurement (like the pilot funnel) to
 * describe one coherent point in time rather than several independently
 * observed states. The database enforces the read-only property itself;
 * this is not merely "the SQL happens to be SELECT-only."
 *
 * On success: COMMIT (a no-op for a read-only transaction, but explicit and
 * symmetric). On failure: ROLLBACK, then rethrow the original error — a
 * failed ROLLBACK is logged (never the connection string) but does not
 * replace the original failure as the thrown error. No partial report is
 * ever returned.
 */
export async function withLocalPostgresReadOnlyTransaction<T>(
  run: (client: Client) => Promise<T>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const connectionString = resolveLocalDatabaseUrl(env);
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(BEGIN_READ_ONLY_SNAPSHOT);

    let result: T;
    try {
      result = await run(client);
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Pilot funnel: ROLLBACK failed after a measurement error:",
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError),
        );
      }
      throw error;
    }

    await client.query("COMMIT");
    return result;
  } finally {
    await client.end();
  }
}

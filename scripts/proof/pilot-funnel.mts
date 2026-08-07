#!/usr/bin/env node
/**
 * Deterministic, read-only pilot-funnel measurement (D-075).
 *
 * Local Supabase only. Refuses hosted/Production targets. Runs entirely
 * inside one `REPEATABLE READ READ ONLY` Postgres transaction so all five
 * metric queries describe one coherent database snapshot, measured at one
 * transaction-stable instant (`transaction_timestamp()`) — not five
 * independently observed states. Performs SELECT statements only against
 * existing tables/columns and the existing `is_vacancy_effectively_public(...)`
 * predicate — no INSERT/UPDATE/DELETE/UPSERT, no mutation RPC, no
 * service-role client.
 *
 * Usage: pnpm proof:pilot-funnel
 */

import { assertLocalProofEnvironment } from "../../src/lib/proof/local-environment-guard.ts";
import { loadEnvFileIfPresent } from "../../src/lib/proof/load-env-file.ts";
import { withLocalPostgresReadOnlyTransaction } from "../../src/lib/proof/local-postgres.ts";
import { buildPilotFunnelReport } from "../../src/lib/proof/pilot-funnel.ts";

async function main(): Promise<void> {
  loadEnvFileIfPresent(".env.local");
  loadEnvFileIfPresent(".env");

  const guard = assertLocalProofEnvironment(process.env, process.argv.slice(2));
  if (!guard.ok) {
    console.error(guard.error);
    process.exitCode = 1;
    return;
  }

  try {
    const report = await withLocalPostgresReadOnlyTransaction((client) =>
      buildPilotFunnelReport(async (sql) => {
        const result = await client.query(sql);
        return result.rows;
      }),
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Pilot funnel proof failed.",
    );
    process.exitCode = 1;
  }
}

main();

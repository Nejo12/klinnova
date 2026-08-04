#!/usr/bin/env node
/**
 * Local-only migration inventory for Slice proof readiness.
 * Never queries a remote Supabase project.
 */

import {
  assertNoHostedMutationIntent,
  assertOptionalLocalDatabaseUrl,
} from "../../src/lib/proof/local-environment-guard.ts";
import {
  buildMigrationInventory,
  formatMigrationInventory,
} from "../../src/lib/proof/migration-inventory.ts";

const DB_URL_KEYS = [
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "STINT_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
] as const;

function main(): void {
  const mutation = assertNoHostedMutationIntent(process.argv.slice(2));
  if (!mutation.ok) {
    console.error(mutation.error);
    process.exitCode = 1;
    return;
  }

  for (const key of DB_URL_KEYS) {
    const db = assertOptionalLocalDatabaseUrl(process.env[key], key);
    if (!db.ok) {
      console.error(db.error);
      process.exitCode = 1;
      return;
    }
  }

  const report = buildMigrationInventory();
  console.log(formatMigrationInventory(report));

  if (!report.slice4Present) {
    console.error("Slice 4 required migration files are missing locally.");
    process.exitCode = 1;
  }
}

main();

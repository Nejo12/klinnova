#!/usr/bin/env node
/**
 * Owner-run hosted Demo fixture apply/cleanup (D-031).
 * Never invoked by install, build, migrate, CI, or deploy defaults.
 *
 * Credentials: export SUPABASE_DB_URL temporarily (never on the CLI).
 *
 * Usage:
 *   export SUPABASE_DB_URL='...'
 *   pnpm fixtures:hosted:apply -- --env preview --project-ref <ref>
 *   unset SUPABASE_DB_URL
 *
 * Production:
 *   export SUPABASE_DB_URL='...'
 *   pnpm fixtures:hosted:apply -- --env production --project-ref <ref> \
 *     --confirm-production=I_UNDERSTAND_HOSTED_DEMO
 *   unset SUPABASE_DB_URL
 */

import { Client } from "pg";

import {
  assertSafeHostedFixtureSql,
  defaultFixturesRoot,
  formatHostedFixturePlan,
  loadHostedFixtureManifest,
  prepareHostedFixtureRun,
  readHostedFixtureSql,
  sanitizeHostedFixtureError,
} from "../../src/lib/fixtures/hosted-demo.ts";

async function main(): Promise<void> {
  const prepared = prepareHostedFixtureRun(process.argv.slice(2), process.env);
  if (!prepared.ok) {
    console.error(prepared.error);
    process.exitCode = 1;
    return;
  }

  const { args, databaseUrl, execution } = prepared;
  const fixturesRoot = defaultFixturesRoot();
  const manifest = loadHostedFixtureManifest(fixturesRoot);
  const sql = readHostedFixtureSql(args.action, fixturesRoot);
  assertSafeHostedFixtureSql(sql, manifest);

  console.log(formatHostedFixturePlan(args, manifest));

  if (args.dryRun) {
    console.log("dry_run=complete (no database changes)");
    return;
  }

  if (databaseUrl === null || execution === null) {
    console.error("Missing execution boundary after credential resolution.");
    process.exitCode = 1;
    return;
  }

  if (execution.shell !== false) {
    console.error("Refusing execution with shell enabled.");
    process.exitCode = 1;
    return;
  }

  // Connection string stays in-process / env only — never argv, never logged.
  const client = new Client({
    connectionString: execution.env.SUPABASE_DB_URL,
  });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`result=success action=${args.action}`);
    if (args.action === "apply") {
      const expiry = await client.query<{ id: string; expires_at: Date }>(
        `select id, expires_at
         from public.vacancies
         where id = any($1::uuid[])
         order by id`,
        [manifest.vacancyIds],
      );
      for (const row of expiry.rows) {
        console.log(`fixture_expiry id=${row.id} expires_at=${row.expires_at}`);
      }
    } else {
      const remaining = await client.query<{
        vacancies: number;
        languages: number;
        company: number;
      }>(
        `select
           (select count(*)::int from public.vacancies where id = any($1::uuid[])) as vacancies,
           (select count(*)::int from public.vacancy_language_requirements where id = any($2::uuid[])) as languages,
           (select count(*)::int from public.companies where id = $3::uuid) as company`,
        [
          manifest.vacancyIds,
          manifest.languageRequirementIds,
          manifest.companyId,
        ],
      );
      const counts = remaining.rows[0];
      if (counts === undefined) {
        throw new Error("cleanup verification query returned no rows");
      }
      console.log(
        `cleanup_remaining vacancies=${counts.vacancies} languages=${counts.languages} company=${counts.company}`,
      );
    }
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Connection may already be closed.
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`result=failure ${sanitizeHostedFixtureError(message)}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`result=failure ${sanitizeHostedFixtureError(message)}`);
  process.exitCode = 1;
});

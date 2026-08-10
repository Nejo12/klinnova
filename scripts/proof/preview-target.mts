#!/usr/bin/env node
/**
 * Guarded Preview Supabase migration push (M5.1 Unit F, D-F1/D-F3).
 *
 * Refuses to run unless STINT_PREVIEW_SUPABASE_URL and
 * STINT_PREVIEW_SUPABASE_DB_URL structurally resolve to the explicitly
 * configured STINT_PREVIEW_SUPABASE_PROJECT_REF, and never to
 * STINT_PRODUCTION_SUPABASE_PROJECT_REF. All four env vars are required;
 * missing any of them fails closed before any command runs. Never passes
 * --linked to the Supabase CLI.
 *
 * Usage: pnpm preview:db:push
 */

import { loadEnvFileIfPresent } from "../../src/lib/proof/load-env-file.ts";
import { runPreviewDbPush } from "../../src/lib/proof/preview-db-push.ts";

function main(): void {
  loadEnvFileIfPresent(".env.local");
  loadEnvFileIfPresent(".env");

  process.exitCode = runPreviewDbPush(process.env);
}

main();

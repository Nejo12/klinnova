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
 * Deliberately does NOT auto-load .env.local/.env (unlike scripts/proof/
 * slice4.mts and other local-only proof scripts): this command is an
 * eventual hosted-mutation command, so its four STINT_* inputs must come
 * only from the invoking shell's actual process environment, set
 * consciously for that one invocation — never from a possibly-stale or
 * possibly-wrong dotenv file loaded implicitly. See
 * docs/52-preview-environment-runbook.md.
 *
 * Usage: pnpm preview:db:push
 */

import { runPreviewDbPush } from "../../src/lib/proof/preview-db-push.ts";

function main(): void {
  process.exitCode = runPreviewDbPush(process.env);
}

main();

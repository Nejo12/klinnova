import { spawnSync } from "node:child_process";

import { assertPreviewSupabaseTarget } from "./preview-target-guard.ts";

export type SpawnRunner = typeof spawnSync;

export type PreviewDbPushEnv = {
  STINT_PREVIEW_SUPABASE_URL?: string;
  STINT_PREVIEW_SUPABASE_DB_URL?: string;
  STINT_PREVIEW_SUPABASE_PROJECT_REF?: string;
  STINT_PRODUCTION_SUPABASE_PROJECT_REF?: string;
};

/**
 * Guarded `supabase db push --db-url` against the M5.1 Unit F persistent
 * Preview Supabase project. Never invokes `--linked`. The Preview-target
 * guard runs first and fails closed; `runner` is only ever reached when the
 * target has been structurally verified as the configured Preview project
 * and explicitly not the configured Production project.
 *
 * `runner` is injectable so this can be exercised in tests without ever
 * spawning a real process against a hosted target.
 */
export function runPreviewDbPush(
  env: PreviewDbPushEnv,
  runner: SpawnRunner = spawnSync,
): number {
  const guard = assertPreviewSupabaseTarget({
    supabaseUrl: env.STINT_PREVIEW_SUPABASE_URL,
    databaseUrl: env.STINT_PREVIEW_SUPABASE_DB_URL,
    expectedPreviewProjectRef: env.STINT_PREVIEW_SUPABASE_PROJECT_REF,
    expectedProductionProjectRef: env.STINT_PRODUCTION_SUPABASE_PROJECT_REF,
  });

  if (!guard.ok) {
    console.error(guard.error);
    return 1;
  }

  console.log(
    `ok: Preview target verified (project ref "${guard.projectRef}")`,
  );
  console.log("$ supabase db push --db-url <redacted>");

  const dbUrl = env.STINT_PREVIEW_SUPABASE_DB_URL as string;
  const result = runner("supabase", ["db", "push", "--db-url", dbUrl], {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

#!/usr/bin/env node
/**
 * Deterministic local Slice 4 exit-proof orchestrator.
 *
 * - Fail fast; preserve first failing exit code
 * - Local services only
 * - Rejects hosted database URLs / Production mutation targets
 * - Never logs secret values
 *
 * Usage: pnpm proof:slice4
 */

import { spawnSync } from "node:child_process";

import { assertLocalProofEnvironment } from "../../src/lib/proof/local-environment-guard.ts";
import { loadEnvFileIfPresent } from "../../src/lib/proof/load-env-file.ts";
import {
  buildMigrationInventory,
  formatMigrationInventory,
} from "../../src/lib/proof/migration-inventory.ts";

type Phase = {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
};

function printHeading(title: string): void {
  console.log("");
  console.log(`======== ${title} ========`);
}

function runPhase(phase: Phase): number {
  printHeading(phase.name);
  console.log(`$ ${phase.command} ${phase.args.join(" ")}`.trimEnd());

  const result = spawnSync(phase.command, phase.args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...phase.env,
    },
    shell: false,
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

function main(): void {
  loadEnvFileIfPresent(".env.local");
  loadEnvFileIfPresent(".env");

  printHeading("Environment safety guard");
  const guard = assertLocalProofEnvironment(process.env, process.argv.slice(2));
  if (!guard.ok) {
    console.error(guard.error);
    process.exitCode = 1;
    return;
  }
  console.log(
    "ok: local Supabase API URL shape, optional DB URLs, and no hosted mutation intent",
  );

  printHeading("Migration inventory (local files only)");
  const inventory = buildMigrationInventory();
  console.log(formatMigrationInventory(inventory));
  if (!inventory.slice4Present) {
    console.error("Slice 4 required migration files are missing locally.");
    process.exitCode = 1;
    return;
  }

  const phases: Phase[] = [
    { name: "Format check", command: "pnpm", args: ["format:check"] },
    { name: "Lint", command: "pnpm", args: ["lint"] },
    { name: "Typecheck", command: "pnpm", args: ["typecheck"] },
    { name: "Vitest", command: "pnpm", args: ["test:run"] },
    { name: "Production build", command: "pnpm", args: ["build"] },
    {
      name: "Local Supabase reset",
      command: "pnpm",
      args: ["supabase:db:reset"],
    },
    { name: "pgTAP", command: "pnpm", args: ["supabase:test:db"] },
    {
      name: "Generated database types check",
      command: "pnpm",
      args: ["db:types:check"],
    },
    {
      name: "Employer onboarding + vacancy E2E",
      command: "pnpm",
      args: ["test:e2e:employer"],
      env: { E2E_AUTH_JOURNEY: "1" },
    },
    {
      name: "Slice 3 candidate regression E2E",
      command: "pnpm",
      args: ["test:e2e:slice3"],
      env: { E2E_AUTH_JOURNEY: "1" },
    },
  ];

  for (const phase of phases) {
    const code = runPhase(phase);
    if (code !== 0) {
      printHeading("Slice 4 local proof FAILED");
      console.error(`First failing phase: ${phase.name} (exit ${code})`);
      process.exitCode = code;
      return;
    }
  }

  printHeading("Slice 4 local proof PASSED");
  console.log(
    "Local checklist green. Hosted Slice 4 proof is not executed by this command.",
  );
}

main();

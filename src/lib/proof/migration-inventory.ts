import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type MigrationInventoryEntry = {
  filename: string;
  checksumSha256: string;
  bytes: number;
};

export type MigrationInventoryReport = {
  migrationsRoot: string;
  generatedAt: string;
  entries: MigrationInventoryEntry[];
  slice4Required: string[];
  slice4Present: boolean;
  note: string;
};

/** Slice 4 migrations that a clean hosted environment must eventually apply. */
export const SLICE4_REQUIRED_MIGRATIONS = [
  "20260803200000_employer_profiles_and_company_ownership.sql",
  "20260804120000_employer_owned_draft_vacancies.sql",
] as const;

const MIGRATION_FILE_RE = /^\d{14}_.+\.sql$/;

export function defaultMigrationsRoot(cwd = process.cwd()): string {
  return path.join(cwd, "supabase", "migrations");
}

export function listMigrationFilenames(migrationsRoot: string): string[] {
  if (!existsSync(migrationsRoot)) {
    throw new Error(`Migrations directory not found: ${migrationsRoot}`);
  }

  return readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MIGRATION_FILE_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function checksumFileSha256(absolutePath: string): {
  checksumSha256: string;
  bytes: number;
} {
  const buffer = readFileSync(absolutePath);
  return {
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.byteLength,
  };
}

/**
 * Local-only migration inventory. Does not query remote projects.
 * Presence of a file never implies a hosted environment has applied it.
 */
export function buildMigrationInventory(
  migrationsRoot = defaultMigrationsRoot(),
): MigrationInventoryReport {
  const filenames = listMigrationFilenames(migrationsRoot);
  const entries = filenames.map((filename) => {
    const absolutePath = path.join(migrationsRoot, filename);
    const { checksumSha256, bytes } = checksumFileSha256(absolutePath);
    return { filename, checksumSha256, bytes };
  });

  const present = new Set(filenames);
  const slice4Present = SLICE4_REQUIRED_MIGRATIONS.every((name) =>
    present.has(name),
  );

  return {
    migrationsRoot,
    generatedAt: new Date().toISOString(),
    entries,
    slice4Required: [...SLICE4_REQUIRED_MIGRATIONS],
    slice4Present,
    note: "Local file inventory only. Do not infer hosted migration status from this report.",
  };
}

export function formatMigrationInventory(
  report: MigrationInventoryReport,
): string {
  const lines: string[] = [
    "migration_inventory=local",
    `generated_at=${report.generatedAt}`,
    `migrations_root=${report.migrationsRoot}`,
    `count=${report.entries.length}`,
    `slice4_present=${report.slice4Present ? "yes" : "no"}`,
    `note=${report.note}`,
    "",
    "ordered_migrations:",
  ];

  for (const entry of report.entries) {
    lines.push(
      `- ${entry.filename} sha256=${entry.checksumSha256} bytes=${entry.bytes}`,
    );
  }

  lines.push("", "slice4_required:");
  for (const name of report.slice4Required) {
    const found = report.entries.some((entry) => entry.filename === name);
    lines.push(`- ${name} local_file=${found ? "present" : "missing"}`);
  }

  return lines.join("\n");
}

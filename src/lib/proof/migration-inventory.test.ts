import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  SLICE4_REQUIRED_MIGRATIONS,
  buildMigrationInventory,
  formatMigrationInventory,
  listMigrationFilenames,
} from "@/lib/proof/migration-inventory";

describe("migration inventory", () => {
  it("lists repository migrations in filename order and includes Slice 4 files", () => {
    const report = buildMigrationInventory();
    expect(report.entries.length).toBeGreaterThanOrEqual(7);
    expect(report.slice4Present).toBe(true);
    for (const required of SLICE4_REQUIRED_MIGRATIONS) {
      expect(report.entries.some((entry) => entry.filename === required)).toBe(
        true,
      );
    }
    expect(report.note).toMatch(/Do not infer hosted/i);
  });

  it("formats a stable local-only inventory without remote claims", () => {
    const report = buildMigrationInventory();
    const text = formatMigrationInventory(report);
    expect(text).toMatch(/^migration_inventory=local/m);
    expect(text).toMatch(/slice4_present=yes/);
    expect(text).not.toMatch(/remote_status=/);
    expect(text).not.toMatch(/applied_on_hosted/);
  });

  it("ignores non-migration files in a temp migrations root", () => {
    const root = mkdtempSync(path.join(tmpdir(), "stint-migrations-"));
    writeFileSync(path.join(root, ".gitkeep"), "");
    writeFileSync(
      path.join(
        root,
        "20260803200000_employer_profiles_and_company_ownership.sql",
      ),
      "-- test\n",
    );
    writeFileSync(
      path.join(root, "20260804120000_employer_owned_draft_vacancies.sql"),
      "-- test\n",
    );
    writeFileSync(path.join(root, "notes.txt"), "ignore");

    expect(listMigrationFilenames(root)).toEqual([
      "20260803200000_employer_profiles_and_company_ownership.sql",
      "20260804120000_employer_owned_draft_vacancies.sql",
    ]);
    expect(buildMigrationInventory(root).slice4Present).toBe(true);
  });
});

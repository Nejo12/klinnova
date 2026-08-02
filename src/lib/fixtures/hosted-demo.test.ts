import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PRODUCTION_CONFIRMATION,
  SUPABASE_DB_URL_ENV,
  assertSafeHostedFixtureSql,
  buildHostedFixtureExecutionBoundary,
  formatHostedFixturePlan,
  loadHostedFixtureManifest,
  parseHostedFixtureArgs,
  prepareHostedFixtureRun,
  readHostedFixtureSql,
  resolveSupabaseDbUrl,
  sanitizeHostedFixtureError,
} from "@/lib/fixtures/hosted-demo";

const sampleUrl = "postgresql://postgres:secret@127.0.0.1:54322/postgres";

describe("parseHostedFixtureArgs", () => {
  it("rejects missing environment", () => {
    const result = parseHostedFixtureArgs(["apply", "--project-ref", "abcd"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/--env/);
      expect(result.error).not.toContain(sampleUrl);
      expect(result.error).not.toContain("secret");
    }
  });

  it("rejects invalid environment", () => {
    const result = parseHostedFixtureArgs([
      "apply",
      "--env",
      "staging",
      "--project-ref",
      "abcd",
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects unspecified project ref", () => {
    const result = parseHostedFixtureArgs(["apply", "--env", "preview"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/project-ref/);
    }
  });

  it("rejects --database-url as a forbidden credential argument", () => {
    const result = parseHostedFixtureArgs([
      "apply",
      "--env",
      "preview",
      "--project-ref",
      "previewref",
      "--database-url",
      sampleUrl,
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Forbidden credential argument/);
      expect(result.error).toContain(SUPABASE_DB_URL_ENV);
      expect(result.error).not.toContain(sampleUrl);
      expect(result.error).not.toContain("secret");
    }
  });

  it("rejects positional URL-like credentials", () => {
    const result = parseHostedFixtureArgs([
      "apply",
      "--env",
      "preview",
      "--project-ref",
      "previewref",
      sampleUrl,
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Positional database URL/);
      expect(result.error).not.toContain(sampleUrl);
    }
  });

  it("rejects Production without explicit confirmation before execution", () => {
    const result = prepareHostedFixtureRun(
      ["apply", "--env", "production", "--project-ref", "prodref"],
      { [SUPABASE_DB_URL_ENV]: sampleUrl },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(PRODUCTION_CONFIRMATION);
      expect(result.error).not.toContain(sampleUrl);
    }
  });

  it("accepts Preview dry-run without SUPABASE_DB_URL", () => {
    const result = prepareHostedFixtureRun(
      ["apply", "--env", "preview", "--project-ref", "previewref", "--dry-run"],
      {},
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.dryRun).toBe(true);
      expect(result.databaseUrl).toBeNull();
      expect(result.execution).toBeNull();
    }
  });

  it("accepts Preview with env/project ref when SUPABASE_DB_URL exists", () => {
    const result = prepareHostedFixtureRun(
      ["apply", "--env", "preview", "--project-ref", "previewref"],
      { [SUPABASE_DB_URL_ENV]: sampleUrl },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.environment).toBe("preview");
      expect(result.args.projectRef).toBe("previewref");
      expect(result.databaseUrl).toBe(sampleUrl);
      expect(result.execution?.shell).toBe(false);
      expect(result.execution?.env.SUPABASE_DB_URL).toBe(sampleUrl);
      expect(result.execution?.argv.join(" ")).not.toContain(sampleUrl);
      expect(result.execution?.argv.join(" ")).not.toContain("secret");
    }
  });

  it("accepts Production with confirmation through the execution boundary", () => {
    const result = prepareHostedFixtureRun(
      [
        "cleanup",
        "--env",
        "production",
        "--project-ref",
        "prodref",
        `--confirm-production=${PRODUCTION_CONFIRMATION}`,
      ],
      { [SUPABASE_DB_URL_ENV]: sampleUrl },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args.action).toBe("cleanup");
      expect(result.args.confirmProduction).toBe(PRODUCTION_CONFIRMATION);
      expect(result.execution?.shell).toBe(false);
      expect(result.execution?.env.SUPABASE_DB_URL).toBe(sampleUrl);
      expect(JSON.stringify(result.execution?.argv)).not.toContain("secret");
    }
  });

  it("rejects confirm-production outside Production", () => {
    const result = parseHostedFixtureArgs([
      "apply",
      "--env",
      "preview",
      "--project-ref",
      "previewref",
      `--confirm-production=${PRODUCTION_CONFIRMATION}`,
    ]);
    expect(result.ok).toBe(false);
  });
});

describe("SUPABASE_DB_URL resolution", () => {
  it("rejects missing SUPABASE_DB_URL for real apply", () => {
    const result = prepareHostedFixtureRun(
      ["apply", "--env", "local", "--project-ref", "local"],
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(SUPABASE_DB_URL_ENV);
      expect(result.error).not.toMatch(/postgresql:\/\//i);
    }
  });

  it("rejects missing SUPABASE_DB_URL for real cleanup", () => {
    const result = prepareHostedFixtureRun(
      ["cleanup", "--env", "preview", "--project-ref", "previewref"],
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(SUPABASE_DB_URL_ENV);
    }
  });

  it("resolveSupabaseDbUrl rejects empty values", () => {
    expect(resolveSupabaseDbUrl({}).ok).toBe(false);
    expect(resolveSupabaseDbUrl({ [SUPABASE_DB_URL_ENV]: "  " }).ok).toBe(
      false,
    );
  });
});

describe("credential secrecy in plans, errors, and execution", () => {
  const manifest = loadHostedFixtureManifest();

  it("plan output never includes the database URL", () => {
    const parsed = parseHostedFixtureArgs([
      "apply",
      "--env",
      "local",
      "--project-ref",
      "local",
      "--dry-run",
    ]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const plan = formatHostedFixturePlan(parsed.args, manifest);
    expect(plan).toContain("project_ref=local");
    expect(plan).toContain(`credential_source=env:${SUPABASE_DB_URL_ENV}`);
    expect(plan).not.toContain("database_url");
    expect(plan).not.toContain(sampleUrl);
    expect(plan).not.toContain("secret");
    expect(plan).not.toMatch(/postgresql:\/\//i);
  });

  it("execution boundary never uses shell:true and never puts URL in argv", () => {
    const parsed = parseHostedFixtureArgs([
      "apply",
      "--env",
      "preview",
      "--project-ref",
      "previewref",
    ]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const boundary = buildHostedFixtureExecutionBoundary(
      parsed.args,
      sampleUrl,
    );
    expect(boundary.shell).toBe(false);
    expect(boundary.env.SUPABASE_DB_URL).toBe(sampleUrl);
    expect(boundary.argv.join("\0")).not.toContain(sampleUrl);
    expect(boundary.argv.join("\0")).not.toContain("secret");
    expect(boundary.argv).not.toContain("--database-url");
  });

  it("sanitizeHostedFixtureError strips URL material", () => {
    const sanitized = sanitizeHostedFixtureError(
      `connect failed ${sampleUrl} password=secret`,
    );
    expect(sanitized).not.toContain(sampleUrl);
    expect(sanitized).not.toContain("secret");
    expect(sanitized).toContain("(redacted)");
  });

  it("CLI source does not use shell: true", () => {
    const cliPath = path.join(
      process.cwd(),
      "scripts",
      "fixtures",
      "hosted-demo.mts",
    );
    const source = readFileSync(cliPath, "utf8");
    expect(source).not.toMatch(/shell\s*:\s*true/);
    expect(source).not.toContain("--database-url");
    expect(source).not.toMatch(/spawn\(|exec\(|execFile\(/);
  });

  it("fixture CLI files are covered by tsconfig.scripts.json", () => {
    const configPath = path.join(process.cwd(), "tsconfig.scripts.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      include: string[];
    };
    expect(config.include).toEqual(
      expect.arrayContaining(["scripts/**/*.mts", "src/lib/fixtures/**/*.ts"]),
    );
  });
});

describe("hosted fixture SQL safety", () => {
  const manifest = loadHostedFixtureManifest();

  it("apply and cleanup SQL target only deterministic fixture IDs", () => {
    const applySql = readHostedFixtureSql("apply");
    const cleanupSql = readHostedFixtureSql("cleanup");
    expect(() => assertSafeHostedFixtureSql(applySql, manifest)).not.toThrow();
    expect(() =>
      assertSafeHostedFixtureSql(cleanupSql, manifest),
    ).not.toThrow();

    for (const id of [
      manifest.companyId,
      ...manifest.vacancyIds,
      ...manifest.languageRequirementIds,
    ]) {
      expect(applySql).toContain(id);
      expect(cleanupSql).toContain(id);
    }

    expect(cleanupSql.toLowerCase()).not.toMatch(/\btruncate\b/);
    expect(cleanupSql.toLowerCase()).not.toMatch(
      /delete\s+from\s+public\.\w+\s*;/,
    );
    expect(cleanupSql.toLowerCase()).not.toMatch(/where\s+source\s*=\s*'seed'/);
  });

  it("rejects broad delete and truncate patterns", () => {
    expect(() =>
      assertSafeHostedFixtureSql("truncate public.vacancies;", manifest),
    ).toThrow(/truncate/i);
    expect(() =>
      assertSafeHostedFixtureSql(
        "delete from public.vacancies where source = 'seed';",
        manifest,
      ),
    ).toThrow(/source/i);
  });

  it("uses fixed hosted fixture identities shared with local seed subset", () => {
    expect(manifest.companyId).toBe("11111111-1111-4111-8111-111111111111");
    expect(manifest.vacancyIds).toEqual([
      "22222222-2222-4222-8222-222222222201",
      "22222222-2222-4222-8222-222222222206",
    ]);
    expect(manifest.languageRequirementIds).toEqual([
      "33333333-3333-4333-8333-333333333301",
    ]);
    expect(manifest.expiryDays).toBe(30);
  });
});

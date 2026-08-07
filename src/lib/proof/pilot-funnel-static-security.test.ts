import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

/** All pilot-funnel proof files (D-075). */
const PILOT_FUNNEL_FILES = [
  "src/lib/proof/pilot-funnel.ts",
  "src/lib/proof/local-postgres.ts",
  "scripts/proof/pilot-funnel.mts",
] as const;

function readSource(relativePath: (typeof PILOT_FUNNEL_FILES)[number]) {
  return readFileSync(join(root, relativePath), "utf8");
}

/** Strips comments so prose describing what the code avoids doesn't self-trip the checks below. */
function readCode(relativePath: (typeof PILOT_FUNNEL_FILES)[number]) {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("pilot-funnel read-only static security proof", () => {
  it("never issues an INSERT/UPDATE/DELETE/UPSERT SQL statement or Supabase mutation call", () => {
    for (const file of PILOT_FUNNEL_FILES) {
      const code = readCode(file);
      expect(code, file).not.toMatch(/\binsert\s+into\b/i);
      expect(code, file).not.toMatch(/\bupdate\s+public\./i);
      expect(code, file).not.toMatch(/\bdelete\s+from\b/i);
      expect(code, file).not.toMatch(/\bupsert\b/i);
      expect(code, file).not.toMatch(/\.insert\(/);
      expect(code, file).not.toMatch(/\.update\(/);
      expect(code, file).not.toMatch(/\.delete\(/);
      expect(code, file).not.toMatch(/\.upsert\(/);
    }
  });

  it("never calls a known mutation RPC", () => {
    const MUTATION_RPCS = [
      "suspend_employer",
      "unsuspend_employer",
      "moderate_vacancy",
      "restore_vacancy",
      "revoke_employer_verification",
      "submit_candidate_application",
      "complete_employer_onboarding",
      "transition_current_employer_application_status",
    ];
    for (const file of PILOT_FUNNEL_FILES) {
      const code = readCode(file);
      for (const name of MUTATION_RPCS) {
        expect(code, `${file} calls ${name}`).not.toContain(name);
      }
    }
  });

  it("every metric SQL string in the funnel logic is a SELECT (excludes transaction control)", () => {
    const source = readSource("src/lib/proof/pilot-funnel.ts");
    const queryBlocks = [
      ...source.matchAll(/const [A-Z_]+_QUERY = `([\s\S]*?)`;/g),
    ].map((match) => match[1]?.trim() ?? "");
    // Exactly the five metric queries — never BEGIN/COMMIT/ROLLBACK, which
    // live in local-postgres.ts and are asserted separately below.
    expect(queryBlocks).toHaveLength(5);
    for (const block of queryBlocks) {
      expect(block.toLowerCase().startsWith("select")).toBe(true);
    }
  });

  it("recognises BEGIN/COMMIT/ROLLBACK as legitimate transaction control, distinct from metric or mutation SQL", () => {
    const source = readSource("src/lib/proof/local-postgres.ts");

    // The transaction-control statements exist...
    expect(source).toMatch(
      /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/,
    );
    expect(source).toMatch(/"COMMIT"/);
    expect(source).toMatch(/"ROLLBACK"/);

    // ...and the mutation-pattern checks above correctly do not flag them:
    // none of BEGIN/COMMIT/ROLLBACK match insert/update/delete/upsert.
    const code = readCode("src/lib/proof/local-postgres.ts");
    expect(code).not.toMatch(/\binsert\s+into\b/i);
    expect(code).not.toMatch(/\bdelete\s+from\b/i);
    expect(code).not.toMatch(/\bupsert\b/i);
  });

  it("the transaction is REPEATABLE READ and READ ONLY, not merely SELECT-only SQL", () => {
    const source = readSource("src/lib/proof/local-postgres.ts");
    expect(source).toMatch(/ISOLATION LEVEL REPEATABLE READ/);
    expect(source).toMatch(/READ ONLY/);
  });

  it("the effective-public metric and the report timestamp share one transaction-stable instant", () => {
    const source = readSource("src/lib/proof/pilot-funnel.ts");
    expect(source).toMatch(
      /is_vacancy_effectively_public\(\s*id,\s*transaction_timestamp\(\)\s*\)/,
    );
    expect(source).toMatch(/transaction_timestamp\(\) as measured_at/);
    expect(source).not.toMatch(/is_vacancy_effectively_public\([^)]*\bnow\(\)/);
  });

  it("avoids service-role clients and secret keys", () => {
    for (const file of PILOT_FUNNEL_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("the script wrapper runs the local-proof environment guard before querying", () => {
    const source = readSource("scripts/proof/pilot-funnel.mts");
    expect(source).toMatch(/assertLocalProofEnvironment/);
  });

  it("the local Postgres connection is restricted to localhost", () => {
    const source = readSource("src/lib/proof/local-postgres.ts");
    expect(source).toMatch(/127\.0\.0\.1/);
    expect(source).toMatch(/localhost/);
  });

  it("does not re-implement the effective-public predicate in TypeScript", () => {
    const source = readSource("src/lib/proof/pilot-funnel.ts");
    expect(source).not.toMatch(/publication_state\s*===?\s*['"]published['"]/);
    expect(source).toMatch(/is_vacancy_effectively_public/);
  });
});

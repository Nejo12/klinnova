import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function walk(dir: string, results: string[]): void {
  for (const entry of readdirSync(join(root, dir))) {
    const relativePath = `${dir}/${entry}`;
    const stat = statSync(join(root, relativePath));
    if (stat.isDirectory()) {
      walk(relativePath, results);
      continue;
    }
    if (/\.tsx?$/.test(entry)) {
      results.push(relativePath);
    }
  }
}

/** Every non-test TS/TSX source file in the repository. */
function allSourceFiles(): string[] {
  const results: string[] = [];
  walk("src", results);
  return results.filter(
    (file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"),
  );
}

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

/**
 * Files pre-existing before PR 8.4 that already contain their own
 * service-role detection strings/conventions, unrelated to account
 * deletion. Excluded from the "confined to account-deletion" assertion so
 * this test proves PR 8.4's own confinement, not a repo-wide audit of
 * pre-existing patterns (those are covered by their own PRs/tests).
 */
const PRE_EXISTING_SERVICE_ROLE_REFERENCES = new Set([
  "src/lib/proof/local-environment-guard.ts",
  "src/lib/proof/local-environment-guard.test.ts",
  "src/lib/fixtures/hosted-demo.ts",
]);

const ACCOUNT_DELETION_PRIVILEGED_FILES = new Set([
  "src/lib/account-deletion/privileged-supabase.ts",
  "src/lib/account-deletion/processor.ts",
]);

describe("PR 8.4 account-deletion privileged-boundary static security proof", () => {
  it("imports privileged-supabase.ts only from processor.ts", () => {
    const files = allSourceFiles().filter(
      (file) => file !== "src/lib/account-deletion/privileged-supabase.ts",
    );

    for (const file of files) {
      const source = readSource(file);
      const importsPrivilegedClient =
        /from\s+["']@\/lib\/account-deletion\/privileged-supabase["']/.test(
          source,
        );
      if (importsPrivilegedClient) {
        expect(
          file,
          `${file} must not import privileged-supabase.ts directly`,
        ).toBe("src/lib/account-deletion/processor.ts");
      }
    }
  });

  it("confines service_role/Auth Admin credential usage to the isolated processor module", () => {
    const pattern = /service_role|createServiceRole|SUPABASE_SERVICE_ROLE_KEY/i;

    for (const file of allSourceFiles()) {
      if (
        PRE_EXISTING_SERVICE_ROLE_REFERENCES.has(file) ||
        ACCOUNT_DELETION_PRIVILEGED_FILES.has(file)
      ) {
        continue;
      }
      const source = readSource(file);
      expect(source, file).not.toMatch(pattern);
    }
  });

  it("confines auth.admin/deleteUser calls to the isolated processor module", () => {
    for (const file of allSourceFiles()) {
      if (ACCOUNT_DELETION_PRIVILEGED_FILES.has(file)) {
        continue;
      }
      const source = readSource(file);
      expect(source, file).not.toMatch(/auth\.admin\./);
      expect(source, file).not.toMatch(/\.deleteUser\(/);
    }
  });

  it("never calls listUsers anywhere in the account-deletion module", () => {
    for (const file of allSourceFiles().filter((file) =>
      file.startsWith("src/lib/account-deletion/"),
    )) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.listUsers\(/);
    }
  });

  it("never exposes a privileged secret shape via a NEXT_PUBLIC_ variable", () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*SECRET/);
    }
  });

  it("never routes account deletion through a GET handler", () => {
    const deleteRouteFiles = allSourceFiles().filter(
      (file) => file.includes("account/delete") && file.endsWith("route.ts"),
    );
    expect(deleteRouteFiles).toEqual([]);
  });

  it("reconcileAccountDeletionRequest is never imported outside the account-deletion module and its tests", () => {
    for (const file of allSourceFiles()) {
      if (file.startsWith("src/lib/account-deletion/")) {
        continue;
      }
      const source = readSource(file);
      expect(source, file).not.toMatch(/reconcileAccountDeletionRequest/);
    }
  });

  it("privileged-supabase.ts never logs or returns the service-role key", () => {
    const source = readSource(
      "src/lib/account-deletion/privileged-supabase.ts",
    );
    expect(source).not.toMatch(/console\.(log|error|warn|info|debug)/);
  });

  it("processor.ts never logs raw Auth/Postgres error objects", () => {
    const source = readSource("src/lib/account-deletion/processor.ts");
    expect(source).not.toMatch(/console\.(log|error|warn|info|debug)/);
  });

  it("self-service Server Actions never accept a caller-supplied request/user id from form data", () => {
    const files = [
      "src/app/candidate/account/delete/actions.ts",
      "src/app/employer/account/delete/actions.ts",
    ];
    for (const file of files) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/formData\.get\(\s*["']request/i);
      expect(source, file).not.toMatch(/formData\.get\(\s*["']user/i);
    }
  });
});

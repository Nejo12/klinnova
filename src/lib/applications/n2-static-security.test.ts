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

const PRIVILEGED_LOOKUP_FILE =
  "src/lib/applications/privileged-employer-recipient-lookup.ts";
const NOTIFY_FILE = "src/lib/applications/notify-employer-new-application.ts";

describe("N2 employer-notification static security proof", () => {
  it("only notify-employer-new-application.ts imports the privileged employer-recipient lookup", () => {
    for (const file of allSourceFiles().filter(
      (candidate) => candidate !== PRIVILEGED_LOOKUP_FILE,
    )) {
      const source = readSource(file);
      const importsPrivilegedLookup =
        /from\s+["']@\/lib\/applications\/privileged-employer-recipient-lookup["']/.test(
          source,
        );
      if (importsPrivilegedLookup) {
        expect(
          file,
          `${file} must not import the privileged employer-recipient lookup directly`,
        ).toBe(NOTIFY_FILE);
      }
    }
  });

  it("application-domain code never imports the Resend transport directly (only the N1 mail facade)", () => {
    for (const file of allSourceFiles()) {
      if (file.startsWith("src/lib/mail/")) {
        continue;
      }
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /from\s+["']@\/lib\/mail\/providers\/resend-transport["']/,
      );
      expect(source, file).not.toMatch(/api\.resend\.com/);
    }
  });

  it("the privileged employer-recipient lookup never logs anything", () => {
    const source = readSource(PRIVILEGED_LOOKUP_FILE);
    expect(source).not.toMatch(/console\.(log|error|warn|info|debug)/);
  });

  it("no NEXT_PUBLIC_ variable is shaped like the service-role secret used for recipient lookup", () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/);
    }
  });

  it("notify-employer-new-application.ts declares the server-only import guard", () => {
    const source = readSource(NOTIFY_FILE);
    expect(source).toMatch(/^import\s+"server-only";/m);
  });

  it("privileged-employer-recipient-lookup.ts declares the server-only import guard", () => {
    const source = readSource(PRIVILEGED_LOOKUP_FILE);
    expect(source).toMatch(/^import\s+"server-only";/m);
  });

  it('no Client Component (`"use client"`) imports the notify or privileged-lookup modules', () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      const isClientComponent = /^["']use client["'];/.test(source.trim());
      if (!isClientComponent) {
        continue;
      }
      expect(source, file).not.toMatch(
        /from\s+["']@\/lib\/applications\/notify-employer-new-application["']/,
      );
      expect(source, file).not.toMatch(
        /from\s+["']@\/lib\/applications\/privileged-employer-recipient-lookup["']/,
      );
    }
  });

  it("the employer new-application email template never references candidate-identifying field names", () => {
    const source = readSource(
      "src/lib/applications/employer-new-application-email.ts",
    );
    expect(source).not.toMatch(
      /candidateName|candidateEmail|candidatePhone|candidateAddress|candidate_snapshot/i,
    );
  });

  it("does not add fake application_status_history events for email delivery", () => {
    for (const file of [NOTIFY_FILE, PRIVILEGED_LOOKUP_FILE]) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/application_status_history/);
    }
  });
});

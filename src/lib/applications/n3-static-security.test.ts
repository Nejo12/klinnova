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
  "src/lib/applications/privileged-candidate-recipient-lookup.ts";
const NOTIFY_FILE = "src/lib/applications/notify-candidate-status-change.ts";
const EMAIL_TEMPLATE_FILE = "src/lib/applications/candidate-status-email.ts";

describe("N3 candidate-status-notification static security proof", () => {
  it("only notify-candidate-status-change.ts imports the privileged candidate-recipient lookup", () => {
    for (const file of allSourceFiles().filter(
      (candidate) => candidate !== PRIVILEGED_LOOKUP_FILE,
    )) {
      const source = readSource(file);
      const importsPrivilegedLookup =
        /from\s+["']@\/lib\/applications\/privileged-candidate-recipient-lookup["']/.test(
          source,
        );
      if (importsPrivilegedLookup) {
        expect(
          file,
          `${file} must not import the privileged candidate-recipient lookup directly`,
        ).toBe(NOTIFY_FILE);
      }
    }
  });

  it("the privileged candidate-recipient lookup never logs anything", () => {
    const source = readSource(PRIVILEGED_LOOKUP_FILE);
    expect(source).not.toMatch(/console\.(log|error|warn|info|debug)/);
  });

  it("no NEXT_PUBLIC_ variable is shaped like the service-role secret used for candidate recipient lookup", () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/);
    }
  });

  it("notify-candidate-status-change.ts and the privileged lookup declare the server-only import guard", () => {
    for (const file of [NOTIFY_FILE, PRIVILEGED_LOOKUP_FILE]) {
      expect(readSource(file), file).toMatch(/^import\s+"server-only";/m);
    }
  });

  it('no Client Component (`"use client"`) imports the notify or privileged-lookup modules', () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      const isClientComponent = /^["']use client["'];/.test(source.trim());
      if (!isClientComponent) {
        continue;
      }
      expect(source, file).not.toMatch(
        /from\s+["']@\/lib\/applications\/notify-candidate-status-change["']/,
      );
      expect(source, file).not.toMatch(
        /from\s+["']@\/lib\/applications\/privileged-candidate-recipient-lookup["']/,
      );
    }
  });

  it("the candidate status-email template never references employer-private rejection/actor fields", () => {
    const source = readSource(EMAIL_TEMPLATE_FILE);
    expect(source).not.toMatch(
      /rejectionReason|reason:|actorUserId|actor_user_id|actorRole|actor_role/,
    );
  });

  it("the candidate status-email builder input type has no reason/actor field (TypeScript type-level check)", () => {
    const source = readSource(EMAIL_TEMPLATE_FILE);
    const typeMatch = source.match(
      /export type CandidateStatusEmailInput = \{[^}]*\}/,
    );
    expect(
      typeMatch,
      "CandidateStatusEmailInput type not found",
    ).not.toBeNull();
    const typeBody = typeMatch?.[0] ?? "";
    expect(typeBody).not.toMatch(/reason/i);
    expect(typeBody).not.toMatch(/actor/i);
  });

  it("does not add fake application_status_history events for email delivery", () => {
    for (const file of [NOTIFY_FILE, PRIVILEGED_LOOKUP_FILE]) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/application_status_history/);
    }
  });

  it("N3 never touches application_outcome_events / record_application_outcome / void_application_outcome", () => {
    for (const file of [
      NOTIFY_FILE,
      PRIVILEGED_LOOKUP_FILE,
      EMAIL_TEMPLATE_FILE,
    ]) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /application_outcome_events|record_application_outcome|void_application_outcome|outcome_type/i,
      );
    }
  });

  it("the orchestrator and privileged lookup never reference 'hired' (the email template's own disclaimer sentence is the sole, tested exception)", () => {
    for (const file of [NOTIFY_FILE, PRIVILEGED_LOOKUP_FILE]) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/hired/i);
    }
  });

  it("does not add N4 seen/unseen/read persistence", () => {
    for (const file of [NOTIFY_FILE, PRIVILEGED_LOOKUP_FILE]) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /seen_at|read_at|unseen_count|seenAt|readAt|unseenCount/,
      );
    }
  });
});

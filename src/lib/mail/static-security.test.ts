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

const MAIL_MODULE_FILES = new Set([
  "src/lib/mail/env.ts",
  "src/lib/mail/message.ts",
  "src/lib/mail/transport.ts",
  "src/lib/mail/providers/resend-transport.ts",
  "src/lib/mail/send-transactional-email.ts",
]);

describe("N1 business-mail static security proof", () => {
  it("every server-only mail module declares the `server-only` import guard", () => {
    for (const file of [
      "src/lib/mail/env.ts",
      "src/lib/mail/providers/resend-transport.ts",
      "src/lib/mail/send-transactional-email.ts",
    ]) {
      const source = readSource(file);
      expect(source, file).toMatch(/^import\s+"server-only";/m);
    }
  });

  it('no Client Component (`"use client"`) imports any mail module', () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      const isClientComponent = /^["']use client["'];/.test(source.trim());
      if (!isClientComponent) {
        continue;
      }
      expect(source, file).not.toMatch(/from\s+["']@\/lib\/mail\//);
    }
  });

  it("no NEXT_PUBLIC_ variable is shaped like a mail-provider secret", () => {
    for (const file of allSourceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*RESEND/);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*MAIL_/);
    }
  });

  it("process.env.RESEND_API_KEY is read only inside the mail env module", () => {
    for (const file of allSourceFiles().filter(
      (candidate) => candidate !== "src/lib/mail/env.ts",
    )) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/process\.env\.RESEND_API_KEY/);
    }
  });

  it("only send-transactional-email.ts imports the Resend transport implementation directly", () => {
    for (const file of allSourceFiles().filter(
      (candidate) => candidate !== "src/lib/mail/providers/resend-transport.ts",
    )) {
      const source = readSource(file);
      const importsResendTransport =
        /from\s+["']@\/lib\/mail\/providers\/resend-transport["']/.test(source);
      if (importsResendTransport) {
        expect(
          file,
          `${file} must not import resend-transport.ts directly`,
        ).toBe("src/lib/mail/send-transactional-email.ts");
      }
    }
  });

  it("the Resend transport module never logs anything (it is the only module holding the raw API key in scope)", () => {
    const source = readSource("src/lib/mail/providers/resend-transport.ts");
    expect(source).not.toMatch(/console\.(log|error|warn|info|debug)/);
  });

  it("no mail module logs the message body (`text`/`html`) or the raw recipient field name in a console call", () => {
    for (const file of MAIL_MODULE_FILES) {
      const source = readSource(file);
      const consoleCalls = source.match(/console\.\w+\((?:[^;]|\n)*\);/g) ?? [];
      for (const call of consoleCalls) {
        expect(call, file).not.toMatch(/message\.text/);
        expect(call, file).not.toMatch(/message\.html/);
        expect(call, file).not.toMatch(/message\.to\b/);
      }
    }
  });
});

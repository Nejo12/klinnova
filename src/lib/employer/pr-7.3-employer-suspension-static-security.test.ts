import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

/** All PR 7.3 employer-facing suspended-state UX files. */
const EMPLOYER_SUSPENSION_FILES = [
  "src/lib/employer/suspension-guard.ts",
  "src/lib/employer/update-own-profile.ts",
  "src/app/employer/onboarding/actions.ts",
  "src/lib/employer/ensure-employer-profile.ts",
  "src/app/employer/applications/page.tsx",
  "src/app/employer/applications/[applicationId]/page.tsx",
  "src/app/employer/vacancies/page.tsx",
  "src/app/employer/vacancies/[vacancyId]/page.tsx",
  "src/components/employer-vacancies/vacancy-detail.tsx",
  "src/app/employer/verification/page.tsx",
  "src/components/employer-shared/employer-restricted-notice.tsx",
] as const;

function readSource(relativePath: (typeof EMPLOYER_SUSPENSION_FILES)[number]) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PR 7.3 employer-facing suspension UX static security proof", () => {
  it("calls is_current_employer_suspended only from the shared guard, with no arguments", () => {
    const guardSource = readSource("src/lib/employer/suspension-guard.ts");
    const callSites = [
      ...guardSource.matchAll(
        /\.rpc\(\s*["']is_current_employer_suspended["']\s*(,[^)]*)?\)/g,
      ),
    ];
    expect(callSites.length).toBeGreaterThan(0);
    for (const match of callSites) {
      // No second argument (a params object) is ever passed — the RPC is
      // self-derived from the caller's auth session, never a caller-supplied
      // id. A bare trailing comma before the closing paren is allowed.
      expect(match[1]?.replace(",", "").trim()).toBeFalsy();
    }

    for (const file of EMPLOYER_SUSPENSION_FILES) {
      if (file === "src/lib/employer/suspension-guard.ts") continue;
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /\.rpc\(\s*["']is_current_employer_suspended["']/,
      );
    }
  });

  it("never passes a caller-supplied employer id to a suspension check", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /is_current_employer_suspended\([^)]+\)/,
      );
      expect(source, file).not.toMatch(/_is_employer_suspended/);
    }
  });

  it("never reads employer_suspension directly", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.from\(["']employer_suspension["']\)/);
    }
  });

  it("never exposes the operator-authored suspension reason to employer-facing UI", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/suspended_reason|suspendedReason/);
    }
  });

  it("never exposes vacancy moderation reason to employer-facing UI", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/moderated_reason|moderatedReason/);
    }
  });

  it("never renders actor identity or operator identity", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /actor_user_id|actorUserId|operator_user_id/,
      );
    }
  });

  it("avoids service-role clients and secret keys", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("never redirects a suspended employer out of the employer area to an auth error page", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/redirect\(\s*["']\/auth\/error["']/);
    }
  });

  it("never uses dangerouslySetInnerHTML", () => {
    for (const file of EMPLOYER_SUSPENSION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });
});

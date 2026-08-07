import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

/** All PR 7.3 internal employer/vacancy moderation UI files. */
const INTERNAL_MODERATION_FILES = [
  "src/lib/internal/moderation/schemas.ts",
  "src/lib/internal/moderation/messages.ts",
  "src/lib/internal/moderation/pagination.ts",
  "src/lib/internal/moderation/audit-event-label.ts",
  "src/lib/internal/moderation/load-employers.ts",
  "src/lib/internal/moderation/load-employer-moderation.ts",
  "src/lib/internal/moderation/load-vacancy-moderation.ts",
  "src/lib/internal/moderation/map-rpc-status.ts",
  "src/app/internal/layout.tsx",
  "src/app/internal/employers/page.tsx",
  "src/app/internal/employers/[employerProfileId]/page.tsx",
  "src/app/internal/employers/[employerProfileId]/actions.ts",
  "src/app/internal/employers/[employerProfileId]/vacancies/[vacancyId]/page.tsx",
  "src/app/internal/employers/[employerProfileId]/vacancies/[vacancyId]/actions.ts",
  "src/components/internal-shared/internal-nav.tsx",
  "src/components/internal-moderation/audit-timeline.tsx",
  "src/components/internal-moderation/moderation-pagination.tsx",
  "src/components/internal-moderation/internal-moderation-unavailable.tsx",
  "src/components/internal-moderation/employer-list.tsx",
  "src/components/internal-moderation/employer-suspension-actions.tsx",
  "src/components/internal-moderation/revoke-verification-action.tsx",
  "src/components/internal-moderation/employer-vacancy-list.tsx",
  "src/components/internal-moderation/employer-moderation-detail.tsx",
  "src/components/internal-moderation/vacancy-moderation-actions.tsx",
  "src/components/internal-moderation/vacancy-moderation-detail.tsx",
] as const;

const APPROVED_RPC_NAMES = [
  "list_employers_for_operator",
  "get_employer_moderation_status",
  "list_employer_vacancies_for_operator",
  "get_vacancy_moderation_status",
  "suspend_employer",
  "unsuspend_employer",
  "revoke_employer_verification",
  "moderate_vacancy",
  "restore_vacancy",
  "is_current_user_verification_operator",
];

function readSource(relativePath: (typeof INTERNAL_MODERATION_FILES)[number]) {
  return readFileSync(join(root, relativePath), "utf8");
}

/**
 * Strips `//` and block comments so assertions about what code actually
 * *does* aren't tripped up by prose that documents what it deliberately
 * avoids (e.g. "never renders actor_user_id").
 */
function readCode(relativePath: (typeof INTERNAL_MODERATION_FILES)[number]) {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("PR 7.3 internal employer/vacancy moderation static security proof", () => {
  it("avoids service-role clients and secret keys", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("never reads employer_suspension, vacancy_moderation, or admin_audit_events directly", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.from\(["']employer_suspension["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']vacancy_moderation["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']admin_audit_events["']\)/);
    }
  });

  it("never reads employer_profiles, vacancies, or candidate tables directly", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.from\(["']employer_profiles["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']vacancies["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']candidate_profiles["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']candidate_languages["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']applications["']\)/);
    }
  });

  it("uses only the approved canonical RPC names", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      const rpcCalls = [...source.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map(
        (m) => m[1],
      );
      for (const name of rpcCalls) {
        expect(APPROVED_RPC_NAMES, file).toContain(name);
      }
    }
  });

  it("never renders or forwards actor_user_id", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const code = readCode(file);
      expect(code, file).not.toMatch(/actor_user_id|actorUserId/);
    }
  });

  it("never reads or renders candidate PII", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const code = readCode(file);
      expect(code, file).not.toMatch(
        /candidate_id|candidateId|first_name|last_name|date_of_birth/,
      );
    }
  });

  it("never lists employers or audit events without a bounded limit/offset", () => {
    const source = readSource("src/lib/internal/moderation/load-employers.ts");
    expect(source).toMatch(/p_limit/);
    expect(source).toMatch(/p_offset/);
  });

  it("never accepts an arbitrary employer suspension lookup outside the operator RPCs", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/_is_employer_suspended/);
    }
  });

  it("never uses dangerouslySetInnerHTML", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it("never uses a broad layout-wide revalidatePath", () => {
    for (const file of INTERNAL_MODERATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/revalidatePath\(\s*["']\/["']/);
    }
  });

  it("never redirects a mismatched vacancy to its real owner's route", () => {
    const source = readSource(
      "src/lib/internal/moderation/load-vacancy-moderation.ts",
    );
    expect(source).not.toMatch(/redirect\(/);
  });
});

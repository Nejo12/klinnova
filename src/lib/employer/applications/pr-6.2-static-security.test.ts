import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

/** All PR 6.2 employer applicant list/detail/status-transition UI files. */
const EMPLOYER_APPLICATION_REVIEW_FILES = [
  "src/lib/employer/applications/status.ts",
  "src/lib/employer/applications/messages.ts",
  "src/lib/employer/applications/schemas.ts",
  "src/lib/employer/applications/parse-list-filters.ts",
  "src/lib/employer/applications/format-timestamp.ts",
  "src/lib/employer/applications/load-employer-applications.ts",
  "src/lib/employer/applications/load-employer-application.ts",
  "src/lib/employer/applications/transition-action-state.ts",
  "src/app/employer/applications/page.tsx",
  "src/app/employer/applications/[applicationId]/page.tsx",
  "src/app/employer/applications/[applicationId]/transition-actions.ts",
  "src/components/employer-applications/application-list.tsx",
  "src/components/employer-applications/application-list-filters.tsx",
  "src/components/employer-applications/application-detail.tsx",
  "src/components/employer-applications/application-status-history.tsx",
  "src/components/employer-applications/application-transition-form.tsx",
  "src/components/employer-applications/application-unavailable.tsx",
] as const;

const APPROVED_RPC_NAMES = [
  "list_current_employer_applications",
  "get_current_employer_application",
  "transition_current_employer_application_status",
];

function readSource(
  relativePath: (typeof EMPLOYER_APPLICATION_REVIEW_FILES)[number],
) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PR 6.2 employer applicant review static security proof", () => {
  it("avoids service-role clients", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("never reads applications/application_status_history/candidate_profiles/candidate_languages/vacancies/employer_profiles/verification tables directly", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.from\(["']applications["']\)/);
      expect(source, file).not.toMatch(
        /\.from\(["']application_status_history["']\)/,
      );
      expect(source, file).not.toMatch(/\.from\(["']candidate_profiles["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']candidate_languages["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']vacancies["']\)/);
      expect(source, file).not.toMatch(
        /\.from\(["']vacancy_language_requirements["']\)/,
      );
      expect(source, file).not.toMatch(/\.from\(["']employer_profiles["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']companies["']\)/);
      expect(source, file).not.toMatch(
        /verification_operators|employer_profiles\.verification/,
      );
    }
  });

  it("uses only the approved canonical RPC names", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      const rpcCalls = [...source.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map(
        (m) => m[1],
      );
      for (const name of rpcCalls) {
        expect(APPROVED_RPC_NAMES, file).toContain(name);
      }
    }
  });

  it("never recomputes the allowed-transition matrix in TypeScript", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/_application_allowed_transitions/);
    }
  });

  it("never sends caller-supplied actor identity, employer id, or timestamp to the transition RPC", () => {
    const source = readSource(
      "src/app/employer/applications/[applicationId]/transition-actions.ts",
    );
    expect(source).not.toMatch(/p_actor_user_id|p_actor_role|p_employer_id/);
    expect(source).not.toMatch(/p_occurred_at|p_current_status/);
  });

  it("never renders candidate id, auth id, actor id, or actor role", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /actor_user_id|actor_role|actorUserId|actorRole/,
      );
      expect(source, file).not.toMatch(/candidate_id|candidateId/);
    }
  });

  it("never uses forbidden work-authorisation wording", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /legally authorized|visa verified|work permit confirmed/i,
      );
    }
  });

  it("never re-sorts the canonical RPC ordering client-side", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.sort\(/);
    }
  });

  it("never uses dangerouslySetInnerHTML", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it("never uses a broad layout-wide revalidatePath", () => {
    for (const file of EMPLOYER_APPLICATION_REVIEW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/revalidatePath\(\s*["']\/["']/);
    }
  });
});

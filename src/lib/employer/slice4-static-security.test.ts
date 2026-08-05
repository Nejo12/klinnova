import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const EMPLOYER_FLOW_FILES = [
  "src/app/employer/page.tsx",
  "src/app/employer/onboarding/page.tsx",
  "src/app/employer/register/page.tsx",
  "src/app/employer/vacancies/page.tsx",
  "src/app/employer/vacancies/new/page.tsx",
  "src/app/employer/vacancies/[vacancyId]/page.tsx",
  "src/app/employer/vacancies/[vacancyId]/edit/page.tsx",
  "src/app/employer/vacancies/[vacancyId]/lifecycle-actions.ts",
  "src/app/employer/vacancies/actions.ts",
  "src/lib/employer/load-employer.ts",
  "src/lib/employer/vacancies/load-employer-draft.ts",
  "src/lib/employer/vacancies/load-employer-drafts.ts",
  "src/lib/employer/vacancies/load-employer-vacancy.ts",
  "src/lib/employer/vacancies/require-completed-employer.ts",
  "src/lib/employer/vacancies/require-authenticated-employer.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/browser.ts",
  "src/lib/supabase/proxy.ts",
  "src/components/employer-vacancies/vacancy-draft-form.tsx",
  "src/components/employer-vacancies/vacancy-list.tsx",
  "src/components/employer-vacancies/vacancy-detail.tsx",
  "src/components/employer-vacancies/vacancy-lifecycle-actions.tsx",
  "src/components/employer-vacancies/vacancy-lifecycle-status.tsx",
  "src/components/employer-vacancies/delete-draft-form.tsx",
  "src/components/employer-vacancies/language-requirements-editor.tsx",
  "src/components/employer-vacancies/readiness-checklist.tsx",
] as const;

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function collectTsFiles(relativeDirectory: string): string[] {
  const absolute = join(root, relativeDirectory);
  const entries = readdirSync(absolute);
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = join(relativeDirectory, entry);
    const absolutePath = join(root, relativePath);
    if (statSync(absolutePath).isDirectory()) {
      files.push(...collectTsFiles(relativePath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(relativePath);
    }
  }
  return files;
}

/**
 * Static source invariants for Slice 4/5 employer vacancy flows (PR 4.3
 * draft CRUD through PR 5.4 lifecycle controls).
 * One proof layer only — use with pgTAP, action/loader tests, and Playwright.
 */
describe("Slice 4/5 employer vacancy static security proof", () => {
  it("employer flow sources avoid service-role clients", () => {
    for (const file of EMPLOYER_FLOW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("vacancy mutations use PR 4.3 RPCs only and never direct table writes", () => {
    const source = readSource("src/app/employer/vacancies/actions.ts");
    expect(source).toMatch(/create_employer_vacancy_draft/);
    expect(source).toMatch(/update_employer_vacancy_draft/);
    expect(source).toMatch(/replace_employer_vacancy_languages/);
    expect(source).toMatch(/delete_employer_vacancy_draft/);
    expect(source).not.toMatch(
      /\.from\(["']vacancies["']\)\s*\.(insert|update|delete)/i,
    );
    expect(source).not.toMatch(
      /\.from\(["']vacancy_language_requirements["']\)\s*\.(insert|update|delete|upsert)/i,
    );
    expect(source).not.toMatch(/p_employer_profile_id/);
    expect(source).not.toMatch(/p_company_id/);
    expect(source).not.toMatch(/p_source|publication_state|published_at/);
  });

  it("employer vacancy UI does not expose applicant review or a generic state setter", () => {
    // Publish/pause/resume/fill/withdraw controls are PR 5.4 in-scope
    // (D-058 lifecycle contract); this only guards the boundaries PR 5.4
    // still excludes: applicant review (Slice 6), public job routes, and
    // any generic/unrestricted lifecycle status setter (D-058 forbids one —
    // every transition must be its own named RPC).
    const uiFiles = [
      ...collectTsFiles("src/components/employer-vacancies"),
      ...collectTsFiles("src/app/employer/vacancies"),
    ];

    for (const file of uiFiles) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/Applicants|Public preview/i);
      expect(source, file).not.toMatch(/set_publication_state/i);
    }
  });

  it("lifecycle actions call only the named PR 5.2 RPCs with no caller-controlled owner, state, or timestamps", () => {
    const source = readSource(
      "src/app/employer/vacancies/[vacancyId]/lifecycle-actions.ts",
    );
    expect(source).toMatch(/publish_employer_vacancy/);
    expect(source).toMatch(/pause_employer_vacancy/);
    expect(source).toMatch(/resume_employer_vacancy/);
    expect(source).toMatch(/fill_employer_vacancy/);
    expect(source).toMatch(/withdraw_employer_vacancy/);
    expect(source).toMatch(/materialize_employer_vacancy_expiry/);
    expect(source).toMatch(/renew_employer_vacancy_to_draft/);
    expect(source).not.toMatch(
      /\.from\(["']vacancies["']\)\s*\.(insert|update|delete)/i,
    );
    expect(source).not.toMatch(/p_employer_profile_id/);
    expect(source).not.toMatch(/p_company_id/);
    expect(source).not.toMatch(/p_source|p_publication_state/);
    expect(source).not.toMatch(
      /p_published_at|p_paused_at|p_filled_at|p_withdrawn_at/,
    );
  });

  it("loaders never accept caller-owned employer UUIDs as ownership inputs", () => {
    const draftLoader = readSource(
      "src/lib/employer/vacancies/load-employer-draft.ts",
    );
    const draftsLoader = readSource(
      "src/lib/employer/vacancies/load-employer-drafts.ts",
    );
    const vacancyLoader = readSource(
      "src/lib/employer/vacancies/load-employer-vacancy.ts",
    );
    expect(draftLoader).toMatch(/requireCompletedEmployer/);
    expect(draftsLoader).toMatch(/requireCompletedEmployer/);
    expect(vacancyLoader).toMatch(/requireCompletedEmployer/);
    expect(draftLoader).toMatch(/employer_profile_id/);
    expect(vacancyLoader).toMatch(/employer_profile_id/);
    expect(draftLoader).not.toMatch(/p_owner|ownerId|employerProfileId:/);
    expect(draftsLoader).not.toMatch(/p_owner|ownerId|employerProfileId:/);
    expect(vacancyLoader).not.toMatch(/p_owner|ownerId|employerProfileId:/);
  });
});

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
  "src/app/employer/vacancies/actions.ts",
  "src/lib/employer/load-employer.ts",
  "src/lib/employer/vacancies/load-employer-draft.ts",
  "src/lib/employer/vacancies/load-employer-drafts.ts",
  "src/lib/employer/vacancies/require-completed-employer.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/browser.ts",
  "src/lib/supabase/proxy.ts",
  "src/components/employer-vacancies/vacancy-draft-form.tsx",
  "src/components/employer-vacancies/vacancy-list.tsx",
  "src/components/employer-vacancies/vacancy-detail.tsx",
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
 * Static source invariants for Slice 4 employer flows.
 * One proof layer only — use with pgTAP, action/loader tests, and Playwright.
 */
describe("Slice 4 static security proof", () => {
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

  it("employer vacancy UI does not expose Publish or applicant controls", () => {
    const uiFiles = [
      ...collectTsFiles("src/components/employer-vacancies"),
      ...collectTsFiles("src/app/employer/vacancies"),
    ];

    for (const file of uiFiles) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /Publish vacancy|Publish draft|Applicants|Public preview/i,
      );
      expect(source, file).not.toMatch(
        /publish_employer_vacancy|set_publication_state/i,
      );
    }
  });

  it("loaders never accept caller-owned employer UUIDs as ownership inputs", () => {
    const draftLoader = readSource(
      "src/lib/employer/vacancies/load-employer-draft.ts",
    );
    const draftsLoader = readSource(
      "src/lib/employer/vacancies/load-employer-drafts.ts",
    );
    expect(draftLoader).toMatch(/requireCompletedEmployer/);
    expect(draftsLoader).toMatch(/requireCompletedEmployer/);
    expect(draftLoader).toMatch(/employer_profile_id/);
    expect(draftLoader).not.toMatch(/p_owner|ownerId|employerProfileId:/);
    expect(draftsLoader).not.toMatch(/p_owner|ownerId|employerProfileId:/);
  });
});

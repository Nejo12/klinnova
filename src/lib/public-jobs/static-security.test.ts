import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const PUBLIC_JOBS_FILES = [
  "src/app/jobs/(browse)/page.tsx",
  "src/app/jobs/[vacancyId]/page.tsx",
  "src/app/jobs/[vacancyId]/not-found.tsx",
  "src/lib/public-jobs/load-public-vacancies.ts",
  "src/lib/public-jobs/load-public-vacancy-detail.ts",
  "src/lib/public-jobs/domain.ts",
  "src/lib/public-jobs/schemas.ts",
  "src/components/public-jobs/public-jobs-page.tsx",
  "src/components/public-jobs/public-job-card.tsx",
  "src/components/public-jobs/public-job-detail-page.tsx",
  "src/components/public-jobs/application-entry-notice.tsx",
] as const;

function readSource(relativePath: (typeof PUBLIC_JOBS_FILES)[number]) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PR 5.5b public-jobs static security proof", () => {
  it("does not wrap public job detail in a loading.tsx Suspense shell", () => {
    // A loading.tsx in `app/jobs/` wraps `/jobs/[vacancyId]` as well as the
    // listing. Combined with `app/jobs/[vacancyId]/loading.tsx`, Next.js
    // streams HTTP 200 + skeleton before `notFound()`, so Playwright and
    // curl observe 200 even when get_effective_public_vacancy returns zero
    // rows (D-072/D-073 hidden vacancies). Listing loading belongs in a
    // route group that does not wrap the detail segment, and the detail
    // route must not have its own loading.tsx.
    expect(existsSync(join(root, "src/app/jobs/loading.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/app/jobs/[vacancyId]/loading.tsx"))).toBe(
      false,
    );
  });

  it("avoids service-role clients", () => {
    for (const file of PUBLIC_JOBS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("never reads vacancies/vacancy_language_requirements/employer_profiles/companies/verification tables directly", () => {
    for (const file of PUBLIC_JOBS_FILES) {
      const source = readSource(file);
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

  it("never reads applications or candidate_profiles", () => {
    for (const file of PUBLIC_JOBS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.from\(["']applications["']\)/);
      expect(source, file).not.toMatch(/\.from\(["']candidate_profiles["']\)/);
    }
  });

  it("uses only the three approved RPC names", () => {
    const loaderFiles = [
      "src/lib/public-jobs/load-public-vacancies.ts",
      "src/lib/public-jobs/load-public-vacancy-detail.ts",
    ] as const;
    for (const file of loaderFiles) {
      const source = readSource(file);
      const rpcCalls = [...source.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map(
        (m) => m[1],
      );
      expect(rpcCalls.length).toBeGreaterThan(0);
      for (const name of rpcCalls) {
        expect([
          "list_effective_public_vacancies",
          "get_effective_public_vacancy",
          "get_effective_public_vacancy_languages",
        ]).toContain(name);
      }
    }
  });

  it("never calls submit_candidate_application or the candidate matcher", () => {
    for (const file of PUBLIC_JOBS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/submit_candidate_application/);
      expect(source, file).not.toMatch(
        /matchCandidateToVacancy|resolveCandidateVacancyMatch/,
      );
    }
  });

  it("never uses dangerouslySetInnerHTML", () => {
    for (const file of PUBLIC_JOBS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it("application entry notice shows only the approved neutral copy", () => {
    const source = readSource(
      "src/components/public-jobs/application-entry-notice.tsx",
    );
    expect(source).not.toMatch(
      /Apply now|You match|You are eligible|Missing requirements/i,
    );
  });
});

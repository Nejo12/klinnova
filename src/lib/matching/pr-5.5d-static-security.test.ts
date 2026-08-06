import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

/** All PR 5.5d candidate discovery/application UI integration files. */
const CANDIDATE_INTEGRATION_FILES = [
  "src/lib/matching/missing-requirement-codes.ts",
  "src/lib/matching/candidate-vacancy-match-schemas.ts",
  "src/lib/matching/load-current-candidate-matches.ts",
  "src/lib/matching/load-current-candidate-matches-page.ts",
  "src/lib/matching/resolve-current-candidate-vacancy-detail.ts",
  "src/lib/onboarding/candidate-completion-status.ts",
  "src/app/candidate/matches/resolve-matches-view.ts",
  "src/app/candidate/matches/page.tsx",
  "src/app/candidate/jobs/[vacancyId]/resolve-job-detail-view.ts",
  "src/app/candidate/jobs/[vacancyId]/page.tsx",
  "src/app/candidate/jobs/[vacancyId]/actions.ts",
  "src/components/candidate-matches/candidate-matches-page.tsx",
  "src/components/candidate-matches/match-card.tsx",
  "src/components/candidate-matches/match-list.tsx",
  "src/components/candidate-job-detail/candidate-job-detail-page.tsx",
  "src/components/candidate-job-detail/application-submit-form.tsx",
  "src/components/candidate-job-detail/missing-requirements-list.tsx",
  "src/components/candidate-job-detail/job-detail-unavailable.tsx",
] as const;

/** The one approved direct table read: candidate-owned `applications`. */
const APPLICATIONS_READERS = [
  "src/lib/matching/load-current-candidate-matches-page.ts",
  "src/lib/matching/resolve-current-candidate-vacancy-detail.ts",
] as const;

/**
 * The one approved direct `candidate_profiles` read: the narrow completion
 * guard, selecting only `onboarding_completed_at` (never a matching-input
 * column). Enforced separately below by asserting the exact select list.
 */
const CANDIDATE_PROFILE_COMPLETION_READERS = [
  "src/lib/onboarding/candidate-completion-status.ts",
] as const;

const APPROVED_RPC_NAMES = [
  "list_current_candidate_vacancy_matches",
  "resolve_current_candidate_vacancy_match",
  "get_effective_public_vacancy",
  "get_effective_public_vacancy_languages",
  "submit_candidate_application",
];

function readSource(
  relativePath: (typeof CANDIDATE_INTEGRATION_FILES)[number],
) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PR 5.5d candidate integration static security proof", () => {
  it("avoids service-role clients", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("never reads vacancies/vacancy_language_requirements/employer_profiles/companies/verification tables directly", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
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

  it("never reads candidate_languages directly", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.from\(["']candidate_languages["']\)/);
    }
  });

  it("only the narrow completion guard reads candidate_profiles, and only onboarding_completed_at", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      const readsProfiles = /\.from\(["']candidate_profiles["']\)/.test(source);
      if (
        (CANDIDATE_PROFILE_COMPLETION_READERS as readonly string[]).includes(
          file,
        )
      ) {
        expect(readsProfiles, file).toBe(true);
        expect(source, file).toMatch(
          /\.select\(\s*["']onboarding_completed_at["']\s*\)/,
        );
        expect(source, file).not.toMatch(
          /job_categories|employment_types|shift_preferences|german_comfort|available_from|travel_radius_minutes/,
        );
      } else {
        expect(readsProfiles, file).toBe(false);
      }
    }
  });

  it("only the RLS-audited detail/list loaders read the candidate-owned applications table", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      const readsApplications = /\.from\(["']applications["']\)/.test(source);
      if ((APPLICATIONS_READERS as readonly string[]).includes(file)) {
        expect(readsApplications, file).toBe(true);
      } else {
        expect(readsApplications, file).toBe(false);
      }
    }
  });

  it("uses only the approved canonical RPC names", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      const rpcCalls = [...source.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map(
        (m) => m[1],
      );
      for (const name of rpcCalls) {
        expect(APPROVED_RPC_NAMES, file).toContain(name);
      }
    }
  });

  it("never uses the TypeScript matcher as an eligibility authority", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /matchCandidateToVacancy|matchCandidateToVacancies|resolveCandidateVacancyMatch/,
      );
    }
  });

  it("never re-sorts the canonical RPC ordering (vacancy list or missing-requirement codes) client-side", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.sort\(/);
    }
  });

  it("never uses dangerouslySetInnerHTML", () => {
    for (const file of CANDIDATE_INTEGRATION_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });
});

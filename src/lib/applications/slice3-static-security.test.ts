import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const APPLICATION_FLOW_FILES = [
  "src/app/candidate/jobs/[vacancyId]/actions.ts",
  "src/app/candidate/jobs/[vacancyId]/page.tsx",
  "src/app/candidate/applications/[applicationId]/page.tsx",
  "src/lib/applications/load-candidate-application-confirmation.ts",
  "src/lib/matching/load-candidate-vacancy-detail.ts",
  "src/lib/matching/load-candidate-matches.ts",
  "src/lib/matching/resolve-candidate-vacancy-match.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/browser.ts",
  "src/lib/supabase/proxy.ts",
  "src/components/candidate-job-detail/application-submit-form.tsx",
  "src/components/candidate-application-confirmation/application-confirmation-page.tsx",
] as const;

function readSource(relativePath: (typeof APPLICATION_FLOW_FILES)[number]) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Slice 3 static security proof", () => {
  it("candidate application flow sources avoid service-role clients", () => {
    for (const file of APPLICATION_FLOW_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("submit action sends only vacancy ID to the RPC", () => {
    const source = readSource("src/app/candidate/jobs/[vacancyId]/actions.ts");
    expect(source).toMatch(/submit_candidate_application/);
    expect(source).toMatch(/p_vacancy_id:\s*vacancyId/);
    expect(source).not.toMatch(/p_candidate/);
    expect(source).not.toMatch(/candidate_snapshot/);
    expect(source).not.toMatch(/vacancy_snapshot/);
    expect(source).not.toMatch(/p_status|submitted_at|application_id:/);
    expect(source).not.toMatch(
      /\.from\(["']applications["']\)\s*\.(insert|update|delete)/i,
    );
  });

  it("confirmation loader does not reconstruct from current profile or matcher", () => {
    const source = readSource(
      "src/lib/applications/load-candidate-application-confirmation.ts",
    );
    expect(source).toMatch(/from\("applications"\)/);
    expect(source).toMatch(/candidate_snapshot/);
    expect(source).toMatch(/vacancy_snapshot/);
    expect(source).not.toMatch(/candidate_profiles/);
    expect(source).not.toMatch(/from\("vacancies"\)/);
    expect(source).not.toMatch(/from\("companies"\)/);
    expect(source).not.toMatch(
      /matchCandidateToVacancy|resolveCandidateVacancyMatch/,
    );
    expect(source).not.toMatch(
      /complete_candidate_onboarding|onboarding_completed/,
    );
  });

  it("confirmation page does not render applicationId as visible copy", () => {
    const source = readSource(
      "src/components/candidate-application-confirmation/application-confirmation-page.tsx",
    );
    expect(source).not.toMatch(/confirmation\.applicationId/);
    expect(source).not.toMatch(/\{[^}]*applicationId[^}]*\}/);
    expect(source).not.toMatch(
      /Withdraw|Submit again|Edit application|Message employer/,
    );
  });

  it("does not invent RPC not_matching and keeps matcher TypeScript-only in the action", () => {
    const action = readSource("src/app/candidate/jobs/[vacancyId]/actions.ts");
    expect(action).toMatch(/case "not_matching"/);
    expect(action).not.toMatch(/result:\s*["']not_matching["']/);
    expect(action).toMatch(/resolveCandidateVacancyMatch/);
  });

  it("keeps confirmation and job detail under authenticated candidate routes", () => {
    const confirmationPage = readSource(
      "src/app/candidate/applications/[applicationId]/page.tsx",
    );
    const jobDetailPage = readSource(
      "src/app/candidate/jobs/[vacancyId]/page.tsx",
    );
    expect(confirmationPage).toMatch(/loadCandidateApplicationConfirmation/);
    expect(jobDetailPage).toMatch(/loadCandidateVacancyDetail/);
    expect(confirmationPage).not.toMatch(/employer/);
    expect(jobDetailPage).not.toMatch(/\/employer\//);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

/** All PR 6.3 candidate application inventory/status-history UI files (new + extended). */
const CANDIDATE_APPLICATION_STATUS_FILES = [
  "src/lib/applications/status.ts",
  "src/lib/applications/snapshot-schemas.ts",
  "src/lib/applications/application-confirmation.ts",
  "src/lib/applications/load-candidate-application-confirmation.ts",
  "src/lib/applications/load-candidate-application-inventory.ts",
  "src/lib/applications/load-candidate-application-history.ts",
  "src/app/candidate/applications/page.tsx",
  "src/app/candidate/applications/resolve-inventory-view.ts",
  "src/app/candidate/applications/[applicationId]/page.tsx",
  "src/components/candidate-applications/candidate-applications-page-header.tsx",
  "src/components/candidate-applications/applications-empty-state.tsx",
  "src/components/candidate-applications/applications-error-state.tsx",
  "src/components/candidate-applications/application-inventory-card.tsx",
  "src/components/candidate-applications/application-inventory-list.tsx",
  "src/components/candidate-application-confirmation/application-confirmation-page.tsx",
  "src/components/candidate-application-confirmation/application-status-timeline.tsx",
] as const;

/** The only files allowed a direct, candidate-owned `.from("applications")` read (RLS: `applications_select_own`). */
const APPLICATIONS_READERS = [
  "src/lib/applications/load-candidate-application-confirmation.ts",
  "src/lib/applications/load-candidate-application-inventory.ts",
] as const;

const APPROVED_RPC_NAMES = [
  "list_current_candidate_application_status_history",
];

function readSource(
  relativePath: (typeof CANDIDATE_APPLICATION_STATUS_FILES)[number],
) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PR 6.3 candidate application status static security proof", () => {
  it("avoids service-role clients", () => {
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /createServiceRole|SERVICE_ROLE|service_role/i,
      );
      expect(source, file).not.toMatch(/sb_secret_/i);
    }
  });

  it("never reads application_status_history, vacancies, employer_profiles, or verification tables directly", () => {
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /\.from\(["']application_status_history["']\)/,
      );
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

  it("never uses the employer applicant-review RPCs", () => {
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /get_current_employer_application|list_current_employer_applications|transition_current_employer_application_status/,
      );
    }
  });

  it("only the approved candidate-owned loaders read the applications table directly", () => {
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
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
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      const rpcCalls = [...source.matchAll(/\.rpc\(\s*["']([a-z_]+)["']/g)].map(
        (m) => m[1],
      );
      for (const name of rpcCalls) {
        expect(APPROVED_RPC_NAMES, file).toContain(name);
      }
    }
  });

  it("never sends a caller-supplied candidate id to the history RPC", () => {
    const source = readSource(
      "src/lib/applications/load-candidate-application-history.ts",
    );
    expect(source).not.toMatch(/p_candidate_id|p_candidate/);
  });

  it("never renders or requests actor identity or an employer rejection reason", () => {
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(
        /actor_user_id|actor_role|actorUserId|actorRole/,
      );
    }
    // The history RPC's own projection excludes `reason` entirely — assert
    // none of the candidate-facing files ever select or render it.
    const historyLoader = readSource(
      "src/lib/applications/load-candidate-application-history.ts",
    );
    expect(historyLoader).not.toMatch(/\breason\b/);
    const timeline = readSource(
      "src/components/candidate-application-confirmation/application-status-timeline.tsx",
    );
    expect(timeline).not.toMatch(/\breason\b/);
  });

  it("never dumps a snapshot or confirmation object as raw JSON", () => {
    // Loaders/schemas legitimately read/parse individual typed fields off
    // `candidate_snapshot`/`vacancy_snapshot` (e.g.
    // `application.vacancy_snapshot.title`) — the real guarantee is that no
    // file ever serializes the whole object into rendered output.
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/JSON\.stringify/);
    }
  });

  it("never uses dangerouslySetInnerHTML", () => {
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it("never re-sorts the canonical inventory/history ordering client-side", () => {
    // `application-confirmation.ts` pre-dates PR 6.3 and legitimately sorts
    // the *display* order of a snapshot's own language sub-arrays — an
    // unrelated, already-reviewed concern, not a re-sort of the
    // database-ordered inventory list or status history this check guards.
    const exempt: readonly string[] = [
      "src/lib/applications/application-confirmation.ts",
    ];
    for (const file of CANDIDATE_APPLICATION_STATUS_FILES) {
      if (exempt.includes(file)) {
        continue;
      }
      const source = readSource(file);
      expect(source, file).not.toMatch(/\.sort\(/);
    }
  });
});

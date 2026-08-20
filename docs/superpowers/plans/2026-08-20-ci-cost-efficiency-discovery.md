# CI Cost Efficiency Discovery

Status: Discovery only
Date: 2026-08-20
Branch base: `d3c33b681878ca0e53e7798abe056243b2e5aaca`
Workflow audited: `.github/workflows/ci.yml`

## 1. Current-State Findings

The current CI workflow runs on:

- every `pull_request`;
- every `push` to `main`.

It uses one classifier job, currently named `Classify change (Tier A docs-only detection)`. The classifier produces one output:

- `docs_only`

The classifier computes changed files as:

- pull request: `github.event.pull_request.base.sha` to `github.event.pull_request.head.sha`;
- push: `github.event.before` to `github.sha`.

It fails safe to `docs_only=false` when:

- the base SHA is empty;
- the base SHA is all zeroes;
- the base commit cannot be found;
- no changed files are detected.

The current Tier A whitelist is exactly:

```text
docs/*
README.md
AGENTS.md
NOT_NOW.md
```

Anything else sets `docs_only=false`.

The two expensive jobs are:

- `quality`: `Format, lint, typecheck, test, build, e2e`
- `database`: `Schema and RLS`

Both jobs currently run when `needs.classify.outputs.docs_only != 'true'`.

The current workflow uses job-level `if:` gates, not workflow-level path filters. This is the right direction for required-check predictability because the workflow still creates checks rather than disappearing entirely for skipped paths.

The workflow concurrency group is:

```text
ci-${{ github.workflow }}-${{ github.ref }}
```

with `cancel-in-progress: true`. This cancels older runs for the same pull-request branch or the same `main` ref, but it does not make a PR-head run and the later `main` push run cancel each other because they use different refs.

## 2. PR #123 Root Cause

PR #123 changed only bootstrap/governance paths:

```text
.agents/skills/klinnova-discovery/SKILL.md
.agents/skills/klinnova-discovery/agents/openai.yaml
.agents/skills/klinnova-implementation/SKILL.md
.agents/skills/klinnova-implementation/agents/openai.yaml
.agents/skills/klinnova-merge-verification/SKILL.md
.agents/skills/klinnova-merge-verification/agents/openai.yaml
.agents/skills/klinnova-pr-readiness/SKILL.md
.agents/skills/klinnova-pr-readiness/agents/openai.yaml
.agents/skills/klinnova-review/SKILL.md
.agents/skills/klinnova-review/agents/openai.yaml
.agents/skills/klinnova-ui-verification/SKILL.md
.agents/skills/klinnova-ui-verification/agents/openai.yaml
.codex/config.toml
AGENTS.md
README.md
docs/agent/README.md
docs/agent/governance.md
docs/agent/workflow.md
```

The current classifier accepted `AGENTS.md`, `README.md`, and `docs/agent/**`, but it did not accept:

```text
.agents/**
.codex/**
```

Therefore the classifier set `docs_only=false`, and both expensive jobs ran on PR head `c05bbbef51e7c41b746d2b9f18a89f878adcce10`.

Observed PR-head check results:

- `Classify change`: success
- `Format, lint, typecheck, test, build, e2e`: success
- `Schema and RLS`: success
- Vercel status: success
- Supabase Preview: skipped by Supabase integration configuration

After PR #123 merged, merge commit `d3c33b681878ca0e53e7798abe056243b2e5aaca` triggered the workflow again because the workflow also runs on `push` to `main`.

The merge commit had the same tree as the PR head in this specific case:

```text
c05bbbe tree = 6de2b4b9cb223c9bcc2f0e8f2b5e25c1a8cd9020
d3c33b6 tree = 6de2b4b9cb223c9bcc2f0e8f2b5e25c1a8cd9020
```

Even so, the current push classifier compared `github.event.before` to `github.sha`; the changed-file set was the same bootstrap/governance set, `.agents/**` and `.codex/**` still caused `docs_only=false`, and the full jobs ran again on `main`.

Observed `main` push check results:

- `Classify change`: success
- `Format, lint, typecheck, test, build, e2e`: success
- `Schema and RLS`: success
- Vercel status: success
- Supabase Preview: skipped by Supabase integration configuration

## 3. Tier A Proposal

Tier A should mean non-runtime/governance-only changes. It should skip product build, product E2E, and local Supabase/RLS work.

Proposed Tier A whitelist:

```text
docs/**
README.md
AGENTS.md
NOT_NOW.md
.agents/**
.codex/**
```

Rationale:

- `docs/**` is already accepted and is repository documentation.
- `README.md`, `AGENTS.md`, and `NOT_NOW.md` are already accepted and are non-runtime governance/docs.
- `.agents/**` contains Codex skill instructions and metadata. It is model/operator guidance, not app runtime code.
- `.codex/**` contains repo-local Codex config. It is agent configuration, not Next/Supabase runtime configuration.

Do not initially include these as Tier A:

```text
.github/workflows/**
package.json
pnpm-lock.yaml
next.config.ts
tsconfig.json
tsconfig.scripts.json
vitest.config.mts
playwright.config.ts
playwright.webkit-smoke.config.ts
eslint.config.mjs
.prettierrc.json
.prettierignore
.env.example
public/**
next-env.d.ts
src/types/database.ts
```

Rationale:

- `.github/workflows/**` can weaken or break CI itself and needs dedicated validation.
- package, lockfile, build, TypeScript, Vitest, Playwright, ESLint, Prettier, and Next config changes can alter the environment or the checks.
- `.env.example` is not runtime-loaded, but it documents deployment and secret boundaries; keep it out of Tier A until a metadata validator explicitly covers it.
- `public/**` is runtime-served static surface.
- `next-env.d.ts` and `src/types/database.ts` are generated/type surfaces that can alter compile-time or DB contract confidence.

Tier A can optionally run a lightweight governance validation job:

- parse `.codex/config.toml` when present;
- parse `.agents/**/SKILL.md` frontmatter;
- parse `.agents/**/agents/openai.yaml`;
- run a targeted secret scan against `.agents`, `.codex`, `docs/agent`, `AGENTS.md`, and `README.md`.

This job should not install full app dependencies unless the validator requires them. Prefer standard shell/Ruby/Python available on `ubuntu-latest` or a tiny committed script.

## 4. Tier B / Tier C Proposal

Use two classifier outputs:

```text
non_runtime_only
database_sensitive
```

Derived behavior:

- Tier A: `non_runtime_only=true`
- Tier B: `non_runtime_only=false`, `database_sensitive=false`
- Tier C: `non_runtime_only=false`, `database_sensitive=true`

Tier B should mean runtime/app changes that need normal quality checks but do not require local Supabase integration proof.

Tier C should mean DB/Auth/security/integration-sensitive changes that require the full local Supabase job.

Because this repository has deep coupling between candidate/employer workflows, Supabase Auth, RLS, publication readiness, application status, outcomes, matching, and account deletion, the classifier should be conservative. Ambiguous runtime paths should fall into Tier C.

## 5. Exact Path Rules

### `non_runtime_only=true`

Only when every changed file matches one of:

```text
docs/**
README.md
AGENTS.md
NOT_NOW.md
.agents/**
.codex/**
```

If any file falls outside this list:

```text
non_runtime_only=false
```

### `database_sensitive=true`

Set `database_sensitive=true` when any changed file matches:

```text
supabase/**
src/types/database.ts
package.json
pnpm-lock.yaml
next.config.ts
tsconfig.json
tsconfig.scripts.json
vitest.config.mts
playwright.config.ts
playwright.webkit-smoke.config.ts
.github/workflows/**
scripts/**
e2e/**
src/lib/supabase/**
src/proxy.ts
src/lib/auth/**
src/lib/env/**
src/lib/account-deletion/**
src/lib/account-export/**
src/lib/applications/**
src/lib/employer/**
src/lib/internal/**
src/lib/matching/**
src/lib/onboarding/**
src/lib/proof/**
src/lib/public-jobs/load-*
src/app/auth/**
src/app/login/**
src/app/register/**
src/app/forgot-password/**
src/app/reset-password/**
src/app/account/**
src/app/candidate/**
src/app/employer/**
src/app/internal/**
src/app/jobs/**
src/components/account-deletion/**
src/components/auth/**
src/components/candidate-application-confirmation/**
src/components/candidate-applications/**
src/components/candidate-job-detail/**
src/components/candidate-matches/**
src/components/candidate-nav/**
src/components/employer-applications/**
src/components/employer-onboarding/**
src/components/employer-shared/**
src/components/employer-vacancies/**
src/components/employer-verification/**
src/components/internal-moderation/**
src/components/internal-shared/**
src/components/internal-verification/**
src/components/onboarding/**
src/components/public-jobs/**
```

Rationale:

- `supabase/**` contains migrations, config, seeds, templates, and pgTAP tests.
- `src/types/database.ts` is generated from the local DB schema and is verified in the database job.
- package/config/workflow/script changes can alter runtime, test runtime, DB tooling, or CI behavior.
- `e2e/**` changes alter the CI proof surface.
- `src/lib/supabase/**`, `src/proxy.ts`, and `src/lib/auth/**` are auth/session boundaries.
- account deletion/export, applications, employer, internal moderation/verification, matching, onboarding, and public job loaders encode DB-backed product contracts.
- candidate/employer/internal/job app routes compose DB-backed server actions/loaders and are covered by local Supabase journeys.
- candidate/employer/auth/internal/onboarding/application/public-job components sit on critical flows that current DB-backed E2E jobs prove.

### `database_sensitive=false`

Allowed only when:

- `non_runtime_only=false`; and
- no changed file matches the `database_sensitive=true` rules; and
- every changed runtime file is in a known presentation/static area.

Known Tier B presentation/static areas at this point:

```text
src/components/homepage/**
src/components/public-shared/**
src/components/legal/**
src/components/brand-mark.*
src/components/shell-header.*
src/styles/**
src/app/impressum/**
src/app/privacy/**
src/app/terms/**
src/app/error.*
src/app/global-error.*
src/app/icon.tsx
src/app/apple-icon.tsx
public/**
.prettierrc.json
.prettierignore
eslint.config.mjs
```

Notes:

- `eslint.config.mjs`, `.prettierrc.json`, and `.prettierignore` should still run `quality`; they do not need local Supabase.
- `public/**` is runtime-served, so it should not be Tier A, but it normally does not need local Supabase unless mixed with sensitive files.
- If a file is not explicitly known as Tier A or Tier B, classify it as Tier C.

## 6. Main-Push Recommendation

Keep the `push` to `main` trigger.

Do not remove post-merge validation casually. A merge commit can differ from the PR head when:

- `main` advanced during the PR;
- GitHub creates a true merge commit;
- conflict resolution changes the final tree;
- required checks were green on an older PR head but the final merge tree has not been proven.

However, apply the same classifier on `main` pushes:

- Tier A main push: run classifier and optional metadata validation only; skip product build/E2E and Schema/RLS.
- Tier B main push: run quality; skip Schema/RLS.
- Tier C main push: run quality and Schema/RLS.

This preserves post-merge confidence for meaningful runtime/DB/security changes while avoiding the PR #123 pattern where governance-only changes pay for the full suite twice.

Future optional optimization, not first implementation:

- detect when a merge commit tree exactly equals the already-passed PR head tree, and reuse exact-head evidence for selected jobs.

That requires reliable PR-head/check mapping and branch-protection clarity. It is not worth doing before the simpler tier classifier.

## 7. Duplication Findings

### Duplicate but expected today

Both `quality` and `database` do:

- checkout;
- Node setup;
- Corepack enable;
- pnpm activation;
- pnpm store path calculation;
- pnpm cache restore/save;
- `pnpm install --frozen-lockfile`.

This duplication is expected because the jobs run on separate GitHub-hosted runners. The pnpm store cache reduces but does not remove install cost.

Both jobs also run a production build:

- `quality` runs `pnpm build` with placeholder Supabase public env;
- `database` runs `pnpm build` after local Supabase env export.

The database build is useful because it proves the app builds against local Supabase/Auth env, not just placeholder scaffold values. Removing it would weaken the DB/Auth job. The quality build is useful for Tier B, where the database job is skipped.

Both jobs install Chromium:

- `quality` installs Chromium for generic smoke E2E;
- `database` installs Chromium for local Supabase/Auth journeys.

For Tier C, this duplicates browser setup. It is not the first optimization target because splitting quality into smaller jobs or conditional steps would add complexity.

The database job additionally installs WebKit for the Unit I mobile-Safari-equivalent smoke. This is structurally tied to the current local Supabase navigation proof and should remain in the database job unless a separate browser-readiness job is deliberately designed.

### Cost drivers from observed runs

Observed PR #123 and merge runs show relative cost drivers:

- `quality`: unit coverage is the longest step inside the job; build and browser install are secondary.
- `database`: local Supabase startup, DB reset, local build, browser installs, WebKit smoke, and DB-backed E2E journeys dominate.

No dollar estimate is made here because the repository evidence does not expose billing rates or account-specific quota accounting.

## 8. Proposed Workflow Structure

Keep one workflow file and keep it understandable:

```text
classify
  outputs:
    non_runtime_only
    database_sensitive

metadata-validation
  if: non_runtime_only == true
  runs: TOML/YAML/skill metadata checks and targeted secret scan

quality
  if: non_runtime_only != true
  runs: format, lint, typecheck, unit coverage, build, generic E2E smoke

database
  if: non_runtime_only != true && database_sensitive == true
  runs: local Supabase, migrations, pgTAP, lock proof, DB types check, local build, DB-backed E2E
```

If adding a metadata-validation job feels too much for the first implementation, the minimum safe change is:

```text
classify
quality if non_runtime_only != true
database if non_runtime_only != true && database_sensitive == true
```

But a small metadata-validation job is useful because Tier A can still break agent config or accidentally introduce secrets.

Do not use workflow-level `paths-ignore` for this change. Job-level gates preserve predictable PR check creation.

## 9. Safety / Fail-Safe Behavior

Fail safe to Tier C when:

- the diff cannot be computed;
- the base SHA is missing, all zeroes, or absent locally;
- the changed-file list is empty;
- a path contains unexpected whitespace/control characters;
- a path is not matched by the Tier A whitelist or the known Tier B whitelist;
- a rename crosses tiers;
- any deleted/renamed file makes classification ambiguous;
- workflow/package/config/tooling paths change;
- `supabase/**`, generated DB types, auth, RLS, matching, application lifecycle, account deletion, verification, or publication-related paths change.

Use exact changed file paths from `git diff --name-only`. Do not infer from PR title, labels, commit messages, or author intent.

Recommended classifier outputs:

```text
non_runtime_only=true|false
database_sensitive=true|false
changed_files=<newline list in log only>
classification_reason=<short log summary>
```

Do not expose the changed-file list as a multi-line GitHub Actions output unless escaped safely. It is enough to log it.

## 10. Local Test Strategy

Preferred implementation shape:

- extract classifier logic into a small committed script, for example `scripts/ci/classify-change.mjs` or `scripts/ci/classify-change.mts`;
- script accepts a newline-delimited changed-file list or two SHAs;
- script prints shell-safe key/value outputs;
- workflow calls the script from the `classify` job;
- local tests exercise path lists without triggering remote CI.

Tradeoff:

- Inline Bash is shorter for a tiny docs-only classifier.
- A script is safer once the classifier has two outputs, Tier B/Tier C rules, rename/fail-safe handling, and deterministic local tests.

Recommended deterministic tests:

```text
docs/04-mvp.md
=> non_runtime_only=true, database_sensitive=false

.agents/skills/klinnova-discovery/SKILL.md
=> non_runtime_only=true, database_sensitive=false

.codex/config.toml
=> non_runtime_only=true, database_sensitive=false

src/components/homepage/homepage.module.scss
=> non_runtime_only=false, database_sensitive=false

src/lib/public-jobs/description.ts
=> non_runtime_only=false, database_sensitive=false only if explicitly added to Tier B later; otherwise Tier C by default

src/lib/auth/confirm.ts
=> non_runtime_only=false, database_sensitive=true

supabase/migrations/20260810020000_application_outcome_events_contract.sql
=> non_runtime_only=false, database_sensitive=true

package.json
=> non_runtime_only=false, database_sensitive=true

.github/workflows/ci.yml
=> non_runtime_only=false, database_sensitive=true

docs/README.md plus src/app/page.tsx
=> non_runtime_only=false, database_sensitive=true unless src/app/page.tsx is later explicitly proven safe
```

Run local tests with the ordinary `quality` job after implementing the script. Do not spend multiple remote full-CI runs just to debug classifier cases.

## 11. Expected Actions-Saving Mechanisms

Expected savings without weakening meaningful proof:

1. Governance/docs-only PRs skip `quality` and `database`.
2. `.agents/**` and `.codex/**` no longer force app build/E2E or local Supabase.
3. Docs/governance merges to `main` also skip the expensive jobs.
4. Known presentation/static Tier B changes run quality but skip local Supabase.
5. DB/Auth/security paths continue to run full validation.
6. Current concurrency continues to cancel obsolete runs on the same PR branch or `main`.
7. Teams can avoid intermediate remote CI by pushing only after local classifier tests and local checks are ready.

Current branch pushes without an open PR do not trigger this workflow because `push` is scoped to `main`. A pushed docs-only branch will only be classified by GitHub Actions after a PR is opened, unless the workflow trigger changes.

## 12. Example Matrix

| Change type | Classifier | Quality job | Database job |
|---|---|---:|---:|
| docs only | `non_runtime_only=true`, `database_sensitive=false` | No | No |
| `.agents` skill only | `non_runtime_only=true`, `database_sensitive=false` | No | No |
| `.codex` config only | `non_runtime_only=true`, `database_sensitive=false` | No | No |
| SCSS/component-only UI in known presentation area | `non_runtime_only=false`, `database_sensitive=false` | Yes | No |
| ordinary TypeScript app logic | Tier C unless path is explicitly known presentation/static | Yes | Conservative yes |
| auth change | `non_runtime_only=false`, `database_sensitive=true` | Yes | Yes |
| migration/RLS change | `non_runtime_only=false`, `database_sensitive=true` | Yes | Yes |
| package/lockfile change | `non_runtime_only=false`, `database_sensitive=true` | Yes | Yes |
| workflow-file change | `non_runtime_only=false`, `database_sensitive=true` | Yes | Yes |
| mixed docs + runtime change | runtime path decides; fail safe to Tier C if ambiguous | Yes | Usually yes |

## 13. Unresolved Decisions

1. Whether to add a dedicated `metadata-validation` job in the first implementation or only expand classifier gates.
2. Whether `.env.example` should become Tier A later after a metadata/secret-boundary validator exists.
3. Whether any pure helper libraries under `src/lib/public-jobs/**` or label/message-only modules should be promoted to Tier B after targeted evidence.
4. Whether to split `quality` into `static-unit` and `generic-smoke` later to reduce duplicate builds/browser installs on Tier C.
5. Whether branch protection currently requires specific checks. The GitHub branch-protection API returned a 403 for this private repo/account configuration, so required-check behavior should be verified in the GitHub UI before relying on skipped job conclusions.
6. Whether Vercel preview deployment should be independently path-filtered. That is outside this discovery because it is not GitHub Actions compute and may have separate deployment-value tradeoffs.

## 14. Recommended Implementation Scope

Recommended first implementation PR:

1. Add `scripts/ci/classify-change.mjs` or equivalent minimal script.
2. Add local tests for representative changed-file lists.
3. Update `.github/workflows/ci.yml` classifier output from `docs_only` to:
   - `non_runtime_only`
   - `database_sensitive`
4. Expand Tier A to include `.agents/**` and `.codex/**`.
5. Gate `quality` on `non_runtime_only != 'true'`.
6. Gate `database` on `non_runtime_only != 'true' && database_sensitive == 'true'`.
7. Keep `pull_request` and `push` to `main`.
8. Keep fail-safe defaults to full validation.
9. Do not introduce a complex matrix.
10. Do not remove post-merge validation.

Non-goals for the first implementation:

- no product/runtime source changes;
- no Supabase/Vercel/Production/Preview mutation;
- no workflow-level path filtering;
- no CI billing/dollar estimates;
- no branch-protection changes;
- no advanced reuse of PR-head checks for merge commits.

## 15. Discovery Conclusion

The safe first cost-efficiency move is not to weaken CI. It is to make the classifier represent the repository's real non-runtime governance paths and to split "needs quality" from "needs local Supabase/RLS".

The highest-confidence immediate fix is:

```text
Tier A += .agents/**, .codex/**
database job runs only when database_sensitive=true
unknown paths fail safe to database_sensitive=true
```

This would have prevented PR #123 from running product build/E2E and Schema/RLS on both the PR head and the merge commit, while preserving full validation for DB/Auth/security-sensitive changes.

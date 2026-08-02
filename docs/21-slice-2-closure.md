# Slice 2 Closure Evidence

Owner-facing evidence and status for Slice 2 — Onboarding to seeded matches.

**Do not mark Slice 2 Done until the owner-run hosted proof is complete.**

## Scope delivered

| Capability | Status |
|------------|--------|
| Vacancy schema + completed-candidate RLS | Implemented (PR #26) |
| Deterministic local/CI Demo fixtures | Implemented (PR #26) |
| Pure matcher + authenticated server loader | Implemented (PR #27) |
| Protected `/candidate/matches` UI | Implemented (PR #28) |
| Local critical journey (Playwright) | Locally verified (PR 2.4) |
| Owner-controlled hosted Demo fixture procedure | Procedure ready (PR 2.4) |
| Owner-run hosted Preview/Production proof | Owner-run hosted proof pending |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 2.1 Vacancy schema, RLS, local/CI fixtures | #26 | Merged |
| 2.2 Pure matcher + server loader | #27 | Merged |
| 2.3 `/candidate/matches` UI | #28 | Merged |
| 2.4 Exit proof + hosted fixtures + closure readiness | — | In progress (this work) |

## Accepted decisions

D-026 through D-033 remain **Accepted** (2026-08-01). No reinterpretation of D-031 Production fixture restrictions.

## Local exit proof checklist

| # | Criterion | Evidence layer |
|---|-----------|----------------|
| 1 | Candidate registers | Playwright critical journey |
| 2 | Completes essential onboarding | Playwright |
| 3 | Completion persists | Playwright + Slice 1 completion tests |
| 4 | Reaches `/candidate/matches` | Playwright |
| 5 | Loader reads only RLS-visible active Demo vacancies | Vitest loader + pgTAP RLS |
| 6 | Matcher evaluates saved profile | Vitest matcher |
| 7 | ≥1 matching Demo vacancy shown | Playwright content |
| 8 | Match reasons visible | Playwright |
| 9 | Work-authorisation notice visible (exact copy) | Playwright |
| 10 | Reload preserves result | Playwright |
| 11 | Incomplete cannot access inventory | Playwright content |
| 12 | Unauthenticated cannot access inventory | Playwright content |
| 13 | Invalidating essential clears completion | Playwright |
| 14 | Invalidated candidate returned to onboarding | Playwright |
| 15 | Correct → re-complete → matches return | Playwright |

## Hosted fixture policy (D-031)

- Location: `supabase/fixtures/hosted/` (not migrations).
- Commands: `pnpm fixtures:hosted:apply` / `pnpm fixtures:hosted:cleanup`.
- Require `--env` (`local` \| `preview` \| `production`) and `--project-ref`.
- Credentials only via temporary `SUPABASE_DB_URL` (never `--database-url` or other CLI credential args).
- Production requires `--confirm-production=I_UNDERSTAND_HOSTED_DEMO`.
- Never auto-run from install, build, migrate, CI, Vercel, or app startup.
- Deterministic IDs; 30-day relative expiry on apply; ID-scoped cleanup only.
- Fictional labels only; no verified-employer claim.
- Hosted evidence may record project ref, environment, timestamp, fixture IDs, expiry, result — never database URL, password, access token, or service-role key.

See `supabase/fixtures/hosted/README.md` for the full owner checklist.

## Hosted verification checklist (owner-run)

### Before insertion

- [ ] Confirm target project ref
- [ ] Confirm target environment (`preview` or `production`)
- [ ] Confirm current migration state; no pending migrations
- [ ] Confirm fixture IDs in `supabase/fixtures/hosted/manifest.json`
- [ ] Confirm fictional Demo labels (no real employers)
- [ ] If Production: authorize and prepare `--confirm-production=I_UNDERSTAND_HOSTED_DEMO`

### Insert

- [ ] `export SUPABASE_DB_URL='...'` (temporary; do not paste into issues/PRs/evidence)
- [ ] Run `pnpm fixtures:hosted:apply -- --env <env> --project-ref <ref>` (Production: add `--confirm-production=I_UNDERSTAND_HOSTED_DEMO`)
- [ ] `unset SUPABASE_DB_URL`
- [ ] Record timestamp, project ref, environment, and printed `fixture_expiry` values (never the connection string)
- [ ] Confirm expected company / vacancy / language rows

### Candidate journey

- [ ] Register a fresh test candidate on the hosted app
- [ ] Complete onboarding with documented matching values (see hosted README)
- [ ] Confirm `/candidate/matches` shows Demo vacancy, fictional company, reasons, work-authorisation notice
- [ ] Reload and confirm persistence
- [ ] Invalidate an essential field; confirm matches inaccessible (no inventory content)
- [ ] Correct and re-complete; confirm matches return

### Authorization checks

- [ ] Unauthenticated visitor cannot view matches inventory
- [ ] Incomplete candidate cannot view inventory
- [ ] No vacancy data in unauthorized HTML
- [ ] RLS remains the access boundary

### Cleanup

- [ ] Remove the test candidate only if a safe existing procedure/policy permits (do not invent deletion tooling here)
- [ ] Run `pnpm fixtures:hosted:cleanup` if fixtures should not be retained
- [ ] Confirm cleanup affected only known fixture IDs

## Hosted verification status

| Item | Status |
|------|--------|
| Hosted procedure implemented | Implemented |
| Dry-run / static safeguards | Locally verified |
| Local apply/cleanup simulation | Locally verified (not hosted proof) |
| Owner-run Preview/Production journey | Owner-run hosted proof pending |

Do not invent project refs, timestamps, or hosted pass results here.

## Remaining exclusions (Slice 3+)

Job detail, applications, save/unsave, employer contact, salary, experience, travel-time matching, scores, employer Auth/verification UI, automatic Production seeding.

## Slice 3 boundary

Slice 3 remains **Not started**. Do not activate Slice 3 in the founder dashboard until Slice 2 is Done after owner-run hosted proof.

## Closure status wording (current)

- PR 2.4 in progress
- Local exit proof complete (after verification in this PR)
- Hosted procedure ready
- Owner-run hosted proof pending
- Slice 2 awaiting hosted exit proof

## After owner reports hosted proof

A separate documentation update may then mark:

- Hosted proof complete
- Slice 2 Done
- Next active slice Slice 3

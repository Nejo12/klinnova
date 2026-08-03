# Slice 2 Closure Evidence

Owner-facing evidence and status for Slice 2 — Onboarding to seeded matches.

**Slice 2 is Done.** Owner-run hosted Production proof is complete. Slice 3 is next and has not started implementation.

## Scope delivered

| Capability | Status |
|------------|--------|
| Vacancy schema + completed-candidate RLS | Implemented (PR #26) |
| Deterministic local/CI Demo fixtures | Implemented (PR #26) |
| Pure matcher + authenticated server loader | Implemented (PR #27) |
| Protected `/candidate/matches` UI | Implemented (PR #28) |
| Local critical journey (Playwright) | Locally verified (PR 2.4 / #29) |
| Owner-controlled hosted Demo fixture procedure | Implemented (PR 2.4 / #29) |
| Owner-run hosted Production proof | Complete (2026-08-03) |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 2.1 Vacancy schema, RLS, local/CI fixtures | #26 | Merged |
| 2.2 Pure matcher + server loader | #27 | Merged |
| 2.3 `/candidate/matches` UI | #28 | Merged |
| 2.4 Exit proof + hosted fixtures + closure readiness | #29 | Merged |

## Accepted decisions

D-026 through D-033 remain **Accepted** (2026-08-01). D-034 (private and organisation employers) remains **Accepted** as a future employer-domain requirement — not an implemented employer feature in Slice 2. No reinterpretation of D-031 Production fixture restrictions: Production Demo data requires explicit owner-controlled application.

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

## Hosted Production proof (owner-run)

### Target

| Field | Value |
|-------|--------|
| Environment | production (explicit owner authorization) |
| Project ref | `kvrzmzoszitdicjvrprt` |
| Application | `https://stint.company` |
| Proof date | 2026-08-03 |

Production was the intentionally authorized target. It was not contacted accidentally. No automatic fixture insertion was introduced.

### Migration status

- Existing candidate migrations were already applied on the remote project.
- Migration `20260802190000_vacancy_schema_and_rls.sql` was initially missing remotely.
- It was applied intentionally with `pnpm exec supabase db push --linked`.
- Vacancy schema and RLS were present before the successful Demo fixture apply.

### Demo fixture apply

| Field | Value |
|-------|--------|
| Result | success |
| Approximate execution | 2026-08-03 02:56 CEST |
| Company ID | `11111111-1111-4111-8111-111111111111` |
| Vacancy IDs | `22222222-2222-4222-8222-222222222201`, `22222222-2222-4222-8222-222222222206` |
| Language requirement ID | `33333333-3333-4333-8333-333333333301` |
| Expiry | `2026-09-02 02:56:07 +0200` |
| Retention | Retained until expiry; cleanup not run |

### Journey results

| Check | Result |
|-------|--------|
| Candidate registration | Pass |
| Essential onboarding | Pass |
| `/candidate/matches` | Pass |
| Demo vacancy visible | Pass |
| Fictional company visible | Pass |
| Match reasons visible | Pass |
| Exact work-authorisation notice | Pass |
| Reload persistence | Pass |
| Unauthenticated denial | Pass |
| Incomplete-candidate denial | Pass |
| Essential-field invalidation | Pass |
| Matches inaccessible after invalidation | Pass |
| Correction and explicit re-completion | Pass |
| Matches restored after re-completion | Pass |
| No score, percentage, apply, save, detail, or contact | Pass |

### Credential safety

- No database URL, password, access token, or service-role key was recorded in source, GitHub, reports, or chat.
- `SUPABASE_DB_URL` was unset after execution.
- Credentials were passed only via temporary environment variable, never as CLI arguments.

### Deviations and operational notes

- A second hosted apply was **not** executed in Production. Hosted idempotency was therefore not directly repeated there. Idempotency remains established by deterministic fixture IDs, fixture-tool tests, and the verified local apply/apply simulation. Do not claim a second hosted apply occurred.
- Completed candidates redirect from `/candidate` to `/candidate/matches`. Direct onboarding group URLs (for example `/candidate/onboarding?group=work_authorisation`) were used to edit work authorisation during the invalidation proof.

## Hosted fixture policy (D-031)

- Location: `supabase/fixtures/hosted/` (not migrations).
- Commands: `pnpm fixtures:hosted:apply` / `pnpm fixtures:hosted:cleanup`.
- Require `--env` (`local` \| `preview` \| `production`) and `--project-ref`.
- Credentials only via temporary `SUPABASE_DB_URL` (never `--database-url` or other CLI credential args).
- Production requires `--confirm-production=I_UNDERSTAND_HOSTED_DEMO`.
- Never auto-run from install, build, migrate, CI, Vercel, or app startup.
- Deterministic IDs; 30-day relative expiry on apply; ID-scoped cleanup only.
- Fictional labels only; no verified-employer claim.
- Cleanup remains available via `pnpm fixtures:hosted:cleanup` but was not run for this proof.

See `supabase/fixtures/hosted/README.md` for the owner checklist.

## Hosted verification status

| Item | Status |
|------|--------|
| Hosted procedure implemented | Implemented |
| Dry-run / static safeguards | Locally verified |
| Local apply/cleanup simulation | Locally verified |
| Owner-run Production journey | Complete |
| Fixture retention | Retained until 2026-09-02 expiry |
| Cleanup | Not run |

## Remaining exclusions (Slice 3+)

Job detail, applications, save/unsave, employer contact, salary, experience, travel-time matching, scores, employer Auth/verification UI, automatic Production seeding. D-034 private/organisation employer workflows remain future employer-slice work.

## Slice 3 boundary

Slice 3 — Job detail to submitted application — is the **next planned** slice. Implementation has **not** started.

## Closure status wording (final)

- PR 2.4 merged (#29)
- Local exit proof complete
- Hosted procedure implemented
- Owner-run hosted proof complete
- Slice 2 Done
- Next planned slice: Slice 3

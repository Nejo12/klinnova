# Slice 3 Exit Proof (Local)

Owner-facing local exit evidence for Slice 3 — Job detail to submitted application.

**Local exit proof is complete (PR #37).** Owner-authorized Production hosted
proof and Slice 3 closure are recorded in `docs/27-slice-3-closure.md`.
**Slice 3 is Done.** Slice 4 has not started.

## Scope delivered (implementation PRs)

| Capability | Status |
|------------|--------|
| Application schema, constraints, RLS, submit RPC | Merged (PR #33) |
| Candidate job detail | Merged (PR #34) |
| Application preview + atomic submission | Merged (PR #35) |
| Persistent confirmation + Applied state | Merged (PR #36) |
| Local critical journey + static security proof | Merged (PR #37) |
| Hosted-proof runbook | Merged (PR #37) — executed later under owner authorization |
| Owner-run hosted proof | Complete — see `docs/27-slice-3-closure.md` |
| Slice 3 Done | Yes — see `docs/27-slice-3-closure.md` |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 3.1 Application persistence + RPC | #33 | Merged |
| 3.2 Candidate job detail | #34 | Merged |
| 3.3 Preview + atomic submission | #35 | Merged |
| 3.4 Confirmation + Applied state | #36 | Merged |
| 3.5 Local exit proof + hosted readiness | #37 | Merged |

## Accepted decisions

D-035 through D-045 remain **Accepted** (2026-08-03). Slice 3 acceptance
conditions are complete. Hosted Production proof used explicit owner
authorization per D-045 after Preview was not safely isolated.

## Proof environment (local)

| Field | Value |
|-------|--------|
| Base / tested main SHA | `8bfed056b2dfaf13dcc3d822a6342b5bd4d7a3cc` |
| Branch (at proof) | `chore/slice-3-exit-proof` |
| Environment | Local CLI Supabase + Mailpit + `pnpm start` |
| Local proof date (UTC) | 2026-08-03 |
| Hosted commands in PR #37 | None |

## Commands executed

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm supabase:db:reset
pnpm supabase:test:db
E2E_AUTH_JOURNEY=1 pnpm test:e2e:slice3   # critical journey run 1
pnpm supabase:db:reset
E2E_AUTH_JOURNEY=1 pnpm test:e2e:slice3   # critical journey run 2
pnpm supabase:db:reset
E2E_AUTH_JOURNEY=1 pnpm exec playwright test --workers=1
git diff --check
```

## Pass totals

| Suite | Result |
|-------|--------|
| Format / lint / typecheck | Pass |
| Vitest | **247 passed** / 1 skipped |
| Build | Pass |
| Local DB reset | Pass (all migrations applied, including applications) |
| pgTAP | **322 passed** |
| Slice 3 critical journey run 1 | **3 passed** |
| Slice 3 critical journey run 2 (after reset) | **3 passed** |
| Full Playwright (`workers=1`) | **19 passed** |
| Flakes | Initial non-matching heading assertion used unavailable copy; corrected to `This job no longer matches your preferences`. Both subsequent critical runs and full suite green. |

## Local exit proof checklist

| # | Criterion | Evidence layer | Result |
|---|-----------|----------------|--------|
| 1 | Unauthenticated denied protected candidate surfaces | Playwright Slice 3 critical | Pass |
| 2 | Incomplete redirected to onboarding for matches/detail/submit | Playwright | Pass |
| 3 | Completed candidate reaches matches | Playwright | Pass |
| 4 | Opens matched Demo vacancy detail | Playwright | Pass |
| 5 | Privacy-safe detail fields only | Playwright + component tests | Pass |
| 6 | Preview shows accepted application fields only | Playwright | Pass |
| 7 | Server Action rechecks Auth, completion, availability, matcher | Vitest actions | Pass |
| 8 | Caller submits vacancy ID only | Static security + action source | Pass |
| 9 | First eligible submission creates one application | Playwright + local RPC count | Pass |
| 10 | Redirect to canonical confirmation | Playwright | Pass |
| 11 | Confirmation candidate-owned via RLS | Playwright foreign denial + pgTAP | Pass |
| 12 | Confirmation from immutable snapshots | Playwright historical + unit parser | Pass |
| 13 | Confirmation survives reload | Playwright | Pass |
| 14 | Readable when onboarding later incomplete | Playwright historical | Pass |
| 15 | Stable after profile/vacancy current changes | Playwright historical (local DB boundary) | Pass |
| 16 | Another candidate cannot read confirmation | Playwright | Pass |
| 17 | Malformed/foreign IDs disclose no protected data | Playwright | Pass |
| 18 | Duplicate routes to same confirmation | Playwright + RPC `already_applied` | Pass |
| 19 | Exactly one application row for pair | Playwright local SELECT count | Pass |
| 20 | Job detail Applied; preview/Submit removed | Playwright | Pass |
| 21 | Matches Applied + View application | Playwright | Pass |
| 22 | Application lookup failure ≠ false non-applied | Vitest loaders | Pass |
| 23 | Expired/withdrawn/future/hidden cannot receive a new application | Playwright withdrawn + pgTAP | Pass |
| 24 | Visible non-matching cannot reach RPC | Playwright unavailable + Vitest action | Pass |
| 25 | No application ID in candidate-facing text | Playwright + static security | Pass |
| 26 | No service-role browser/SSR path | Static security + client modules | Pass |
| 27 | No direct authenticated application INSERT/UPDATE/DELETE | pgTAP + static security | Pass |
| 28 | No employer/withdrawal/history/messaging implied | Playwright negative assertions | Pass |
| 29 | Exact work-authorisation notice present | Playwright | Pass |
| 30 | No employer response/verification/interview/job guarantee claims | Playwright negative assertions | Pass |

## Automation artifacts

| Artifact | Path |
|----------|------|
| Critical journey | `e2e/slice3-critical-journey.spec.ts` |
| Local proof helpers | `e2e/helpers/local-application-proof.ts` |
| Package script | `pnpm test:e2e:slice3` |
| Static security | `src/lib/applications/slice3-static-security.test.ts` |
| Hosted runbook | `docs/26-slice-3-hosted-proof-runbook.md` |
| Closure evidence | `docs/27-slice-3-closure.md` |

## Database / RLS / RPC proof

Recorded from `pnpm supabase:db:reset` + `pnpm supabase:test:db` during PR #37:

| Check | Result |
|-------|--------|
| Clean local reset + all migrations | Pass |
| pgTAP total | **322 passed** |
| Application constraints + uniqueness | Covered by `11_applications_schema_test.sql` |
| Candidate-own SELECT RLS | Covered by `12_applications_privileges_and_rls_test.sql` |
| No authenticated direct INSERT/UPDATE/DELETE | Covered by privileges/RLS tests |
| Authenticated RPC execute only; PUBLIC/anon denied | Covered by RPC privilege tests |
| Duplicate uniqueness + snapshot immutability | Covered by submit RPC tests |
| Completion-before-duplicate / unavailable lifecycle | Covered by submit RPC tests |

## Privacy and unsupported-feature review

- Confirmation and detail show privacy-safe city, Demo labels, and schema-backed fields only.
- No exact address, contact data, CV, or raw application UUID in candidate-facing copy.
- No Withdraw, Submit again, Edit application, Contact/Message employer, timeline, or interview promises.
- Exact work-authorisation notice retained on matches/detail surfaces.

## Hosted proof and closure

Hosted Production proof and final Done status are recorded in
`docs/27-slice-3-closure.md`. This document remains the local automated proof
record.

## Status wording (final for local proof)

- PRs #33–#37 merged
- Local exit proof complete
- Hosted Production proof complete — see `docs/27-slice-3-closure.md`
- Slice 3 Done
- Slice 4 has not started

# Slice 4 Exit Proof (Local)

Owner-facing local exit evidence for Slice 4 — Employer registration to draft
vacancy.

**Local exit proof status:** Pass on this branch via `pnpm proof:slice4`
(2026-08-04 UTC). **Hosted Slice 4 proof has not been executed.** **Production
authorization has not been granted.** **Slice 4 is not Done** until
owner-authorized hosted proof and closure are accepted under D-054.

Related:

- Hosted runbook: `docs/32-slice-4-hosted-proof-runbook.md`
- Closure (after hosted proof): `docs/33-slice-4-closure.md` — not created until
  hosted evidence exists
- Build plan: `docs/29-slice-4-build-plan.md`

## Scope delivered (implementation PRs)

| Capability | Status |
|------------|--------|
| Employer profile schema + company ownership RLS | Merged (PR #41) |
| Employer registration + onboarding UI | Merged (PR #42) |
| Employer-owned draft vacancy schema, RPCs, RLS, pgTAP | Merged (PR #43) |
| Employer draft vacancy UI | Merged (PR #44) |
| Local exit proof tooling + hosted readiness | This PR (4.5) — prepared |
| Owner-run hosted proof | Not executed |
| Slice 4 Done | No |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 4.1 Employer profile schema/RLS | #41 | Merged |
| 4.2 Employer onboarding UI | #42 | Merged |
| 4.3 Draft vacancy schema/RPCs/RLS | #43 | Merged |
| 4.4 Employer draft vacancy UI | #44 | Merged |
| 4.5 Local exit proof + hosted readiness | Pending review | Implementation prepared |

## Accepted decisions

D-046 through D-054 remain **Accepted** (2026-08-03). Accepting D-054 does **not**
authorize Production hosted proof. Any Production fallback requires a new
explicit owner authorization recorded for that run.

## Proof environment (local)

| Field | Value |
|-------|--------|
| Base / tested main SHA | `5c73f5374b01ccdaa27465d8c4204018d5b4a5e3` |
| Branch (at proof) | `chore/slice-4-exit-proof` |
| Environment | Local CLI Supabase + Mailpit + `pnpm start` |
| Hosted commands in PR 4.5 | None |
| Production mutation | None |

## Commands

Primary orchestrator (fail-fast, local-only, environment-guarded):

```bash
pnpm proof:slice4
```

Phases:

1. Environment safety guard
2. Local migration inventory (checksums; no remote status)
3. `pnpm format:check`
4. `pnpm lint`
5. `pnpm typecheck`
6. `pnpm test:run`
7. `pnpm build`
8. `pnpm supabase:db:reset`
9. `pnpm supabase:test:db`
10. `pnpm db:types:check`
11. `pnpm test:e2e:employer`
12. `pnpm test:e2e:slice3`

Supporting:

```bash
pnpm proof:migrations
```

## Pass totals

Recorded from `pnpm proof:slice4` on `chore/slice-4-exit-proof` (2026-08-04 UTC).

| Suite | Result |
|-------|--------|
| Format / lint / typecheck | Pass |
| Vitest | **320 passed** / 1 skipped |
| Build | Pass |
| Local DB reset | Pass (all 7 migrations including PR 4.1 + 4.3) |
| pgTAP | **533 passed** |
| Generated types check | Pass (unchanged) |
| Employer E2E | **9 passed** |
| Slice 3 regression E2E | **3 passed** |
| Hosted proof | Not executed |

## Focused Playwright decision

No additional Slice 4 critical Playwright suite was added.

Reasons:

- Existing employer E2E already covers the accepted 9/9 journeys
  (`pnpm test:e2e:employer`).
- Slice 3 regression already covers the candidate-critical 3/3 flows
  (`pnpm test:e2e:slice3`).
- pgTAP suites 14–19 provide isolation and lifecycle evidence.
- This matrix links those proofs explicitly as an evidence index.
- An additional composite journey would duplicate coverage and increase
  brittleness.

The matrix does not replace execution. Local Pass rows require `pnpm proof:slice4`
(and its underlying suites) to have actually succeeded.

## Evidence matrix

Columns:

- **Hosted** = required for Slice 4 Done under D-054 (not passed until executed)
- **Hosted mutation** = whether applying migrations or creating fixtures is needed
- **Cleanup** = required cleanup/retention decision when hosted proof runs

| # | Requirement | Proof layer | Exact test / command | Expected result | Local | Hosted | Hosted mutation | Cleanup |
|---|-------------|-------------|----------------------|-----------------|-------|--------|-----------------|---------|
| 1 | Candidate-only user can add employer capability | Playwright | `employer-onboarding-journey` dual-capability | Employer capability added; candidate remains | Pass when employer E2E green | Required | Yes (auth user) | Delete proof Auth users |
| 2 | Candidate + employer profiles coexist | Playwright + pgTAP | dual-capability journey; `14`/`15` employer schema/RLS | Both profiles readable by owner | Same | Required | Yes | Same |
| 3 | Candidate completion unchanged | Playwright | Slice 3 critical + dual-capability | Candidate completion intact | Same | Required | Optional | N/A if using seed Demo |
| 4 | Employer completion independent | Playwright + pgTAP | onboarding journeys; `16_employer_completion_bootstrap_test` | Employer completes without changing candidate | Same | Required | Yes | Delete proof employers |
| 5 | Dual-capability navigation explicit | Playwright | dual-capability + employer home | Both homes reachable; no role trap | Same | Required | Yes | Same |
| 6 | No global exclusive role | Static + schema | static security; D-047 schema | No exclusive `profiles.role` | Pass (schema) | Inspect schema | Migration only if missing | N/A |
| 7 | Private employer register/resume/complete | Playwright | private onboarding journey | Complete; unverified; no company | Same | Required | Yes | Delete proof user/profile |
| 8 | Private employer creates no company | Playwright + pgTAP | private journey; schema tests | `company_id` null path | Same | Required | Yes | Same |
| 9 | Completion ≠ verification | Playwright | verification copy assertions | Remains unverified | Same | Required | Yes | Same |
| 10 | Organisation bootstrap + ownership | Playwright + pgTAP | org journey; `16` bootstrap | Company derived; no selector | Same | Required | Yes | Delete company if safe |
| 11 | Seed companies cannot be claimed | pgTAP | employer company ownership tests | Claim denied | Pass (pgTAP) | Required | Migration inspect | N/A |
| 12 | Private draft create without company | Playwright | vacancy draft private journey | Draft owned; no company | Same | Required | Yes | Delete draft |
| 13 | Organisation draft uses derived company | Playwright | vacancy draft org journey | Company display-only | Same | Required | Yes | Delete draft |
| 14 | Owner list/view/edit/delete eligible drafts | Playwright | vacancy draft journeys | CRUD for owner drafts | Same | Required | Yes | Delete/retain draft |
| 15 | Language replacement atomic | Playwright + pgTAP | edit languages; `18_employer_draft_rpc_test` | Single replace RPC | Same | Required | Yes | Same |
| 16 | Salary persists as integer cents | Vitest + Playwright | `salary.test.ts`; draft edit | Integer cents EUR | Same | Required | Yes | Same |
| 17 | Readiness reports missing / becomes ready | Playwright + pgTAP | readiness UI; readiness RPC tests | Ready ≠ published | Same | Required | Yes | Same |
| 18 | No Publish control | Playwright + static | draft journeys; `slice4-static-security` | No Publish UI/RPC | Same | Required | No | N/A |
| 19 | Owner isolation (profile/company/vacancy/languages/delete) | Playwright + pgTAP | foreign unavailable; RLS/RPC suites `15`/`18`/`19` | Generic unavailable | Same | Required | Yes (second employer) | Delete both proof users |
| 20 | Candidate list/match/detail/apply seed-only | Playwright + pgTAP | Slice 3 E2E; `19_employer_draft_visibility_test` | Drafts invisible | Same | Required | Optional | N/A |
| 21 | Anon cannot read employer profile/company/draft/languages | pgTAP | RLS suites `15`/`19` | Denied / empty | Pass (pgTAP) | Required | No | N/A |
| 22 | `source=employer`, `publication_state=draft`, null published/expires | pgTAP + Playwright | draft RPC/schema; UI private notice | Lifecycle unchanged | Same | Required | Yes | Same |
| 23 | No publication RPC; no direct vacancy DML policies | pgTAP + static | privileges + static security | RPC-only mutations | Same | Required | No | N/A |
| 24 | No service-role application path | Static | `slice4-static-security` | No service_role in employer flow | Same | Inspect deploy env | No | N/A |
| 25 | Type lock when completed/company/draft-owned | pgTAP | employer type-lock tests | Locked | Pass (pgTAP) | Required | Yes | Same |
| 26 | Eligible draft delete; apps block delete; profile/company survive | Playwright + pgTAP | delete journey; RPC delete tests | Profile remains | Same | Required | Yes | Confirm survivors |
| 27 | Seed fixtures + matcher/apply/snapshots stable | Playwright + pgTAP | Slice 3 E2E; vacancy/application suites | Regression green | Same | Required | Demo fixtures if needed | Demo retention policy |
| 28 | format/lint/typecheck/build/pgTAP/types green | `pnpm proof:slice4` | orchestrated phases | All pass | Pass | CI green on PR | No | N/A |

## Automation artifacts

| Artifact | Path |
|----------|------|
| Proof orchestrator | `scripts/proof/slice4.mts` (`pnpm proof:slice4`) |
| Migration inventory | `scripts/proof/migration-inventory.mts` (`pnpm proof:migrations`) |
| Environment guard | `src/lib/proof/local-environment-guard.ts` |
| Static security (one layer; not a sole guarantee) | `src/lib/employer/slice4-static-security.test.ts` |
| Employer onboarding E2E | `e2e/employer-onboarding-journey.spec.ts` |
| Employer vacancy E2E | `e2e/employer-vacancy-draft-journey.spec.ts` |
| Candidate regression E2E | `e2e/slice3-critical-journey.spec.ts` |
| Hosted runbook | `docs/32-slice-4-hosted-proof-runbook.md` |

## Database / RLS / RPC proof

Local layers (from existing Slice 4 pgTAP; totals confirmed by `pnpm supabase:test:db`):

| Check | Suite |
|-------|--------|
| Employer profile schema/constraints | `14_employer_profiles_schema_test.sql` |
| Employer/company RLS isolation | `15_employer_profiles_rls_test.sql` |
| Completion + bootstrap | `16_employer_completion_bootstrap_test.sql` |
| Draft schema + lifecycle | `17_employer_draft_schema_test.sql` |
| Draft RPCs | `18_employer_draft_rpc_test.sql` |
| Candidate/anon draft invisibility | `19_employer_draft_visibility_test.sql` |
| Full local total | **533** tests |

## Required hosted migration set (inventory only)

All repository migrations must exist on a clean hosted environment before Slice 4
hosted smoke. Slice 4 adds:

1. `20260803200000_employer_profiles_and_company_ownership.sql`
2. `20260804120000_employer_owned_draft_vacancies.sql`

Earlier migrations (candidate, vacancy seed, applications) remain required
prerequisites. Run `pnpm proof:migrations` for ordered filenames + SHA-256
checksums. **Do not infer hosted status from local files.**

## Privacy and unsupported-feature review

- Employer drafts remain private; no public draft URL.
- No Publish control; readiness is future-publication readiness only.
- No verification approval/upload UI.
- No applicant review, messaging, or scheduling.
- No exact residential address collection.
- No service-role browser/SSR path in employer vacancy flow.

## Hosted proof and closure

Hosted procedure: `docs/32-slice-4-hosted-proof-runbook.md`.

Closure document (`docs/33-slice-4-closure.md`) must not be written until
owner-authorized hosted proof is actually executed and recorded.

## Status wording (current)

- PRs #41–#44 merged
- PR 4.5 prepared (local tooling + runbook)
- Local exit proof: **Pass** via `pnpm proof:slice4` on this branch (see below)
- Hosted Slice 4 proof: not executed
- Production authorization: not granted
- Publication / verification approval / applicant review: not started
- Slice 5 / Slice 6: not started
- Slice 4: **not Done**

### Local proof run record

| Field | Value |
|-------|--------|
| Command | `pnpm proof:slice4` |
| Result | Pass |
| Date (UTC) | 2026-08-04 |
| Notes | Vitest 320/1 skip; pgTAP 533; employer E2E 9/9; Slice 3 E2E 3/3; no hosted commands |

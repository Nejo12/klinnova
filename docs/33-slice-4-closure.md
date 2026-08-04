# Slice 4 Closure Evidence

Owner-facing evidence and status for Slice 4 — Employer registration to draft
vacancy.

**Slice 4 is Done.** Owner-authorized Preview / disposable hosted proof is
complete. Slice 5 is next and has **not** started. Separate planning and
authorization are required before Slice 5 begins. Publication and verification
approval remain out of scope and were proven unavailable, not available.

## Identification

| Field | Value |
|-------|--------|
| Proof date / time (UTC) | 2026-08-04T20:50:54Z (Phase C window); cleanup 2026-08-04T20:52:11Z |
| Operator | olaniyiaborisade (owner-authorized Cursor agent run) |
| Run ID | `20260804T2039Z` |
| Application SHA | `96d6fab3bc1a27e702d39bb95555403257d202a1` |
| Environment | Isolated Vercel Preview + disposable Supabase project |
| Disposable project ref | `wbucxaquktraobrvknts` (`stint-slice4-proof-20260804`) |
| Preview deployment | `https://stint-n3iswiz71-olaniyis-projects.vercel.app` |
| Production | Not targeted (`kvrzmzoszitdicjvrprt` / `https://stint.company` untouched) |

## Scope delivered

| Capability | Status |
|------------|--------|
| Employer profile schema + company ownership RLS | Implemented (PR #41) |
| Employer registration + onboarding UI | Implemented (PR #42) |
| Employer-owned draft vacancy schema, languages, RLS, RPCs | Implemented (PR #43) |
| Employer draft vacancy UI | Implemented (PR #44) |
| Local critical journey + static security + hosted readiness | Implemented (PR #45) |
| Owner-run Preview / disposable hosted proof | Complete (2026-08-04) |
| Disposable project + Preview override cleanup | Complete (2026-08-04) |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 4.1 Employer profile schema/RLS | #41 | Merged |
| 4.2 Employer onboarding UI | #42 | Merged |
| 4.3 Draft vacancy schema/RPCs/RLS | #43 | Merged |
| 4.4 Employer draft vacancy UI | #44 | Merged |
| 4.5 Local exit proof + hosted readiness | #45 | Merged |
| Closure documentation | This change | Pending merge |

## Accepted decisions

D-034 and D-046 through D-054 remain **Accepted** (2026-08-03). Slice 4
acceptance conditions for the employer-registration-to-draft path are complete.
Publication, verification approval, moderation, and applicant review remain
explicitly out of scope.

## Evidence layers

| Layer | Location / result |
|-------|-------------------|
| Repository implementation | Merged PRs #41–#45 |
| Local automated proof | `docs/31-slice-4-exit-proof.md` / `pnpm proof:slice4` — **PASS** |
| Hosted-proof runbook | `docs/32-slice-4-hosted-proof-runbook.md` — executed 2026-08-04 |
| Preview / disposable hosted proof | This document — **PASS** |
| Infrastructure follow-up | Preview-scoped disposable overrides removed after proof; Preview again has no dedicated isolated env vars |

## Local exit proof summary

Recorded on PR #45 / main tip `96d6fab3bc1a27e702d39bb95555403257d202a1` and
retained in `docs/31-slice-4-exit-proof.md`:

- `pnpm proof:slice4` **PASS**
- Vitest **320 passed** / 1 skipped; pgTAP **533**; employer E2E 9/9; Slice 3 E2E 3/3
- Publication controls absent in employer UI/RPC surface

## Hosted Preview / disposable proof (owner-authorized)

### Migration proof (Phase B)

Applied on disposable project `wbucxaquktraobrvknts` only via
`supabase db push --linked` while CLI linked ref was exactly that project.
Production was not linked and was not migrated.

| Stage | Result |
|-------|--------|
| Before | Zero migrations installed remotely (all seven missing) |
| After | All seven repository migrations installed; local == remote |
| Unexpected remote-only migrations | None |
| Database reset | Not used |
| Seed overwrite | Not used |
| Production migration | Not performed |

Migrations applied (in order):

1. `20260801050157_candidate_schema_and_rls.sql`
2. `20260801140000_candidate_allow_list_constraints.sql`
3. `20260801160000_complete_candidate_onboarding.sql`
4. `20260802190000_vacancy_schema_and_rls.sql`
5. `20260803120000_applications_schema_and_submit_rpc.sql`
6. `20260803200000_employer_profiles_and_company_ownership.sql`
7. `20260804120000_employer_owned_draft_vacancies.sql`

### Fixture manifest (no secrets)

Fictional Auth users and records existed only on the disposable project
(destroyed with project deletion).

| Kind | Email | User ID |
|------|-------|---------|
| Dual private employer + candidate | `stint-s4.preview.dual.20260804T2039Z@example.test` | `2e3a9cfd-f04f-40db-9f98-a0dcd390c8ea` |
| Organisation employer | `stint-s4.preview.org.20260804T2039Z@example.test` | `2451284a-70e0-457c-be6a-4a9de09cc8ac` |
| Isolation private employer | `stint-s4.preview.iso.20260804T2039Z@example.test` | `02f358c6-e860-4076-b5dd-9bda7197d2ce` |
| Private resume helper | `stint-s4.preview.private.20260804T2039Z@example.test` | `b34c1ba5-a79e-4d94-b9d7-449c52f0be56` |

| Record | ID |
|--------|----|
| Org company | `b3b52281-fc11-4ccc-9206-8f177f8faa13` |
| Private draft vacancy | `6e494eb8-388a-4e63-9bfd-f1a53107ff41` |
| Org draft vacancy | `ac7799b6-332e-47c0-b597-06ca5063a937` |
| Deleted private draft target | `7af3167e-7896-4917-9c00-4c79433eab15` |

Display names were clearly fictional (`S4 Proof Dual Private`,
`S4 Proof Org GmbH`, `S4 Proof Iso Employer`).

### Hosted smoke result (Phase C) — PASS

| Check | Result |
|-------|--------|
| Employer capability addition | Pass |
| Candidate and employer profile coexistence | Pass |
| Independent completion state | Pass |
| Explicit dual-capability navigation | Pass |
| Private employer onboarding | Pass |
| Organisation employer onboarding (derived company; no selector) | Pass |
| Private draft creation and lifecycle | Pass |
| Organisation draft creation and lifecycle | Pass |
| Salary persistence (integer cents) | Pass |
| Normalized language replacement | Pass |
| Readiness progression | Pass |
| Readiness does not publish | Pass |
| Owner isolation | Pass |
| Candidate isolation | Pass |
| Anonymous isolation | Pass |
| Candidate application rejection for employer drafts | Pass |
| Absence of Publish controls | Pass |
| Draft deletion | Pass |
| Employer profile survival after draft delete | Pass |
| Candidate capability survival | Pass |

Publication and verification were **not** tested as available. The proof
establishes that they remain unavailable on this surface.

### Negative and security proof — PASS

| Assertion | Result |
|-----------|--------|
| No public employer-draft access | Pass |
| No cross-owner access | Pass |
| No candidate draft visibility | Pass |
| No candidate application to employer draft | Pass |
| No direct publication path (`publish_employer_vacancy` absent) | Pass |
| No applicant-review path | Pass |
| No verification-approval path | Pass |
| No service-role browser path for employer draft flows | Pass |
| No Production mutation | Pass |

Method: Admin API created confirmed Auth users on the disposable project;
data-plane checks used the same authenticated RPCs/tables as app server actions;
UI smoke used Playwright against the Preview URL. Preview login with disposable
Auth users confirmed Preview was not coupled to the Production database for this
run.

### Cleanup (Phase D) — PASS

Cleanup mechanism: **entire disposable Supabase project deletion** (not
row-level cleanup alone).

| Check | Result |
|-------|--------|
| Proof fixtures existed only in the disposable project | Pass |
| Disposable project `wbucxaquktraobrvknts` deleted | Pass |
| Preview-specific Supabase/SITE env overrides cleared | Pass |
| Fixture retention | None — destroyed with project |
| Residual hosted proof records | None (project gone) |
| Production project `kvrzmzoszitdicjvrprt` remains ACTIVE_HEALTHY | Pass |
| Production data untouched | Pass |
| Production env values restored into Preview | **Not done** (intentional) |
| Local CLI link to disposable cleared | Pass |

## Residual operational note (prominent)

After teardown:

- Vercel Preview currently has **no** Preview-scoped Supabase variables.
- Preview must **not** be assumed usable or isolated for any future hosted proof.
- A new isolated database and matching Preview configuration must be created
  before any future hosted proof.
- Preview must **never** silently fall back to Production credentials.

## Credential safety

- No database URL, password, access token, service-role key, publishable key
  value, JWT, cookie, or connection string is recorded in this closure document
  or other repository docs for this run.
- Temporary proof passwords were never committed and are not recorded here.
- This document is the durable evidence record for the hosted proof.

## Remaining exclusions (Slice 5+)

Employer verification, public vacancy publication, applicant review, save/unsave,
CV upload, messaging, interviews, offers, hire flows, public SEO job board,
withdrawal UI, application history dashboard, automatic Production seeding, and
items in `NOT_NOW.md`.

## Slice 5 / Slice 6 boundary

Slice 5 — Employer verification to public vacancy — is the **next planned**
slice. Implementation has **not** started and requires separate planning and
authorization. Slice 6 has **not** started.

## Final decision

| Item | Status |
|------|--------|
| Slice 4 local proof | **PASS** |
| Slice 4 hosted proof | **PASS** |
| Slice 4 cleanup | **PASS** |
| Slice 4 | **Done** |
| Publication | Not started |
| Verification approval | Not started |
| Applicant review | Not started |
| Slice 5 | Not started |
| Slice 6 | Not started |

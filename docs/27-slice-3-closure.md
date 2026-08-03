# Slice 3 Closure Evidence

Owner-facing evidence and status for Slice 3 — Job detail to submitted application.

**Slice 3 is Done.** Owner-authorized Production hosted proof is complete.
Slice 4 is next and has **not** started. Separate planning and authorization are
required before Slice 4 begins.

## Scope delivered

| Capability | Status |
|------------|--------|
| Application schema, constraints, RLS, submit RPC | Implemented (PR #33) |
| Candidate job detail | Implemented (PR #34) |
| Application preview + atomic submission | Implemented (PR #35) |
| Persistent confirmation + Applied state | Implemented (PR #36) |
| Local critical journey + static security + hosted readiness | Implemented (PR #37) |
| Owner-run Production hosted proof | Complete (2026-08-03) |
| Scoped proof-user / application cleanup | Complete (2026-08-03) |
| Retained Demo fixture restoration | Complete (2026-08-03) |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 3.1 Application persistence + RPC | #33 | Merged |
| 3.2 Candidate job detail | #34 | Merged |
| 3.3 Preview + atomic submission | #35 | Merged |
| 3.4 Confirmation + Applied state | #36 | Merged |
| 3.5 Local exit proof + hosted readiness | #37 | Merged |
| Closure documentation | This PR | Pending merge |

## Accepted decisions

D-035 through D-045 remain **Accepted** (2026-08-03) and their Slice 3
acceptance conditions are complete. D-045 preferred Preview for hosted proof;
Production was used only after explicit owner authorization when Preview was
not safely isolated.

## Evidence layers

| Layer | Location / result |
|-------|-------------------|
| Repository implementation | Merged PRs #33–#36 |
| Local automated proof | `docs/25-slice-3-exit-proof.md` (PR #37) — Vitest 247/1 skip; Playwright 19; pgTAP 322; Slice 3 critical journey 3/3 twice |
| Hosted-proof runbook | `docs/26-slice-3-hosted-proof-runbook.md` |
| Production hosted proof | This document |
| Infrastructure follow-up | Preview isolation not configured (does not block Slice 3 Done) |

## Local exit proof summary

Recorded on PR #37 against main tip `8bfed056b2dfaf13dcc3d822a6342b5bd4d7a3cc`
and retained in `docs/25-slice-3-exit-proof.md`:

- format / lint / typecheck / build passed
- Vitest **247 passed** / 1 skipped
- pgTAP **322 passed**
- Slice 3 critical journey **3/3** twice after reset
- full Playwright suite **19 passed**
- local checklist items 1–30 passed

## Hosted Production proof (owner-authorized)

### Target

| Field | Value |
|-------|--------|
| Environment | `PRODUCTION_FALLBACK` (explicit owner authorization) |
| Application | `https://stint.company` |
| Project ref | `kvrzmzoszitdicjvrprt` |
| Tested repository SHA | `d2896702b4fa5601b16871656607f7e3ecc00b01` |
| Supabase CLI | `2.111.0` |
| Journey window | 2026-08-03 14:08:48–14:10:04 CEST |
| Cleanup window | 2026-08-03 14:10:40–14:10:48 CEST |

Production was the intentionally authorized target after Preview failed
isolation and usability gates. No Preview proof is claimed.

### Migration

| Field | Value |
|-------|--------|
| Preflight | Prior migrations applied; only pending: `20260803120000` |
| Applied file | `supabase/migrations/20260803120000_applications_schema_and_submit_rpc.sql` |
| Command | `pnpm exec supabase db push --linked` |
| Window | 2026-08-03 14:04:52–14:04:59 CEST |
| Repair / reset | Not used |
| Post-status | All five migrations present remotely; none pending |

### Retained fictional inventory

Fixture apply was **skipped** because retained Slice 2 Demo inventory was active.

| Kind | ID / value |
|------|------------|
| Company | `11111111-1111-4111-8111-111111111111` — Demo Berlin Work Co |
| Vacancy | `22222222-2222-4222-8222-222222222201` |
| Vacancy | `22222222-2222-4222-8222-222222222206` |
| Language requirement | `33333333-3333-4333-8333-333333333301` |
| Expiry | `2026-09-02 01:11:48+00` |

Fixture-tool dry-run completed (plan only). Live inventory existence was
verified with approved linked read-only database inspection. After historical
mutation testing, company/vacancy display values were restored; expiry
unchanged. Post-cleanup retained counts: company 1, vacancies 2, language
requirement 1.

### Primary journey results

| Check | Result |
|-------|--------|
| Synthetic Candidate A registration | Pass |
| Essential onboarding | Pass |
| `/candidate/matches` | Pass |
| Demo vacancy visible | Pass |
| Exact work-authorisation notice | Pass |
| Privacy-safe job detail | Pass |
| Approved application preview | Pass |
| No extra checkbox | Pass |
| Exact submission disclosure | Pass |
| Submission | Pass |
| Canonical confirmation route | Pass |
| Confirmation heading / body / `Submitted` | Pass |
| No application UUID in visible page text | Pass |
| Reload persistence | Pass |
| Job detail Applied; preview/Submit absent | Pass |
| Matches Applied; View application + View job | Pass |

### Duplicate and persistence

| Check | Result |
|-------|--------|
| Duplicate RPC `already_applied` | Pass |
| Same application ID returned | Pass |
| Canonical confirmation route unchanged | Pass |
| Exactly one application row for pair | Pass |
| Status `submitted` | Pass |
| Snapshot version `1` | Pass |
| Candidate and vacancy snapshots present | Pass |

### Authorization and denial

| Check | Result |
|-------|--------|
| Unauthenticated → login with `next` | Pass |
| No protected snapshot leak when unauthenticated | Pass |
| Incomplete → onboarding; RPC `incomplete`; no application | Pass |
| Foreign candidate → generic unavailable; RLS empty | Pass |
| Malformed confirmation ID → generic unavailable | Pass |
| Unavailable vacancy → `This job is not available` | Pass |
| Non-matching → `This job no longer matches your preferences`; no Submit; no application | Pass |

Unavailable vacancy ID `22222222-2222-4222-8222-222222222210` was
absent/invisible in Production rather than part of the retained Demo fixture
set. The denial result remained valid.

### Historical snapshot stability

After submission, current proof data was changed (candidate display name,
onboarding completion, vacancy title, company display name). Confirmation:

- remained readable while onboarding was incomplete;
- retained the original candidate display value;
- retained the original vacancy title;
- retained the original employer display name;
- did not reconstruct from current profile, vacancy, company, or matcher state.

### Privacy and unsupported behaviour

| Check | Result |
|-------|--------|
| No application UUID in candidate-facing copy | Pass |
| No Withdraw / Submit again | Pass |
| No employer-response, interview, or job-guarantee claims | Pass |
| No document-verification claim | Pass |
| No service-role browser/SSR application path | Pass |
| Creation through accepted RPC boundary | Pass |
| TypeScript remained current matcher source of truth | Pass |

### Cleanup

| Check | Result |
|-------|--------|
| Proof Candidates A/B/C/D Auth users deleted | Pass |
| Proof application rows deleted (scoped cleanup / cascade) | Pass |
| Remaining proof application count | 0 |
| Orphan users from initial failed UI-label attempt removed | Pass |
| Unrelated Auth/application rows unaffected | Pass |
| Retained Demo inventory present with restored values/expiry | Pass |
| Temporary credentials / API key files removed; `SUPABASE_DB_URL` unset | Pass |

Cleanup window: 2026-08-03 14:10:40–14:10:48 CEST.

### Credential safety

- No database URL, password, access token, service-role key, publishable key
  value, JWT secret, or SMTP credential was recorded in source, GitHub, or
  closure docs.
- Temporary proof passwords were not committed.
- Full raw snapshots were not published in closure docs.

### Operational notes / deviations

- Vercel `env pull` did not expose usable `POSTGRES_URL` values (encrypted
  placeholders). Live inventory and evidence used approved linked database
  inspection and Admin API boundaries instead of the fixture CLI connection
  string for those steps.
- Fixture-tool dry-run was plan-only; live existence was proven separately.
- First UI attempt failed on login button label (`Log in` vs `Sign in`); orphan
  users from that attempt were deleted before the successful run.
- Matcher remains TypeScript-only before RPC; non-matching was proven by UI
  denial and absence of an application row.

## Preview infrastructure follow-up (not a Slice 3 blocker)

Recorded during preflight; does **not** reopen Slice 3:

- Vercel Preview deployments exist and are automatic;
- Supabase Preview branching/isolation is not configured;
- Preview-scoped public Supabase variables were malformed/incomplete;
- Preview shared Production integration database variables;
- Preview deployments were SSO-protected;
- Production fallback was explicitly owner-authorized;
- future hosted proofs should prefer an isolated Preview environment after that
  infrastructure is corrected.

## Remaining exclusions (Slice 4+)

Employer Auth / verification / applicant review, save/unsave, CV upload,
messaging, interviews, offers, hire flows, public SEO job board, withdrawal UI,
application history dashboard, automatic Production seeding, and items in
`NOT_NOW.md`.

## Slice 4 boundary

Slice 4 — Employer registration to draft vacancy — is the **next planned**
slice. Implementation has **not** started and requires separate planning and
authorization.

## Closure status wording (final)

- PRs #33–#37 merged
- Local exit proof complete
- Owner-authorized Production hosted proof complete
- Retained fixture restoration and scoped cleanup complete
- D-035–D-045 Slice 3 acceptance conditions complete
- Slice 3 Done
- Next planned slice: Slice 4 (not started)

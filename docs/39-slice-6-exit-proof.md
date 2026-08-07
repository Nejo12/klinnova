# Slice 6 Exit Proof (Local)

Owner-facing local exit evidence for Slice 6 — Applicant review to status
update.

**Local exit proof status:** Pass (this document, 2026-08-07 UTC).
**Hosted Slice 6 proof:** Not performed. Runbook prepared:
`docs/40-slice-6-hosted-proof-runbook.md`. **Production authorization was not
used. Preview was not configured or touched.**
**Slice 6 local implementation is complete. Slice 6 is not marked Done —
hosted proof remains a separately authorized follow-up (see "Hosted status"
below).**

Related:

- Decision: D-070, `docs/10-decisions.md`
- Build plan: `docs/37-slice-6-build-plan.md`
- Schema/RPC proposal: `docs/38-application-status-and-review-proposal.md`
- Hosted runbook: `docs/40-slice-6-hosted-proof-runbook.md`

## Scope delivered (implementation PRs)

| Capability | Status |
|------------|--------|
| Slice 6 planning (D-070 drafted; build plan; schema proposal) | Merged (PR #59) |
| Application status + audit-history database contract | Merged (PR #60) |
| Employer applicant list/detail/status-transition UI | Merged (PR #61) |
| Candidate application inventory/status-history UI | Merged (PR #62) |
| Local exit proof + hosted-proof runbook + closure docs | This unit (PR 6.4) |
| Owner-run hosted proof | Not performed — separately authorized follow-up |
| Slice 6 Done | Not yet — pending hosted-proof decision |

## Pull requests

| PR | GitHub | Status |
|----|--------|--------|
| 6.0 Slice 6 planning (D-070 drafted) | #59 | Merged |
| 6.1 Application status + review database contract | #60 | Merged |
| 6.2 Employer applicant review UI | #61 | Merged |
| 6.3 Candidate application status UI | #62 | Merged |
| 6.4 Exit proof, hosted-proof runbook, closure | this unit | In progress |

## Accepted decisions

D-070 (Accepted 2026-08-06) remains **Accepted** and is not modified by this
PR — the merged implementation was audited against it below and no
contradiction was found. Accepting D-070 does **not** authorize hosted proof
of any kind; hosted execution requires the separate authorization described
in `docs/40-slice-6-hosted-proof-runbook.md`.

## Proof environment (local)

| Field | Value |
|-------|--------|
| Base / tested main SHA | `aef3cf2e743e0d05d99ea6bb9dff61353c36b59f` (PR #62 merge commit) |
| Branch (at proof) | `docs/slice-6-exit-proof` |
| Environment | Local project-local Supabase CLI (`pnpm exec supabase`, v2.111.0) + `pnpm start` |
| Hosted commands run in PR 6.4 | None |
| Production mutation | None |

## Commands

No dedicated `pnpm proof:slice6` orchestrator was added — PR 6.4 is
documentation/proof-only per its own scope, so the commands below were run
directly rather than through new automation:

```bash
pnpm exec supabase --version   # 2.111.0
rm -rf .next
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm supabase:db:reset
pnpm supabase:test:db
pnpm db:types:check
pnpm proof:migrations
pnpm test:e2e:employer
pnpm test:e2e:public-jobs
pnpm test:e2e:slice2
pnpm test:e2e:slice3
pnpm test:e2e:candidate-integration
pnpm test:e2e:employer-applications
pnpm test:e2e:candidate-applications
git diff --check
```

## Pass totals

Recorded on `docs/slice-6-exit-proof` at base `aef3cf2e743e0d05d99ea6bb9dff61353c36b59f`
(2026-08-07 UTC).

| Suite | Result |
|-------|--------|
| Format / lint / typecheck | Pass |
| Vitest | **679 passed** / 1 skipped (109 files) |
| Build | Pass — `/employer/applications`, `/employer/applications/[applicationId]`, `/candidate/applications`, `/candidate/applications/[applicationId]` all render as dynamic (`ƒ`) |
| Local DB reset | Pass (all 12 migrations, including the 12th Slice 6 migration) |
| pgTAP | **914 passed** across 29 files (Slice 6's own file, `28_application_status_and_review_contract_test.sql`, contributes 90 of the 914) |
| Generated types check | Pass (no drift) |
| Migration proof | `count=12` |
| Employer E2E | **15 passed** |
| Public-jobs E2E | **1 passed** |
| Slice 2 E2E | **1 passed** |
| Slice 3 E2E | **3 passed** |
| Candidate-integration E2E | **9 passed** |
| Employer-applications E2E | **5 passed** |
| Candidate-applications E2E | **4 passed** |
| `git diff --check` | Clean |
| Hosted proof | Not performed — see "Hosted status" |

Every count above matches the accepted PR 6.1–6.3 baseline exactly; PR 6.4
adds no new Vitest/pgTAP/Playwright cases (documentation-only unit).

## D-070 audit — requirement-to-evidence mapping

This section maps every D-070 requirement to the merged implementation. No
contradiction was found; nothing here required a code change.

### Status model

| Requirement | Evidence |
|---|---|
| Exactly five statuses (`submitted`, `reviewing`, `shortlisted`, `accepted`, `rejected`) | `applications_status_chk` and `application_status_history_to_status_chk` in `20260806140000_application_status_and_review_contract.sql`; mirrored in `src/lib/employer/applications/status.ts` and `src/lib/applications/status.ts` |
| Forward-only, skips allowed | `_application_allowed_transitions(text)` (internal SQL helper) — `submitted → {reviewing, shortlisted, accepted, rejected}`, `reviewing → {shortlisted, accepted, rejected}`, `shortlisted → {accepted, rejected}` |
| `accepted`/`rejected` terminal | Same helper returns `{}` for both — proven by pgTAP terminal-state assertions and by the employer/candidate E2E suites (no transition form/controls render once terminal) |
| No candidate withdrawal | Grep-confirmed: no withdrawal code path anywhere in the candidate application surface |
| No automatic vacancy/application lifecycle coupling | Grep-confirmed: zero references to `fill_employer_vacancy`/`withdraw_employer_vacancy`/`pause_employer_vacancy` anywhere in the application-review runtime files; independently proven live by the employer-applications E2E "stale transition" test and the candidate-applications E2E "vacancy withdrawn" test, both showing the two state machines never influence each other |

### Employer review

| Requirement | Evidence |
|---|---|
| Completed employer required | `requireCompletedEmployer`/inline `employer_profiles.onboarding_completed_at is not null` checks in all three employer RPCs |
| Vacancy ownership required | `vacancies.employer_profile_id = auth.uid()` join in all three employer RPCs |
| Current verification **not** required | No `verification_state` check anywhere in `list_current_employer_applications`/`get_current_employer_application`/`transition_current_employer_application_status`; proven live by the "revoked-verification employer can still list and review" E2E test |
| Review survives vacancy lifecycle changes | Proven live by the employer-applications E2E main journey (paused/no special-cased vacancy state affects review) and the candidate-applications E2E withdrawal test |
| Review survives verification revocation | Same revoked-verification E2E test above |
| List/detail/transition are RPC-mediated | Grep-confirmed: zero `.from("applications")` reads anywhere in the employer application-review surface — all three operations go through `.rpc(...)` only |
| No broad employer `applications` RLS | Confirmed in `docs/38` §15 and by migration inspection: no new RLS policy was added to `applications`; employer access is exclusively through the three `SECURITY DEFINER` RPCs |

### Candidate visibility

| Requirement | Evidence |
|---|---|
| Candidate owns direct SELECT on own applications only | `applications_select_own` RLS policy (unchanged since Slice 3); confirmed as the sole direct-read path via the two approved candidate loaders |
| Candidate inventory exists | `/candidate/applications` (PR #62) |
| Candidate detail exists | `/candidate/applications/[applicationId]` (Slice 3, extended in PR #62) |
| Candidate-safe history exposes status/timestamp only | `list_current_candidate_application_status_history` returns exactly `to_status`, `occurred_at` — grep-confirmed no `reason`/`actor_user_id`/`actor_role`/`from_status` in its return type or in any candidate-facing file |
| Rejection reason hidden from candidate | Grep-confirmed: zero rejection-reason exposure in any candidate file; proven live by the candidate-applications E2E rejection-privacy test |
| No actor identity | Grep-confirmed: zero `actor_user_id`/`actor_role` references anywhere in the candidate surface |
| No candidate mutation | Grep-confirmed: no transition/status-mutation Server Action exists anywhere under `src/app/candidate/applications` |

### History

| Requirement | Evidence |
|---|---|
| Append-only `application_status_history` | Table has zero `authenticated` grant (`revoke all ... from public, anon, authenticated`); only `service_role` and the `SECURITY DEFINER` RPCs can write |
| One initial event per application | `application_status_history_one_initial_event_idx` unique partial index (`where from_status is null`) |
| Historical backfill | One synthesized `submitted` event per pre-existing application, migration §backfill, idempotent via `where not exists` |
| Future submission writes initial event atomically | `submit_candidate_application` inserts the `applications` row and its initial history row in the same transaction |
| Shared submission/history timestamp | Both use the same `ts` variable (`clock_timestamp()`, captured once) — proven byte-identical by a dedicated pgTAP assertion in `28_application_status_and_review_contract_test.sql` |
| Actor identity DB-derived | `actor_user_id`/`actor_role` are set server-side from `auth.uid()` and the RPC's own identity, never accepted as a parameter — grep-confirmed no `p_actor_user_id`/`p_actor_role` parameter exists on any RPC |
| Transition timestamps DB-derived | `occurred_at` uses the transition RPC's own `ts := clock_timestamp()`, never a caller-supplied value — grep-confirmed no `p_occurred_at` parameter exists |
| Direct authenticated table access denied | `application_status_history` has zero `authenticated` grant (see above) |

### Snapshots

| Requirement | Evidence |
|---|---|
| Employer review uses immutable candidate snapshot | `get_current_employer_application` projects fields from `applications.candidate_snapshot` only, never a live `candidate_profiles`/`candidate_languages` join |
| Candidate historical vacancy display uses immutable vacancy snapshot | `loadCandidateApplicationInventory`/`loadCandidateApplicationConfirmation` read `vacancy_snapshot` only, never `.from("vacancies")` — grep-confirmed |
| Real-employer snapshot parsing bug fixed | `vacancySnapshotV1Schema.source`/`.demo_label` widened in PR #62 (verified against the actual `submit_candidate_application` SQL at merge time); regression-tested in five Vitest files and asserted live in the candidate-applications E2E main journey |
| No raw snapshot rendering | Grep-confirmed: zero `JSON.stringify` in the candidate application surface; the employer surface renders only individually-labeled fields, never the raw RPC payload |
| No live candidate profile in employer review | Grep-confirmed: zero `.from("candidate_profiles")`/`.from("candidate_languages")` in the employer application-review surface |
| No live vacancy dependency for candidate history | Grep-confirmed: zero `.from("vacancies")` anywhere in the candidate application surface; proven live by the vacancy-withdrawal E2E test |

### Privacy

Confirmed absent from both surfaces by grep sweep across all 37
implementation files under `src/lib/employer/applications`,
`src/app/employer/applications`, `src/components/employer-applications`,
`src/lib/applications`, `src/app/candidate/applications`,
`src/components/candidate-applications`, and
`src/components/candidate-application-confirmation`:

- candidate auth ID in employer UI — never returned by any employer RPC
- email / phone / exact address — never selected or returned by any Slice 6 RPC
- actor identity (either direction) — zero matches
- eligibility missing-requirement codes — not part of the Slice 6 surface
- employer rejection reason in candidate UI — zero matches outside the employer-only detail RPC
- other applicants — every RPC scopes to the caller's own rows/vacancies only
- service-role client — zero matches (`service_role`/`SERVICE_ROLE`/`createServiceRole`/`sb_secret_`)

### Explicit non-goals

Confirmed absent by the same grep sweep plus manual code-path review:

CV/document workflow, Storage, messaging, notifications, interview
scheduling, scoring/ranking/AI, payroll, invoicing, contracts, candidate
withdrawal, operator applicant review, bulk applicant actions, analytics,
automatic fill/reject coupling — none present anywhere in the merged Slice 6
surface.

**No D-070 contradiction was found. No corrective code change was required
in PR 6.4.**

## Static-security test evidence

| Test file | Assertions | Scope |
|---|---|---|
| `src/lib/employer/applications/pr-6.2-static-security.test.ts` | 10 | Employer applicant-review file set |
| `src/lib/applications/pr-6.3-static-security.test.ts` | 10 | Candidate application inventory/status/history file set |
| `src/lib/applications/slice3-static-security.test.ts` | (pre-existing, extended in PR #62) | Candidate confirmation route, narrowed for the PR #62 dual-capability nav import |

Both Slice 6 static-security files enumerate their exact file set, assert an
approved-RPC-name allowlist, and assert the absence of every forbidden
pattern from the privacy/non-goals lists above — all passing as part of the
679/1 Vitest total.

## Automation artifacts

| Artifact | Path |
|----------|------|
| Migration inventory | `scripts/proof/migration-inventory.mts` (`pnpm proof:migrations`) |
| Database contract migration | `supabase/migrations/20260806140000_application_status_and_review_contract.sql` (672 lines, 12th migration) |
| Database contract pgTAP | `supabase/tests/database/28_application_status_and_review_contract_test.sql` (800 lines, 90 of the 914 total assertions) |
| Employer static security | `src/lib/employer/applications/pr-6.2-static-security.test.ts` |
| Candidate static security | `src/lib/applications/pr-6.3-static-security.test.ts` |
| Employer applicant-review E2E | `e2e/employer-applicant-review-journey.spec.ts` |
| Candidate application-status E2E | `e2e/candidate-application-status-journey.spec.ts` |
| Hosted runbook | `docs/40-slice-6-hosted-proof-runbook.md` |

## CI/workflow coverage

`.github/workflows/ci.yml` runs two jobs on every PR and push to `main`:

- **`quality`** — `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (full Vitest suite), `pnpm build`, then `pnpm test:e2e` (ungated specs only).
- **`database`** — `pnpm supabase:db:reset`, `pnpm supabase:test:db` (full pgTAP), `pnpm db:types:check`, a production build against local Supabase, then `pnpm test:e2e:onboarding`.

CI therefore already gates format/lint/typecheck/Vitest/build/schema-RLS/
type-drift on every PR automatically — no gap for those layers. It does not
by itself run the full Slice-6-specific Playwright battery (`test:e2e:employer`,
`test:e2e:employer-applications`, `test:e2e:candidate-applications`, etc.);
that battery is run manually as local exit proof instead, exactly the same
pattern Slice 4 used (`docs/31-slice-4-exit-proof.md`: local exit proof via a
manual run, not a named CI step). Every Slice 6 PR (#60, #61, #62) had this
full manual sweep run and reported green before merge, and this document
re-confirms it once more at the Slice-6-closure boundary. **No workflow file
was modified in PR 6.4** — the existing gates are adequate and this is not a
concrete missing proof that requires a CI change.

## Hosted status

- Local exit proof: **PASS** (this document).
- No hosted command was run in PR 6.4 — every command targeted
  `127.0.0.1`/`localhost` only (enforced by `withLocalPostgres`'s own guard
  and by every E2E spec's own `expect(supabaseUrl).toMatch(/127\.0\.0\.1|localhost/)`
  assertion).
- Preview intentionally remains unconfigured (unchanged since PR #58's
  Slice 5 hosted proof cleanup) — re-isolating it is a precondition for any
  future hosted proof, not something this PR performs.
- Production is untouched.
- A disposable hosted proof is prepared as a runbook
  (`docs/40-slice-6-hosted-proof-runbook.md`) and is a **separately
  authorized follow-up** — it is not executed by this PR and its absence
  does not block this document's local PASS.

## Deferred / non-goals (unchanged from D-070)

Candidate withdrawal; interview invitation metadata or scheduling; email/
SMS/push notifications; messaging; CV/document upload or storage; employer
notes visible to candidates; internal scoring or AI ranking; bulk status
changes; automated/system-initiated rejection; operator participation in
applicant review; the general `audit_events` platform (Slice 7). None of
these were added in PR 6.4.

## Closure decision

**Slice 6 local exit criteria: PASS.**

All local format/lint/typecheck/build/Vitest/pgTAP/migration/type-drift/E2E
gates pass at the exact expected counts, and the D-070 audit above found no
contradiction between the decision and the merged implementation. Slice 6's
**local implementation is complete**. Slice 6 itself is not marked Done in
this document — per the established Slice 3/4/5 pattern, that requires an
owner-authorized hosted proof, which remains a separate, explicitly
authorized follow-up (see `docs/40-slice-6-hosted-proof-runbook.md`).

### Local proof run record

| Field | Value |
|-------|--------|
| Commands | see "Commands" above |
| Result | Pass |
| Date (UTC) | 2026-08-07 |
| Base SHA | `aef3cf2e743e0d05d99ea6bb9dff61353c36b59f` |
| Notes | Vitest 679/1 skip (109 files); pgTAP 914/29; migrations 12; types no drift; employer E2E 15/15; public-jobs 1/1; Slice 2 1/1; Slice 3 3/3; candidate-integration 9/9; employer-applications 5/5; candidate-applications 4/4; no hosted commands run |

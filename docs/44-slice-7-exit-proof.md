# Slice 7 Exit Proof (Local)

Owner-facing local exit evidence for Slice 7 — Admin moderation to audit
event.

**Local exit proof status:** Pass (this document, 2026-08-07 UTC).
**Hosted Slice 7 proof:** Not performed. **Production authorization was not
used. Preview was not configured or touched.**
**Slice 7 local implementation is complete. Slice 7 is not marked Done until
PR 7.4 merges** — per the established Slice 3/4/5/6 pattern, hosted proof
remains a separately authorized follow-up and is not a precondition for
local closure (see "Hosted status" below).

Related:

- Decisions: D-071–D-075, `docs/10-decisions.md`
- Discovery: `docs/41-slice-7-discovery.md`
- Build plan: `docs/42-slice-7-build-plan.md`
- Moderation/audit proposal: `docs/43-slice-7-moderation-and-audit-proposal.md`

## Scope delivered (implementation PRs)

| Capability | Status |
|---|---|
| Slice 7 planning (D-071–D-075 drafted; discovery; build plan; moderation/audit proposal) | Merged (PR #64) |
| Admin moderation/audit database contract | Merged (PR #65) |
| Operator moderation UI + suspended-employer UX | Merged (PR #66) |
| Pilot funnel proof + legal placeholders + local exit proof | This unit (PR 7.4) |
| Owner-run hosted proof | Not performed — separately authorized follow-up |
| Slice 7 Done | Not yet — pending PR 7.4 review/merge |

## Pull requests

| PR | GitHub | Status |
|---|---|---|
| 7.1 Slice 7 planning (D-071–D-075 drafted) | #64 | Merged |
| 7.2 Admin moderation/audit database contract | #65 | Merged |
| 7.3 Operator moderation UI + suspended-employer UX | #66 | Merged |
| 7.4 Pilot funnel, legal placeholders, exit proof | this unit | In progress |

## Accepted decisions

D-071–D-075 (Accepted 2026-08-07) remain **Accepted** and are not modified
by this PR. D-075 specifically gates PR 7.4 ("**Must accept before:** PR
7.4") — its scope (no third-party analytics; a deterministic read-only
funnel-proof script; legal/privacy route placeholders with explicit
"draft — legal review required" text; no transactional email) is
implemented exactly as decided below, with no contradiction found.

## Proof environment (local)

| Field | Value |
|---|---|
| Base SHA (branch start) | `0af8dcf99cd452473d3aa37b6495d5bca6f4e78f` (PR #66 merge commit) |
| Branch (at proof) | `feat/slice-7-pilot-readiness` |
| Environment | Local project-local Supabase CLI (`supabase`, v2.111.0) + `pnpm build`/`pnpm start` |
| Hosted commands run in PR 7.4 | None |
| Production mutation | None |

## Commands

```bash
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
pnpm proof:pilot-funnel
pnpm test:e2e:employer
pnpm test:e2e:public-jobs
pnpm test:e2e:slice2
pnpm test:e2e:slice3
pnpm test:e2e:candidate-integration
pnpm test:e2e:employer-applications
pnpm test:e2e:candidate-applications
pnpm test:e2e:admin-moderation
git diff --check
```

## Pass totals

Recorded on `feat/slice-7-pilot-readiness` at base
`0af8dcf99cd452473d3aa37b6495d5bca6f4e78f` (2026-08-07 UTC).

| Suite | Result |
|---|---|
| Format / lint / typecheck | Pass |
| Vitest | **829 passed** / 1 skipped (130 files) — +44 over the pre-PR-7.4 baseline of 785/1 |
| Build | Pass — `/privacy`, `/terms`, `/impressum` render as static (`○`); all authenticated/dynamic routes unchanged (`ƒ`) |
| Local DB reset | Pass (all 13 migrations — no migration #14) |
| pgTAP | **1136 passed** across 30 files — unchanged from the PR 7.2/7.3 baseline; PR 7.4 adds no pgTAP file |
| Generated types check | Pass (no drift) |
| Migration proof | `count=13` |
| Pilot-funnel proof | Pass — see "Exit criterion 3 evidence" below |
| Employer E2E | **15 passed** |
| Public-jobs E2E | **1 passed** |
| Slice 2 E2E | **1 passed** |
| Slice 3 E2E | **3 passed** |
| Candidate-integration E2E | **9 passed** |
| Employer-applications E2E | **5 passed** |
| Candidate-applications E2E | **4 passed** |
| Admin-moderation E2E | **4 passed** |
| `git diff --check` | Clean |
| Hosted proof | Not performed — see "Hosted status" |

**Total Playwright: 42/42 across 8 suites** — the identical 42/42 baseline
established after PR 7.3, re-confirmed unchanged. **No new Playwright
suite was added in PR 7.4** — see "E2E scope decision" below.

Every pre-existing count above matches the accepted PR 7.3 baseline
exactly; PR 7.4 adds +44 Vitest tests: `pilot-funnel.test.ts` (12, including
4 added by a follow-up correction for the transaction-stable measurement
timestamp), `local-postgres.test.ts` (11, added by the same correction —
proves the `REPEATABLE READ READ ONLY` transaction's begin/commit/rollback
behaviour), `pilot-funnel-static-security.test.ts` (10, including 3 added
by the correction), and legal pages/footer (11) — zero new pgTAP/Playwright
cases.

## E2E scope decision

The build plan (`docs/42` §PR 7.4) explicitly states: *"Tests: Vitest for
the new static routes/footer; no new Playwright journey needed (a
static-content check is sufficient)"* and the overall test-strategy table
states *"PR 7.4: Vitest only; no new Playwright journey."* This PR follows
that locked, already-accepted plan: `/privacy`, `/terms`, `/impressum`, and
`PublicFooter` are proven by Vitest/Testing Library component tests
(headings, draft-notice text, footer links, absence of fabricated legal
data), not a new Playwright suite. This is a deliberate, plan-conforming
choice, not an oversight.

## Exit criterion 1 evidence — "administrators can suspend unsafe actors and remove vacancies"

Delivered entirely in PR 7.2 (database contract) and PR 7.3 (operator UI),
unchanged by PR 7.4. Summary (full detail in the PR 7.3 pre-commit/merge
record):

**Employer safety controls:**

| Requirement | Evidence |
|---|---|
| Operator authorization | `requireActiveOperator()` (`src/lib/internal/verification/operator-gate.ts`), reused unmodified by every PR 7.3 route/action |
| Suspend / unsuspend | `suspend_employer(uuid, text)` / `unsuspend_employer(uuid)` RPCs; UI at `/internal/employers/[employerProfileId]` |
| Suspension blocks mutation | `employer_profiles_update_own` RLS policy narrowed in PR 7.2; `updateOwnEmployerProfile()` (PR 7.3) makes a zero-row RLS denial return `restricted`, never a false success |
| Applicant-privacy boundary | `/employer/applications*` checked via `loadCurrentEmployerSuspensionStatus()` before any applicant RPC — candidate data never loaded while suspended |
| Effective-public removal | `is_vacancy_effectively_public` gains an `employer_not_suspended` AND-clause (D-072) — every vacancy owned by a suspended employer stops being effectively public automatically, with no per-vacancy update |
| Operator UI | `/internal/employers`, `/internal/employers/[employerProfileId]` |
| Neutral employer UX | `EmployerRestrictedNotice` across applications/vacancies/verification/onboarding, no operator reason exposed |

**Vacancy safety controls:**

| Requirement | Evidence |
|---|---|
| Moderate / restore | `moderate_vacancy(uuid, text)` / `restore_vacancy(uuid)` RPCs; UI at `/internal/employers/[employerProfileId]/vacancies/[vacancyId]` |
| Target isolation | `admin-moderation.spec.ts` "sibling isolation" E2E proves moderating one vacancy leaves a sibling vacancy from the same employer untouched |
| Effective-public removal | `is_vacancy_effectively_public` gains a `vacancy_not_moderated` AND-clause (D-073) |
| `publication_state` preserved | `moderate_vacancy`/`restore_vacancy` never write `publication_state` — pgTAP (`29_admin_moderation_and_audit_contract_test.sql`) and the operator UI copy both assert this |
| Operator UI | vacancy moderation detail page, `VacancyModerationActions` |

**"Remove" clarification:** accepted Slice 7 vacancy "removal" means removal
from *effective-public discovery* (the same predicate every public/candidate
read path already delegates to), not a database `DELETE`. History,
`publication_state`, and the vacancy row itself are all preserved — this is
explicit in the operator UI copy ("Restore vacancy" / "Remove moderation
hold", never "Publish"/"Republish") and in D-073's own text.

## Exit criterion 2 evidence — "sensitive admin actions are audited"

Delivered entirely in PR 7.2/7.3, unchanged by PR 7.4.

`admin_audit_events` taxonomy (exactly 7 event types, `event_type`/
`target_kind` pairing declaratively CHECK-constrained):

| `event_type` | UI label |
|---|---|
| `employer_suspended` | Employer suspended |
| `employer_unsuspended` | Employer unsuspended |
| `vacancy_moderated` | Vacancy moderated |
| `vacancy_restored` | Vacancy restored |
| `verification_approved` | Verification approved |
| `verification_rejected` | Verification rejected |
| `verification_revoked` | Verification revoked |

| Requirement | Evidence |
|---|---|
| Append-only, no ordinary-principal write | `admin_audit_events` has zero `authenticated`/`anon` grant — writes only via `_append_admin_audit_event(...)`, called exclusively from the `SECURITY DEFINER` moderation RPCs |
| Actor/time DB-derived | `_append_admin_audit_event` takes actor/timestamp from `auth.uid()`/`clock_timestamp()` internally — no RPC accepts a caller-supplied actor id or timestamp (grep-confirmed across every PR 7.3 action file) |
| Target integrity | `target_kind`/`target_id` pairing is declaratively CHECK-constrained; existence is procedural, not a polymorphic FK (by design, per D-074) |
| Operator reason handling | Reason is required/trimmed/bounded (1–500 chars) on suspend/moderate/revoke; absent on unsuspend/restore; rendered to the operator only, never to the moderated employer |
| Verification audit emission | `verification_approved`/`verification_rejected`/`verification_revoked` events are written by the existing verification RPCs, extended in PR 7.2 |
| Operator UI timeline | `AuditTimeline` component — one label mapper (`auditEventLabel`), renders label + `occurred_at` + reason only |
| No actor UUID rendered | Static-security tests (`pr-7.3-internal-static-security.test.ts`) and the admin-moderation E2E both assert `actor_user_id` never appears in rendered output |

**Durable DB event vs. UI display:** the durable record is the
`admin_audit_events` row, written transactionally by the RPC itself,
independent of whether any operator ever opens the UI to view it — the UI
timeline is a read projection of that record, not the record itself.

## Exit criterion 3 evidence — "pilot funnel events are measurable"

**Script:** `scripts/proof/pilot-funnel.mts` (thin CLI wrapper) +
`src/lib/proof/pilot-funnel.ts` (pure query/aggregation logic, unit-tested
independently of any database connection) + `src/lib/proof/local-postgres.ts`
(localhost-only connection helper, mirroring the existing
`e2e/helpers/local-application-proof.ts` pattern).

**Package script:** `pnpm proof:pilot-funnel` (`node
--experimental-strip-types scripts/proof/pilot-funnel.mts`, the same
execution mechanism `pnpm proof:migrations` already uses — no new
dependency).

**Consistent-snapshot guarantee:** all five metric queries run inside one
Postgres `REPEATABLE READ READ ONLY` transaction
(`withLocalPostgresReadOnlyTransaction` in `src/lib/proof/local-postgres.ts`
— `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`, `COMMIT`
on success, `ROLLBACK` and rethrow the original error on any failure, no
partial report ever printed). This is a database-enforced property, not
merely "the SQL happens to be SELECT-only": under `REPEATABLE READ`,
Postgres guarantees every query in the transaction sees the same snapshot
of the database, so the five aggregate counts describe one coherent
measurement point even if, say, a new application is inserted by another
session between two of the five queries. `READ ONLY` additionally makes
Postgres itself reject any write attempted inside the transaction, on top
of the static source-level proof that no mutation SQL is ever issued.
`src/lib/proof/local-postgres.test.ts` proves the transaction begins with
the correct isolation/read-only clause, commits on success, rolls back
(and still rethrows the original error, even if the rollback itself fails)
on failure, and reuses exactly one client connection for every query the
callback issues.

**Transaction-stable measurement instant:** the report's `measuredAt`
field and the `vacancies_effective_public` metric's expiry evaluation both
use PostgreSQL's `transaction_timestamp()`, which is fixed for the whole
transaction. PostgreSQL's `now()` is also transaction-stable — the two are
effectively equivalent for this purpose — but this implementation uses
`transaction_timestamp()` explicitly so the report names its measurement
semantics directly, rather than relying on readers to already know that
`now()` is an alias for it. Neither is ever substituted with a JavaScript
`Date.now()`/serialization-time read. The candidate query captures
`transaction_timestamp()` once as `measured_at`; because it runs inside
the same transaction as the other four queries, that captured instant is
provably the same instant the vacancy query's
`is_vacancy_effectively_public(id, transaction_timestamp())` call
evaluates against, without threading a timestamp parameter between
queries. `pilot-funnel.test.ts` and `pilot-funnel-static-security.test.ts`
both assert this — including that node-postgres's `Date`-typed
`timestamptz` result is normalised correctly, and that a malformed
timestamp throws rather than silently falling back to a JS clock read.

**Read-only guarantee:** in addition to the transaction-level `READ ONLY`
enforcement above, the script issues only five `SELECT`-only metric queries
(see below) against a `pg.Client` connected to `127.0.0.1`/`localhost` only
(`resolveLocalDatabaseUrl` throws for any other host); `assertLocalProofEnvironment`
(reused unmodified from `pnpm proof:slice4`) additionally refuses hosted
Supabase URLs, hosted DB URL env vars, and any argv implying hosted/linked
mutation before a single query runs. `src/lib/proof/pilot-funnel-static-security.test.ts`
asserts zero `INSERT`/`UPDATE`/`DELETE`/`UPSERT` SQL, zero Supabase mutation
calls, and zero known mutation-RPC names anywhere in the implementation
files, while separately recognising `BEGIN`/`COMMIT`/`ROLLBACK` as
legitimate transaction control rather than metric or mutation SQL.

**Privacy guarantee:** every metric is an aggregate `count(*)` — no row-level
data (email, phone, display name, company name, candidate snapshot, operator
reason, actor id) is ever selected or printed. `pilot-funnel.test.ts` asserts
no PII field name appears anywhere in a built report; `pilot-funnel-static-security.test.ts`
asserts the same statically across the source files.

**Query strategy:** exactly 5 metric queries total (transaction-control
statements are not counted as metrics) — one aggregate `count(*)
filter (...)` query per domain (candidate, employer, application), plus two
for vacancy (the per-row aggregate, and one join+`count(distinct)` for
"vacancies with an application" — a relationship no single-table filter can
express). No N+1, no per-row query; `pilot-funnel.test.ts` asserts the exact
call count.

**Metric definitions** (16 metrics across 4 domains):

| Domain | Metric | Definition |
|---|---|---|
| candidate | `candidates_registered` | `candidate_profiles` rows |
| candidate | `candidates_onboarding_completed` | `onboarding_completed_at is not null` |
| employer | `employers_registered` | `employer_profiles` rows |
| employer | `employers_onboarding_completed` | `onboarding_completed_at is not null` |
| employer | `employers_verification_pending` | `verification_state = 'pending'` |
| employer | `employers_verified` | `verification_state = 'verified'` |
| vacancy | `vacancies_created` | `vacancies` rows, `source = 'employer'` (seed/demo fixtures excluded) |
| vacancy | `vacancies_ever_published` | employer-sourced, `published_at is not null` — a historical milestone (published at least once); does **not** mean currently published, since a paused/filled/expired/withdrawn vacancy still counts |
| vacancy | `vacancies_effective_public` | employer-sourced, `is_vacancy_effectively_public(id, transaction_timestamp())` — the canonical predicate evaluated at the report's own transaction-stable measurement instant, not `now()`, not a `publication_state` approximation |
| vacancy | `vacancies_with_application` | distinct employer-sourced vacancies with ≥1 `applications` row |
| application | `applications_submitted` | `applications` rows (any vacancy, including seed/demo — a real candidate submission regardless of target) |
| application | `applications_status_submitted` | `status = 'submitted'` (current state) |
| application | `applications_status_reviewing` | `status = 'reviewing'` (current state) |
| application | `applications_status_shortlisted` | `status = 'shortlisted'` (current state) |
| application | `applications_status_accepted` | `status = 'accepted'` (current state) |
| application | `applications_status_rejected` | `status = 'rejected'` (current state) |

All application metrics are **current-state** counts (`applications.status`
today), not historical ever-reached-state counts — `application_status_history`
exists for a future historical view but is not queried here, avoiding any
"submitted → reviewing → ..." conflation between a current count and a
lifetime-transition count.

**Sample local output** (fresh `pnpm supabase:db:reset`, re-run against the
corrected read-only-transaction implementation with the
`vacancies_ever_published` rename, 2026-08-07 UTC — legitimate all-zero
state, since a clean reset seeds only `source = 'seed'` demo fixtures,
which every vacancy/application metric above deliberately excludes or
which have no candidate/employer accounts to begin with). `measuredAt` is
the actual `transaction_timestamp()` value the database returned for this
run, not a fabricated or JS-side timestamp:

```json
{
  "measuredAt": "2026-08-07T16:48:22.814Z",
  "source": "local-supabase",
  "funnels": {
    "candidate": {
      "candidates_registered": { "count": 0, "definition": "candidate_profiles rows — one per registered candidate." },
      "candidates_onboarding_completed": { "count": 0, "definition": "candidate_profiles.onboarding_completed_at is not null." }
    },
    "employer": {
      "employers_registered": { "count": 0, "definition": "employer_profiles rows — one per registered employer." },
      "employers_onboarding_completed": { "count": 0, "definition": "employer_profiles.onboarding_completed_at is not null." },
      "employers_verification_pending": { "count": 0, "definition": "employer_profiles.verification_state = 'pending'." },
      "employers_verified": { "count": 0, "definition": "employer_profiles.verification_state = 'verified'." }
    },
    "vacancy": {
      "vacancies_created": { "count": 0, "definition": "vacancies rows with source = 'employer' (excludes seed/demo fixtures)." },
      "vacancies_ever_published": { "count": 0, "definition": "Employer-sourced vacancies that have been published at least once (published_at IS NOT NULL), regardless of current publication state — a vacancy counted here may currently be paused, filled, expired, or withdrawn." },
      "vacancies_effective_public": { "count": 0, "definition": "employer-sourced vacancies where is_vacancy_effectively_public(id, transaction_timestamp()) is true — the canonical predicate, evaluated at the report's own measurement instant, honouring verification, expiry, suspension, and moderation state." },
      "vacancies_with_application": { "count": 0, "definition": "distinct employer-sourced vacancies with at least one row in applications." }
    },
    "application": {
      "applications_submitted": { "count": 0, "definition": "applications rows — one per candidate submission (any vacancy)." },
      "applications_status_submitted": { "count": 0, "definition": "applications.status = 'submitted' (current state)." },
      "applications_status_reviewing": { "count": 0, "definition": "applications.status = 'reviewing' (current state)." },
      "applications_status_shortlisted": { "count": 0, "definition": "applications.status = 'shortlisted' (current state)." },
      "applications_status_accepted": { "count": 0, "definition": "applications.status = 'accepted' (current state)." },
      "applications_status_rejected": { "count": 0, "definition": "applications.status = 'rejected' (current state)." }
    }
  }
}
```

This is **local proof data from a freshly reset database, not pilot or
business performance** — it demonstrates the mechanism works correctly for
the "all-zero legitimate state" case specifically required by the PR 7.4
kickoff, running inside the `REPEATABLE READ READ ONLY` transaction
described above. An earlier run of the pre-correction script (five
independent statements, no shared transaction, and the ambiguously-named
`vacancies_published` key) was also manually executed against a database
populated by this session's own E2E test runs and produced internally
consistent non-zero counts (e.g. `applications_submitted` exactly equal to
the sum of its five status buckets; `vacancies_effective_public` ≤
`vacancies_ever_published` ≤ `vacancies_created`) — consistent by
coincidence of a quiescent database, not by any guarantee the
pre-correction implementation provided. That run is not reproduced here
since it reflects session test data, not a reproducible baseline, and no
longer reflects the
current (corrected) implementation.

## Legal placeholder pages

| Route | Purpose | Draft warning | Fabricated data |
|---|---|---|---|
| `/privacy` | Privacy Policy structural draft | "Draft — legal review required" (shared `DraftNotice` component, identical wording) | None — placeholders only, no invented retention periods/legal bases/subprocessors |
| `/terms` | Terms of Service structural draft | Same shared component | None — no invented enforceable legal language |
| `/impressum` | Impressum structural draft | Same shared component | None — every field is `[TO COMPLETE]`/`[IF APPLICABLE]`, zero real business/personal data |

`PublicFooter` (`src/components/public-shared/public-footer.tsx`) links all
three from: `/` (landing), `/jobs`, `/jobs/[vacancyId]`, `/login`,
`/register`, `/employer/register`, and the three legal pages themselves.
Not added to authenticated candidate/employer/internal dashboards, which
have their own navigation.

## Static-security test evidence

| Test file | Scope |
|---|---|
| `src/lib/proof/pilot-funnel-static-security.test.ts` | Pilot-funnel proof file set — no mutation SQL/RPC, no service-role, SELECT-only metric queries (transaction control distinguished separately), `REPEATABLE READ READ ONLY` isolation asserted, localhost-only connection |
| `src/lib/proof/local-postgres.test.ts` | Behavioural proof of the read-only transaction: begins with the correct isolation/read-only clause, commits on success, rolls back and rethrows on failure (including when rollback itself fails), reuses one client/connection for the whole measurement, rejects non-localhost targets before connecting |

Passing as part of the 829/1 Vitest total, alongside the unmodified PR
7.2/7.3 static-security suites.

## Automation artifacts

| Artifact | Path |
|---|---|
| Pilot-funnel script | `scripts/proof/pilot-funnel.mts` (`pnpm proof:pilot-funnel`) |
| Pilot-funnel logic | `src/lib/proof/pilot-funnel.ts` |
| Local Postgres read-only-transaction guard | `src/lib/proof/local-postgres.ts` (`withLocalPostgresReadOnlyTransaction`) |
| Legal pages | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/impressum/page.tsx` |
| Shared draft notice | `src/components/legal/draft-notice.tsx` |
| Shared legal footer | `src/components/public-shared/public-footer.tsx` |

## Database and workflow invariants

No migration, pgTAP file, generated-type change, or `.github/workflows`
change in PR 7.4 — confirmed by empty `git diff --name-only` against
`supabase/migrations`, `supabase/tests`, `src/types/database.ts`, and
`.github/workflows`. Migration count remains **13**; pgTAP remains
**1136/1136 across 30 files**.

## Hosted status

- Local exit proof: **PASS** (this document).
- No hosted command was run in PR 7.4 — every command targeted
  `127.0.0.1`/`localhost` only, enforced by `assertLocalProofEnvironment`
  and `resolveLocalDatabaseUrl`'s own guards.
- Preview intentionally remains unconfigured (unchanged since Slice 5).
- Production is untouched.
- No hosted-proof runbook was prepared for Slice 7 — the accepted Slice 7
  exit criteria are fully local-database-derived (D-075), and nothing in
  D-071–D-075 makes hosted proof a precondition for local closure.

## Slice 7 overall scope matrix

| PR | Delivered |
|---|---|
| 7.1 | Planning + decisions (D-071–D-075) |
| 7.2 | Moderation/audit database contract |
| 7.3 | Operator moderation UI + suspended-employer UX |
| 7.4 | Pilot funnel + legal placeholders + local exit proof |

## Deferred / non-goals (unchanged from D-075)

Third-party analytics (PostHog or equivalent); user-submitted report
intake/ticketing; transactional email (candidate, employer, or operator);
candidate suspension; operator self-management; a new moderation
architecture beyond PR 7.2/7.3's. None of these were added in PR 7.4.

## Closure decision

**Slice 7 local exit criteria: PASS.**

All three accepted exit criteria (`docs/13-implementation-plan.md`) are
demonstrably satisfied by the merged/local implementation:

1. **"Administrators can suspend unsafe actors and remove vacancies"** —
   PASS (PR 7.2/7.3, re-confirmed above).
2. **"Sensitive admin actions are audited"** — PASS (PR 7.2/7.3,
   re-confirmed above).
3. **"Pilot funnel events are measurable"** — PASS (PR 7.4,
   `pnpm proof:pilot-funnel`, evidenced above).

All local format/lint/typecheck/build/Vitest/pgTAP/migration/type-drift/E2E
gates pass at the exact expected counts. **Slice 7's local implementation
is complete.** Slice 7 is not marked Done in this document until PR 7.4 is
independently reviewed and merged — per the established Slice 3/4/5/6
pattern, that is the point at which a slice's implementation PRs are all
merged. No hosted proof is required by the accepted Slice 7 exit criteria
before Slice 8 development may begin; hosted verification of Slices 5–7
remains a separately authorized, not-yet-scheduled follow-up that does not
block Slice 8.

### Local proof run record

| Field | Value |
|---|---|
| Commands | see "Commands" above |
| Result | Pass |
| Date (UTC) | 2026-08-07 |
| Base SHA | `0af8dcf99cd452473d3aa37b6495d5bca6f4e78f` |
| Notes | Vitest 829/1 skip (130 files); pgTAP 1136/1136 across 30 files; migrations 13; types no drift; pilot-funnel proof pass — `REPEATABLE READ READ ONLY` transaction, transaction-stable `measuredAt`, all-zero on fresh reset; employer E2E 15/15; public-jobs 1/1; Slice 2 1/1; Slice 3 3/3; candidate-integration 9/9; employer-applications 5/5; candidate-applications 4/4; admin-moderation 4/4; no hosted commands run |

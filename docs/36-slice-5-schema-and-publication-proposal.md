# Slice 5 Schema and Publication Proposal

> Contract for Slice 5. **Status:** Locked with Accepted D-055–D-067 (2026-08-05).
> PR 5.2 implemented this database contract (merged, PR #49; migration
> `20260805110000_verification_and_vacancy_publication.sql`).

**Baseline schema:** eight migrations through
`20260805110000_verification_and_vacancy_publication.sql`. Types:
`src/types/database.ts`.

**Authoritative decisions:** D-055–D-067 in `docs/10-decisions.md` (**Accepted**).

## PR 5.3 database-contract audit (operator read access)

During PR 5.3 implementation, the following was confirmed against the merged
PR 5.2 migration:

- `verification_operators` has `revoke all ... from public, anon, authenticated`
  and `grant all ... to service_role` only — no authenticated SELECT policy.
- `_is_active_verification_operator(uuid)` is `revoke all ... from public, anon,
  authenticated` — callable only by other `SECURITY DEFINER` functions
  internally, not directly by an authenticated Server Action.
- `approve_employer_verification`, `reject_employer_verification`, and
  `revoke_employer_verification` all correctly gate on operator membership
  internally and are `grant execute ... to authenticated` — these three RPCs
  are safe to invoke from an authenticated Server Action once a caller already
  knows (or is willing to attempt and receive a `forbidden` result for) an
  employer profile id.
- There is **no RPC to let a caller check their own operator status**, and
  **no RPC to list pending verification requests** for active operators.
- `employer_profiles` RLS remains owner-only SELECT — no operator-scoped read
  policy exists for listing other employers' profiles.

**Consequence:** an operator review route (`/internal/verification`) cannot be
safely gated (no way to distinguish "operator" from "non-operator" without
either calling `approve`/`reject` blind, which would create real side effects
just to probe membership) and cannot safely render a pending list (no read
path). Building it would require either a service-role client in the
application (forbidden by D-066) or broadening RLS/grants (a schema change,
which PR 5.3 was instructed to avoid absent an explicit blocker report).

**PR 5.3a — implemented** (migration
`20260805170000_operator_verification_read_contract.sql`, one file, additive
only — no existing table, policy, or grant changed):

1. `is_current_user_verification_operator() returns boolean` — `language
   sql`, `SECURITY DEFINER`, `stable`, fixed `search_path`, no parameters,
   derives identity from `auth.uid()` via the existing
   `_is_active_verification_operator(uuid)` helper. `anon` has no EXECUTE
   grant, so a genuine anonymous call is denied by privilege
   (`permission denied`, SQLSTATE `42501`) before the function body runs.
   For an authenticated caller, `false` covers no session identity,
   non-operator, and inactive operator; `true` only for the caller's own
   active allow-listed operator membership.
2. `list_pending_employer_verifications() returns table (employer_profile_id,
   employer_type, display_name, company_name, website, onboarding_completed,
   verification_state, verification_requested_at, verification_attested_at,
   verification_attestation_version)` — `language sql`, `SECURITY DEFINER`,
   `stable`. The operator gate is a `WHERE ... AND
   _is_active_verification_operator(auth.uid())` predicate, so non-operators
   get a deterministic empty result (no exception, no partial row). Ordered
   `verification_requested_at ASC, employer_profile_id ASC`. `company_name`
   comes from the employer's owned `companies.name` (organisation only, via
   `owner_employer_id`) and is `null` for private employers. No reviewer
   identity, auth metadata, address, candidate, or application data.
3. `get_employer_verification_review(p_employer_profile_id uuid) returns
   table (employer_profile_id, employer_type, display_name, company_name,
   website, berlin_locality, onboarding_completed, verification_state,
   verification_requested_at, verification_attested_at,
   verification_attestation_version, verification_reviewed_at,
   verification_review_reason)` — same shape as above, plus review
   timestamps/reason, still excluding `verification_reviewed_by`. Eligible
   states: `pending`, `verified`, `rejected` (not `unverified`/`revoked`).
   Non-operators, non-eligible states, and unknown ids all return zero rows.

All three are `revoke all ... from public, anon; grant execute ... to
authenticated`, and `anon`'s lack of EXECUTE is proven at the API layer (not
just by ACL inspection) via `throws_ok(..., '42501', ...)` invocation tests
for each RPC. `verification_operators` still has no authenticated SELECT
policy; `employer_profiles` still has exactly its original 3 owner-only
policies (select/insert/update) — confirmed by pgTAP file `25`. pgTAP:
`supabase/tests/database/25_operator_verification_read_contract_test.sql`
(47 assertions; full local suite is 672 assertions across 26 files). PR 5.3b
must call `is_current_user_verification_operator()` first and deny the
internal route on `false` — an empty pending list alone must never be treated
as proof of operator authorization.

**PR 5.3b — implemented** (no schema change; application-layer only).
`/internal/verification` and `/internal/verification/[employerProfileId]`
call the three PR 5.3a RPCs through a shared `requireActiveOperator` gate,
and `approve_employer_verification` / `reject_employer_verification`
(PR 5.2) remain the authoritative mutation path — the gate and read RPCs are
defense in depth, not a substitute for the mutation RPCs' own operator and
state rechecks under row lock. `/internal/*` was added to the proxy's
protected-path set (`isInternalPath` in `src/lib/auth/paths.ts`) alongside
`/candidate/*` and `/employer/*`, so unauthenticated requests get the same
session-refresh and encoded-redirect treatment. No new migration, RLS
policy, or grant. No revocation UI.

**PR 5.4 — implemented** (no schema change; application-layer only). Employer
manage-page and Server Actions for the seven PR 5.2 lifecycle RPCs
(`publish_employer_vacancy`, `pause_employer_vacancy`,
`resume_employer_vacancy`, `fill_employer_vacancy`,
`withdraw_employer_vacancy`, `materialize_employer_vacancy_expiry`,
`renew_employer_vacancy_to_draft`). Each RPC remains the sole authority for
its own transition — the new Server Actions add only Zod input validation,
explicit server-validated confirmation, and result-status mapping, never a
client-side readiness/eligibility recomputation. Confirmed the pre-PR-5.2
`employer_vacancy_draft_readiness` RPC (PR 4.3) is stale relative to the
PR 5.2 publish gate (`_employer_vacancy_publish_missing`): it does not check
`verification_state`, `workplace_type`, `work_frequency`, `cv_required`,
`interview_english_ok`, or `expires_at`. Rather than adding a migration to
fix it, the draft-stage readiness panel keeps using it unchanged (structural
completeness only, as before) and the manage page separately surfaces the
employer's live `verification_state`; the authoritative missing-field list
for publish/resume is the `incomplete`/`missing` result actually returned by
`publish_employer_vacancy`/`resume_employer_vacancy` themselves, rendered
through the same label map. No new migration, RLS policy, or grant. No
expiry input exposed to the caller.

**PR 5.5 database-contract audit (public/candidate read access).** Before
writing any `/jobs` route or matching-loader change, the database contract
was audited and found insufficient: `is_vacancy_effectively_public` and
`visible_public_vacancy_ids` (PR 5.2) prove eligibility but project no
fields; `anon` has zero table-level `SELECT` grant on `vacancies` or
`vacancy_language_requirements` (revoked in the original PR 2.1 migration,
never re-granted); no `authenticated` RLS policy covers another employer's
effective-public row. `supabase/tests/database/23_effective_public_and_application_test.sql`
already locks this in via `throws_ok($$ select * from public.vacancies $$,
'42501', ..., 'anon still cannot select vacancies table')`. Split into
PR 5.5a (this narrow read-contract migration) and PR 5.5b (UI).

**PR 5.5a — implemented** (migration
`20260805200000_effective_public_vacancy_read_contract.sql`, additive
only, no table grant or RLS change):

1. `list_effective_public_vacancies() returns table (vacancy_id, title,
   description, job_category, public_locality, workplace_type,
   work_frequency, cv_required, interview_english_ok, source,
   employer_type, employer_display_name, company_name, website,
   published_at, expires_at)` — **no arguments** (confirmed against
   `pg_proc` directly, not just migration text: exactly one overload
   exists, `pronargs = 0`; calling with any argument, including a
   timestamp, fails with `42883 undefined_function`). Ordered
   `published_at DESC, vacancy_id ASC`. An earlier draft of this RPC
   accepted an optional `p_at timestamptz default now()` — removed before
   merge: exposing a caller-controlled visibility instant could let a
   caller ask "was this public at some other time," which can disagree
   with "is this public right now" (e.g. a row still stored `published`
   after its expiry elapsed but before materialization). All three RPCs
   now evaluate exclusively against `now()`, which is stable for the
   lifetime of one transaction.
2. `get_effective_public_vacancy(p_vacancy_id uuid)` — same projection,
   at most one row, gated on `is_vacancy_effectively_public(v.id, now())`.
   Every non-eligible case (unknown id, draft, paused, filled, expired,
   withdrawn, elapsed-but-not-materialized, unverified/rejected/revoked
   employer) returns zero rows — structurally indistinguishable, never an
   error, never a different shape. No visibility-time argument either.
3. `get_effective_public_vacancy_languages(p_vacancy_id uuid) returns table
   (language_code, min_proficiency)` — a separate RPC rather than an
   embedded composite array, since Supabase's type generation for
   composite arrays inside a `RETURNS TABLE` column is not reliably
   precise; ordered by `language_code ASC`; also gated on `now()`, zero
   rows for any vacancy that is not currently effective-public (including
   the elapsed-but-unmaterialized case).

**Projection corrections from the first draft:** `city` was removed — it is
constrained to the literal value `'Berlin'` for every row
(`vacancies_city_berlin_chk`), so it carries no information beyond what the
product's whole Berlin-only scope (D-004) already establishes; only
`public_locality` (the actual district-level field) is returned, matching
D-061's approved public location contract exactly. `source` was reviewed
and **kept**: it is not incidental internal provenance — D-031 requires
seed/demo vacancies to be visibly labelled "Demo vacancy" to candidates,
and `source` is the only field that lets PR 5.5b's UI make that call.

All three are `SECURITY DEFINER`, `stable`, fixed `search_path`, `revoke all
... from public; grant execute ... to anon, authenticated`. Confirmed
directly against `pg_proc` (not just migration text): `anon_exec=true`,
`authenticated_exec=true`, `service_role_exec=false` for all three — no
`service_role` grant, unlike the PR 5.2 helpers these RPCs sit on top of,
since nothing internal calls them. `employer_display_name`/`company_name`
use `coalesce(c.name, ep.display_name)` / bare `c.name` via a `LEFT JOIN`,
which is provably equivalent to `submit_candidate_application`'s existing
accepted seed/employer branching (for seed rows `ep` is null through the
join, so the `coalesce` reduces to `c.name` exactly as that RPC's seed
branch already does) — no new business logic invented.

**Runtime nullability** (the generated TypeScript types mark every field
non-null — a known `RETURNS TABLE` codegen limitation, same caveat as
PR 5.3a; these are the actual runtime semantics, pgTAP-verified against the
local seed fixture, which intentionally omits several columns):
`vacancy_id`, `title`, `job_category`, `source`, `published_at`,
`expires_at` are never null. `public_locality`, `workplace_type`,
`work_frequency`, `cv_required`, `interview_english_ok`, `description` are
`NOT NULL` for every `source='employer'` row (the publish-readiness gate
enforces this before a row can become effective-public) but **null for
`source='seed'` rows** (the local/CI demo seed does not populate them —
pgTAP asserts this directly). `employer_type` and `website` are null for
seed rows (no real `employer_profiles` row exists). `company_name` is null
whenever the vacancy has no `company_id` (private-employer rows).
`employer_display_name` is not expected null for any row these RPCs can
return, but is not enforced by a single constraint spanning the join, so
PR 5.5b's Zod schema should still treat it as nullable defensively. PR 5.5b
must build its Zod schemas from this list, not from the generated types'
non-null claims.

pgTAP: `supabase/tests/database/26_effective_public_vacancy_read_contract_test.sql`
(72 assertions — corrected from an earlier 58-assertion draft after adding
zero-argument/no-overload proof, the elapsed-expiry case re-proven through
all three public RPCs, and explicit nullability assertions; full local
suite is **744 assertions across 27 files**, up from the PR 5.4 baseline of
672/26). Next unit: PR 5.5b — `/jobs` public routes and candidate matching
integration, built on this contract.

---

## PR 5.2 schema contract (concepts only — no SQL in this PR)

PR 5.2 must implement the following concepts. Exact SQL is authored there and
must not contradict Accepted decisions.

### Verification

| Concept | Contract |
|---------|----------|
| Expanded `employer_profiles.verification_state` | `unverified \| pending \| verified \| rejected \| revoked` |
| Operator allow-list | Database table keyed to authenticated user identity (e.g. `platform_operators`) |
| Attestation | Structured request attestation fields (boolean + timestamp); no Storage |
| Timestamps | `requested_at`, `reviewed_at`, `updated_at` |
| Reviewer | `reviewed_by` = operator `auth.users.id` (never caller-supplied) |
| Reason | Rejection/revocation reason where applicable |
| Employer request RPC | `unverified\|rejected → pending` when onboarding complete |
| Operator RPCs | approve (`pending → verified`), reject (`pending → rejected`), revoke (`verified → revoked`) |
| Forbidden | Direct `unverified→verified`, `rejected→verified`; generic status setter; browser service-role |

### Vacancy lifecycle

| Concept | Contract |
|---------|----------|
| Expanded `publication_state` | `draft \| published \| paused \| filled \| expired \| withdrawn` |
| Lifecycle timestamps | `published_at`, `paused_at`, `filled_at`, `withdrawn_at`, `expires_at`, `updated_at` (+ `expired_at` if needed) |
| Mandatory expiry at publish | Default 30 days; max 90 days; must be `> transaction time` |
| Canonical effective-public helper | Single DB/helper contract used by public, candidate, and apply paths |
| Explicit RPCs | publish; pause; resume; fill; withdraw; renew (`expired → draft`); materialize-expiry |
| Verification-revocation cascade | Atomic: revoke + pause all currently `published` owned vacancies |
| Application eligibility | Submit rechecks effective visibility + `expires_at > now()` in transaction |
| Pause/resume audit | PR 5.2 must decide if a narrow immutable vacancy lifecycle event table is required when repeated pause/resume cannot be represented by a single `paused_at` (D-065) |
| Forbidden | Generic unrestricted lifecycle status setter |

### Public access

| Audience | Access |
|----------|--------|
| Anonymous | Effectively public vacancies only (`/jobs`, `/jobs/[vacancyId]`) |
| Candidate (completed) | Same effective-public rule for match/detail/apply |
| Owner employer | All owned states |
| Unrelated employer | No private/non-public records |
| Seed | Existing seed visibility rules continue |

Effectively public employer vacancy: `source=employer` AND `publication_state=published` AND `expires_at > now()` AND owner complete AND `verification_state=verified` AND org company ownership valid when applicable.

### Seed compatibility

- Seed published vacancies continue to work under existing rules
- Employer verification requirements do not invalidate ownerless seed companies
- Existing candidate matching and application behaviour remains valid
- Existing employer drafts remain valid

### Deletion compatibility

- Existing eligible draft deletion remains available
- Published or historically published vacancies cannot use the draft-delete path
- Filled, withdrawn, expired, paused, and published records are retained

### Edit rules

`update_employer_vacancy_draft` and `replace_employer_vacancy_languages` remain allowed for `publication_state` in (`draft`, `paused`); other lifecycle states are not editable via those RPCs.

### Terminal / renewal rules

| Rule | Contract |
|------|----------|
| Terminal | `filled`, `withdrawn` — no return to published/draft in Slice 5 |
| Expired | Not republished directly; `expired → draft` renewal, then readiness + publish with new expiry |
| Effective expiry safety | `expires_at > transaction time` is authoritative even before materialization |

---

## 1. Current state (exact)

### `employer_profiles`

| Column | Notes |
|--------|-------|
| `id` | PK → `auth.users` |
| `employer_type` | `private` \| `organisation` |
| `display_name`, `berlin_locality`, `phone`, `website` | Profile fields |
| `organisation_legal_name` | Org only |
| `lawful_hiring_declared` / `_at` | Completion gate |
| `verification_state` | CHECK = `'unverified'` only; trigger forces unverified |
| `onboarding_completed_at` | Independent of verification |

RLS: owner select/insert/update. No delete for authenticated.

### `companies`

Seed (`owner_employer_id` null) or employer-owned org company. Owner update name only.

### `vacancies`

| Concern | Current |
|---------|---------|
| `publication_state` | `draft` \| `published` \| `withdrawn` |
| `source` | `seed` \| `employer` |
| Employer rows | Forced `draft` (`vacancies_employer_draft_only_chk`) |
| Draft timestamps | `published_at` / `expires_at` null |
| Published CHECKs | `published_at` and `expires_at` required when published |
| Location | `city='Berlin'`; `public_locality` optional |
| Mutations | SECURITY DEFINER draft RPCs only |

### RPCs (employer vacancy)

`create_employer_vacancy_draft`, `update_employer_vacancy_draft`,
`replace_employer_vacancy_languages`, `delete_employer_vacancy_draft`,
`employer_vacancy_draft_readiness` — **no publish**.

### Candidate visibility / apply

- `visible_seed_vacancy_ids()` — seed + published + time window
- Matcher TypeScript; loader uses seed visibility
- `submit_candidate_application` — seed eligibility rules
- Applications: candidate SELECT own; no employer read

---

## 2. Accepted verification model (summary)

See D-056 / D-057. States and transitions as Accepted. Evidence = profile +
attestation only. Operator allow-list enforced in database.

---

## 3. Accepted publication states and transitions

See D-058. Explicit RPCs only. Terminal: filled, withdrawn. Renewal:
`expired → draft` then publish.

### Transition matrix (Accepted)

| From → To | Actor | Verified? | Ready? | Public / match | New apply | Reversible? |
|-----------|-------|-----------|--------|----------------|-----------|-------------|
| draft → published | Owner | Yes | Yes (tx) | Yes if effective | Yes if effective | Via later transitions |
| published → paused | Owner | — | — | No | No | Resume |
| paused → published | Owner | Yes | Yes (tx) | Yes if effective | Yes if effective | — |
| published → filled | Owner | — | — | No | No | No |
| paused → filled | Owner | — | — | No | No | No |
| published → withdrawn | Owner | — | — | No | No | No |
| paused → withdrawn | Owner | — | — | No | No | No |
| published → expired | System/lazy | — | — | No | No | Via renew to draft |
| paused → expired | System/lazy | — | — | No | No | Via renew to draft |
| expired → draft | Owner | — | — | No | No | Then publish path |

Verification-loss: operator `verified → revoked` also forces owned
`published → paused` atomically (D-064).

---

## 4. Publication readiness (Accepted)

Transactional inside publish RPC per D-059. Stale UI readiness cannot authorize
publish. Default expiry 30 days; max 90 days.

---

## 5. Visibility and routes (Accepted)

Canonical effective-public helper shared by `/jobs`, `/jobs/[vacancyId]`,
`/candidate/matches`, `/candidate/jobs/[vacancyId]`, and apply RPC (D-060).

---

## 6. Matching and application integration (Accepted)

Loader expansion into existing deterministic matcher (D-062). Algorithm
unchanged unless a separately reviewed decision is required. Snapshots survive
lifecycle and verification-loss. No employer applicant access in Slice 5.

---

## 7. Verification-loss behaviour (Accepted)

Atomic revoke + pause published owned vacancies; effective visibility excludes
non-verified owners; completion invalidation also ineffective via helper
(D-064).

---

## 8. Expiry model (Accepted)

Authoritative: `expires_at > transaction time`. Materialization optional for UX
ops; never required for safety (D-063).

---

## 9. Concurrency / idempotency (Accepted)

Per D-066: lock vacancy + employer on publish; lock employer + affected
vacancies on revoke; apply rechecks in transaction; deterministic duplicate
errors.

---

## 10. Audit model (Accepted interim)

Source-row evidence per D-065. PR 5.2 uses the narrow append-only
`vacancy_lifecycle_events` table because repeated pause/resume history cannot be
represented by one timestamp. No general `audit_events` platform in Slice 5.

---

## 11. Notifications

Deferred (Slice 7 completeness). Core journey works without email.

---

## 12. RPC boundary (Accepted)

Per D-066. No service-role in browser or public env vars.

---

## 13. Migration risk and compatibility

| Risk | Mitigation |
|------|------------|
| Breaking seed visibility | Keep seed helper semantics; additive employer branch |
| Employer draft chk removal | Replace with RPC-only publish |
| Verification trigger removal | Replace with constrained transition RPCs |
| Type generation drift | `db:types:check` in PR 5.2 |
| In-flight Demo fixtures | Retain until existing expiry policy |

Backwards compatible for: candidate onboarding, seed matches/apply, employer
draft CRUD, dual capability.

---

## 14. Tests required before Slice 5 Done

pgTAP for verification, lifecycle, effective visibility, verification-loss,
apply eligibility, draft privacy; Vitest/Playwright for UI journeys; hosted
proof per D-067.

---

## 15. Explicit non-goals

Applicant list/detail; application status; interviews; messaging; moderation
dashboard; suspension UI; Storage uploads; exact address; GDPR export/deletion;
opaque ranking; Slice 6/7/8 features.

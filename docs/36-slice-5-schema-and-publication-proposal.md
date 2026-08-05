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
as proof of operator authorization. Next unit: PR 5.3b — minimal operator
list/detail and approve/reject UI, built on these three RPCs.

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

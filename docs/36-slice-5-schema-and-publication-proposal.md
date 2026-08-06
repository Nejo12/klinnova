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
672/26). Next unit: PR 5.5b — `/jobs` public routes, built on this contract.

**PR 5.5b database-contract audit (candidate matching).** Before writing any
candidate-facing code, the existing candidate-matching read path was
audited and found insufficient for effectively public *employer* vacancies.
`resolveCandidateVacancyMatch()` (`src/lib/matching/resolve-candidate-vacancy-match.ts`)
— shared by `/candidate/matches`, `/candidate/jobs/[vacancyId]`, and the
apply Server Action (`submitCandidateApplicationAction`) — does a direct
`supabase.from("vacancies").select(...)` requesting `employment_types`,
`shift_requirements`, `german_requirement`, `available_from`. The
deterministic matcher (`matchCandidateToVacancy` in
`src/lib/matching/match-candidate-to-vacancy.ts`) is a hard filter over
exactly those fields (plus `languageRequirements`, already available via
`get_effective_public_vacancy_languages`) — location, category, employment
type, shift, German requirement, additional languages, and availability
must all pass or the candidate never sees the vacancy as a match.

Grepping every `create policy` for `vacancies` across all 10 migrations
finds exactly three authenticated SELECT policies:
`vacancies_select_completed_seed_active` (seed only),
`vacancies_select_own_employer_draft`, and `vacancies_select_own_employer`
(both owner-only). None let a candidate read another employer's row.
Grepping every `create or replace function public.` across all 10
migrations finds no RPC that projects `employment_types`,
`shift_requirements`, `german_requirement`, or `available_from` for
effective-public employer vacancies to `authenticated` — PR 5.5a's
projection deliberately excludes them (D-060/D-061 scoped the public
projection to display fields only).

`submit_candidate_application` (unchanged by PR 5.5b) does not independently
enforce the deterministic matcher either — inspecting its body shows it
checks candidate completion, `is_vacancy_effectively_public`, the
candidate's job-category preference, and application uniqueness, but never
employment type, shift, German requirement, language proficiency, or
availability fit. The existing Server Action's TypeScript matcher pre-check
(D-041) is the only thing enforcing full eligibility today; skipping it for
employer vacancies would silently drop that guarantee while the seed path
keeps enforcing it — an inconsistency, not a simplification.

This is exactly the "schema incompatibility requiring a separately reviewed
decision" D-062 anticipated. Per instruction, PR 5.5b does not add a
migration, broaden RLS, use a service-role client, or invent ad hoc
candidate eligibility in application code to close this gap — it reports
the gap and leaves `/candidate/matches`, `/candidate/jobs/[vacancyId]`,
`resolveCandidateVacancyMatch`, `matchCandidateToVacancy`, and the
application Server Action untouched. **PR 5.5c** (Done, merged) owns
designing and migrating the missing contract; **PR 5.5d** (in progress)
owns the resulting candidate-facing UI/application integration.

**PR 5.5c — implemented** (migration
`20260806000000_candidate_eligibility_contract.sql`, additive only — no
table change, no RLS policy change; D-068):

1. `_evaluate_candidate_vacancy_eligibility(p_candidate_id uuid, p_vacancy_id
   uuid, p_at timestamptz) returns table (eligible boolean,
   missing_requirements text[])` — internal only (`revoke all ... from
   public, anon, authenticated`; callable only from within other
   `SECURITY DEFINER` functions via the owner's implicit EXECUTE right, the
   same pattern already established by `_is_active_verification_operator`).
   `language plpgsql`, `stable`, fixed `search_path`. Ports every
   TypeScript matcher rule rule-for-rule, audited against
   `src/lib/matching/{rules,ranks,match-candidate-to-vacancy}.ts` before
   implementation: category (`vacancy.job_category = any(candidate.job_categories)`);
   employment type (non-empty array intersection); shift (candidate
   `'flexible'` short-circuits true, else non-empty concrete-array
   intersection); German (`_german_comfort_rank(candidate) >=
   _german_comfort_rank(vacancy)`, ranks 0–3 matching
   `src/lib/matching/ranks.ts` exactly); other languages (every
   `vacancy_language_requirements` row must be met by a
   `candidate_languages` row of the same code at
   `_language_proficiency_rank(candidate) >= _language_proficiency_rank(required)`,
   ranks 0–3; zero requirement rows always satisfied); availability
   (`vacancy.available_from is null` always satisfied — flexible — else
   `candidate.available_from <= vacancy.available_from`). `city`/location is
   deliberately not a rule: `candidate_profiles_city_berlin_chk` and
   `vacancies_city_berlin_chk` already force both sides to literal `'Berlin'`
   whenever set, and candidate completion requires `city` to be set, so the
   rule can never fail in practice (D-030). Unlike the TypeScript matcher
   (which short-circuits on the first failing rule), the evaluator checks
   every rule independently so callers can report every unmet requirement —
   an explicit PR 5.5c requirement, not a behavioural drift, since the
   eligibility *conclusion* (eligible iff every rule passes) is identical.
2. `resolve_current_candidate_vacancy_match(p_vacancy_id uuid) returns table
   (status text, eligible boolean, missing_requirements text[])` —
   authenticated-only (`revoke all ... from public, anon; grant execute ...
   to authenticated`). Identity from `auth.uid()` only. Mirrors the
   existing `resolveCandidateVacancyMatch` status split
   (`unavailable | incomplete | eligible | ineligible`) that
   `/candidate/jobs/[vacancyId]`'s redirect targets already depend on, so
   collapsing it to a single shape would have been a PR 5.5d regression,
   not a simplification. Vacancy unavailability (unknown id, not
   effective-public — draft/paused/filled/expired/withdrawn/elapsed-expiry/
   unverified/rejected/revoked employer, all proven via the same
   `is_vacancy_effectively_public` gate PR 5.5a uses) and candidate
   incompleteness are structurally indistinguishable from each other in
   shape (both return one row with a status column), preserving the "no
   existence oracle" property. Does not return public vacancy fields — PR
   5.5d composes this with the PR 5.5a `get_effective_public_vacancy*` RPCs
   rather than duplicating that projection.
3. `list_current_candidate_vacancy_matches() returns table (vacancy_id uuid,
   title text, description text, job_category text, public_locality text,
   workplace_type text, work_frequency text, cv_required boolean,
   interview_english_ok boolean, source text, employer_type text,
   employer_display_name text, company_name text, website text,
   published_at timestamptz, expires_at timestamptz, eligible boolean,
   missing_requirements text[])` — authenticated-only, no arguments,
   identity from `auth.uid()` only. Reuses the PR 5.5a public projection
   field set exactly (no new anon-visible fields — this RPC itself is never
   anon-executable) plus two candidate-specific columns. Returns
   **eligible rows only**, matching `/candidate/matches`'s existing hard
   filter (`matchCandidateToVacancies` never returns a non-match) rather
   than "all effective-public with match status" — confirmed by reading the
   existing loader/UI, not assumed. Ordered `published_at desc,
   vacancy_id asc`, identical to PR 5.5a. Incomplete/missing/unauthenticated
   candidates simply see zero rows (list semantics tolerate an empty result
   without a typed distinction, unlike the detail RPC).
4. `submit_candidate_application(p_vacancy_id uuid) returns jsonb` —
   signature unchanged. The pre-existing narrow category-only check
   ("Narrow category membership only — not a full matcher; miss →
   unavailable", the pgTAP comment this PR updates) is replaced by a call
   to the same canonical evaluator, positioned after the `already_applied`
   duplicate check (so a stale/retried submission for an existing
   application stays idempotent per D-040, never newly rejected as
   ineligible) and before snapshot construction. An ineligible result
   returns `{"result":"ineligible","missing_requirements":[...]}` — purely
   additive to the existing JSONB shape. PR 5.5b's
   `submitApplicationRpcResultSchema` (a `z.discriminatedUnion`) does not
   know this discriminant yet; `safeParse` fails validation safely into the
   action's existing generic `{status:"failure"}` path — not a crash, not
   silent success, just a less-specific error until PR 5.5d updates the
   parser and the Server Action's exhaustive switch. This was evaluated
   against "do not modify UI unless compilation requires it" (per the PR
   5.5c brief): TypeScript compilation does not require the change (the
   existing schema/switch still compile and fail safely at runtime), so it
   is deferred rather than made here.

**Regression note:** one pre-existing pgTAP fixture and one pre-existing
assertion needed updating as a direct, intentional consequence of closing
the eligibility gap, not a weakening:
`13_applications_submit_rpc_test.sql`'s "Complete Candidate" fixture
previously satisfied only the category-only check for seed vacancy
`222222222206` (food_production/full_time/night/basic German); its
`employment_types`/`shift_preferences` arrays were extended
(`mini_job,part_time` → `+full_time`; `daytime,morning` → `+night`) so the
same candidate is now genuinely eligible on every rule, and the one
assertion expecting the old category-only-miss behaviour
(`'unavailable'` for a genuine category mismatch on vacancy `222202`) was
updated to expect `'ineligible'` with an inline comment explaining why. No
assertion was deleted or had its expected value loosened to hide a
regression — every other assertion in the file, and the entire rest of the
744-assertion PR 5.5a/5.5b baseline plus the 79 new PR 5.5c assertions,
passes unchanged. Full suite: **823 assertions across 28 files**, up from
the PR 5.5b baseline of 744/27.

pgTAP: `supabase/tests/database/27_candidate_eligibility_contract_test.sql`
(79 assertions). PR 5.5d (in progress) integrates `/candidate/matches` and
`/candidate/jobs/[vacancyId]` onto this contract (D-069) with no migration
and no change to this file's RPCs — pgTAP stays unchanged from PR 5.5c.

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

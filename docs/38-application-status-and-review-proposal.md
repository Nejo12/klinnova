# Application Status and Employer Review — Schema and Contract Proposal

> Database contract for Slice 6 PR 6.1. **Status:** **D-070 Accepted**
> 2026-08-06 — see `docs/10-decisions.md`. Implemented in migration
> `20260806140000_application_status_and_review_contract.sql` (12th) and
> proven by `supabase/tests/database/28_application_status_and_review_contract_test.sql`
> (87 assertions, all passing locally). PR 6.1 itself is in progress; do not
> mark Done before merge. Baseline schema before this migration: 11
> migrations through `20260806000000_candidate_eligibility_contract.sql`.
> Baseline decisions: D-001–D-070 in `docs/10-decisions.md` (all Accepted).

**Companion document:** `docs/37-slice-6-build-plan.md` (PR decomposition,
route/component architecture, test strategy, rollout plan).

---

## 1. Current-state audit — `applications` schema (exact, unchanged since PR 3.1)

```sql
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (id) on delete cascade,
  vacancy_id uuid not null references public.vacancies (id) on delete restrict,
  status text not null,
  submitted_at timestamptz not null default now(),
  snapshot_version integer not null,
  candidate_snapshot jsonb not null,
  vacancy_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_chk check (status = 'submitted'),
  constraint applications_snapshot_version_chk check (snapshot_version = 1),
  constraint applications_candidate_snapshot_object_chk check (jsonb_typeof(candidate_snapshot) = 'object'),
  constraint applications_vacancy_snapshot_object_chk check (jsonb_typeof(vacancy_snapshot) = 'object'),
  constraint applications_candidate_vacancy_key unique (candidate_id, vacancy_id)
);
create index applications_vacancy_id_idx on public.applications (vacancy_id);
```

- No trigger exists on this table today.
- `candidate_id` → `ON DELETE CASCADE` (deleting a candidate deletes their applications). `vacancy_id` → `ON DELETE RESTRICT` (vacancies are soft-withdrawn, never hard-deleted once an application references them).
- **`status` is CHECK-pinned to the single literal `'submitted'`.** No other value is possible in the database today — proven live by pgTAP `throws_ok` for `status='viewed'` (`23514`). Slice 6 is the first work that needs this constraint widened.
- **`snapshot_version` is CHECK-pinned to `1`.** A snapshot *shape* change is a separate, later, versioned decision — Slice 6 does not touch snapshot shape (see §2) and therefore does not need to bump this.
- `updated_at` exists but nothing writes to it today (no `UPDATE` grant to `authenticated`, no trigger). Slice 6 can repurpose it as "status last changed at" for free — no new column needed for that.
- Grants (verbatim): `revoke all on table public.applications from public, anon, authenticated; grant select on table public.applications to authenticated; grant all on table public.applications to service_role;`
- RLS (verbatim, the only policy that exists today):
  ```sql
  create policy applications_select_own on public.applications
    for select to authenticated
    using (candidate_id = (select auth.uid()));
  ```
  **No employer-facing SELECT policy exists.** D-042: *"No employer/admin read policies in Slice 3."* D-062: *"Slice 5 does not give employers access to applicant records."* Slice 6 is the first slice to grant employers any read of `applications`.
- `authenticated` has SELECT only — no INSERT/UPDATE/DELETE, proven by pgTAP even for the row's own owner. All mutation is RPC-only (`submit_candidate_application`), matching D-042/D-066.
- Application rows survive vacancy withdrawal/expiry/pause and candidate profile edits — proven end-to-end by `e2e/slice3-critical-journey.spec.ts`'s snapshot-stability test, because the confirmation view renders exclusively from the immutable snapshot, never a live join.

### pgTAP coverage inventory (files touching `applications`)

| File | Plan | Covers |
|---|---|---|
| `00_schema_structure_test.sql` | 40 (whole-schema) | table/PK/RLS-enabled/FK existence |
| `11_applications_schema_test.sql` | 26 | columns, all 4 CHECKs, index, unique constraint, RPC existence |
| `12_applications_privileges_and_rls_test.sql` | 21 | grants, candidate-owner isolation, direct write denial (incl. owner) |
| `13_applications_submit_rpc_test.sql` | 48 | full submit RPC behavior, race path, isolation |
| `18_employer_draft_rpc_test.sql` | 58 (whole-file) | applications block draft deletion |
| `23_effective_public_and_application_test.sql` | 12 | employer-source submission, paused-vacancy resubmission |
| `27_candidate_eligibility_contract_test.sql` | 80 | canonical evaluator + `ineligible` transactional path |

### Callers today (all read-only over the candidate's own row via RLS, or via `submit_candidate_application`)

`src/lib/applications/load-candidate-application-confirmation.ts` (selects `id, status, submitted_at, snapshot_version, candidate_snapshot, vacancy_snapshot`, RLS-scoped, no explicit `candidate_id` filter), `src/lib/applications/owned-application.ts` (narrow `{id, vacancy_id, status, submitted_at}` shape, reused by the Slice 5 matches/detail Applied badges), `src/lib/matching/load-current-candidate-matches-page.ts` and `src/lib/matching/resolve-current-candidate-vacancy-detail.ts` (both from PR 5.5d, same pattern), and `src/app/candidate/jobs/[vacancyId]/actions.ts` (the submit Server Action, RPC-only).

### Known pre-existing issue (not a Slice 6 deliverable, flagged for the build plan)

`vacancySnapshotV1Schema` (`src/lib/applications/snapshot-schemas.ts`) has `source: z.literal("seed")` and `demo_label: z.literal("Demo vacancy")`, but the live `submit_candidate_application` body sets `source: vacancy.source` (`'seed'|'employer'`) and `demo_label: null` for employer-source vacancies. This means a candidate who applies to a real employer vacancy today gets an "Application not available" confirmation page (Zod validation fails, loader returns `unavailable`) — a pre-existing, unfixed bug in the same data model Slice 6 builds on. No E2E test currently exercises an employer-vacancy confirmation page, so it has not been caught. **Recommendation: fix as a small, separate PR before or alongside Slice 6.1**, since Slice 6's employer detail view will read the same `vacancy_snapshot`, and a broken candidate-side schema is an unrelated but adjacent correctness gap worth closing while this code is already under review. Not included in the Slice 6 migration or RPC contract itself.

## 2. Candidate snapshot analysis (exact fields, from the live `submit_candidate_application` body)

**`candidate_snapshot` (v1):** `display_name`, `job_category` (the vacancy's matched category, not the candidate's full preference list), `german_comfort`, `languages` (`[{language_code, proficiency}]`, filtered to only vacancy-required languages), `work_authorisation_declared`, `available_from` (`YYYY-MM-DD` or `null`), `employment_types` (sorted array), `shift_preferences` (sorted array).

**`vacancy_snapshot` (v1):** `vacancy_id`, `title`, `employer_display_name`, `source`, `demo_label`, `city`, `job_category`, `employment_types`, `shift_requirements`, `german_requirement`, `language_requirements`, `available_from`.

Neither snapshot contains: candidate auth ID, email, phone, exact address, CV/document data, or internal eligibility/matching-reason data — by design, per D-038: *"Future employer review needs stable evidence without copying unnecessary PII."* This snapshot was purpose-built for exactly what Slice 6 now needs.

## 3. Employer-safe applicant projection

Field-by-field classification of everything an employer could plausibly see:

| Field | Classification | Source | Notes |
|---|---|---|---|
| `display_name` | Safe | `candidate_snapshot` | Already candidate-disclosed at submit time (D-038 submit disclosure) |
| `job_category` (matched) | Safe | `candidate_snapshot` | Already vacancy-scoped, not the candidate's full preference list |
| `german_comfort` | Safe | `candidate_snapshot` | Matches D-043's original preview field list |
| `languages` (relevant) | Safe | `candidate_snapshot` | Vacancy-scoped subset only |
| `work_authorisation_declared` | Safe | `candidate_snapshot` | Declaration only, not verified documents (D-023 precedent) |
| `available_from` | Safe | `candidate_snapshot` | |
| `employment_types` | Safe | `candidate_snapshot` | |
| `shift_preferences` | Safe | `candidate_snapshot` | |
| `application status` | Safe | `applications.status` | Employer-authored |
| `submitted_at` | Safe | `applications.submitted_at` | |
| `status history` (to_status, occurred_at, reason) | Safe (employer-authored) | new `application_status_history` | Employer wrote it themselves |
| `candidate_id` (candidate_profiles PK) | **Prohibited** | — | No functional need; would enable cross-feature candidate tracking outside this application |
| Auth user ID | **Prohibited** | — | Never exposed anywhere in this codebase to any non-owner |
| Email | **Prohibited** | — | Never collected into any snapshot (D-038); not on `candidate_profiles` write path exposed here |
| Phone | **Prohibited** | — | Same as email |
| Exact address | **Prohibited** | — | Only `city="Berlin"` + travel radius exist; never an exact address anywhere in this schema |
| Free-text profile fields | **Not required** | — | None exist on `candidate_profiles` today (no bio/summary field) |
| Internal eligibility reasons / missing-requirement codes | **Prohibited** | — | Those are pre-application matching internals (PR 5.5c), unrelated to a submitted application and never written into the snapshot |
| Application snapshot metadata (`snapshot_version`) | Not required | — | Internal versioning detail, no product value to an employer |
| Other applicants for the same vacancy | **Prohibited** | — | List RPC scoped to the requesting employer's own vacancies only, never cross-employer |

**Architecture decision: employer review reads the immutable submission-time `candidate_snapshot`, never a live `candidate_profiles`/`candidate_languages` join.**

Justification: (1) D-038's snapshot was explicitly designed for this exact purpose and already excludes everything prohibited above; (2) it's stable — an employer's view of an applicant doesn't silently change if the candidate edits their profile after applying, matching the same stability guarantee already proven for the candidate's own confirmation page; (3) it avoids ever granting an employer any read path to `candidate_profiles`/`candidate_languages`, closing off an entire class of potential privacy leakage the same way the Slice 5 candidate-integration work closed off direct-table reads on the candidate side; (4) a hybrid or live-profile model would require new RLS on `candidate_profiles` for employers, which no current decision authorizes and which this proposal explicitly does not request.

## 4. Candidate-safe status projection

**Current candidate confirmation route already exposes:** `vacancy_snapshot` fields, application ID (route param, not rendered as visible copy per D-043's later narrowing), `submitted_at`, and `status` (currently only ever `"submitted"` since no other value exists). Employer/company name comes from the vacancy snapshot's `employer_display_name`. No status history, no rejection reason, no internal notes, no contact information are exposed today (none of these exist yet).

**Slice 6 candidate-facing status model:** expose current `status` (mapped to a candidate-facing label, not the raw DB value) and an optional minimal status timeline (`to_status`, `occurred_at` pairs only — no `reason`, no `actor_user_id`, no `from_status`). Do **not** expose: `reason` (employer-internal only, see §6), `actor_user_id` (there is exactly one employer per vacancy in this model; exposing it adds nothing and starts a precedent this repo has avoided everywhere else), any other applicant's data, or any vacancy-lifecycle/verification cause (matching the existing `JobDetailUnavailable`/`resolveJobDetailPageView` convention of never disclosing *why* something changed to the party who doesn't own the cause).

**Candidate-facing labels** (per `docs/12-terminology.md`'s existing guidance — plain, respectful, never define people by what they lack):

| Status | Candidate label |
|---|---|
| `submitted` | "Submitted" (unchanged) |
| `reviewing` | "In review" |
| `shortlisted` | "Shortlisted" |
| `accepted` | "Accepted" |
| `rejected` | "This one was not the right fit. Keep moving." (verbatim, existing terminology-doc copy) |

## 5. Proposed status state machine

**Statuses (5, minimal MVP):** `submitted`, `reviewing`, `shortlisted`, `accepted`, `rejected`.

Rejected as unjustified by current evidence: `withdrawn` (candidate-initiated — a different actor-authority model than "employer-controlled application-status transitions," the stated Slice 6 objective; D-040 already deferred this explicitly; recommend a separate later PR, not Slice 6); `archived` (no functional need for a DB status — an employer wanting to declutter their list can filter by status client-side; adding a DB state for pure presentation would blur the terminal/non-terminal model for no product benefit); the fuller D-041/`docs/05-features.md` 9-state aspirational pipeline (`viewed`, `interview invited`, `interview scheduled`, `offer`, `hired`, `not selected` as a separate status from `rejected`) — all excluded by this planning task's explicit non-goals (interviews/scheduling) or redundant with the 5 chosen statuses.

| Status | Set by | Terminal? | Candidate label | Employer label |
|---|---|---|---|---|
| `submitted` | System (on insert, via `submit_candidate_application`) | No | "Submitted" | "Submitted" |
| `reviewing` | Employer | No | "In review" | "Reviewing" |
| `shortlisted` | Employer | No | "Shortlisted" | "Shortlisted" |
| `accepted` | Employer | **Yes** | "Accepted" | "Accepted" |
| `rejected` | Employer | **Yes** | "This one was not the right fit. Keep moving." | "Rejected" |

## 6. Transition matrix

Forward-only, no backward transitions, no undo of terminal states, forward skips allowed (an obviously-unfit or obviously-excellent applicant doesn't need to pass through every intermediate status):

| From \ To | `reviewing` | `shortlisted` | `accepted` | `rejected` |
|---|---|---|---|---|
| `submitted` | ✅ | ✅ | ✅ | ✅ |
| `reviewing` | — (already_in_state) | ✅ | ✅ | ✅ |
| `shortlisted` | ❌ | — (already_in_state) | ✅ | ✅ |
| `accepted` | ❌ | ❌ | — (already_in_state) | ❌ |
| `rejected` | ❌ | ❌ | ❌ | — (already_in_state) |

- **Reason:** optional, employer-only, **only accepted on the `rejected` transition** (same shape family as `verification_review_reason`'s CHECK, but bounded 1–1000 chars, trimmed, non-empty if present — see the accepted implementation in the migration). Never candidate-visible. Not accepted on any other transition.
  - **Normalization (as implemented):** the RPC computes `nullif(btrim(coalesce(p_reason, '')), '')`. An empty string or whitespace-only input normalizes to `NULL` (treated identically to "no reason given"). If the normalized value is **non-null and the target status is not `rejected`, the whole request is rejected as `invalid_transition`** — no application update, no history row. Supplying a reason for the wrong transition is treated as a caller/UI defect worth surfacing, not silently discarded. A non-null, post-trim value longer than 1000 characters on a `rejected` target is also `invalid_transition`, never a raw `application_status_history_reason_len_chk` constraint violation — matches D-066's "no raw PostgreSQL errors" rule and the same pre-validate-then-insert pattern `submit_candidate_application` already uses for its own CHECK-backed columns. The table's own CHECK constraint remains as defense-in-depth; the RPC is expected to reject invalid input before ever attempting the write.
- **Timestamp:** one shared value per submission/transition (`clock_timestamp()`, captured once into a local variable and reused for every column it touches in that call — e.g. `applications.submitted_at`/`created_at`/`updated_at` and `application_status_history.occurred_at` are byte-identical for a given submission), never client-supplied.
- **Reversibility:** none. `accepted`/`rejected` are hard-terminal in Slice 6. An employer mistake is an acknowledged limitation of this narrow MVP, not silently worked around with an undo path that would need its own history-integrity rules.
- **Vacancy lifecycle side effects:** none, by design (see §9). `accepted` does not auto-call `fill_employer_vacancy`; filling a vacancy does not auto-reject remaining applications. The two state machines stay decoupled in Slice 6. Considered and rejected: coupling them was judged to add cross-domain side-effect complexity disproportionate to the MVP's needs; revisit as a later, separately-decided enhancement if real usage shows friction.

## 7. Status-history design

Evaluated against the five options in the brief:

1. Only current status on `applications` — rejected: no auditability, no candidate timeline, no employer accountability trail.
2. **Separate `application_status_history` table — recommended.**
3. Append-only generic audit-event table — rejected for now: D-065 explicitly reserves the general `audit_events` platform for Slice 7 (*"Slice 5 does not add the general audit_events platform planned for Slice 7"*); building a narrow, purpose-specific table now and folding it into the general platform later (if ever) is the established precedent (`vacancy_lifecycle_events`, built the same way in Slice 5, not yet unified with anything).
4. Structured JSON history column on `applications` — rejected: unindexable per-transition, harder to query "who changed what when" reliably, and this repo has already chosen typed relational columns over JSON blobs for exactly this kind of data (`vacancy_lifecycle_events`).
5. Database audit trigger — rejected: this repo has zero triggers driving business data (only guard/defaulting triggers on profile tables); a trigger-authored history row would also need to derive `actor_user_id`/`reason`, which triggers can't cleanly receive as RPC arguments — a direct `insert` from within the transition RPC is simpler and matches `_append_vacancy_lifecycle_event`'s exact pattern.

**Recommended schema** (directly adapted from `vacancy_lifecycle_events`):

```sql
create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users (id),
  occurred_at timestamptz not null default now(),
  reason text,
  constraint application_status_history_to_status_chk
    check (to_status in ('submitted','reviewing','shortlisted','accepted','rejected')),
  constraint application_status_history_reason_len_chk
    check (reason is null or char_length(btrim(reason)) between 1 and 500)
);
create index application_status_history_application_occurred_idx
  on public.application_status_history (application_id, occurred_at, id);
```

- `from_status` nullable — every application's first history row (`to_status = 'submitted'`, `from_status = null`) represents its creation.
- `on delete cascade` from `applications` — history has no independent lifecycle.

**Initial `submitted` event strategy (explicit decision, required before the PR 6.1 migration can be written):**

- **Existing applications (created before PR 6.1):** backfilled. The same migration that creates `application_status_history` also runs one `insert into public.application_status_history (application_id, from_status, to_status, actor_user_id, occurred_at) select id, null, 'submitted', candidate_id, submitted_at from public.applications` — one synthesized event per existing row, using each application's own `submitted_at` as `occurred_at` and `candidate_id` as `actor_user_id` (the only "actor" available for a pre-history submission is the candidate who submitted it; this is consistent with `submit_candidate_application` running as the candidate's own authenticated session, not a separate system identity). This gives every application, old or new, a complete, gapless history from `submitted` onward — the candidate/employer timeline UI never needs a special case for "applications older than the history table."
- **Future applications:** `submit_candidate_application` is updated (still within the PR 6.1 migration, `create or replace function`) to insert the same `to_status='submitted', from_status=null` row itself, in the same transaction as the `applications` insert, immediately after it succeeds — so an application and its first history event are created atomically; a submission can never exist without its initial history row, and there is no window where a client could observe an application with an empty history array.
- **Alternative considered and rejected:** synthesizing the initial event on-the-fly at read time from `applications.submitted_at` (never materializing a row) — rejected because it would require every history-reading RPC to special-case "row zero," doubles the logic that needs to stay in sync between the transition RPC's matrix and the read path, and breaks the simple invariant "every row in `application_status_history` is a real, actor-attributed event" that the rest of this design relies on (e.g. §12's transition RPC only ever needs to *insert*, never reconcile a synthetic vs. real first row).
- **No `authenticated` grant at all.** `revoke all on table public.application_status_history from public, anon, authenticated; grant all on table public.application_status_history to service_role;` — history is never read or written directly by any client role. Both the candidate-safe projection (§4) and the employer-full projection (§11) are RPC-only, so column-level exposure (`reason`, `actor_user_id`) is controlled entirely by which RPC a caller can invoke, not by RLS row-filtering (which cannot filter columns). This mirrors how `vacancy_lifecycle_events` and `verification_operators` are both zero-grant-to-authenticated, RPC-mediated tables.
- Writes happen exclusively from inside `transition_current_employer_application_status` (and one bootstrap row from `submit_candidate_application`), both `security definer`, both deriving `actor_user_id` from `auth.uid()` and `occurred_at` from `now()` — never client-supplied.

## 8. Concurrency model

**Row lock only — no optimistic version token, no client-supplied "expected current status."** Matches every existing transactional RPC in this codebase (`submit_candidate_application`, `_transition_employer_vacancy`): `select ... from public.applications where id = p_application_id for update`, re-read the live `status` inside the transaction, validate the requested target against that live value using the matrix in §6, branch.

| Scenario | Behavior |
|---|---|
| Two employer tabs transition the same application concurrently | Second transaction blocks on the row lock, then re-reads the (now-updated) status and evaluates its own request against it — either a valid forward transition (succeeds, writes its own history row) or `invalid_transition`/`already_in_state` |
| Status changed between employer page load and submit | Same as above — the RPC always re-validates against live state, never trusts a client-supplied "I saw status X" |
| Vacancy paused/filled/expired/withdrawn before review | No effect — review/transition is ownership-gated, not lifecycle-gated (§9) |
| Employer verification revoked before transition | No effect — verification is not required for review/transition, only for publish (§9, §3 of the build plan) |
| Candidate account deleted | `applications` row cascades away with the candidate (`ON DELETE CASCADE`) — nothing left to transition; not a Slice 6-specific concern |
| Candidate profile changed after submission | No effect — transitions and reads operate on `applications`/snapshot/status only, never the live profile |
| Application already terminal | `invalid_transition` (zero valid outbound transitions from `accepted`/`rejected`) |
| Duplicate transition submission (same target twice) | `already_in_state`, idempotent, no duplicate history row written |

## 9. Vacancy-lifecycle interaction

| Question | Answer | Basis |
|---|---|---|
| Review applications for paused vacancies? | Yes | Ownership-only gate, matches `loadEmployerVacancy` showing any lifecycle state to its owner |
| Review applications for expired vacancies? | Yes | Same |
| Review applications after withdrawal? | Yes | Same; snapshot model already guarantees stable history |
| Review applications after verification revocation? | Yes | Verification is not currently a blanket route gate (only a publish-time check); revocation already only pauses vacancies, doesn't hide them |
| Transition status on filled vacancies? | Yes | Decoupled state machines |
| Does accepting fill the vacancy? | **No**, decoupled | Avoids a hidden cross-domain side effect on top of two already-independent state machines; employer explicitly calls the existing `fill_employer_vacancy` RPC when ready (UI may *suggest* this after an `accepted` transition, without a DB-level cascade) |
| Does filling freeze application transitions? | **No** | Same decoupling rationale |
| Do prior applications stay readable after the vacancy is no longer public? | Yes | Already guaranteed by the `ON DELETE RESTRICT` + snapshot model, proven by existing E2E |

## 10. Employer list RPC

```sql
create or replace function public.list_current_employer_applications(
  p_vacancy_id uuid default null,
  p_status text default null
)
returns table (
  application_id uuid,
  vacancy_id uuid,
  vacancy_title text,
  candidate_display_name text,
  status text,
  submitted_at timestamptz,
  status_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$ ... $$;
revoke all on function public.list_current_employer_applications(uuid, text) from public, anon;
grant execute on function public.list_current_employer_applications(uuid, text) to authenticated;
```

- Identity from `auth.uid()` only; joins to `public.vacancies` internally (`v.employer_profile_id = auth.uid() and v.source = 'employer'`) to derive ownership — no caller-supplied employer ID.
- `p_vacancy_id` optional — omitted lists across every vacancy the employer owns; supplied narrows to one (and returns empty, not an error, if that vacancy isn't owned by the caller — no existence oracle).
- `p_status` optional exact-match filter.
- No pagination in this MVP — expected data volume is small at pilot stage (one employer's applicant counts per vacancy); documented as a known future enhancement, not built now, per "prefer the narrowest MVP contract."
- Returns no `candidate_id`, no auth ID, no raw snapshot — `candidate_display_name` is projected out of `candidate_snapshot->>'display_name'` only.
- Ordering: `submitted_at desc, application_id asc` — deterministic, mirrors the `published_at desc, vacancy_id asc` canonical-ordering precedent from Slice 5; never re-sorted client-side.
- Unauthenticated or non-employer caller → empty result (RPC internally requires `auth.uid()`; a null/non-owning join naturally yields zero rows — same "no existence oracle, no error leakage" pattern as the candidate-side Slice 5 RPCs).

## 11. Employer detail RPC

```sql
create or replace function public.get_current_employer_application(p_application_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to pg_catalog, public
as $$ ... $$;
revoke all on function public.get_current_employer_application(uuid) from public, anon;
grant execute on function public.get_current_employer_application(uuid) to authenticated;
```

Returns one JSONB object (unavailable/unauthorized collapse to the same shape, no existence oracle across employers):

```jsonc
{
  "status": "ready",              // | "unavailable"
  "application_id": "...",
  "vacancy_id": "...",
  "vacancy_title": "...",
  "current_status": "reviewing",
  "submitted_at": "...",
  "status_updated_at": "...",
  "allowed_transitions": ["shortlisted", "rejected"],   // derived from §6, computed server-side
  "candidate": { /* full candidate_snapshot fields, §3 */ },
  "status_history": [
    { "to_status": "submitted", "occurred_at": "...", "reason": null },
    { "to_status": "reviewing", "occurred_at": "...", "reason": null }
  ]
}
```

- Ownership proven the same way as the list RPC (vacancy join on `auth.uid()`).
- `status_history.reason` is populated for the employer's own `rejected` entries (their own note), never any operator/other-actor data (there is no other actor in this model).
- No `actor_user_id` returned — always implicitly "you," per §4's reasoning.
- Unknown and unauthorized application IDs return the identical `{"status":"unavailable"}` shape.

## 12. Status-transition RPC

```sql
create or replace function public.transition_current_employer_application_status(
  p_application_id uuid,
  p_target_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public
as $$ ... $$;
revoke all on function public.transition_current_employer_application_status(uuid, text, text) from public, anon;
grant execute on function public.transition_current_employer_application_status(uuid, text, text) to authenticated;
```

Behavior: derive employer identity from `auth.uid()`; verify `employer_profiles` exists and `onboarding_completed_at is not null` (same completion gate as every other employer RPC — **no additional "currently verified" check**, see build-plan §3 for the ownership-rule justification); lock the target `applications` row `for update`, joined through `vacancies` to prove ownership in the same query (unowned/unknown → `unavailable`, no existence oracle); validate `p_target_status` against a hardcoded (not client-configurable) copy of the §6 matrix given the row's live current status; if `p_target_status` already equals current status → `already_in_state` (idempotent, no history row); if the transition isn't in the matrix → `invalid_transition`; otherwise insert one `application_status_history` row (`from_status` = live current, `to_status` = target, `actor_user_id = auth.uid()`, `occurred_at = clock_timestamp()`, `reason` = `p_reason` only when `p_target_status = 'rejected'`, else forced `null` even if supplied) and `update public.applications set status = p_target_status, updated_at = clock_timestamp() where id = p_application_id`.

Result shapes: `{"result":"updated","status":"..."}`, `{"result":"already_in_state","status":"..."}`, `{"result":"invalid_transition"}`, `{"result":"unavailable"}` (application not found or not owned), `{"result":"employer_unavailable"}` (employer profile missing or incomplete — distinguished from `unavailable` so the caller can route to onboarding rather than a generic not-found page, mirroring how the candidate submit RPC distinguishes `incomplete` from `unavailable`).

No raw PostgreSQL errors ever surface (matches D-066); no dynamic SQL; fixed `search_path`; explicit `revoke`/`grant` pair; accepts no actor ID, no employer ID, no vacancy ID (all derived), no timestamp (always server `now()`/`clock_timestamp()`).

## 13. Candidate status RPCs

Two narrow additions, both RLS-scoped by the caller's own `auth.uid()` (no new grant needed for the first — it reuses the existing raw-select pattern already proven safe for confirmation):

1. **No new RPC needed for current status** — `load-candidate-application-confirmation.ts`'s existing select already includes `status`; once §1's CHECK is widened, this column naturally starts returning the new values with zero code change to the query itself (only the label-mapping function needs updating, per §4).
2. **`list_current_candidate_application_status_history(p_application_id uuid) returns table(to_status text, occurred_at timestamptz)`** — `security definer`, ownership proven via `applications.candidate_id = auth.uid()` internally (not RLS, since `application_status_history` has zero direct grants per §7), returns only `to_status`/`occurred_at` — no `reason`, no `actor_user_id`, no `from_status`. `revoke all ... from public, anon; grant execute ... to authenticated;`.

A candidate applications index (`/candidate/applications`) needs no new RPC — the existing `applications_select_own` RLS policy already scopes a plain `select id, vacancy_id, status, submitted_at from public.applications` to the caller's own rows safely (same pattern already used for Applied badges).

## 14. Privileges and grants (summary)

| Object | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| `applications` (table) | none | SELECT only (own rows via RLS, unchanged) | ALL |
| `application_status_history` (table) | none | **none — RPC only** | ALL |
| `list_current_employer_applications` | revoked | EXECUTE | n/a |
| `get_current_employer_application` | revoked | EXECUTE | n/a |
| `transition_current_employer_application_status` | revoked | EXECUTE | n/a |
| `list_current_candidate_application_status_history` | revoked | EXECUTE | n/a |

## 15. RLS design

**No new RLS policy on `applications`.** The existing `applications_select_own` policy is untouched. Employer access is granted exclusively through the three `security definer` RPCs above, each performing its own internal ownership check via the `vacancies` join — this avoids ever widening raw table-level row visibility for employers (which would let a client query `.from("applications")` directly and receive full snapshots/`candidate_id`), keeping the RPC as the sole place that decides exactly which columns an employer may see. This mirrors how Slice 5's candidate-facing RPCs (`resolve_current_candidate_vacancy_match`, `get_effective_public_vacancy`) never relied on broadened `vacancies` RLS for candidates — they are RPC-projected, not RLS-widened.

`application_status_history` gets **no RLS policy for `authenticated` at all** (zero grant, see §7/§14) — RLS is moot when there's no direct grant to filter.

## 16. Field-level privacy matrix

| Field | Anonymous | Candidate owner | Employer owner | Unrelated employer | Verification operator | Service role | DB owner |
|---|---|---|---|---|---|---|---|
| `candidate_snapshot` (full) | — | R (own, direct) | R (via detail RPC, projected) | — | — | R/W | R/W |
| `vacancy_snapshot` | — | R (own, direct) | — (not needed; employer already knows their own vacancy) | — | — | R/W | R/W |
| `current status` | — | R (own, direct) | R (list/detail RPC) | — | — | R/W | R/W |
| `status_history.to_status`/`occurred_at` | — | R (own, via candidate RPC) | R (via detail RPC) | — | — | R/W | R/W |
| `status_history.reason` | — | **never** | R (own, via detail RPC — their own note) | — | — | R/W | R/W |
| `status_history.actor_user_id` | — | never | never (implicit self) | — | — | R/W | R/W |
| `application_id` | — | R (route param) | R (list/detail RPC) | — | — | R/W | R/W |
| `candidate_id` | — | implicit (RLS) | **never returned** | — | — | R/W | R/W |
| `vacancy_id` | — | R (own) | R (own) | — | — | R/W | R/W |

"Unrelated employer" and "Verification operator" are `—` (no access) across every row — confirmed by design in §11/§12 (no existence oracle across employers) and by the employer-domain audit (zero operator function touches `applications` today, and none is proposed here — operator applicant review is an explicit non-goal, see build plan §non-goals).

## 17. Migration plan (summary — full PR-level detail in the build plan)

One additive migration for PR 6.1: widen `applications_status_chk`; create `application_status_history` (table + index + grants, no RLS policy needed since there's no `authenticated` grant); create the five RPCs above (three employer, two candidate) with explicit grants/revokes; add table/function comments. No change to `applications`' column set, no change to `snapshot_version`, no change to any Slice 5 (PR 5.5a/5.5c) function. Migration count goes from 11 to 12.

## 18. D-070 — Accepted

`docs/13-implementation-plan.md`'s existing Slice 6 scope line included *"interview invitation metadata without full messaging"* and *"status notification emails,"* both outside this proposal's scope. Per `AGENTS.md`'s conflict-reporting rule, this was reported (not silently resolved) during planning, matching the identical precedent of D-035/D-046/D-055 narrowing their own slices' earlier `docs/13` descriptions. **D-070 is now Accepted** — see `docs/10-decisions.md` for the full, final decision text (accepted 2026-08-06, at the start of PR 6.1, before the migration below was applied). It codifies exactly the 5-status state machine, the ownership-not-verification employer access rule, the immutable-snapshot review model, and the full non-goals list from this document.

# Slice 7 Moderation and Audit — Proposed Contract

> Proposal only. No executable SQL. No migration lands from this document.
> Full audit trail and rationale: `docs/41-slice-7-discovery.md`. PR
> sequence: `docs/42-slice-7-build-plan.md`. Everything below is the input
> to PR 7.2's actual migration — the migration author still writes the real
> SQL, following the security/concurrency conventions cited throughout, and
> may adjust exact column/function names during implementation as long as
> the boundaries below are preserved.

---

## 1. Authorization model (proposed: unchanged reuse)

No new identity or role table. Every new RPC gates through the existing
`_is_active_verification_operator(auth.uid())` internal helper (PR 5.2),
exposed to routes/actions via the existing
`is_current_user_verification_operator()` read RPC and the existing
`requireActiveOperator` server-side gate
(`src/lib/internal/verification/operator-gate.ts`). No operator
grant/revoke RPC is added — operator provisioning remains an owner-only
direct-database action, as it is today.

The name `verification_operators`/`_is_active_verification_operator` is
verification-specific in naming only; the underlying concept ("is this
authenticated user internal staff") is already general-purpose and is
reused for suspension/moderation without renaming, to avoid unrelated
migration churn. A future rename, if ever wanted for clarity, is a
separate, non-Slice-7-blocking cleanup.

---

## 2. Proposed schema

### 2.1 `employer_suspension` (proposed name — new, small, additive)

Rationale for a parallel table over inline columns on `employer_profiles`:
keeps every existing employer-facing RLS policy and RPC on
`employer_profiles` completely untouched (zero regression risk to Slice
3–6), and makes "is this employer currently suspended" a single, cheap,
explicit join rather than a new column mixed into an already
verification-heavy row.

Proposed shape (conceptual, not SQL):

- `employer_profile_id` — primary key, references `employer_profiles(id)`,
  `on delete cascade`
- `suspended_at` — not null when suspended; null means "not currently
  suspended" (current-state row, not a history — history lives in the
  audit ledger, §3)
- `suspended_by` — references `auth.users(id)`, the operator who suspended
- `suspended_reason` — required, trimmed, bounded (proposed: same 1–500
  char bound already established for verification-review reasons)
- `updated_at`

A row's *presence with `suspended_at is not null`* is the suspended state;
unsuspension either deletes the row or sets `suspended_at`/`suspended_by`/
`suspended_reason` to null and stamps a new `updated_at` — implementation
detail to fix at PR 7.2 time, either is compatible with this proposal, as
long as "currently suspended" remains a single deterministic boolean
derivable without scanning history.

**Grants:** zero `authenticated` grant on the table itself (mirrors
`application_status_history`). All reads/writes go through
`SECURITY DEFINER` RPCs (§4).

### 2.2 `vacancy_moderation` (proposed name — new, small, additive)

Rationale: keeps `vacancies`/`publication_state` and every existing
employer-facing lifecycle RPC completely untouched. Composes with
`publication_state` rather than replacing it — a vacancy can be
`published` (employer's own state) *and* `moderated` (operator's
independent hold) at the same time; the *effective* public-visibility
computation (§5) must require **both** "employer state allows visibility"
**and** "not moderated."

Proposed shape (conceptual, not SQL):

- `vacancy_id` — primary key, references `vacancies(id)`, `on delete
  cascade`
- `moderated_at` — not null when moderated
- `moderated_by` — references `auth.users(id)`
- `moderated_reason` — required, trimmed, bounded
- `updated_at`

Same presence/nullability convention as §2.1.

### 2.3 `admin_audit_events` (proposed name — new, general ledger)

One append-only table for every operator-initiated sensitive action,
mirroring `application_status_history`'s zero-grant, RPC-mediated pattern
(not `vacancy_lifecycle_events`'s owner-readable-actor pattern — see
`docs/41` §4/§5 for why that pattern is wrong for operator actions).

Proposed shape (conceptual, not SQL):

- `id` — primary key
- `event_type` — bounded enum (the action/event discriminator): proposed
  `employer_suspended | employer_unsuspended | vacancy_moderated | vacancy_restored | verification_approved | verification_rejected | verification_revoked`
  (the last three optionally re-emitted from the existing Slice 5 RPCs to
  close the "second review overwrites first review's evidence" gap
  identified in `docs/41` §2.7 — see open question 2 there)
- `target_kind` — a second, independently bounded enum: `employer | vacancy`
  — **not** the same field as `event_type**, and not derived from it by
  string-matching; each approved audit-producing RPC sets `target_kind`
  itself, from its own fixed domain, never from caller input
- `target_id` — `uuid`, the employer_profile_id or vacancy_id the event
  concerns, whichever `target_kind` says
- `actor_user_id` — the operator, `auth.uid()`-derived only, never
  client-supplied
- `occurred_at` — `clock_timestamp()`-derived only, never client-supplied
- `reason` — nullable at the ledger level (some event types, like
  `verification_approved`, have no reason; punitive event types require
  one — enforced by a CHECK tying `event_type` to reason-required-ness,
  mirroring `application_status_history`'s existing
  `reason`/`to_status`-pairing CHECK pattern from Slice 6 — this CHECK is
  valid because it only compares columns *within the same row*, unlike the
  cross-table existence claim corrected below)
- `metadata` — bounded `jsonb` object (mirrors
  `vacancy_lifecycle_events.metadata`'s `jsonb_typeof = 'object'` CHECK),
  for narrow, event-type-specific extra fields only — never a dumping
  ground, never raw snapshot data, never secrets

**Same-row invariant: `event_type`/`target_kind` pairing is declaratively
CHECK-constrained.** Unlike `target_id` existence (below), `event_type` and
`target_kind` are two columns of the *same row*, so their legal pairing is
an ordinary same-row CHECK constraint — no cross-table query involved, the
same class of constraint `application_status_history` already uses to tie
`reason` to `to_status`. Both enums are closed and the pairing is fixed:

- `target_kind = 'employer'` only for `event_type in ('employer_suspended', 'employer_unsuspended', 'verification_approved', 'verification_rejected', 'verification_revoked')`
- `target_kind = 'vacancy'` only for `event_type in ('vacancy_moderated', 'vacancy_restored')`

Exact SQL for the `CHECK (...)` expression is PR 7.2 implementation work —
this document fixes the pairing itself, not the literal constraint syntax.
This closes the case where a bug in an approved RPC's own insert (not a
malicious client — no client can insert directly at all, per the zero-grant
rule below) could otherwise write a mismatched pair, e.g.
`event_type = 'vacancy_moderated'` with `target_kind = 'employer'`; the
constraint makes that a hard database error rather than a silently wrong
row.

**Corrected referential-integrity strategy for `target_id` (no polymorphic
FK, no cross-table CHECK).** `target_id` existence is a different, harder
problem than the pairing above: it is polymorphic — the same column must
validate against `employer_profiles` for one `target_kind` and `vacancies`
for the other, which spans tables. An earlier draft of this proposal
claimed a CHECK constraint could validate that `target_id` exists in
whichever table `target_kind`/`event_type` implies. **This is not
implementable in PostgreSQL** — a CHECK constraint cannot perform a
cross-table existence query (subqueries are not permitted inside CHECK
expressions). That claim is withdrawn. The actual integrity guarantee for
`target_id` is procedural, not declarative, and is proposed as follows:

- every approved audit-producing RPC (§4) first resolves and row-locks its
  target (the employer or vacancy row) exactly as every existing Slice 5/6
  mutating RPC already does;
- `target_kind` is hard-coded per RPC (e.g. `suspend_employer` always
  writes `target_kind = 'employer'`) — it is never a caller-supplied
  parameter, so there is no way to mismatch it against the RPC's own
  domain;
- `target_id` is the id of the row the RPC just locked, not a
  separately-supplied parameter re-typed into the insert;
- the ledger insert happens only *after* target existence/authorization is
  already proven by that lock — an event for a nonexistent target is
  structurally impossible because the RPC would already have returned
  `unavailable` before reaching the insert;
- there is **no generic "append an audit event" RPC** a client could call
  with an arbitrary `event_type`/`target_kind`/`target_id` triple — every
  event is a side effect of a specific, narrow, already-authorized
  domain RPC;
- PR 7.2's pgTAP suite proves this behaviorally (§11), since it cannot be
  proven declaratively.

**Retention — deliberately not `ON DELETE CASCADE` from the target.**
`admin_audit_events.target_id` is historical evidence, not a live
reference — the ledger must not lose an employer's or vacancy's
moderation/suspension history merely because that employer or vacancy row
is later deleted (e.g. via a future Slice 8 account-deletion flow). This
proposal does **not** decide Slice 8's final GDPR retention/deletion
policy — it only states the constraint Slice 8 must respect: **Slice 8
must explicitly reconcile administrative-audit retention with account
deletion requirements; PR 7.2 must not accidentally erase the
administrative ledger merely because a domain row is deleted.** Contrast
this with the two *current-state* tables in §2.1/§2.2, which legitimately
use real foreign keys with `on delete cascade`, because they represent
live state tied to a still-existing row, not durable cross-domain history.

**Grants:** zero `authenticated` grant, exactly `application_status_history`'s
model. Reads are RPC-mediated and scoped to "this operator, for this
specific target" (§4) — no unbounded "dump the whole ledger" RPC by
default, to avoid an accidental unbounded-read surface; a bounded,
paginated, target-scoped read is sufficient for the stated exit criteria.

---

## 3. Proposed audit-event taxonomy

| `event_type` | `target_kind` | Fired by | Reason required | Notes |
|---|---|---|---|---|
| `employer_suspended` | `employer` | new suspend RPC | Yes | |
| `employer_unsuspended` | `employer` | new unsuspend RPC | No (proposed — restoration is not punitive) | |
| `vacancy_moderated` | `vacancy` | new moderate RPC | Yes | |
| `vacancy_restored` | `vacancy` | new restore RPC | No | |
| `verification_approved` | `employer` | existing `approve_employer_verification`, extended | No | Closes `docs/41` §2.7's history gap; existing RPC signature/result contract unchanged |
| `verification_rejected` | `employer` | existing `reject_employer_verification`, extended | Yes (already required by the existing RPC) | Same |
| `verification_revoked` | `employer` | existing `revoke_employer_verification`, extended | Yes (already required) | Same |

Extending the three existing verification RPCs to also write an audit-ledger
row is additive only — their JSON result contracts, parameters, and every
existing pgTAP assertion about them remain unchanged; the only new
behavior is one additional insert inside the same transaction.

The `event_type`/`target_kind` column in this table is exactly the pairing
the §2.3 same-row CHECK constraint enforces — every row above is a legal
pairing by construction, and the constraint exists to guarantee no other
pairing can ever be written.

---

## 4. Proposed RPC boundaries

All `SECURITY DEFINER`, `set search_path to pg_catalog, public`, operator-gated
via `_is_active_verification_operator(auth.uid())`, row-locking their
target with `FOR UPDATE`, re-reading live state, returning a deterministic
result discriminant — the exact Slice 5/6 pattern, not a new one.

| Proposed RPC | Purpose | Caller-supplied inputs | Result discriminants (proposed) |
|---|---|---|---|
| `suspend_employer(p_employer_profile_id, p_reason)` | Suspend | employer id, reason | `ok \| already_in_state \| unavailable \| forbidden \| validation_error` |
| `unsuspend_employer(p_employer_profile_id)` | Restore | employer id | `ok \| already_in_state \| unavailable \| forbidden` |
| `moderate_vacancy(p_vacancy_id, p_reason)` | Hide/remove | vacancy id, reason | `ok \| already_in_state \| unavailable \| forbidden \| validation_error` |
| `restore_vacancy(p_vacancy_id)` | Un-hide | vacancy id | `ok \| already_in_state \| unavailable \| forbidden` |
| `is_current_employer_suspended()` **or** an `is_suspended` field folded into an existing employer-facing read | Let the employer's own UI explain a blocked action | none | boolean / inline field |
| `get_employer_moderation_status(p_employer_profile_id)` | Operator read: suspension state + linked audit events for this employer | employer id | row or empty |
| `get_vacancy_moderation_status(p_vacancy_id)` | Operator read: moderation state + linked audit events for this vacancy | vacancy id | row or empty |

None of these accept `p_actor_user_id`, `p_actor_role`, or
`p_occurred_at` — mirrors the Slice 6 static-security assertion pattern
exactly, and PR 7.3's static-security test should assert their absence the
same way `pr-6.2-static-security.test.ts` did for the transition RPC.

### 4.1 Suspension enforcement inventory — every authoritative employer mutation *and* sensitive read path

**Corrected framing.** An earlier draft of this section said "every
existing employer-mutating **RPC**." That was incomplete and, left
uncorrected, would have shipped a suspension that a suspended employer
could trivially bypass. The current codebase's employer-mutation surface
is **not** RPC-only — it is a genuine mix of two mechanisms, and the
enumeration below covers both, by file and line, not by assumption.

**Mechanism A — `SECURITY DEFINER` RPC** (the majority of the surface):

- `create_employer_vacancy_draft`, `update_employer_vacancy_draft`,
  `replace_employer_vacancy_languages`, `delete_employer_vacancy_draft`
- `publish_employer_vacancy`, `pause_employer_vacancy`,
  `resume_employer_vacancy`, `fill_employer_vacancy`,
  `withdraw_employer_vacancy`, `renew_employer_vacancy_to_draft`
- `request_employer_verification`
- `bootstrap_organisation_employer` (organisation profile + company
  creation, called from `saveOrganisationEmployerAction`/
  `completeEmployerOnboardingAction`'s organisation branch)
- `complete_employer_onboarding` (the onboarding-completion flip)

For every RPC in this list, enforcement is proposed as an additional
internal check (`not suspended`) inside the function body, exactly
mirroring how every existing RPC already checks ownership/completion —
**no RLS change needed for this group**, since the RPC itself is the
sole gate.

**Mechanism B — direct authenticated table write under plain RLS
(confirmed by grepping every `.update(`/`.insert(`/`.upsert(`/`.delete(`
call across `src/app/employer` and `src/lib/employer`, cross-referenced
against `employer_profiles`' actual RLS policies in
`20260803200000_employer_profiles_and_company_ownership.sql`):**

| Call site | Operation | RLS policy in effect |
|---|---|---|
| `src/app/employer/onboarding/actions.ts:129` (`savePrivateEmployerAction`) | `UPDATE employer_profiles` (display_name, berlin_locality, phone, website, lawful_hiring_declared) | `employer_profiles_update_own` — `auth.uid() = id`, **no suspension check today** |
| `src/app/employer/onboarding/actions.ts:257` (`completeEmployerOnboardingAction`, private branch) | Same `UPDATE employer_profiles` | Same |
| `src/app/employer/onboarding/actions.ts:348` (`setLawfulHiringDeclared`) | `UPDATE employer_profiles` (lawful_hiring_declared only) | Same |
| `src/lib/employer/ensure-employer-profile.ts:60` | `INSERT employer_profiles` (initial profile bootstrap) | `employer_profiles_insert_own` — structurally not suspension-relevant, since a not-yet-existing profile cannot already have an `employer_suspension` row referencing it |
| `src/lib/employer/ensure-employer-profile.ts:109` | `UPDATE employer_profiles.employer_type` (pre-type-lock only) | `employer_profiles_update_own` — **same policy as the three rows above**; blocked by the same narrowing, no separate treatment needed |

No direct write path exists on `companies` (verified: the only
`.from("companies")` call in employer app code is a read in
`load-employer.ts`) or on `vacancies` from employer app code (verified:
the three `.from("vacancies")` files under `src/lib/employer/vacancies`
are read-only loaders — grepped for `.update(`/`.insert(`/`.upsert(`/
`.delete(` and found none). Vacancy mutation is 100% Mechanism A.

**Architectural implication — stated explicitly, not hidden.** The three
`savePrivateEmployerAction`/`completeEmployerOnboardingAction`/
`setLawfulHiringDeclared` update paths are genuine "employer business
mutations" (editing the employer's own displayed profile detail) that a
suspended private employer could still perform today, because
`employer_profiles_update_own`'s RLS `USING`/`WITH CHECK` clauses only
check `auth.uid() = id` — nothing about suspension state. **Blocking
these three paths requires an RLS policy change, not just a new RPC.**
PR 7.2's migration must therefore include one additive change to
`employer_profiles_update_own` (proposed: extend the existing `USING`
clause with an additional `and not exists (select 1 from
employer_suspension es where es.employer_profile_id = employer_profiles.id
and es.suspended_at is not null)` condition), in addition to the new
tables/RPCs above. This is an **RLS policy change**, and the build plan
(`docs/42`) is corrected accordingly — it must not claim "no RLS changes."

**No leftover "low-risk exception."** Because the narrowing applies at the
policy level — to `employer_profiles_update_own` itself, not to a named
list of call sites — it blocks **every** authenticated `UPDATE` issued
through that policy once a suspension row exists, with no per-call-site
carve-out to track. This includes the pre-lock `employer_type` update
(`ensure-employer-profile.ts:109`): it uses the exact same policy as the
three named actions above, so the RLS change blocks it automatically and
identically — it is not a separate, lower-risk, deliberately-unblocked
path. The **only** structurally distinct case is the initial `INSERT`
(`ensure-employer-profile.ts:60`): an `employer_suspension` row can only
reference an `employer_profile_id` that already exists, so a not-yet-created
profile cannot be suspended, and the insert therefore needs no
suspension-awareness at all — this is a structural impossibility, not a
risk judgment, and is the only path in this table correctly left unchanged.

**Mechanism C/D:** no Server-Action-with-direct-table-access pattern
beyond Mechanism B was found, and no other mechanism (e.g. a trigger-based
write path, a webhook, a scheduled job) exists for employer mutation.

### 4.2 Sensitive read paths: Slice 6 employer applicant-review RPCs are **included**, not excluded

**Corrected framing.** An earlier draft of this proposal excluded
`list_current_employer_applications`, `get_current_employer_application`,
and `transition_current_employer_application_status` from suspension
enforcement, citing D-070's "review survives verification revocation" as
precedent. **That citation was a reasoning error and is withdrawn.**
Verification revocation and employer suspension are deliberately distinct
trust states (`docs/41` §3): revocation is a trust-gate reset the employer
can undo by simply resubmitting, while suspension is an operator-imposed,
operator-lift-only safety hold against an actor already judged unsafe.
D-070's precedent describes the former; it does not, and must not, govern
the latter.

**Corrected decision: all three Slice 6 employer RPCs are blocked while
suspended.**

- `list_current_employer_applications` — a suspended employer's session
  receives the RPC's own existing "not a completed employer" behavior:
  **zero rows**, exactly the deterministic, no-error, no-existence-oracle
  result the RPC already returns for an incomplete employer. No new
  discriminant is needed — suspension is simply folded into the existing
  gate check as one more reason the RPC declines to return rows.
- `get_current_employer_application` — a suspended employer's session
  receives the RPC's own existing `{"status":"unavailable"}` result,
  exactly as it already returns for an incomplete employer or an
  unowned/unknown application. This uniformly denies access without
  creating a new "you're suspended, specifically" oracle distinguishable
  from "this application doesn't exist" — consistent with the no-
  existence-oracle discipline already established for this RPC.
- `transition_current_employer_application_status` — a suspended
  employer's session receives the RPC's own existing
  `{"result":"employer_unavailable"}` result, exactly the discriminant
  already used for an incomplete employer.

**Rationale (candidate-snapshot privacy).** `get_current_employer_application`
returns the full candidate snapshot (display name, matched category,
German comfort, languages, work-authorisation declaration, availability,
employment types, shift preferences) for every application on the
employer's vacancies. An employer under an active operator safety hold —
by definition, judged unsafe enough to warrant a punitive suspension —
retaining unrestricted read access to that PII for as long as the
suspension lasts is a real, avoidable privacy exposure, not merely a
"nice to also block" convenience. Blocking it costs nothing functionally:
the underlying `applications`/`candidate_snapshot` data is untouched and
becomes visible again immediately on unsuspension, exactly like every
other suspension-blocked action.

Exact result-shape wiring (which internal helper each RPC calls, whether
the check is folded into the existing employer-completion gate or added as
a sibling check) remains PR 7.2 implementation work — this document locks
the **denial semantics** (deterministic, existing-discriminant reuse, no
new oracle), not the literal SQL.

### 4.3 Corrected: a suspended employer's vacancies must not remain publicly
discoverable

**An earlier draft of this proposal (and D-072) said suspension leaves
`vacancies.publication_state` untouched and therefore leaves effective-public
visibility "unaffected by employer suspension alone." The first half is
correct; the second half is a real safety gap and is withdrawn.** An
operator-imposed suspension means the employer has been judged unsafe.
Candidates must not continue discovering that employer's vacancies, or
submitting new applications to them, while the safety hold is active — even
though `publication_state` itself stays exactly as stored.

**Corrected contract:** suspension remains orthogonal to
`vacancies.publication_state` — it still does **not** rewrite
`publication_state`, `verification_state`, or any existing
`applications.status` value (§5.1 is unchanged on this point). Instead,
effective-public visibility gains an **additional, independent** employer-
suspension gate, composed exactly the same way §5.2/§5.3 already compose
vacancy moderation:

```
effective_public =
  existing_publication_conditions
  AND employer_not_suspended
  AND vacancy_not_moderated
```

Suspension therefore hides every one of that employer's currently public
vacancies purely by narrowing the canonical `is_vacancy_effectively_public`
predicate (§4.4, §5.3) — never by rewriting stored lifecycle state. On
unsuspension: nothing is republished and no captured state is restored;
removing the suspension gate is the entire effect. Each vacancy becomes
visible again only if its **current live** `publication_state`/
verification/expiry/moderation state independently qualifies it as
effective-public at that moment — exactly the same "re-read live state, do
not replay a snapshot" discipline §10 already applies to vacancy-moderation
restoration.

### 4.4 Canonical effective-public/eligibility function inventory — exact
list, audited, not guessed

There is exactly **one** canonical row-level predicate in the current
schema; every public/candidate read and write path delegates to it rather
than duplicating its logic. This inventory is grepped directly from the
migrations, not assumed:

| Function | File:line | Relationship to `is_vacancy_effectively_public` |
|---|---|---|
| `is_vacancy_effectively_public(vacancy_id, at)` | `20260805110000_verification_and_vacancy_publication.sql:516` | **The canonical predicate itself.** Gains the new `employer_not_suspended` condition here (alongside D-073's already-proposed `vacancy_not_moderated` condition) — every consumer below inherits both automatically. |
| `visible_public_vacancy_ids(at)` | same file:565 | Delegates directly — `select v.id from vacancies v where is_vacancy_effectively_public(v.id, p_at)`. |
| `list_effective_public_vacancies()` | `20260805200000_effective_public_vacancy_read_contract.sql:58` | Delegates directly (`where public.is_vacancy_effectively_public(v.id, now())`). This is the public vacancy **list** boundary. |
| `get_effective_public_vacancy(uuid)` | same file:113 | Delegates directly. This is the public vacancy **detail** boundary. |
| `get_effective_public_vacancy_languages(uuid)` | same file:170 | Delegates directly. |
| `resolve_current_candidate_vacancy_match(uuid)` | `20260806000000_candidate_eligibility_contract.sql:201` | Delegates directly — checks `is_vacancy_effectively_public(p_vacancy_id, ts)` and returns `'unavailable'` before ever calling the eligibility evaluator. This is the candidate **match detail** boundary. |
| `list_current_candidate_vacancy_matches()` | same file:267 | Delegates directly (`where public.is_vacancy_effectively_public(v.id, ts)`). This is the candidate **match list** boundary. |
| `submit_candidate_application(uuid)` | `20260806140000_application_status_and_review_contract.sql:148` (the winning definition — `create or replace` supersedes the two earlier same-named stubs in the prior two migrations; not a second call site) | Delegates directly, inside the same row-locked transaction as the insert (`not public.is_vacancy_effectively_public(vacancy.id, ts)` → `{"result":"unavailable"}`). This is the candidate **application submission** boundary. |

**The candidate eligibility evaluator delegates via caller precondition —
it does not duplicate the check.** `_evaluate_candidate_vacancy_eligibility`
(`20260806000000_candidate_eligibility_contract.sql:89`) does **not** itself
call `is_vacancy_effectively_public` — its own comment states callers "are
expected to have already verified... an effective-public vacancy before
calling." All three of its callers above satisfy that precondition by
checking the canonical predicate first. So the suspension gate reaches
eligibility/application-submission decisions through the callers, with no
duplicated logic inside the evaluator itself.

**One non-public consumer, noted for completeness, not a boundary
change.** `publish_employer_vacancy` (`20260805110000...sql:684`) calls
`is_vacancy_effectively_public` once, purely as an **idempotency
short-circuit** for an employer republishing their own already-public
vacancy (`if is_vacancy_effectively_public(...) then return 'ok'`) — this is
not a public/candidate boundary. Once the suspension condition is added, a
suspended employer's already-published vacancy stops short-circuiting here
and instead falls through to the function's `invalid_state` branch; this is
a harmless side effect, since `publish_employer_vacancy` is itself already
blocked for a suspended employer as a Mechanism A RPC (D-072) — flagged
here so PR 7.2's pgTAP suite asserts it explicitly rather than discovering
it as a surprise.

**Candidate/public consequence, summarized:**

- public vacancy list/detail (`list_effective_public_vacancies`/
  `get_effective_public_vacancy`) stop returning a suspended employer's
  vacancies;
- candidate match list/detail (`list_current_candidate_vacancy_matches`/
  `resolve_current_candidate_vacancy_match`) stop returning them, using the
  existing `'unavailable'` status — no new "employer suspended" status
  value;
- `submit_candidate_application` returns its existing
  `{"result":"unavailable"}` for a suspended employer's vacancy — the exact
  same discriminant already returned for a paused/expired/withdrawn/
  unverified-employer vacancy, deliberately **not** a distinguishable new
  reason (no candidate-facing "this employer is suspended" oracle, per
  `docs/41` §11's existing-discriminant-reuse discipline);
- existing applications already submitted before suspension remain stored,
  untouched;
- a candidate can still see their own historical applications and status
  timeline via their own-application RPCs (`list_current_candidate_...`
  application-status history), which are keyed by `candidate_id`, not by
  the vacancy's current effective-public status, and are entirely unaffected
  by this change;
- a suspended employer cannot list/detail/transition those same
  applications, per the already-corrected §4.2 rule.

---

## 5. Proposed state machines

### 5.1 Employer suspension

```
not suspended --suspend_employer--> suspended
suspended --unsuspend_employer--> not suspended
```

Two states only. No "temporary vs permanent" distinction at the state-
machine level for MVP — `docs/41` found no product evidence requiring
graduated suspension severity yet; a single boolean-equivalent state with
a required reason is the narrowest correct design. Independent of
`verification_state` — a suspended employer's `verification_state` is
untouched by suspension (unlike `revoke_employer_verification`, which does
mutate `verification_state`); suspension and verification remain two
orthogonal gates, exactly mirroring how `docs/41` found revocation and
suspension are *not* equivalent.

### 5.2 Vacancy moderation

```
not moderated --moderate_vacancy--> moderated
moderated --restore_vacancy--> not moderated
```

Independent of `publication_state`. Effective public visibility (§5.3
below — the actual computation, not a new state) requires **both** "employer
`publication_state` currently allows visibility" **and** "not moderated."

### 5.3 Effective-public visibility (proposed extension, not a new RPC family)

**Corrected: two additive conditions, not one.** The single canonical
`is_vacancy_effectively_public(vacancy_id, at)` predicate (§4.4) — and, by
delegation, every function in §4.4's table — gains **two** additional
conditions, one per independent safety gate:

```
effective_public =
  existing_publication_conditions
  AND not exists (
    select 1 from vacancy_moderation vm
    where vm.vacancy_id = v.id and vm.moderated_at is not null
  )                                                    -- D-073, vacancy-level
  AND not exists (
    select 1 from employer_suspension es
    where es.employer_profile_id = v.employer_profile_id
      and es.suspended_at is not null
  )                                                    -- D-072, employer-level
```

The employer-level condition is written against `v.employer_profile_id`
directly (already a column on `vacancies`), so it applies uniformly to
private and organisation employers alike and is a no-op for `source =
'seed'` rows (`employer_profile_id is null` there, so the `not exists`
trivially holds — seed vacancies were never employer-owned and cannot be
suspended). This is the *only* proposed change to already-shipped Slice 5
code, and it is additive-only in both conditions (narrows visibility
further, never widens it) — every existing pgTAP assertion about
effective-public visibility must continue to pass unchanged; new assertions
are added, not modified.

**D-072 and D-073 remain two independent gates composed into one
predicate, not one collapsed concept:** employer suspension is an
actor-level safety gate that narrows visibility for *every* vacancy that
employer owns; vacancy moderation is a vacancy-level safety gate that
narrows visibility for *one* specific vacancy regardless of who owns it.
Both conditions can independently be true or false for the same vacancy at
the same time (e.g. a moderated vacancy belonging to a suspended employer —
both conditions exclude it; restoring one alone still leaves it hidden by
the other).

**Unsuspension/restoration visibility semantics (both gates identical).**
Removing either gate — unsuspending the employer or restoring the vacancy —
never republishes anything and never restores captured state; it simply
deletes/clears the corresponding `employer_suspension`/`vacancy_moderation`
row. The vacancy becomes effective-public again only if, at that moment, its
**current live** `publication_state`/`published_at`/`expires_at`/
verification state independently satisfies `existing_publication_conditions`
**and** the other gate is also clear. Concretely: a vacancy that was
separately moderated remains hidden after its employer is unsuspended
(the moderation gate is untouched by unsuspension); an expired, withdrawn,
or paused vacancy does not become visible merely because its employer is
unsuspended (`existing_publication_conditions` still fails on its own
terms) — restoring one gate never overrides the other conditions.

---

## 6. RLS/grants summary

| Object | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| `employer_suspension` (table) | none | none | ALL |
| `vacancy_moderation` (table) | none | none | ALL |
| `admin_audit_events` (table) | none | none | ALL |
| `suspend_employer` / `unsuspend_employer` / `moderate_vacancy` / `restore_vacancy` | revoked | EXECUTE (operator-gated internally) | n/a |
| `employer_profiles_update_own` (existing RLS policy) | unchanged (no `anon` access) | **narrowed** — adds a `not suspended` condition (§4.1); previously any own-row update, now any own-row update while not suspended | n/a |
| `get_employer_moderation_status` / `get_vacancy_moderation_status` | revoked | EXECUTE (operator-gated internally) | n/a |
| `is_current_employer_suspended` (or equivalent inline field) | revoked | EXECUTE (own-account-scoped) | n/a |
| `is_vacancy_effectively_public` / `visible_public_vacancy_ids` / `list_effective_public_vacancies` / `get_effective_public_vacancy` / `get_effective_public_vacancy_languages` / `resolve_current_candidate_vacancy_match` / `list_current_candidate_vacancy_matches` / `submit_candidate_application` (existing `SECURITY DEFINER` functions, §4.4) | unchanged (`anon`/none per existing grant) | unchanged grants — **function body** gains the two additional conditions from §5.3; this is not an RLS change, since none of these functions are gated by RLS in the first place | n/a |

**Corrected: one existing RLS policy does require a change.** An earlier
draft of this section claimed no RLS policy change was needed anywhere,
by analogy to D-070's "no RLS policy is added to `applications` itself."
That analogy does not hold here — D-070 never needed to *restrict* an
already-existing RLS grant; §4.1's audit found that
`employer_profiles_update_own` already grants direct authenticated
`UPDATE` access independent of any RPC, so blocking a suspended employer
from using it requires narrowing that policy's `USING`/`WITH CHECK`
clauses (§4.1), not merely adding an internal RPC-body check. This is the
**only** proposed RLS change in the entire Slice 7 contract — `vacancies`
has no direct-write RLS grant to narrow (all vacancy mutation is
Mechanism A, RPC-only), and no new RLS policy is proposed on any table
this document introduces (§2) beyond the zero-grant baseline already
stated above. Per the corrected §4.1, the narrowed policy covers **every**
row it already governs, including the early-`employer_type` `UPDATE` path —
only `employer_profiles_insert_own` is structurally unaffected (§4.1), not
by a deliberate MVP-scope exclusion. The §5.3 visibility conditions are a
function-body change inside existing `SECURITY DEFINER` functions, not an
RLS policy — those functions have no RLS gating them (they run as their
definer, joining `vacancies`/`employer_profiles`/`companies` directly) — so
they do not add to this RLS-change count.

---

## 7. Privacy boundary

- Suspension/moderation `reason` is operator-facing only by default. No
  candidate or employer RPC returns it. If a future product decision wants
  the employer to see *why* they were suspended, that is a new, explicit,
  separately-decided feature (mirroring how D-070 treated employer
  rejection reasons as candidate-invisible by default) — not assumed here.
- `actor_user_id` on every new event is operator-identity only, never
  returned to the moderated employer/candidate, never returned to another
  operator's unrelated query (each read RPC is target-scoped, not a
  general "who is operator X" lookup).
- No candidate-facing surface changes. Candidates never see suspension or
  moderation state directly — they simply stop seeing a moderated vacancy
  via the existing effective-public computation, indistinguishable from
  any other vacancy that stopped being public for a mundane reason (paused,
  expired, withdrawn).

---

## 8. Concurrency

Every write RPC: `FOR UPDATE` lock on the target row (or the new
suspension/moderation row plus the target row, if lock ordering requires
both), re-read live state, deterministic result. Two operators acting
concurrently on the same target must not both succeed with conflicting
effects — the second operator's call observes the first's committed change
and returns `already_in_state` rather than double-writing.

State change and audit-ledger insert happen in the **same transaction**,
using the **same captured timestamp variable** — exactly Slice 6's proven
shared-timestamp pattern (`docs/39-slice-6-exit-proof.md` §"shared-
timestamp proof").

---

## 9. Reason semantics

- **Suspend / moderate:** required. Trimmed. Bounded (proposed 1–500
  chars, matching the existing verification-review-reason bound). Operator
  identity implicit via `actor_user_id`, never a separate field.
- **Unsuspend / restore:** optional or absent entirely (proposed: absent —
  restoration is not itself a punitive act needing self-justification;
  the *original* suspend/moderate event's reason remains in the ledger for
  context).
- **Immutability:** reason lives on the audit-ledger event, immutably —
  never edited after the fact. The *current-state* row (`employer_suspension`/
  `vacancy_moderation`) may carry a denormalized copy of the *most recent*
  reason for cheap display, but the ledger event is the authoritative,
  permanent record.
- **Visibility:** operator-only (§7).

---

## 10. Rollback / restoration semantics

Restoration (`unsuspend_employer`/`restore_vacancy`) is always available to
any active operator, not only the one who imposed the original hold — this
matches the existing verification-approval pattern (any operator can
approve/reject any pending request, not only a specific assigned reviewer)
and avoids a single-operator bottleneck for a small pilot team.

If the employer's *own* lifecycle action changed the target's state while
a moderation hold was active (e.g. the employer withdrew a vacancy that
was separately moderated), restoration must re-read the *current* live
`publication_state` rather than assuming the pre-moderation state —
restoring `vacancy_moderation` to "not moderated" simply removes the
independent operator hold; it does not, and must not, also attempt to
resurrect a since-withdrawn vacancy back to `published`. This composes
correctly with §5.3's "both conditions required" visibility rule without
any special-casing. Restoration never touches `admin_audit_events` — the
original suspend/moderate event remains permanently in the ledger
regardless of later restoration, exactly per §2.3's retention rule.

---

## 11. Migration and testing plan (for PR 7.2 to execute against)

- One additive migration (13th): the three new tables (§2), their
  grants/RLS (zero-`authenticated` on all three, mirroring
  `application_status_history`), the new RPCs (§4), the additive "not
  suspended" check folded into every RPC enumerated in §4.1 Mechanism A,
  **one narrowing change to the existing `employer_profiles_update_own`
  RLS policy** to close the Mechanism B gap (§4.1, §6 — this is a real
  RLS policy change, not merely new RPC-body logic, and must not be
  described as "no RLS changes"), the additive "not suspended" denial
  folded into the three Slice 6 employer RPCs (§4.2), and the two additive
  "not moderated"/"employer not suspended" clauses folded into the
  canonical `is_vacancy_effectively_public` predicate and, by delegation,
  every function in §4.4's table (§5.3) — not merely the three PR 5.5a
  read RPCs as an earlier draft understated.
- No change to any existing table's column set or CHECK constraint beyond
  the additions above; the one RLS policy change is explicitly called out,
  not hidden inside a general "internal check" description.
- pgTAP suite (new file, following `28_application_status_and_review_contract_test.sql`'s
  structure) must prove, at minimum:
  - non-operator and unauthenticated calls to every new RPC return
    `forbidden`/`unauthenticated`, never raw errors, never partial success;
  - suspend → every Mechanism A RPC in §4.1 returns a blocked result for
    that employer, proven individually per RPC, not asserted once and
    assumed to generalize;
  - suspend → the three Mechanism B direct-write paths (§4.1) are denied
    by the narrowed `employer_profiles_update_own` RLS policy — proven by
    attempting the same `UPDATE` shape the real Server Actions issue,
    under a suspended employer's session, and asserting zero rows
    affected/RLS denial, not merely asserting the *policy exists*;
  - suspend → all three Slice 6 employer RPCs
    (`list_current_employer_applications`,
    `get_current_employer_application`,
    `transition_current_employer_application_status`) return their
    existing deny-branch results for a suspended employer, proven
    individually, closing the reversed §4.2 finding;
  - a nonexistent target cannot produce an audit-ledger event (attempting
    `suspend_employer`/`moderate_vacancy` against a fabricated id returns
    `unavailable` and writes nothing);
  - an invalid `event_type`/`target_kind` pairing is rejected by the
    **table's own CHECK constraint** (§2.3) — proven by a direct
    `service_role`/definer-context insert attempt with a mismatched pair
    (e.g. `event_type = 'vacancy_moderated'`, `target_kind = 'employer'`)
    and asserting it raises a check-violation, distinct from the next
    assertion;
  - a valid `event_type`/`target_kind` pairing succeeds **only** through an
    approved domain RPC — proven by exhaustively calling every approved RPC
    and asserting the resulting row's `target_kind` matches the fixed value
    that RPC hard-codes, and separately asserting no role other than the
    RPC's own `SECURITY DEFINER` context can insert directly (no client
    role can insert at all, per the zero-grant proof below);
  - a nonexistent target cannot create an event through any approved RPC
    (restates the first bullet using the corrected `event_type`/
    `target_kind` field names, so both the CHECK-level and RPC-level
    guarantees are each independently proven);
  - `target_kind` cannot be supplied or overridden by the caller on any
    domain RPC — no RPC accepts a `p_target_kind`-shaped parameter (proven
    the same way the actor/timestamp signature-inspection assertion below
    is proven);
  - no direct `authenticated` INSERT/UPDATE/DELETE succeeds against
    `admin_audit_events` (zero grant, proven via `throws_ok`/permission
    assertions, mirroring `application_status_history`'s own proof
    pattern);
  - actor and timestamp on every ledger row are DB-derived — no RPC
    accepts a `p_actor_*`/`p_occurred_at`-shaped parameter (proven the
    same way Slice 6's static-security test proves it for TypeScript, plus
    a pgTAP signature-inspection assertion for the RPCs themselves);
  - successful state transition (suspension/moderation row) and its
    audit-ledger event are written atomically, sharing one captured
    timestamp variable — the exact Slice 6 "shared-timestamp proof"
    pattern (`docs/39` §"shared-timestamp proof"), re-proven here for the
    new tables;
  - **suspension/visibility proof set (§4.3/§5.3), against every function
    in §4.4's table, not asserted once and assumed to generalize:**
    1. a published vacancy belonging to an unsuspended employer remains
       effective-public through every §4.4 function;
    2. suspending that employer makes every one of their otherwise-public
       vacancies disappear from every §4.4 read function in the same
       transaction-consistent check;
    3. a different, unsuspended employer's vacancies are unaffected by
       another employer's suspension;
    4. `resolve_current_candidate_vacancy_match`,
       `list_current_candidate_vacancy_matches`, and
       `submit_candidate_application` each treat a suspended employer's
       vacancy as unavailable/ineligible using their **existing** result
       discriminant (`'unavailable'` / absence from the list /
       `{"result":"unavailable"}`), not a new one;
    5. unsuspending restores visibility only when the vacancy's **current
       live** `publication_state`/verification/expiry/moderation state
       independently qualifies it — proven by unsuspending an employer
       whose vacancy was, in the interim, separately withdrawn, and
       asserting it stays hidden;
    6. a vacancy separately moderated (D-073) remains hidden after its
       employer is unsuspended — proving the two gates in §5.3 compose
       independently, neither one clearing the other;
    7. an expired, withdrawn, or paused vacancy does not become visible
       merely because its employer is unsuspended — `publication_state`/
       `expires_at` conditions are re-evaluated on their own terms, not
       bypassed by the suspension gate clearing;
  - moderate does not affect a *different* vacancy from the same employer;
  - restore reverses visibility correctly, including the "employer changed
    state underneath the hold" case from §10, and does not remove the
    original event from `admin_audit_events`;
  - concurrency: two simultaneous suspend attempts on the same employer
    resolve deterministically (one `ok`, one `already_in_state`), matching
    Slice 5/6's own concurrency pgTAP precedent.
- Generated TypeScript types regenerate cleanly (`pnpm db:types:check`
  clean diff) — no manual edits.
- Migration count becomes 13; `pnpm proof:migrations` updated expectation.

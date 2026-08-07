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
- `target_type` — bounded enum: proposed
  `employer_suspended | employer_unsuspended | vacancy_moderated | vacancy_restored | verification_approved | verification_rejected | verification_revoked`
  (the last three optionally re-emitted from the existing Slice 5 RPCs to
  close the "second review overwrites first review's evidence" gap
  identified in `docs/41` §2.7 — see open question 2 there)
- `target_id` — the employer_profile_id or vacancy_id the event concerns
  (not a foreign key to a single table, since the target type varies — a
  CHECK-constrained pairing between `target_type` and which table
  `target_id` must exist in is the kind of invariant PR 7.2's pgTAP suite
  should prove, even if the column itself can't be a literal FK)
- `actor_user_id` — the operator, `auth.uid()`-derived only, never
  client-supplied
- `occurred_at` — `clock_timestamp()`-derived only, never client-supplied
- `reason` — nullable at the ledger level (some event types, like
  `verification_approved`, have no reason; punitive event types require
  one — enforced by a CHECK tying `target_type` to reason-required-ness,
  mirroring `application_status_history`'s existing
  `reason`/`to_status`-pairing CHECK pattern from Slice 6)
- `metadata` — bounded `jsonb` object (mirrors
  `vacancy_lifecycle_events.metadata`'s `jsonb_typeof = 'object'` CHECK),
  for narrow, event-type-specific extra fields only — never a dumping
  ground, never raw snapshot data, never secrets

**Grants:** zero `authenticated` grant, exactly `application_status_history`'s
model. Reads are RPC-mediated and scoped to "this operator, for this
specific target" (§4) — no unbounded "dump the whole ledger" RPC by
default, to avoid an accidental unbounded-read surface; a bounded,
paginated, target-scoped read is sufficient for the stated exit criteria.

---

## 3. Proposed audit-event taxonomy

| `target_type` | Fired by | Reason required | Notes |
|---|---|---|---|
| `employer_suspended` | new suspend RPC | Yes | |
| `employer_unsuspended` | new unsuspend RPC | No (proposed — restoration is not punitive) | |
| `vacancy_moderated` | new moderate RPC | Yes | |
| `vacancy_restored` | new restore RPC | No | |
| `verification_approved` | existing `approve_employer_verification`, extended | No | Closes `docs/41` §2.7's history gap; existing RPC signature/result contract unchanged |
| `verification_rejected` | existing `reject_employer_verification`, extended | Yes (already required by the existing RPC) | Same |
| `verification_revoked` | existing `revoke_employer_verification`, extended | Yes (already required) | Same |

Extending the three existing verification RPCs to also write an audit-ledger
row is additive only — their JSON result contracts, parameters, and every
existing pgTAP assertion about them remain unchanged; the only new
behavior is one additional insert inside the same transaction.

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

### 4.1 Every existing employer-mutating RPC must additionally check "not suspended"

`docs/41`'s threat model (§11) requires this to be proven, not assumed.
Proposed exact enumeration for PR 7.2's pgTAP suite to verify — a
suspended employer's session must receive a deterministic `forbidden`-style
result (never a raw permission error, never a silent success) from:

- `create_employer_vacancy_draft`
- `update_employer_vacancy_draft`
- `replace_employer_vacancy_languages`
- `delete_employer_vacancy_draft`
- `publish_employer_vacancy`
- `pause_employer_vacancy` / `resume_employer_vacancy`
- `fill_employer_vacancy` / `withdraw_employer_vacancy`
- `renew_employer_vacancy_to_draft`
- `request_employer_verification`

Employer applicant-review RPCs (Slice 6: list/detail/transition) are
**deliberately excluded** from this list at proposal stage — D-070 already
established that employer review of *already-submitted* applications
should not be gated on the employer's current standing (mirroring "review
survives verification revocation"), and a suspended employer withholding a
decision from candidates who already applied is arguably worse for those
candidates than letting the review continue. This is flagged as an
explicit design question for PR 7.2's own review, not silently decided
here — but the default proposed behavior is: **suspension blocks new
employer-initiated changes; it does not retroactively hide already-
submitted candidates' pending review from the employer.**

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

The existing `is_vacancy_effectively_public`/`get_effective_public_vacancy`/
`list_effective_public_vacancies` functions (Slice 5) gain one additional
`and not exists (select 1 from vacancy_moderation vm where vm.vacancy_id = v.id and vm.moderated_at is not null)`-style
condition. This is the *only* proposed change to already-shipped Slice 5
code, and it is additive-only (narrows visibility further, never widens
it) — every existing pgTAP assertion about effective-public visibility
must continue to pass unchanged; new assertions are added, not modified.

---

## 6. RLS/grants summary

| Object | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| `employer_suspension` (table) | none | none | ALL |
| `vacancy_moderation` (table) | none | none | ALL |
| `admin_audit_events` (table) | none | none | ALL |
| `suspend_employer` / `unsuspend_employer` / `moderate_vacancy` / `restore_vacancy` | revoked | EXECUTE (operator-gated internally) | n/a |
| `get_employer_moderation_status` / `get_vacancy_moderation_status` | revoked | EXECUTE (operator-gated internally) | n/a |
| `is_current_employer_suspended` (or equivalent inline field) | revoked | EXECUTE (own-account-scoped) | n/a |

No new RLS policy is proposed on `employer_profiles`, `vacancies`, or any
other existing table — exactly D-070's own precedent ("no RLS policy is
added to `applications` itself"; operator access is RPC-only). The only
existing-table change is `employer_profiles`/`vacancies`' own mutating
RPCs gaining an additional internal suspension/moderation check (§4.1),
not a new RLS policy.

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
any special-casing.

---

## 11. Migration and testing plan (for PR 7.2 to execute against)

- One additive migration (13th): the three new tables, their grants/RLS
  (zero-`authenticated`, mirroring `application_status_history`), the new
  RPCs, and the additive "not suspended" check folded into each RPC
  enumerated in §4.1, plus the additive "not moderated" clause folded into
  the three existing effective-public functions (§5.3).
- No change to any existing table's column set, CHECK constraint, or RLS
  policy beyond the internal-function-body additions above.
- pgTAP suite (new file, following `28_application_status_and_review_contract_test.sql`'s
  structure) must prove, at minimum:
  - non-operator and unauthenticated calls to every new RPC return
    `forbidden`/`unauthenticated`, never raw errors, never partial success;
  - suspend → every RPC in §4.1's list returns a blocked result for that
    employer, proven individually per RPC, not asserted once and assumed
    to generalize;
  - suspend does not affect Slice 6 employer applicant-review RPCs (the
    explicit exclusion in §4.1);
  - moderate → the vacancy disappears from all three effective-public
    functions, proven against existing Slice 5 pgTAP fixtures without
    breaking any existing assertion;
  - moderate does not affect a *different* vacancy from the same employer;
  - restore reverses visibility correctly, including the "employer changed
    state underneath the hold" case from §10;
  - audit-ledger events are append-only (no UPDATE/DELETE grant to any
    role but `service_role`), have DB-derived actor and timestamp
    (attempting to pass one has no effect / is not accepted as a
    parameter), and are correctly scoped per target;
  - concurrency: two simultaneous suspend attempts on the same employer
    resolve deterministically (one `ok`, one `already_in_state`), matching
    Slice 5/6's own concurrency pgTAP precedent.
- Generated TypeScript types regenerate cleanly (`pnpm db:types:check`
  clean diff) — no manual edits.
- Migration count becomes 13; `pnpm proof:migrations` updated expectation.

# Slice 8 Data-Removal Proposal — Account Export to Confirmed Data Removal

**Status:** Accepted contract. This document distills the reasoning in
`docs/45-slice-8-discovery.md` into the authoritative export/deletion
contract — analogous to how `docs/43` distilled `docs/41` for Slice 7.
D-076–D-084 in `docs/10-decisions.md` were Accepted 2026-08-07, following
a corrective review pass. No migration, no runtime code, no RLS change is
introduced by this document — PR 8.2 is the first authorized
implementation unit, and must follow this contract exactly, deferring
only genuine implementation details (e.g. exact SQL identifiers) not
already fixed here. PR 8.2 is merged. This §2 export boundary left two
behaviors genuinely unresolved — dual-capability export scope, and how
the employer's application-process metadata (§2's "narrow application
process metadata only") would actually be read given the current RLS/RPC
surface — closed by D-088 (role-scoped exports) and D-089 (a dedicated
narrow employer-export read RPC) respectively, both Accepted 2026-08-08;
see `docs/10-decisions.md`. PR 8.3 is accordingly split into PR 8.3a (the
D-089 read contract, merged) and PR 8.3b (the export API/UI this §2
describes — implementation-complete locally, awaiting review).

## 1. Current-state graph (summary; full inventory in `docs/45` §2)

```
auth.users
├── candidate_profiles [CASCADE] ──┬── candidate_languages [CASCADE]
│                                   └── applications.candidate_id [CASCADE]
│                                           └── application_status_history [CASCADE]
│                                               (actor_user_id → auth.users, NO ACTION)
└── employer_profiles [CASCADE] ───┬── companies.owner_employer_id [NO ACTION — blocks]
                                    ├── vacancies.employer_profile_id [NO ACTION — blocks]
                                    │       ├── vacancy_language_requirements [CASCADE]
                                    │       ├── vacancy_lifecycle_events [RESTRICT — blocks]
                                    │       ├── applications.vacancy_id [RESTRICT — blocks]
                                    │       └── vacancy_moderation [CASCADE]
                                    └── employer_suspension [CASCADE]

admin_audit_events.target_id — no FK at all (survives any deletion trivially)
admin_audit_events.actor_user_id, employer_suspension.suspended_by,
vacancy_moderation.moderated_by, employer_profiles.verification_reviewed_by
  → auth.users, all NO ACTION (block deleting an operator who ever acted)
```

**Load-bearing fact:** a literal `DELETE FROM auth.users` for an employer
with any vacancy, company, or applicant-review history **fails today** —
blocked by the `NO ACTION`/`RESTRICT` defaults above, not by anything this
proposal adds. This proposal is designed to work *with* that existing
safety property, not around it.

## 2. Export payloads

### Candidate export

Included: Auth account section (`email`, `created_at` — **decided, not
flagged**; `last_sign_in_at` excluded because no concrete user-value
requirement for it has been identified, and password/session/token
material is never included regardless of this decision); own
`candidate_profiles` fields, `candidate_languages`, own
`applications` (id/status/submitted_at/own `candidate_snapshot`/narrow
public-safe `vacancy_snapshot` projection), candidate-safe
`application_status_history` projection (`to_status`/`occurred_at` only —
identical to the existing `list_current_candidate_application_status_history`
shape).

Excluded: employer/operator reasons or identities, other candidates' data,
Auth secrets, raw internal metadata.

### Employer export

Included: Auth account section (`email`, `created_at` — same decision as
candidate export above); own `employer_profiles` fields, own `companies`
row (organisation only), owned `vacancies` (current fields only, not
`vacancy_lifecycle_events` history) plus their structured
`vacancy_language_requirements` rows, narrow application **process
metadata only** per vacancy (id/status/submitted_at/count).

**Excluded, non-negotiable for this proposal:** `applications.candidate_snapshot`
in any form, candidate name/email/profile fields, candidate Auth identity,
`application_status_history.actor_user_id`, operator IDs, operator
moderation/verification reasons, other employers' data, password hashes
or session/token material. Viewing one applicant's snapshot at a time
(existing D-070 contract) is not the same privacy posture as
bulk-exporting every candidate snapshot an employer has ever seen — this
proposal treats them as materially different and only permits the former
to remain unchanged.

### Delivery mechanism

Immediate, server-generated, downloadable JSON. No background job, no
object-storage archive, no email delivery (would reopen D-075's
transactional-email deferral). Bounded by `auth.uid()`; no caller-supplied
target-user parameter; versioned envelope (`"version": 1`); deterministic
content (only a `measuredAt`/`exportedAt`-style field varies run to run).

## 3. Deletion state machine

`pending` → `processing` → `completed` | `failed`. Created by the owning
user only, with the target always derived from `auth.uid()` — never a
caller-supplied user ID, on either the request-creation path or the
privileged processing path (which derives its target exclusively from the
claimed request row).

**Concurrency contract (exact):** at most one **active** (`pending` or
`processing`) request per user, enforced at the schema level. **Per
D-085, "per user" means per `auth.uid()`/Stint account, not per role** —
a dual-capability account (D-047) has exactly one deletion request
covering whichever capability/capabilities it holds, never a parallel
candidate request and employer request. A duplicate request while
`pending` returns the existing request rather than creating a second row.
The processor claims `pending` → `processing` under a row lock /
deterministic single-writer transition, so two concurrent claim attempts
cannot both succeed. Cancellation is allowed **only** while `pending`;
once processing has claimed the request, cancellation is impossible
(anonymization is destructive by design and cannot be safely unwound).
**No mandatory cooling-off period for MVP** — `pending` is a process
state, not a promised waiting window; the only reversibility guarantee is
"cancel before the processor claims the request."

**Processing phases and evidence (exact — full detail in `docs/45` §10.2):**
1) claim request under row lock; 2) run the domain anonymization
transaction (§4/§5 — for a dual-capability account, **both** run inside
this one atomic transaction per D-085, never as two separately committed
transactions); 3) record domain-scrub evidence (a durable marker,
conceptually `domain_scrubbed_at`); 4) invoke Auth soft delete (§7); 5)
verify the Auth result; 6) record Auth-deletion evidence
(`auth_deleted_at`) and transition to `completed` — only once both
markers exist. If step 4 fails, the request remains safely retryable
(steps 2/3 are already idempotent). If step 4 succeeds but step 6's
persistence fails, the now-deleted user cannot authenticate to retry
anything — a narrow, manually-invoked, privileged reconciliation
operation (not a background worker) re-confirms the Auth deletion
independently and completes the request without requiring the user to
authenticate (`docs/45` §10.2).

Idempotent processing by construction: re-running anonymization or the
Auth scrub against an already-processed account is a safe no-op, since
both always write the same fixed placeholder/target state rather than
computing a diff. Raw Auth/database errors are never persisted to any
user-visible field — a `failed` request carries a fixed, generic reason
code only.

No email-based confirmation (D-075 unchanged); confirmation is in-app
only. The user sees a final processing/success confirmation screen
**before** their local session ends (not on a later sign-in attempt); the
session/refresh tokens are then revoked as supported. After deletion, any
future login attempt receives the ordinary generic Auth failure state —
no special "this account was deleted" message, and no identifier is
retained to enable one. An independent local proof script (§12) provides
operator/founder-facing verification of the underlying data claim,
including that a stale pre-delete JWT is rejected even before its own
expiry.

## 4. Candidate removal graph

*Runs whenever a candidate profile exists on the target account — for a
dual-capability account (D-047), inside the same atomic transaction as
§5, per D-085.*

**`candidate_profiles`:** preserved as a **structural tombstone row**
(preserved applications depend on this FK anchor) — `account_deleted_at`
is set; `display_name`/`german_comfort`/`work_authorisation_declared`/
`work_authorisation_declared_at`/`city`/`travel_radius_minutes`/
`available_from`/`job_categories`/`employment_types`/`shift_preferences`
are cleared/replaced with fixed placeholders; `onboarding_completed_at`/
`created_at` are preserved as lifecycle facts (full field matrix:
`docs/45` §6).

**`candidate_languages`:** **all rows DELETED** (not anonymized in
place) — this table carries no FK any preserved row depends on.

**`applications` (per row the candidate submitted):** `id`/`vacancy_id`/
`status`/timestamps and `vacancy_snapshot` are **preserved unchanged**;
`candidate_snapshot` is **replaced** with one fixed, versioned tombstone
shape. **Confirmed at PR 8.2**: the `{"version": 1, "deleted": true}`
conceptual minimum required extension — `candidateSnapshotV1Schema` and
the employer-side applicant list/detail schemas require non-nullable
`display_name`/`job_category`/`german_comfort`/`employment_types`/
`shift_preferences` — so the implemented tombstone is `{"version": 1,
"deleted": true, "display_name": "Deleted candidate", "job_category":
"cleaning", "german_comfort": "none", "languages": [],
"work_authorisation_declared": false, "available_from": null,
"employment_types": ["full_time"], "shift_preferences": ["flexible"]}`,
using one fixed, non-identifying constant per required field (identical
for every deleted candidate, so no information about the real value is
disclosed) — this keeps the employer's existing, unmodified applicant
list/detail views rendering "Deleted candidate" instead of failing to
parse, satisfying the "employer can still see an applicant (deleted)
applied and reached status X" preservation goal without any runtime
TypeScript change.

**`application_status_history`:** preserved unchanged, including
`actor_user_id` (the employer's own identity) — access by the deleted
candidate is blocked by the `account_deleted_at` gate (§7), not by
modifying the row.

Auth: processed via mechanism B (`deleteUser(id, true)`, §7) — `auth.users`
row itself is **not** deleted, only soft-deleted.

**Preserved, summarized:** the `applications` row itself, its `status`,
its `vacancy_snapshot`, and its full `application_status_history` — so
the employer's own applicant-list/review record continues to show "an
applicant (account deleted) applied and reached status X," never a
silently-vanished row.

**Preserved does not mean ongoing (D-087):** a preserved application is a
frozen historical record, not an ongoing recruitment workflow — candidate
deletion freezes that candidate's application at its current state. Once
the owning candidate has `account_deleted_at` set, the employer may keep
reading the preserved application, its status, and its history, but
`transition_current_employer_application_status` denies any further
status transition (existing `unavailable` result) and
`get_current_employer_application` reports `allowed_transitions: []`.
D-070's ordinary transition state machine remains authoritative only
while the owning candidate's account is active; full decision text:
`docs/10-decisions.md` D-087.

## 5. Employer removal graph — the graph most likely to be scrutinized

*Runs whenever an employer profile exists on the target account — for a
dual-capability account (D-047), inside the same atomic transaction as
§4, per D-085. Includes the D-086 current-state moderation cleanup (§6).*

**`employer_profiles`:** preserved as a **structural tombstone row**
(`vacancies.employer_profile_id`/`companies.owner_employer_id` are `NO
ACTION`) — `account_deleted_at` is set; `display_name`/`berlin_locality`/
`phone`/`website`/`organisation_legal_name` are cleared/replaced;
`verification_state`/`verification_reviewed_by`/`verification_reviewed_at`
are preserved as operator-facing historical fact (full field matrix:
`docs/45` §7).

**`companies` (organisation employers only):** `name` replaced with a
fixed placeholder; **`slug` replaced with a deterministic, non-PII
tombstone value, `deleted-company-<uuid>`, derived only from the
company's own immutable `id`** — never from name/email. **The
pre-deletion slug is not automatically freed for reuse**; it remains
permanently retired unless a separate, explicit future product decision
introduces a slug-release mechanism.

Every vacancy the employer owned is explicitly withdrawn first (reusing
the existing `withdraw_employer_vacancy` RPC pattern, scoped to the
requester's own rows), so it stops being effective-public immediately via
the existing canonical predicate — no new visibility logic is introduced.
Auth: processed via mechanism B (§7), row not deleted.

**Preserved, unconditionally:** `vacancies`, `vacancy_language_requirements`,
`applications`, `application_status_history` — **nothing in the candidate
application chain is written to, deleted, or cascaded.** This is the
direct answer to "can employer deletion destroy candidate application
history": **no**, by construction — the proposal never touches those
tables at all, rather than relying on careful cascade tuning to avoid it.
`admin_audit_events` referencing the employer/its vacancies is preserved
per §6 below.

## 6. Audit-event retention

`admin_audit_events.id`/`target_id`/`target_kind`/`event_type`/
`actor_user_id`/`created_at` are retained unconditionally after any
employer/vacancy anonymization — no FK exists to violate, and an opaque
UUID pointing at an anonymized-but-still-present row carries no more
information than before.

**Decided (not left open): `reason` is redacted for audit rows targeting
a deleted account.** For any `admin_audit_events` row whose `target_id`
resolves to an employer (or one of its vacancies) that has since been
deleted, `reason` is replaced with a fixed marker, `"[redacted after
account deletion]"`, at the moment deletion processing anonymizes that
employer. This is an **explicit, narrow Slice 8 exception/supersession
to D-074's immutable-reason contract** — not a silent contradiction of
it. D-074's tamper-evident-history purpose is preserved by the taxonomy
(`event_type`/`target_kind`/`created_at`) remaining fully intact; only
free-text content that could embed the deleted subject's own
user-provided information is replaced, and only with the fixed marker —
no other mutation of `admin_audit_events` is introduced, and the
supersession applies only to rows whose target has actually been
deleted.

**Current-state moderation tables — resolved by D-086, not covered by
the redaction contract above.** `employer_suspension.suspended_reason`
and `vacancy_moderation.moderated_reason` are `NOT NULL` free-text
current-state columns, distinct from the durable `admin_audit_events`
ledger. Because `employer_profiles`/`vacancies` are tombstoned rather
than deleted, their existing `ON DELETE CASCADE` to these two tables
never fires. **D-086 decides removal, not redaction**: as part of the
same employer anonymization transaction, the current `employer_suspension`
row for the deleted employer and every current `vacancy_moderation` row
for a vacancy it owns are deleted outright — not preserved, not redacted
in place. `unsuspend_employer`/`restore_vacancy` are not called for this
cleanup (their business semantics don't apply and would generate
misleading `employer_unsuspended`/`vacancy_restored` audit events); no
ordinary `authenticated`/`anon` grant exists for this DELETE. The
historical fact remains solely in `admin_audit_events`, redacted per the
contract above.

## 7. Auth deletion mechanism

**Three distinct Supabase Auth Admin API mechanisms were compared (full
table: `docs/45` §3.1) — not two, and not treated as equivalent:**

- **A. Hard delete** (`deleteUser(id)` / `deleteUser(id, false)`) —
  **rejected**: destroys the `auth.users` row the tombstone design (§4/§5)
  depends on. For candidates, this is technically possible today under the
  existing cascade graph but would destroy the D-078 tombstone and
  preserved application/history records. For employers, it is
  additionally blocked outright today by the `NO ACTION`/`RESTRICT` FKs
  in §1 whenever dependent company, vacancy, review, or actor records
  exist. In both roles, hard deletion is incompatible with the accepted
  tombstone/preservation contract.
- **B. Soft delete** (`deleteUser(id, true)`) — **preferred.** Supabase's
  own explicit deletion primitive; the `auth.users` row remains (avoiding
  the FK landmine entirely, not working around it); no custom
  synthetic-email lifecycle needs to be invented; non-reversible, matching
  deletion's intent; requires `service_role`.
- **C. Manual scrub + `ban_duration`** — rejected as the primary
  mechanism: reversible and semantically designed for temporary
  restriction (suspension-like), not permanent deletion; kept only as a
  documented alternative, not adopted.

**Mechanism B is the accepted choice (D-080).** The literal method is not
called anywhere in PR 8.1; **PR 8.4 must independently verify the exact
local Supabase behavior of `deleteUser(id, true)`** as an
implementation-verification step before this proof is treated as
complete.

**Critical, separate finding — the stale-JWT problem (`docs/45` §3.2):**
deleting/soft-deleting an Auth user does **not** immediately invalidate an
already-issued JWT — a previously issued access token remains
cryptographically valid until its own expiry regardless of which of A/B/C
is used. **"Cannot sign in again" is not sufficient enforcement.**
Slice 8 therefore requires an independent **database-level deleted-account
gate** (`docs/45` §3.3): nullable `account_deleted_at timestamptz` on
`candidate_profiles`/`employer_profiles` (no shared `profiles` table),
composed into every candidate/employer RLS policy and `SECURITY DEFINER`
RPC via canonical helpers (`_is_current_candidate_deleted()`/
`_is_current_employer_deleted()`, mirroring the existing
`_is_current_employer_suspended()` pattern from PR 7.2) — the full
required audit scope (profile reads/writes, onboarding, vacancy
lifecycle, applications, verification, applicant review, etc.) is
enumerated in `docs/45` §3.3 and must be implemented in PR 8.2, not this
PR.

The overall design combines: a self-scoped `SECURITY DEFINER` RPC
performing the public-schema anonymization (§4/§5, `auth.uid()`-scoped, no
caller-supplied target ID); the isolated, server-only mechanism-B
processing step (the only point in the whole design touching privileged
`service_role`/Auth Admin credentials, confined to this one path); and the
`account_deleted_at` database gate as the actual real-time enforcement
layer, since the Auth deletion call itself cannot be relied on to block a
live, unexpired token.

## 8. Error/idempotency model

Full six-phase processing order (claim → domain anonymization → record
domain-scrub evidence → invoke Auth soft delete → verify Auth result →
record Auth-deletion evidence + complete) is specified exactly in §3
above and `docs/45` §10.2, including the reconciliation mechanism for the
case where Auth deletion succeeds but the final evidence-write fails.
Public-schema anonymization always runs before the Auth call and is
independently, durably evidenced (`domain_scrubbed_at`) before the Auth
step begins. "Completed" is only ever set once both the domain-scrub and
Auth-deletion evidence markers are independently confirmed present.

## 9. Authorization

Export and deletion both: current authenticated user only, no
caller-supplied target ID, role determined server-side, no operator-only
data ever included, no `service_role` in the ordinary runtime, all
mutating actions are Server Actions/RPCs (never GET), explicit destructive
confirmation UI (checkbox/typed-acknowledgement, matching PR 7.3's
suspend/moderate pattern), stale/replayed requests are safe by the
idempotency model in §8.

## 10. Privacy boundaries

Restated from §2: candidate export never contains employer/operator
data; employer export never contains candidate snapshot/PII. Both
`candidateSnapshotV1Schema`/`vacancySnapshotV1Schema` must be re-audited
field-by-field against these boundaries at implementation time (PR 8.3b),
not assumed correct from this document alone.

## 11. Confirmation semantics

In-app only (no email, per D-075). A final processing/success
confirmation screen is shown **before** the local session ends (the user
is still authenticated when they see it) — not deferred to a later
sign-in attempt. Session/refresh tokens are then revoked as supported.
After deletion, any subsequent login attempt receives the ordinary
generic Auth failure state; no special "account deleted" login message is
shown, and no identifier is retained solely to enable one. "Confirmed
removal" requires all four: the request reached `completed`; domain
anonymization is evidenced (`domain_scrubbed_at`); Auth soft-delete is
evidenced (`auth_deleted_at`); and local deterministic proof confirms the
deleted principal cannot access the account surface **even with a stale,
not-yet-expired pre-delete JWT** (§7's stale-JWT finding). User-visible
confirmation and DB-verifiable proof are two separate, complementary
mechanisms, not one standing in for the other.

## 12. Proof strategy

`scripts/proof/account-deletion.mts` (name provisional), same
architectural pattern as `scripts/proof/pilot-funnel.mts` (thin CLI
wrapper, pure logic in `src/lib/proof/`, localhost-only guard reused).
Unlike the read-only funnel proof, this proof necessarily performs writes
against disposable local fixture accounts it creates itself. Full
assertion list in `docs/45` §14, and **must include, for both candidate
and employer fixtures: obtain a valid JWT before deletion; process
deletion to completion; attempt protected reads/mutations using that
same, still-unexpired, pre-delete JWT; prove they are denied by the
`account_deleted_at` gate** — not merely that a fresh sign-in fails. Also
proves: fresh login cannot be established; an unrelated account remains
fully functional; preserved application/history records are unchanged;
`candidate_snapshot` matches the exact versioned tombstone shape;
`candidate_languages` rows are gone; deleted-employer vacancies are not
effective-public; and audit-event `reason` redaction matches §6. **Not
implemented or run in PR 8.1.** Hosted deletion/export proof is explicitly
**not proposed** for Slice 8 — deleting even a disposable hosted account
is a materially different risk class from any hosted proof run so far in
this project, and requires its own separate, explicit, owner
authorization if ever pursued.

## 13. Explicit non-goals

Transactional email (unchanged from D-075); background export jobs or
object-storage archives; operator-mediated deletion as the primary path
(evaluated, not adopted); Storage/private-document work (none exists, none
proposed — `docs/45` §9); step-up/recent-auth re-verification as a
deletion precondition (does not exist today; not built here); legal
conclusions of any kind about GDPR Article 15/17 compliance, statutory
retention, or lawful basis; updating the `/privacy`/`/terms`/`/impressum`
placeholder content; hosted proof of any kind; Preview configuration;
Production mutation; a new admin/operator identity system (reuses
`verification_operators` if operator involvement is ever needed at all).

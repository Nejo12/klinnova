# Slice 8 Discovery — Account Export to Confirmed Data Removal

Discovery-only. No migration, no runtime code. The decisions this
document informs live in `docs/10-decisions.md` (D-076–D-084, **Accepted
2026-08-07**, following a corrective review pass) and the distilled
contract lives in `docs/47-slice-8-data-removal-proposal.md`. This
document is the evidence base both are built on; it is retained as the
underlying discovery record and is not itself amended after acceptance.

**Verified base:** `10420cffecfc2d6c23e7ed7d64d8f88c20d35306` (Slice 7
closure merge). Migrations inspected: all 13, in order. Slice 7 is Done
locally (`docs/44-slice-7-exit-proof.md`).

## 1. Governing scope, read in full

`docs/04-mvp.md` — Candidate MVP explicitly includes **"account export and
deletion request"** (line 40). The Employer MVP section does **not**
separately list export/deletion as a bullet, but `docs/13-implementation-plan.md`'s
Slice 8 outcome is explicit that both roles are in scope: *"candidates and
employers can request export and deletion; removal can be confirmed."*
This document treats employer export/deletion as equally in scope —
`docs/04`'s omission reads as an oversight in the original MVP bullet list,
not a deliberate narrowing, and is noted here rather than silently
resolved.

`docs/04-mvp.md`'s explicit **out-of-scope** list includes "document
verification for residence permits or passports" — corroborated by
`NOT_NOW.md`'s parked item (2026-08-05): *"Employer verification document
uploads (Storage) | Slice 5 Proposed path uses profile fields + attestation
only (D-057); document vaulting pulls retention/GDPR forward."* This is a
direct, on-the-record signal from Slice 5 planning that document storage
was deliberately deferred **specifically because** it would complicate
Slice 8 — confirming Part 9's finding below is not an oversight but an
intentional sequencing choice already made.

`docs/07-architecture.md` is the pre-implementation aspirational stack
(Resend, PostHog, Sentry, Supabase Storage, an `employer_verifications`
table, a `reports` table) — none of these were actually built; D-075
(Slice 7) already documented that analytics/email were deferred, and this
document independently confirms Storage was never wired up either (§9).
Treat `docs/07` as historical intent, not current-state evidence; the 13
migrations are authoritative.

`docs/10-decisions.md` D-074's own comment block in the PR 7.2 migration
(`20260807090000_admin_moderation_and_audit_contract.sql`, lines ~85–91)
states verbatim: *"No ON DELETE CASCADE from target_id to any domain table
... audit history is retained even if the employer/vacancy row it concerns
is later deleted. **Slice 8 must separately reconcile this with
account-deletion/GDPR retention requirements; this migration does not
decide that.**"* — this is a direct, planted pointer to §8 below.

## 2. Complete data-ownership inventory

Every table below was inspected directly in its authoring migration —
generated TypeScript types were not used to infer deletion behavior (they
mark every column non-null regardless of actual nullability, and carry no
FK/`ON DELETE`/RLS information at all).

Legend: **PII/UPD** = contains candidate personal or user-linked data;
**EMP** = contains employer personal/business data; **OTHER** = contains
another user's data; **SNAP** = immutable snapshot; **AUDIT** =
operational/audit evidence.

| Table | PK | Owner FK → `auth.users` | Child `ON DELETE` when parent removed | RLS read/write boundary | PII/UPD | EMP | OTHER | SNAP | AUDIT | Export relevance | Deletion relevance |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `candidate_profiles` | `id` | `id → auth.users(id)` **CASCADE** | — | own row only (`select`/`insert`/`update`; **no `delete` policy exists**) | Yes | No | No | No | No | Core candidate export | Cascades from `auth.users`; no RLS delete path exists today |
| `candidate_languages` | `id` | via `candidate_id → candidate_profiles(id)` **CASCADE** | — | own rows only (`select`/`insert`/`update`/`delete`) | Yes | No | No | No | No | Core candidate export | Cascades from `candidate_profiles` |
| `employer_profiles` | `id` | `id → auth.users(id)` **CASCADE** | — | own row only (`select`/`insert`/`update`; **no `delete` policy exists**) | No | Yes | No | No | No | Core employer export | Cascades from `auth.users`; no RLS delete path exists today |
| `companies` | `id` | none directly; `owner_employer_id → employer_profiles(id)` **NO ACTION (default)** | n/a | own company only (via `owner_employer_id`) select/update | No | Yes | No | No | No | Employer export (organisation only) | **Blocks** employer-profile deletion while `owner_employer_id` still references it (no explicit `ON DELETE`) |
| `vacancies` | `id` | none directly; `employer_profile_id → employer_profiles(id)` **NO ACTION (default)**; `company_id → companies(id)` **RESTRICT** | children below | own vacancies (draft visibility) + effective-public read for everyone | No | Yes | No | No | No | Employer export | **Blocks** employer-profile deletion while any vacancy still references it — same default-NO-ACTION landmine as `companies` |
| `vacancy_language_requirements` | `id` | via `vacancy_id → vacancies(id)` **CASCADE** | — | follows vacancy visibility | No | Yes | No | No | No | Employer export (child of vacancy) | Cascades from `vacancies` |
| `vacancy_lifecycle_events` | `id` | `vacancy_id → vacancies(id)` **RESTRICT**; `actor_user_id → auth.users(id)` **NO ACTION (default)**, nullable | — | operator/owner-scoped read via RPC | No | Yes (lifecycle facts) | No | No | Yes | Not currently exported | **Blocks** vacancy deletion (RESTRICT); blocks actor's `auth.users` deletion if they ever acted |
| `applications` | `id` | `candidate_id → candidate_profiles(id)` **CASCADE**; `vacancy_id → vacancies(id)` **RESTRICT** | `application_status_history` below | candidate: own rows only; employer: via RPC on owned-vacancy applications only | Yes (via snapshot) | via snapshot | — | **Yes** (`candidate_snapshot`, `vacancy_snapshot` JSONB) | No | Both candidate and employer export | **Candidate deletion cascades applications away** — this also destroys the employer's own review record of that applicant. Vacancy deletion is blocked while applications exist. |
| `application_status_history` | `id` | `application_id → applications(id)` **CASCADE**; `actor_user_id → auth.users(id)` **NOT NULL, NO ACTION (default)** | — | candidate: read-only own-application history via RPC; employer: same, own-vacancy scope | Yes (indirectly, via which application) | Yes (reviewer identity) | — | No (live rows, not a snapshot) | Yes | Candidate export (status timeline) | Cascades from `applications`; **blocks the reviewing employer's own `auth.users` deletion** as long as any history row records them as `actor_user_id` — true for essentially any employer who has ever reviewed an applicant |
| `employer_suspension` | `employer_profile_id` | `employer_profile_id → employer_profiles(id)` **CASCADE**; `suspended_by → auth.users(id)` **NOT NULL, NO ACTION (default)** | — | zero ordinary grant; RPC-mediated only | No | operator-authored reason (may reference the employer) | No | No | Yes (current-state) | Not exported (operator-only) | Cascades from `employer_profiles`; blocks the *suspending operator's* `auth.users` deletion while the row exists |
| `vacancy_moderation` | `vacancy_id` | `vacancy_id → vacancies(id)` **CASCADE**; `moderated_by → auth.users(id)` **NOT NULL, NO ACTION (default)** | — | zero ordinary grant; RPC-mediated only | No | operator-authored reason (may reference the vacancy) | No | No | Yes (current-state) | Not exported (operator-only) | Cascades from `vacancies`; blocks the *moderating operator's* `auth.users` deletion while the row exists |
| `admin_audit_events` | `id` | `actor_user_id → auth.users(id)` **NOT NULL, NO ACTION (default)**; `target_id` — **no FK at all** (polymorphic, cannot be declared) | — | zero ordinary grant; RPC-mediated only | No | operator-authored `reason` text may name the employer/vacancy | No | No | **Yes — durable ledger** | Not exported (operator-only) | Survives target deletion trivially (no FK to violate); blocks the *authoring operator's* `auth.users` deletion permanently |
| `verification_operators` | `user_id` | `user_id → auth.users(id)` **CASCADE** | — | self-check RPC only (`is_current_user_verification_operator`) | No | No | No | No | No | Not exported | Cascades from `auth.users` — but see `admin_audit_events`/`employer_suspension`/`vacancy_moderation` above: a former operator's audit trail still blocks *those* FKs even after `verification_operators` itself is gone |
| `employer_profiles.verification_state`/`verification_requested_at`/`verification_reviewed_at`/`verification_review_reason` | — (columns on `employer_profiles`) | `verification_reviewed_by → auth.users(id)` **NO ACTION (default)**, nullable | — | see `employer_profiles` | No | Yes | operator identity | No | Partial (state is current-state, not history) | Employer export (own state) | No separate "employer_verifications" table exists (the aspirational `docs/07` entity was never built this way); blocks the *reviewing operator's* `auth.users` deletion if they ever reviewed anyone |
| `auth.users` | `id` | — | see every row above | Supabase Auth-managed | Yes (email, timestamps) | Yes (email, timestamps) | No | No | No | Decision required — see §4/§5 | Root of every cascade above; Supabase-managed, not directly writable by application RLS |

**No `employer_verifications`, `job_verifications`, `reports`, `saved_jobs`,
or `audit_events` table exists** despite appearing in the aspirational
`docs/07-architecture.md` entity list — the actual schema uses columns on
`employer_profiles` for verification state and the PR 7.2 tables
(`employer_suspension`/`vacancy_moderation`/`admin_audit_events`) for
moderation/audit. This document's inventory reflects the real schema, not
the aspirational one.

## 3. Auth-user deletion mechanisms compared

The critical constraint discovered in §2: **`vacancies.employer_profile_id`
and `companies.owner_employer_id` reference `employer_profiles` with no
explicit `ON DELETE` clause — PostgreSQL's default is `NO ACTION`.** The
same default applies to every `actor_user_id`/`suspended_by`/`moderated_by`/
`verification_reviewed_by` column referencing `auth.users` directly. This
means: **a literal, hard removal of an `auth.users` row for an employer
who owns any vacancy, owns a company, or has ever reviewed a single
applicant will fail today with a foreign-key violation and roll back** —
the cascade from `auth.users` reaches `employer_profiles` (which *is*
`ON DELETE CASCADE`), but then hits `vacancies`/`companies`/
`application_status_history` referencing that `employer_profiles` row with
no cascade action, which blocks the whole transaction. The same applies,
more narrowly, to any operator who has ever suspended/moderated/reviewed
anything (blocked by `employer_suspension.suspended_by`,
`vacancy_moderation.moderated_by`, `admin_audit_events.actor_user_id`,
`employer_profiles.verification_reviewed_by`). Critically, this same
`ON DELETE CASCADE` from `auth.users` to `candidate_profiles`/
`employer_profiles` is **also incompatible with keeping a structural
tombstone row** (§6/§7's preferred candidate/employer deletion contract):
if the `auth.users` row is genuinely, physically removed, the
`candidate_profiles`/`employer_profiles` tombstone row is destroyed with
it, along with every field this proposal wants to *preserve* in
anonymized form.

Candidate deletion via a hard `auth.users` row removal is structurally
simpler at the FK level (`candidate_profiles` → `candidate_languages`/
`applications` → `application_status_history` are all `ON DELETE CASCADE`
down to the leaf, so it would not be blocked) — but it would still
destroy the candidate's own tombstone row and, transitively, the
employer's application/review record for anything not otherwise preserved
(see §6).

### 3.1 Three distinct Supabase Auth Admin API mechanisms — not equivalent

The Supabase Auth Admin API (`supabase.auth.admin.*`, requiring the
`service_role` key, callable only from a trusted server context) exposes
more than one way to remove/restrict a user, and they are **not
interchangeable**:

| | **A. Hard delete** — `deleteUser(id)` / `deleteUser(id, false)` | **B. Soft delete** — `deleteUser(id, true)` | **C. Manual scrub + ban** — `updateUserById(id, {...})` + `ban_duration` |
|---|---|---|---|
| **FK behavior** | The `auth.users` row is physically removed. Triggers the `ON DELETE CASCADE` in §2 — **destroys** the `candidate_profiles`/`employer_profiles` tombstone row this proposal depends on. **Incompatible with §6/§7's tombstone design.** | The `auth.users` row is **retained** (Supabase marks it deleted internally rather than removing it) — the CASCADE FK is never triggered. **Compatible** with keeping a public-schema tombstone row. | Row obviously retained (never touched by a delete call at all) — same FK compatibility as B. |
| **PII-removal behavior** | Complete — the row and all its Auth-internal fields (email, phone, identities, metadata) are gone. | Supabase's own built-in erasure semantics apply to the Auth-managed fields (email/phone are cleared/marked by GoTrue itself as part of the soft-delete operation) — this is Supabase's native "erase this identity" primitive, not custom application logic. **Exact current field-level behavior in the pinned local Supabase CLI version must be verified locally before PR 8.4's acceptance proof** — flagged, not assumed. | Requires the application to manually null/scrub every identifying field via `updateUserById` (`email`, `phone`, `user_metadata`) — no Supabase-native guarantee of completeness; a forgotten field is a silent gap this repository would own, not Supabase. |
| **Sign-in behavior** | Impossible — user no longer exists. | Blocked — Supabase soft-deleted users cannot authenticate. | Blocked via `ban_duration` — a **temporary** restriction mechanism by design, even when set to a very large value. |
| **Reversibility** | Irreversible (the row is gone). | **Non-reversible** per Supabase's own documented behavior — once soft-deleted, the account cannot be "undeleted" through the Admin API. Matches the user's actual intent for a permanent deletion request. | **Reversible** — `ban_duration` is designed to be lifted (e.g. by an admin), which is a materially different semantic promise than "your account and its data are gone." Reusing the same primitive Slice 7 already built for *temporary* employer suspension would blur two deliberately distinct concepts (temporary, appealable restriction vs. permanent, user-requested removal). |
| **Session/JWT behavior** | Auth-internal session/refresh-token records are removed, **but a previously issued, still-unexpired access token (JWT) is a self-contained signed credential** — Supabase does not necessarily re-validate it against a live `auth.users` lookup on every request by default. **This limitation is identical across A, B, and C** — see §3.2, it is not a reason to prefer one mechanism over another. | Same limitation as A — refresh-token renewal is blocked, but a live access token is not retroactively invalidated by itself. See §3.2. | Same limitation as A/B. See §3.2. |
| **`service_role` requirement** | Yes — Admin API. | Yes — Admin API. | Yes — Admin API. |
| **Retry semantics** | Retrying against an already hard-deleted user returns a "user not found"-class error — must be treated as evidence of prior success, not a fresh failure. | Retrying against an already soft-deleted user should be safe, but the **exact local GoTrue behavior (no-op vs. benign error) must be verified locally**, not assumed — flagged for PR 8.4. | Re-applying the same scrub/ban is safe by construction (idempotent update). |
| **Compatible with candidate/employer tombstone rows (§6/§7)?** | **No** — actively destroys them. | **Yes** — this is the only one of the three whose Auth-side behavior and the proposed public-schema tombstone design agree with each other. | Yes, but with the reversibility/completeness caveats above. |

**Preferred mechanism: B — `auth.admin.deleteUser(userId, true)`**, through
one isolated, server-only privileged module (unchanged from the general
E+F shape below), unless local verification in PR 8.4 disproves the
platform behavior described above. Reasons: it is Supabase's own explicit
deletion primitive (not a repurposed suspension mechanism, not
hand-rolled scrub logic this repository would have to keep correct as
Supabase's own user-metadata shape evolves); the `auth.users` row remains,
so it never collides with the `ON DELETE CASCADE` FK graph in §2; it is
non-reversible, matching the user's actual intent; and it keeps every
privileged Auth operation inside one narrow boundary exactly like
mechanism C's caveats already required. **Mechanism B is the accepted
choice (D-080)** — the literal method is not called anywhere in PR 8.1,
and PR 8.4 must independently verify the exact local Supabase
behavior (field-level erasure, retry semantics) before treating this
proof as complete, per the "verify locally before acceptance proof"
requirement.

### 3.2 The stale-JWT problem — a separate, critical finding

**Deleting or soft-deleting a Supabase Auth user does not immediately
invalidate an already-issued access token (JWT).** Supabase access tokens
are self-contained signed credentials; a previously issued, unexpired
token can remain cryptographically valid and pass standard JWT signature
verification until its own expiry, regardless of which of A/B/C above is
used, and regardless of whether the user can start a *new* session. This
is a platform property, not a bug this repository introduced, and it
means: **"the user cannot sign in again" is necessary but not sufficient
authorization enforcement.** A malicious or simply slow client holding a
still-valid pre-deletion token could otherwise continue to read or write
through any RLS policy or RPC that only checks "is this `auth.uid()`
present," without also checking whether that principal's account has been
marked deleted.

**This is why Slice 8 needs its own database/application-level deleted-account
gate, independent of and in addition to Auth-level deletion** — elaborated
in §3.3 below, proposed formally as part of D-080/D-081 in
`docs/10-decisions.md`, and required as an explicit local-proof assertion
in §14.

### 3.3 Deleted-account database gate (proposed)

**Proposed:** add one nullable, durable timestamp to each owning-profile
table — `candidate_profiles.account_deleted_at timestamptz` and
`employer_profiles.account_deleted_at timestamptz` — set exactly once,
by the anonymization RPCs in §6/§7, never cleared. No shared `profiles`
table is introduced solely for this (each column lives on the table that
already anchors that role's identity, matching the existing
per-role-table convention this repository has used since Slice 1).

**Canonical helper functions (proposed):** mirroring the exact
established pattern of `_is_current_employer_suspended()`/
`is_current_employer_suspended()` from PR 7.2, propose
`_is_current_candidate_deleted()` and `_is_current_employer_deleted()` —
zero-argument, `auth.uid()`-scoped, `SECURITY DEFINER` where an RLS policy
needs to call them (RLS predicates evaluate under the querying role, so a
policy-callable wrapper needs the same authenticated-EXECUTE grant
`is_current_employer_suspended()` already established), returning
`account_deleted_at IS NOT NULL` for the calling principal. Every RLS
policy and RPC below composes with `NOT _is_current_*_deleted()` (or
reads `account_deleted_at IS NULL` directly where a helper call is not
the natural shape), exactly the same pattern PR 7.2 already proved out for
suspension.

**Once `account_deleted_at` is set, ordinary business access must fail
even if the caller still holds an unexpired JWT** — this is the whole
point of the gate; it does not rely on the JWT itself.

**Surfaces requiring the gate (categorical enumeration for PR 8.2;
exact current RPC/policy names to be confirmed against the schema at
implementation time, not fixed here):**

**Candidate:**

| Surface | Current mechanism | Gate required |
|---|---|---|
| Candidate profile read/write | `candidate_profiles_select_own`/`_insert_own`/`_update_own` RLS | Yes — compose `account_deleted_at IS NULL` into the write policies at minimum; read policy should also gate business-meaningful reads (the tombstone row's own existence is not itself sensitive, but nothing else should be reachable) |
| `candidate_languages` read/write | `candidate_languages_select_own`/`_insert_own`/`_update_own`/`_delete_own` RLS | Yes |
| Onboarding completion | onboarding-completion trigger/RPC path (`reconcile_onboarding_completion()` and any caller-invoked completion RPC) | Yes |
| Candidate matching/list/detail | `resolve_current_candidate_vacancy_match`, `list_current_candidate_vacancy_matches` | Yes |
| Application submission | `submit_candidate_application` | Yes |
| Candidate application list/detail/history | `applications_select_own` RLS, `list_current_candidate_application_status_history` | Yes |

**Employer:**

| Surface | Current mechanism | Gate required |
|---|---|---|
| Employer profile read/write | `employer_profiles_select_own`/`_insert_own`/`_update_own` RLS (already narrowed once for suspension in PR 7.2 — the same policy gains a second, independent condition) | Yes |
| Company read/write | `companies_select_own_employer`/`_update_own_employer` RLS | Yes |
| Onboarding completion | `complete_employer_onboarding` | Yes |
| Vacancy lifecycle (create/edit/publish/pause/resume/fill/expire/withdraw/renew) | the full PR 5.4 lifecycle RPC set (`publish_employer_vacancy`, `pause_employer_vacancy`, `resume_employer_vacancy`, `fill_employer_vacancy`, `withdraw_employer_vacancy`, `materialize_vacancy_expiry`, `renew_employer_vacancy`) plus the PR 4.x draft-vacancy write RPCs/RLS | Yes — every one |
| Verification request | the employer verification-request RPC (PR 5.3) | Yes |
| Applicant list/detail/status transition | `list_current_employer_applications`, `get_current_employer_application`, `transition_current_employer_application_status` | Yes |

A deleted account must never regain business access merely because its
JWT has not yet expired — this must hold even immediately after
processing completes, not only after the token would have expired
naturally. **No policy/RPC change is implemented in this PR** — this
table is the required scope for PR 8.2, not a diff.

**Recommendation carried into `docs/47`:** combine **E** (a request
record decouples the user-visible action from privileged processing) with
the **B**-mechanism Auth step above, gated by the deleted-account database
check in §3.3 as the actual authorization enforcement (not the Auth
deletion call itself, which — per §3.2 — cannot be relied on for
real-time enforcement against a live token). This confines
`service_role` to one narrow, explicitly-triggered processing path,
avoids the FK-cascade/tombstone incompatibility in §3.1, and closes the
stale-JWT gap with a mechanism this repository already fully controls and
has already proven out once (PR 7.2's suspension gate).

### 3.4 Whole-account deletion for dual-capability identities (D-085)

**Discovered during PR 8.2 implementation, resolved by D-085, not reopened
here.** D-047 permits one `auth.users` identity to hold both
`candidate_profiles` and `employer_profiles` simultaneously (a shipped,
reachable "dual-capability account" state, with live routing support at
`/account/choose`). Because mechanism B (§3.1) soft-deletes the *shared*
`auth.users` row rather than an individual capability, §6 (candidate
deletion) and §7 (employer deletion) cannot be treated as independent,
mutually exclusive scenarios when both profiles exist on one identity —
a role-scoped deletion would leave the untouched capability's data intact
in the database while the shared Auth identity underneath it can no
longer sign in, an orphaned, misleading state.

**D-085 resolves this as whole-account deletion**, not a re-decision of
§6/§7's per-role contracts: a deletion request always targets `auth.uid()`
— the Stint account — never a caller-selected role. The privileged
processor derives which profile(s) exist at processing time and, for a
dual-capability account, runs **both** §6's candidate anonymization and
§7's employer anonymization (including the D-086 moderation cleanup and
D-082 audit redaction folded into the employer side) inside **one atomic
domain transaction**, then sets `account_deleted_at` on every existing
profile row before the Auth soft-delete step. `deletion_requests` is
`user_id`-scoped, not role-scoped — see §10.1's amendment below. Full
decision text and rationale: `docs/10-decisions.md` D-085.

### 3.5 Deleted-candidate application transition boundary (D-087)

**Discovered during PR 8.2 implementation, resolved by D-087, not reopened
here.** The §3.3 table above gates the applicant list/detail/status
transition surface against the *employer's own* deletion — it does not
address what happens when the *candidate* who owns a given preserved
application (§6/D-078) is deleted while the employer remains active. A
preserved application is a legitimate historical recruitment record, but
the candidate is no longer an active Stint participant once
`candidate_profiles.account_deleted_at` is set — the ordinary D-070
transition machine must not keep treating that application as an ongoing
workflow.

**D-087 resolves this:** the employer may still read the preserved
application (list/detail, unchanged from §D.1's truthful `candidate_deleted`
projection), but `transition_current_employer_application_status(...)`
returns its existing `unavailable` result — no new result variant — once
the application's candidate has `account_deleted_at IS NOT NULL`, checked
before any row lock/mutation. `get_current_employer_application(...)`'s
deleted-candidate branch returns `allowed_transitions: []` so the detail
RPC never advertises a transition the transition RPC will reject. The
authoritative signal is `candidate_profiles.account_deleted_at`, never
`candidate_snapshot`'s presentation-only `deleted` marker. D-070 remains
authoritative and unaffected for any application whose candidate account is
active. Full decision text and rationale: `docs/10-decisions.md` D-087.

## 4. Candidate export boundary (proposal, not yet accepted)

**Included (proposed):**

- `candidate_profiles`: `display_name`, `german_comfort`,
  `work_authorisation_declared`, `work_authorisation_declared_at`, `city`,
  `travel_radius_minutes`, `available_from`, `job_categories`,
  `employment_types`, `shift_preferences`, `onboarding_completed_at`,
  `created_at`, `updated_at`
- `candidate_languages`: language code + proficiency rows
- `applications`: `id`, `status`, `submitted_at`, the candidate's own
  `candidate_snapshot` (it is the candidate's own historical data, already
  RLS-readable to them today), a **narrow projection** of `vacancy_snapshot`
  limited to fields the candidate could already see on the public/candidate
  job surfaces (title, employer display name, category, locality) — not
  the raw JSONB blob unfiltered, since `vacancy_snapshot` was designed as
  an internal historical-consistency mechanism, not an export payload, and
  may carry fields never meant for candidate-facing display
- `application_status_history` (candidate-safe projection): `to_status`,
  `occurred_at` only — **exactly the same projection**
  `list_current_candidate_application_status_history` already returns
  today; export must not widen this to `from_status`/`reason`/`actor_user_id`

**Excluded (proposed), with rationale:**

- employer moderation reason, operator identity, any `admin_audit_events`
  content — never candidate-readable today, export must not become a new
  privilege-escalation surface
- other candidates' data — export is always scoped to the caller's own
  `auth.uid()`, never a parameter
- auth password/session/token material — Supabase-managed, never
  application-readable
- database/internal metadata (row `id`s beyond what's needed to display
  the export coherently, internal `snapshot_version`, etc.)

**Decided (not left open): Auth account metadata scope is exactly `email`
and `created_at`.** These are the two facts a reasonable person exporting
"their account data" would expect, carry negligible additional risk, and
are cheap to retrieve via `supabase.auth.getUser()` in the same request.
**`last_sign_in_at` is explicitly excluded** — it is operationally
interesting to the platform, not something the user needs from their own
export, and no concrete user-value requirement for it has been identified.
Password hashes, session tokens, and any other Auth-internal material are
never included, as they are not application-readable regardless.

**Proposed envelope (illustrative shape, not schema):**

```json
{
  "version": 1,
  "exportedAt": "2026-08-08T00:00:00.000Z",
  "account": { "email": "...", "createdAt": "..." },
  "candidate": {
    "displayName": "...", "germanComfort": "...", "city": "...",
    "travelRadiusMinutes": 45, "jobCategories": ["cleaning"],
    "languages": [{ "code": "en", "proficiency": "conversational" }]
  },
  "applications": [
    {
      "id": "...", "status": "accepted", "submittedAt": "...",
      "vacancy": { "title": "...", "employerDisplayName": "...", "category": "cleaning" },
      "statusHistory": [{ "toStatus": "submitted", "occurredAt": "..." }]
    }
  ]
}
```

Generated server-side, bounded by the caller's own `auth.uid()`, no
caller-supplied target-user parameter, deterministic given the same
underlying data (same shape/ordering every time, `exportedAt` being the
only run-to-run-varying field — mirroring the `measuredAt`-vs-deterministic-content
split already established by the PR 7.4 pilot-funnel proof).

## 5. Employer export boundary (proposal, not yet accepted)

**Included (proposed):**

- `employer_profiles`: `employer_type`, `display_name`,
  `berlin_locality`, `phone`, `website`, `organisation_legal_name`,
  `lawful_hiring_declared`, `lawful_hiring_declared_at`,
  `verification_state`, `verification_requested_at`,
  `verification_reviewed_at` (state/timestamp only — see exclusions),
  `onboarding_completed_at`, `created_at`, `updated_at`
- `companies` (organisation employers only): `name`, `slug`
- owned `vacancies`: all employer-controlled fields already visible to
  the employer today (title, description, category, locality, workplace
  type, work frequency, salary, publication state, timestamps), plus
  their structured `vacancy_language_requirements` rows (language/level
  pairs — structural requirement data the employer authored, not
  candidate data)
- **current** publication/lifecycle state only, not
  `vacancy_lifecycle_events` history (that table is not currently
  employer-readable at all; export should not silently grant new read
  access)

**CRITICAL — explicitly excluded (proposed), with rationale, because this
is the most consequential boundary in the whole document:**

- `applications.candidate_snapshot` — this is candidate-authored personal
  data. The employer can *view* an applicant's snapshot one-at-a-time
  today through the existing applicant-review RPCs (D-070's own contract),
  but a bulk **export** of every candidate snapshot the employer has ever
  seen is a materially different privacy posture: it converts a
  point-in-time, per-application read into a portable, employer-retained
  bulk archive of multiple candidates' personal data, with no equivalent
  precedent in the current product. **Decided: employer export contains
  narrow application process metadata only** — `application.id`,
  `application.status`, `submitted_at`, and which of the employer's own
  vacancies it targets — **never** `candidate_snapshot` content, never a
  candidate's name/email/profile fields, never a candidate's Auth
  identity, never `application_status_history.actor_user_id`, never
  operator IDs or operator moderation/verification reasons, never
  password hashes or session/token material
- operator identity, moderation/suspension reasons — never
  employer-readable today
- other employers' data
- Auth secrets

This distinction — **"employer's business/process record"** (which
vacancy received how many applications, in what states, when) versus
**"candidate personal data visible to the employer for recruitment"**
(the actual snapshot content) — is the load-bearing design boundary this
document proposes for `docs/47` and the gating decision (§16, D-077).

**Proposed envelope (illustrative shape, not schema):**

```json
{
  "version": 1,
  "exportedAt": "2026-08-08T00:00:00.000Z",
  "account": { "email": "...", "createdAt": "..." },
  "employer": {
    "employerType": "organisation", "displayName": "...",
    "verificationState": "verified", "company": { "name": "...", "slug": "..." }
  },
  "vacancies": [
    {
      "id": "...", "title": "...", "publicationState": "published",
      "applicationCount": 3,
      "applications": [{ "id": "...", "status": "reviewing", "submittedAt": "..." }]
    }
  ]
}
```

## 6. Candidate deletion semantics (proposal, not yet accepted)

*Applies whenever a candidate profile exists on the target identity —
including as one half of a dual-capability domain scrub under D-085/§3.4;
that decision does not alter this section's per-role contract, only when
it runs and alongside what.*

Graph traced in §2/§3: `candidate_profiles` → `candidate_languages`
(cascade), → `applications` (cascade), → `application_status_history`
(cascade). A literal `auth.users` delete for a candidate is **technically
possible** today (nothing blocks it), but its side effects are the
concern, not its feasibility:

- **Employer applicant lists** would silently lose the entry for that
  candidate's application — an employer reviewing their vacancy's
  applicant list tomorrow would see one fewer row, with no record that a
  submission ever existed.
- **Accepted/rejected application evidence** — the employer's own
  business record of an outcome (e.g., "we hired this person") would
  vanish, even though that outcome is arguably the employer's legitimate
  business fact, not solely the candidate's personal data.
- **Pilot funnel counts** (`docs/44`) — `applications_submitted` and its
  status buckets would silently decrease after the fact for a
  point-in-time metric that already ran; not a data-integrity problem
  (the funnel is always "as of now"), but worth naming so it is not
  mistaken for a measurement bug later.
- **Auditability** — `application_status_history.actor_user_id` rows
  authored by the *employer* who reviewed the (now-deleted) application
  would remain (they belong to a different `auth.users` row, unaffected),
  but would reference an `application_id` whose parent no longer exists —
  harmless at the FK level (cascade already removed them together), moot.
- **Vacancy records** — untouched; `applications.vacancy_id` is
  `ON DELETE RESTRICT` in the other direction (vacancy → application), not
  relevant to candidate-initiated deletion.

**Strategies evaluated:**

| Strategy | Effect | Assessment |
|---|---|---|
| A. Hard delete candidate + cascade applications | Simplest; matches current default FK behavior exactly | Destroys the employer's legitimate application-outcome record; not recommended as the sole behavior |
| B. Preserve application row, remove candidate identity/snapshot | Requires changing `applications.candidate_id` to nullable or introducing a tombstone candidate row, plus scrubbing `candidate_snapshot` | Technically the most privacy-correct option, but is a schema change (nullable FK or sentinel row) — a migration decision, not something this discovery document should silently choose |
| C. Anonymize `candidate_snapshot`/`candidate_profiles` in place, then soft-delete Auth identity (no `auth.users` DELETE) | No FK/cascade risk at all (§3.1 mechanism B); application row and its status history survive untouched, snapshot content is redacted to a fixed "deleted candidate" placeholder | **Smallest technically coherent MVP behavior** — no migration required beyond adding the anonymizing RPC itself; preserves employer business continuity; matches the FK-safety conclusion already reached in §3 |
| D. Tombstone candidate identity (dedicated sentinel row) | Cleaner data model long-term | Requires new schema (sentinel `candidate_profiles` row or similar) — deferred, flagged as a possible future migration if C proves insufficient |
| E. Legal-retention hold mechanism | Would let a suspended/under-investigation candidate's data survive a deletion request | **Not a technical decision this document can make** — flagged for legal/product review, not assumed |
| F. Request workflow with manual review | Disproportionate for a self-service GDPR right | Not recommended; D-072/D-073 already established that operator involvement is reserved for safety moderation, not routine account processing |

**Proposed for MVP (not yet accepted, but fully specified — no field left
"TBD"): Strategy C, refined into an exact row-level contract.** The
`candidate_profiles` row is **preserved as a structural tombstone** — it
is not deleted and not replaced with a sentinel row — because every
preserved `applications` row's `candidate_id` FK depends on that identity
continuing to exist (`applications.candidate_id → candidate_profiles(id)
ON DELETE CASCADE`; if the row disappeared, so would every preserved
application, defeating the whole point of preservation).

**`candidate_profiles` exact field matrix:**

| Field | Action |
|---|---|
| `id` | Preserved (FK anchor — see above) |
| `account_deleted_at` | **Set** to the processing timestamp (new column, §3.3) |
| `display_name` | Replaced with a fixed placeholder (e.g. `"Deleted candidate"`) |
| `german_comfort` | Cleared (`null`) |
| `work_authorisation_declared` / `work_authorisation_declared_at` | Cleared (`null`) |
| `city` | Cleared (`null`) |
| `travel_radius_minutes` | Cleared (`null`) |
| `available_from` | Cleared (`null`) |
| `job_categories` / `employment_types` / `shift_preferences` | Cleared (`'{}'`) |
| `onboarding_completed_at` | Preserved — a structural/historical fact about the account's lifecycle, not an identifying field |
| `created_at` | Preserved — historical fact |
| `updated_at` | Set to the processing timestamp (ordinary trigger behavior, unchanged) |

**`candidate_languages`:** **DELETE all rows** for the deleted candidate
(not anonymized in place) — this table carries no FK any preserved row
depends on, so there is no reason to retain empty/placeholder rows; a
clean delete is simpler and equally private.

**`applications` exact field matrix (per row the candidate submitted):**

| Field | Action |
|---|---|
| `id`, `vacancy_id`, `status`, `submitted_at`, `created_at`, `updated_at` | **Preserved unchanged** |
| `vacancy_snapshot` | **Preserved unchanged** — this is the employer's/vacancy's own historical data, not the candidate's |
| `candidate_snapshot` | **Replaced** with one fixed, versioned tombstone shape (below) |

**`candidate_snapshot` tombstone shape (conceptual, not executable SQL —
exact field completeness to be confirmed against the current
`candidateSnapshotV1Schema` at PR 8.2 implementation time):**

```json
{ "version": 1, "deleted": true }
```

`"version": 1` matches the existing `applications.snapshot_version = 1`
constraint's current value (`applications_snapshot_version_chk`) so no
constraint or schema-version bump is required for this tombstone shape
alone. If the current `candidateSnapshotV1Schema` requires additional
non-optional structural fields beyond what a two-key object satisfies,
PR 8.2 must extend this shape to remain schema-valid — but the *contract*
（"replace with a fixed, versioned, non-identifying placeholder" — is
decided here and does not change based on that implementation detail.

**`application_status_history`:** **Preserved unchanged**, including
`actor_user_id` (the reviewing employer's own identity, unaffected — they
are a different `auth.users` row) — but the *deleted candidate* must never
be able to read it again after `account_deleted_at` is set (enforced by
the gate in §3.3, not by modifying the row), and it was never exposed to
candidates in the first place beyond the existing safe
`to_status`/`occurred_at` projection.

Auth side processed via the **B**-mechanism recommendation in §3.1
(`deleteUser(id, true)`), gated by §3.3's database check as the actual
enforcement layer. **What is preserved:** the tombstoned
`candidate_profiles` row (FK anchor + lifecycle timestamps only), every
`applications` row (status, timestamps, `vacancy_snapshot`), and full
`application_status_history`. **What is removed:** every candidate-
identifying field in `candidate_profiles`, all `candidate_languages` rows,
and every `candidate_snapshot`.

## 7. Employer deletion semantics (proposal, not yet accepted) — the most consequential graph

*Applies whenever an employer profile exists on the target identity —
including as one half of a dual-capability domain scrub under D-085/§3.4.
The D-086 current-state moderation cleanup (§8) is folded into this
section's transaction when it runs.*

Full trace, confirmed against §2/§3:

```
auth.users (employer)
  → employer_profiles [CASCADE from auth.users]
      → companies.owner_employer_id [NO ACTION — blocks, does not cascade]
      → vacancies.employer_profile_id [NO ACTION — blocks, does not cascade]
          → vacancy_language_requirements [CASCADE from vacancies]
          → vacancy_lifecycle_events [RESTRICT from vacancies — blocks]
          → applications.vacancy_id [RESTRICT from vacancies — blocks]
              → application_status_history [CASCADE from applications;
                  but actor_user_id NO ACTION back to the employer — blocks
                  independently of the vacancy/application chain above]
          → vacancy_moderation [CASCADE from vacancies]
      → employer_suspension [CASCADE from employer_profiles]
      → employer_profiles.verification_reviewed_by [not applicable — this
          points *to* an operator, not *from* the employer]
```

**Confirmed conclusion, stated explicitly per the kickoff's own expected
answer: employer deletion must NOT be allowed to destroy candidate
application history merely because the vacancies belong to the employer —
and today's schema already technically prevents a naive hard-delete from
doing so, by blocking rather than silently cascading.** The danger is not
that a hard delete would silently destroy candidate history; the danger is
that an implementer might be tempted to "fix" the resulting FK errors by
adding `ON DELETE CASCADE` to `vacancies.employer_profile_id` and/or
`applications.vacancy_id` to make the delete "just work" — which **would**
then destroy candidate application history as a side effect. This document
explicitly recommends against that path.

**Strategies evaluated:**

| Strategy | Effect | Assessment |
|---|---|---|
| A. Hard delete employer + vacancies + applications | Would require weakening `applications.vacancy_id` from `RESTRICT` to `CASCADE` | **Rejected** — directly destroys candidate-owned application/status history for a deletion the candidate never requested; violates the "no cross-user destruction" principle this whole discovery is built around |
| B. Anonymize/tombstone employer while preserving application history | Scrub `employer_profiles` identifying fields in place (same technique as candidate strategy C); leave `vacancies`/`applications`/history untouched | **Proposed for MVP** — no FK collision (nothing is actually deleted from the referenced side), candidate application history is fully preserved exactly as-is, matches the FK-safety conclusion in §3 |
| C. Withdraw/hide all vacancies then remove private employer identity | Requires an explicit withdrawal pass over every vacancy (already an existing, safe RPC — `withdraw_employer_vacancy`) before/alongside B | Complementary to B, not an alternative — withdrawing vacancies makes them non-effective-public immediately (existing D-072/D-073-composed predicate already does this the moment `publication_state` changes), which is the right UX signal even though the row itself is preserved under B |
| D. Retain business vacancy records but detach account identity | Same as B, phrased differently | Folded into B |
| E. Operator-reviewed deletion request | Disproportionate, same reasoning as candidate strategy F | Not recommended for MVP |

**Proposed for MVP (not yet accepted, but fully specified — no open
question left inside the decision itself): Strategies B + C combined,**
with an exact field matrix and a resolved slug rule.

The `employer_profiles` row is **preserved as a structural tombstone**
(same rationale as candidate §6: `vacancies.employer_profile_id` and
`companies.owner_employer_id` are `NO ACTION`, so the row it points at
must continue to exist).

**`employer_profiles` exact field matrix:**

| Field | Action |
|---|---|
| `id` | Preserved (FK anchor) |
| `account_deleted_at` | **Set** to the processing timestamp (new column, §3.3) |
| `display_name` | Replaced with a fixed placeholder (e.g. `"Deleted employer"`) |
| `berlin_locality` | Cleared (`null`) |
| `phone` | Cleared (`null`) |
| `website` | Cleared (`null`) |
| `organisation_legal_name` | Cleared (`null`) |
| `verification_state`, `verification_reviewed_by`, `verification_reviewed_at` | **Preserved unchanged** — historical operator-facing fact, not employer-controlled PII |
| `created_at` | Preserved — historical fact |
| `updated_at` | Set to the processing timestamp |

**`companies` exact field matrix (organisation employers only):**

| Field | Action |
|---|---|
| `id`, `owner_employer_id` | Preserved (FK anchor for owned vacancies) |
| `name` | Replaced with a fixed placeholder (e.g. `"Deleted company"`) |
| `slug` | **Replaced with a deterministic, non-PII tombstone slug: `deleted-company-<uuid>`, where `<uuid>` is the company's own immutable `id`.** This is unique by construction (the `id` it derives from is already unique), requires no new uniqueness check beyond the existing `companies_slug_key`-style constraint, and never derives from `name`/email/any employer-supplied field. |

**Slug-reuse question — resolved, not left open:** the original slug (the
one the employer chose pre-deletion) is **not** automatically freed for
reuse by a different employer. It remains permanently retired once a
company has been tombstoned. Reusing it would require a deliberate,
separate product decision (e.g. an explicit "release slug" operator
action) that does not exist today and is not proposed here — until such a
decision is made, the pre-deletion slug is simply abandoned, exactly as
the tombstone `id` itself is never reissued.

**Vacancy withdrawal:** every currently-published/paused vacancy the
employer owns is withdrawn first, reusing the existing
`withdraw_employer_vacancy` RPC pattern (or an equivalent bulk variant
scoped to the requesting employer's own rows only), so they immediately
stop being effective-public via the existing D-072/D-073-composed
predicate — no new visibility logic required.

**`vacancies`, `vacancy_language_requirements`, `applications`, and
`application_status_history` are never touched** — they remain exactly as
they were, satisfying "employer deletion cannot destroy candidate
application history" by construction rather than by careful cascade
tuning. Auth side processed via mechanism **B** (§3.1), gated by §3.3's
database check.

**H. answered directly: can employer deletion destroy candidate
application history? No — under the proposed B+C strategy, nothing in the
candidate-application chain is written to, deleted, or cascaded at all.**
This is derived from the schema's existing `NO ACTION`/`RESTRICT` defaults
(§3), not assumed.

## 8. Admin audit-event reconciliation (proposal, not yet accepted)

Confirmed from the migration's own comment (§1): `admin_audit_events.target_id`
has no FK, so it survives target deletion/anonymization trivially at the
SQL level — there is no technical barrier to overcome. The open question
is **privacy**, not schema mechanics.

**Evaluated:**

- `target_id` retained as an opaque UUID after the employer/vacancy row is
  anonymized (§7) or would-be-deleted: **proposed to retain** — an opaque
  UUID pointing at an anonymized-but-still-present row (per §7's
  anonymize-not-delete strategy) carries no more information after
  anonymization than before; it never identified anyone by itself.
- `target_kind`/`event_type` retained: **proposed to retain** —
  structural, not personal.
- `reason` text: an operator's free-text suspension/moderation reason
  (e.g., *"repeated fraudulent listings from [employer's business
  name]"*) could incidentally embed the employer's own business name or
  other identifying detail the employer provided. Since §7 proposes
  anonymizing `employer_profiles`/`companies` rather than deleting them,
  the *employer's own current profile* no longer displays that name after
  deletion — but the **audit reason text is a separate, independent
  copy** that would still contain it, un-redacted, forever, unless acted
  on.
- Operator `actor_user_id`: **proposed to retain** — this is the
  operator's own identity, not the deleted user's; already never rendered
  to anyone but other operators (PR 7.2/7.3 static-security tests already
  prove this).

**Decided (not left open): redact `reason` for audit rows targeting a
deleted account.** For any `admin_audit_events` row whose `target_id`
resolves to an employer (or one of that employer's vacancies) that has
since been deleted via this Slice's flow, the `reason` column is
**replaced with a fixed marker string, `"[redacted after account
deletion]"`**, at the moment deletion processing anonymizes that
employer. `id`/`event_type`/`target_kind`/`target_id`/`actor_user_id`/
`created_at` are all retained unconditionally per above — only the
free-text `reason` field is affected.

**This is an explicit, narrow Slice 8 exception to D-074's
immutable-reason contract, not a silent contradiction of it.** D-074
established that audit reasons are tamper-evident historical fact and
must never be edited or deleted by ordinary operator action; this
proposal adds one specific, narrowly-scoped supersession — reason text
may be replaced with the fixed redaction marker, and only the fixed
marker, solely as a consequence of the row's own subject exercising a
GDPR-motivated deletion right, and only for rows targeting that subject.
No other mutation of `admin_audit_events` is introduced, and the
supersession does not apply to rows whose target has not been deleted.
The rationale for choosing redaction over retention: free-text moderation
reasons can contain identifying/user-provided information the audit
system's own author did not control (an operator quoting a business
name), while the event's fact/taxonomy/time remain fully auditable
without retaining arbitrary free text indefinitely — the taxonomy alone
(`event_type`/`target_kind`/`created_at`) already answers "what kind of
action was taken against this account, and when," which is the audit
trail's load-bearing property.

**Current-state moderation tables — resolved by D-086, discovered during
PR 8.2 implementation.** The redaction contract above governs
`admin_audit_events` only. It left open what happens to
`employer_suspension.suspended_reason`/`vacancy_moderation.moderated_reason`
— `NOT NULL` free-text current-state columns that D-074's own text notes
normally `ON DELETE CASCADE` from the employer/vacancy row, a cascade
that never fires under Slice 8's tombstone-preservation design. **D-086
resolves this as removal, not redaction**: during employer account
anonymization, the current `employer_suspension` row for that employer
and every current `vacancy_moderation` row for a vacancy it owns are
deleted outright (not preserved, not redacted in place) — these are
*current operational state*, not history, and the historical fact
already survives, redacted, in `admin_audit_events` per the contract
above. Deletion processing does not call `unsuspend_employer`/
`restore_vacancy` for this cleanup — those RPCs carry different business
semantics and would generate misleading `employer_unsuspended`/
`vacancy_restored` audit events; the cleanup happens directly inside the
authoritative deletion/anonymization transaction, with no ordinary
`authenticated`/`anon` DELETE grant on either table. Full decision text:
`docs/10-decisions.md` D-086.

## 9. Private-document/storage surface — current factual state

Confirmed by direct inspection, not assumed:

- `supabase/config.toml`'s `[storage.buckets.*]` section is entirely
  commented out — **zero configured local storage buckets**.
- Zero references to `supabase.storage`/`createBucket`/any Storage client
  call anywhere in `src/`.
- The only "cv"-related field anywhere in the schema or application code
  is `vacancies.cv_required` — a boolean the employer sets ("is a CV
  required to apply"), not a file upload or stored document of any kind.
- `docs/04-mvp.md` lists "optional CV upload" as aspirational candidate
  MVP scope, but it was never implemented — candidates currently submit
  applications via `candidate_snapshot` (structured profile data), with no
  file attachment path.
- `NOT_NOW.md` independently confirms employer verification document
  uploads were deliberately deferred in Slice 5 planning "because document
  vaulting pulls retention/GDPR forward" (§1) — i.e., this was already a
  known, intentional non-decision, not a gap discovered here for the
  first time.

**Conclusion: Stint currently has zero user-uploaded private documents of
any kind.** The Slice 8 exit criterion *"deletion does not leave private
documents publicly reachable"* is satisfiable by **proof of absence**:
demonstrate no private-document object exists in the current MVP surface,
and that the proposed deletion contract (§6/§7) introduces no new
public-reachability path. No Storage work is proposed for Slice 8. Future
CV/document upload remains deferred, and — per the `NOT_NOW.md` note
already on record — **should itself trigger a fresh Slice 8-style
retention review when it is eventually built**, not retroactively
reopened here.

## 10. Deletion request vs. immediate deletion (proposal, not yet accepted)

Compared:

1. **Immediate self-service deletion** (one click, no intermediate state) —
   simplest, but offers no protection against an accidental click, and
   gives the anonymize/scrub processing (§3/§6/§7) no natural place to
   report partial failure back to the user before the account is gone.
2. **Request → pending → processed → confirmed** — decouples the
   user-visible action from privileged processing (mechanism B, §3.1);
   naturally supports retry/reconciliation (§10.2 below); the "pending"
   state is itself useful UX (the user sees their request was received).
3. **Request → reauthentication/confirmation → immediate deletion** —
   requires "recent-auth" verification. **Supabase's current session
   model in this repo does not implement step-up/recent-auth
   re-verification anywhere today** (grep-confirmed: no password
   re-entry flow exists outside the login form itself) — building it
   would be new authentication-surface work, not a Slice 8 data-removal
   concern. Flagged as **not currently available**, not silently assumed.
4. **Operator-mediated request** — same disproportionality objection as
   §6/§7's rejected operator strategies.

**Proposed for MVP (not yet accepted): option 2**, for one additional
reason beyond the above: because the actual privileged processing (§3's
mechanism-B recommendation combined with the §3.3 gate) is not
instantaneous from the caller's point of view in the safest sequencing
(public-schema anonymization first, Auth scrub second, each independently
confirmable), a request-record state machine is the natural shape
regardless — "immediate" deletion under option 1 would still need to
perform the same ordered steps internally, just without a persisted
intermediate state to recover from if a later step fails.

### 10.1 Concurrency contract (exact, not left open)

- **At most one active deletion request per user.** "Active" means
  `pending` or `processing`. This is enforced at the schema level (a
  partial unique index or equivalent constraint on `(user_id)` filtered to
  active statuses — exact SQL is a PR 8.2 implementation detail, but the
  *constraint itself* is decided here). **Per D-085, this is scoped to
  `user_id` — the whole Stint account — not to a role.** A dual-capability
  user cannot hold a candidate deletion request and an employer deletion
  request in parallel; there is exactly one request per account, and it
  covers whichever capability/capabilities exist at processing time. If a
  capability descriptor is stored on the request row at all, it is
  DB-derived (`candidate` | `employer` | `dual`) and diagnostic only —
  never caller-supplied, and never used to narrow processing to one role.
- **Duplicate request while `pending`:** a second request call from the
  same user returns the existing `pending` request rather than creating a
  new row or erroring — the operation is naturally idempotent from the
  caller's perspective.
- **Claiming (`pending` → `processing`):** the privileged processor claims
  a request under a row lock (`SELECT ... FOR UPDATE` or equivalent
  deterministic single-writer transition), so two concurrent processing
  attempts cannot both claim the same request. Only a request currently
  `pending` can be claimed; claiming a non-`pending` request is a no-op
  that returns the current state rather than erroring.
- **Cancellation:** allowed **only** while the request is `pending`. Once
  a request has been claimed into `processing`, cancellation is
  **impossible** — there is no "cancel mid-processing" state, because
  anonymization is destructive by design and cannot be safely unwound
  once begun.
- **Cooling-off period — decided, not left open: NO mandatory cooling-off
  period for MVP.** `pending` is a process state (the window between
  request-creation and the processor claiming it), not a promised waiting
  period. The user's only reversibility guarantee is "cancel before
  processing claims the request," which in practice may be seconds. If a
  deliberate cooling-off window is wanted later, that is a distinct,
  explicitly-authorized future decision with its own exact duration — it
  is not implied or half-built by this contract.
- **Target identity:** the self-service request-creation path never
  accepts a caller-supplied target user ID — the target is always
  `auth.uid()` of the requesting session. The privileged processor never
  accepts a caller-supplied target user ID either — it derives the target
  exclusively from the persisted `deletion_requests` row it claimed, not
  from any parameter passed at invocation time. This closes the same
  "no caller-supplied target" class of gap enforced everywhere else in
  this repository's `SECURITY DEFINER` surface.
- **Error surfacing:** raw Auth Admin API errors and raw Postgres errors
  are never persisted into any user-visible field. A request that fails
  is marked `failed` with a fixed, generic reason code (not the
  underlying exception text), matching the existing
  no-internal-error-leakage discipline used elsewhere in this codebase.

### 10.2 Processing phases and evidence (exact, not left open)

Six explicit phases, each producing durable evidence sufficient to
determine — without re-running anything — whether the domain scrub
completed and whether the Auth soft-delete completed:

1. **Claim** — processor transitions the request `pending` → `processing`
   under the row lock described in §10.1.
2. **Domain anonymization transaction** — the self-scoped `SECURITY
   DEFINER` RPC (§6 for candidates, §7 for employers) runs inside one
   transaction, applying the exact field matrix already specified.
3. **Record domain-scrub evidence** — on successful commit of step 2, a
   durable marker is written (conceptually `domain_scrubbed_at
   timestamptz` on the request row, or an equivalent narrow
   representation — exact column naming deferred to PR 8.2, but the
   *requirement for a durable, independently-checkable marker* is decided
   here).
4. **Invoke Auth soft delete** — the isolated processing module calls
   `auth.admin.deleteUser(userId, true)` (§3.1, mechanism B) for the
   target derived from the claimed request.
5. **Verify Auth result** — the processor confirms the Auth Admin API
   call succeeded (a non-error response is sufficient; PR 8.4 independently
   verifies the exact local Supabase response shape, per §3.1's standing
   caveat).
6. **Record Auth-deletion evidence + complete** — a second durable marker
   is written (conceptually `auth_deleted_at timestamptz`), and only once
   both markers exist does the request transition to `completed`.

**Failure handling:**

- **Step 4 fails** (Auth call errors or is unreachable): the request
  remains safely retryable. Domain anonymization already committed in
  step 2/3 and is idempotent (re-running it against already-scrubbed data
  is a no-op per §6/§7's field-matrix design), so a retry only needs to
  re-attempt steps 4–6.
- **Step 4 succeeds but step 6's persistence fails** (the hardest case —
  Auth deletion is real, but Stint's own record of that fact never got
  written): the now-deleted user **cannot authenticate to retry
  anything**, so ordinary user-triggered retry cannot solve this case,
  and this document does not claim it can. **Reconciliation mechanism
  (proposed, minimum viable, not a background worker):** a narrow,
  privileged, manually-invoked reconciliation operation — usable by the
  founder/operator during the controlled pilot — that (a) reads any
  request stuck in `processing` with `domain_scrubbed_at` set but no
  `auth_deleted_at`, (b) re-queries the Auth Admin API for that user's
  current deleted/banned state to **reconfirm** (not re-trigger) the
  deletion independently of whether step 4 already ran, and (c) if
  reconfirmed, writes the missing `auth_deleted_at` marker and completes
  the request. This does not require the deleted user to authenticate at
  any point. It is not a scheduled background job in PR 8.1/8.2 — it is a
  manually-invoked, authorization-safe operation, explicitly scoped this
  way rather than silently deferred.
- **Domain anonymization (step 2) fails:** the transaction rolls back
  entirely (ordinary Postgres transactional guarantee); the request
  remains `processing` with no evidence markers set, and is retried from
  step 2 — no Auth call has been made yet, so there is nothing to
  reconcile on that side.

### 10.3 Other operational answers

- **Password re-entry required?** Not currently available (§10, option 3
  above) — proposed default: **no**, rely on the existing authenticated
  session plus an explicit confirmation UI step (matching the existing
  destructive-confirmation pattern already used for suspend/moderate
  actions in PR 7.3 — a required confirmation checkbox/typed
  acknowledgement, not a modal).
- **Recent-auth verification available?** No (confirmed above).
- **Session semantics on delete — corrected, no cosmetic-identifier
  retention.** During the authenticated deletion flow, the UI shows a
  final processing/success confirmation screen **before** the local
  session ends — the user sees "your account has been deleted" while
  still authenticated, as the terminal state of the flow they themselves
  triggered, not as something requiring a later sign-in attempt to
  discover. The session/refresh tokens are then revoked/signed out as
  Supabase's client-side sign-out API supports. **After deletion, any
  future login attempt — using the original email or otherwise —
  receives the ordinary generic Auth failure state already used for any
  invalid credential.** No special "this account was deleted" message is
  shown on a later login attempt, and no identifier (original email, a
  hash of it, or anything else) is retained solely to enable such a
  message. This removes the earlier draft's implicit assumption that some
  identifying value must survive deletion for cosmetic login-copy
  purposes — it does not need to, and nothing is kept for that purpose.
- **"Confirmed data removal" — exact meaning, decided.** A deletion is
  "confirmed removed" when all four hold: (1) the request reached
  `completed` (§10.2); (2) domain anonymization/removal is verified (the
  `domain_scrubbed_at` evidence marker, and independently re-checkable via
  the local proof script, §14); (3) the Auth soft-delete step is verified
  (`auth_deleted_at`); (4) local deterministic proof (§14) confirms the
  deleted principal cannot access the account surface, **including with a
  stale pre-delete JWT that has not yet expired** (§3.2/§3.3) — this
  fourth condition is what makes "confirmed" mean something stronger than
  "the Auth record changed."
- **Confirmation without transactional email?** D-075 already deferred
  transactional email for Slice 7; this document does not reopen that.
  Confirmation is **in-app only**, per the session-semantics point above —
  no email is sent or required at any point in the flow.
- **Retryable?** Yes — see §10.2's explicit failure handling. This is a
  **requirement** carried into the gating decision, not an incidental
  property.
- **Idempotent?** Yes, by the field-matrix design in §6/§7 (fixed
  placeholder writes, not diffs) and the evidence-marker design in
  §10.2.

## 11. Export request vs. immediate export (proposal, not yet accepted)

Compared: immediate JSON download vs. persisted export job vs.
email-delivered archive vs. operator-generated export.

**Proposed for MVP (not yet accepted): immediate, server-generated
downloadable JSON response.** Current data volume per user (a handful of
profile fields, a bounded list of applications/vacancies) is small enough
that computing the export payload synchronously within one request is not
an architectural risk — this mirrors the existing repository principle
("Start with one deployable web application... do not introduce
microservices... until validated usage requires them," `docs/07`) and the
pilot-funnel proof's own precedent (a handful of bounded aggregate
queries, no background processing). No background queue, no object
storage archive, and no email delivery are proposed — email specifically
would reopen D-075's transactional-email deferral, which this document
does not do.

## 12. Security model (proposal, not yet accepted)

**Export invariants:**

- current authenticated user only (`auth.uid()`), never a caller-supplied
  target user ID — identical discipline to every existing self-scoped RPC
  in this repository (`is_current_employer_suspended`,
  `list_current_employer_applications`, etc.)
- candidate role sees only the candidate export shape; employer role sees
  only the employer export shape — role determined server-side from which
  profile row exists for the caller, never a client-supplied parameter
- no cross-user export, ever
- no operator-only reasons/identities in either export shape (§4/§5)
- no secrets (Auth tokens, service-role material) in any export payload

**Deletion invariants:**

- current authenticated user can request deletion of only their own
  account — no caller-supplied target user ID, matching every existing
  suspend/moderate RPC's own-scoping discipline
- arbitrary target-user deletion is impossible by construction (no
  parameter exists to supply one)
- deletion **processing** privilege (the E+F mechanism from §3) is
  isolated to one narrow, explicitly-triggered code path — never part of
  the ordinary authenticated request/response surface
- request ownership is immutable once created (the request row's owner
  cannot be reassigned)
- duplicate requests are deterministic — a second request from the same
  user while one is already `pending` is proposed to be a safe no-op
  (return the existing pending request) rather than creating a second
  competing row
- no GET-triggered deletion anywhere — request creation, cancellation, and
  (if ever exposed) confirmation are all POST/Server Action/RPC, matching
  the existing repository-wide discipline already proven in PR 7.3's
  static-security tests
- explicit destructive confirmation required (checkbox/typed
  acknowledgement pattern, matching PR 7.3's suspend/moderate UI
  convention — not a bare button)
- a stale or replayed request is safe — idempotent processing (§10) means
  reprocessing an already-completed request changes nothing
- no `service_role` exposure to the browser at any point — confirmed as a
  hard invariant carried forward from every prior slice's static-security
  proof convention
- no secrets in logs — the Auth Admin API call (§3 mechanism C/F) must
  never log the service-role credential or full request/response bodies
  containing it, matching the existing `local-postgres.ts` rollback-diagnostic
  precedent from PR 7.4 (log error messages only, never credentials)

**If operator processing is ever proposed instead of/alongside the
automated E+F path (not currently proposed, but evaluated per the
kickoff's instruction):** it must reuse the existing
`verification_operators`/`requireActiveOperator()` identity, exactly as
PR 7.3 reused it rather than inventing a second admin system; an operator
must never be able to fabricate a user's consent or request (i.e., an
operator cannot originate a deletion request on a user's behalf — only
process an already-existing, user-originated `pending` request); the
processing action requires an actual pending request row to exist (no
"delete this user" free-form operator action); the original request
timestamp remains DB-derived (`clock_timestamp()`, matching every existing
audit/suspension pattern), and if an operator ever does process a request,
their actor identity and processing time should be as auditable as any
other operator action (i.e., it would need its own `admin_audit_events`
event type — not proposed as necessary for MVP, since the E+F automated
path does not require operator involvement at all).

## 13. Data-export privacy — fields that must never appear (proposal, not yet accepted)

**Candidate export must never expose:** employer moderation reason,
vacancy moderation reason, operator identity/`actor_user_id`, other
candidates' data, employer Auth secrets. All confirmed absent from the
proposed envelope in §4 by construction (the query set feeding it never
touches `employer_suspension`/`vacancy_moderation`/`admin_audit_events`,
and only ever reads `auth.uid()`-scoped rows).

**Employer export must never expose:** candidate live profile wholesale,
unrelated candidates' applications, candidate email (explicitly **not**
included by default — see §5's boundary; if a future accepted decision
wants to include an already-employer-visible snapshot field, that must be
a new, explicit decision, not a silent inclusion), candidate Auth
identity, operator identity/reasons, other employers' data. All confirmed
absent from the proposed envelope in §5 by the same construction argument.

**Snapshot fields flagged for review before any export implementation:**
`applications.candidate_snapshot` and `applications.vacancy_snapshot` are
JSONB blobs whose exact field set is defined by application code
(`candidateSnapshotV1Schema`/`vacancySnapshotV1Schema`), not by this
discovery document. Before PR 8.3 (export UI/API, per the proposed
decomposition in `docs/46`) is implemented, those schemas must be
re-audited field-by-field against the export boundaries in §4/§5 — this
document establishes the *boundary rule* (candidate export may include
its own snapshot; employer export must not include any candidate
snapshot at all), not a field-by-field sign-off, since that requires
reading the current schema shape at implementation time, not at planning
time.

## 14. Local deletion/export proof strategy (proposal, not yet accepted)

Proposed script, mirroring `scripts/proof/pilot-funnel.mts`'s established
pattern exactly (thin CLI wrapper + pure logic in `src/lib/proof/` +
`withLocalPostgresReadOnlyTransaction`-style local-only safety, though
this proof necessarily performs writes against disposable local fixture
accounts it creates itself, unlike the funnel proof — see below):

`scripts/proof/account-deletion.mts` (name provisional, decided at
implementation time).

**What it must prove for candidate deletion (per §6's proposed contract):**

- a deletion request is scoped to its own requester (cannot be created or
  processed for another user)
- after processing, `candidate_profiles`/`candidate_snapshot` fields match
  the fixed anonymization contract, not merely "changed"
- no candidate-private data remains reachable via any existing RLS path
  or RPC for the deleted account's former `auth.uid()`
- an unrelated candidate fixture is provably untouched (row-for-row
  comparison before/after)
- the employer/vacancy the deleted candidate applied to is provably
  untouched (`applications.status`/`vacancy_snapshot`/
  `application_status_history` unchanged)
- `candidate_languages` rows for the deleted candidate are gone entirely
  (row count zero), not merely blanked
- `candidate_snapshot` inside every affected `applications` row matches
  the exact versioned tombstone shape from §6 (`{"version": 1, "deleted":
  true}` or its PR 8.2-confirmed schema-valid equivalent), not just "some
  placeholder"
- **stale-JWT proof (critical, per §3.2/§3.3):** obtain a valid candidate
  JWT **before** deletion processing runs; run deletion processing to
  completion; then, using that same still-cryptographically-valid,
  not-yet-expired JWT, attempt candidate-protected reads (e.g. own
  profile, own applications) and mutations (e.g. submitting a new
  application); prove every one of them is **denied** — not merely that a
  fresh sign-in fails, but that the pre-delete token itself is rejected by
  the `account_deleted_at` gate (§3.3) even though the token has not
  expired
- prove a fresh login attempt for the deleted candidate cannot be
  established (ordinary generic Auth failure, per §10.3 — not a special
  "deleted" message)

**What it must prove for employer deletion (per §7's proposed contract):**

- a deletion request is scoped to its own requester
- `employer_profiles`/`companies` identifying fields match the fixed
  anonymization contract
- every vacancy the employer owned is no longer effective-public
  (`is_vacancy_effectively_public` returns false for all of them,
  reusing the exact canonical predicate already proven in PR 7.2/7.4 —
  never re-approximated)
- candidate application history for that employer's former vacancies is
  provably **unchanged** (this is the single most important assertion in
  the whole proof suite, given §7's central finding)
- an unrelated employer fixture is provably untouched
- `admin_audit_events` rows targeting the deleted employer/its vacancies
  still exist with `id`/`event_type`/`target_kind`/`target_id`/
  `actor_user_id`/`created_at` intact, and `reason` matches the fixed
  `"[redacted after account deletion]"` marker from §8's redaction
  contract — not merely "still exists," but exactly this shape
- the tombstone `companies.slug` matches the exact `deleted-company-<uuid>`
  pattern from §7, and the pre-deletion slug is provably no longer in use
  by that company row
- **stale-JWT proof (critical, per §3.2/§3.3):** obtain a valid employer
  JWT **before** deletion processing runs; run deletion processing to
  completion; then, using that same still-valid, not-yet-expired JWT,
  attempt employer-protected reads (e.g. own profile, own vacancy list,
  applicant list) and mutations (e.g. publishing a vacancy); prove every
  one of them is **denied** by the `account_deleted_at` gate, not merely
  that a fresh sign-in fails
- prove a fresh login attempt for the deleted employer cannot be
  established (ordinary generic Auth failure, per §10.3)

**Cross-cutting assertions (both roles):** an unrelated account of either
role remains fully functional throughout (proves the gate/anonymization
scope is exactly the deleted account, never broader); every preserved
application/history record identified above remains present and
unchanged; deleted-account vacancies are confirmed not effective-public
via the existing canonical predicate, never a re-approximation.

**What it must prove for Auth:** the deleted account cannot authenticate
afterward (or, if processing is `pending`/`failed`, that the account's
authentication state matches whatever the state machine (§10) defines for
that state — not silently assumed to be "still works"), **and**
separately, that a stale pre-delete JWT is rejected by the database gate
even while cryptographically unexpired (the two are independent proofs —
"cannot log in again" alone is not sufficient per §3.2).

**Local-only, same discipline as every prior proof script:** must reject
non-`127.0.0.1`/`localhost` targets exactly as `local-environment-guard.ts`
does today; must create its own disposable local fixture accounts to
exercise (never operate against arbitrary existing local data, unlike the
read-only pilot-funnel proof, since this proof necessarily performs real
writes/anonymization to verify the contract). **Not run in this PR** — PR
8.1 is planning only. **Hosted deletion/export proof is not authorized**
by this document and is not proposed to run in Slice 8 at all without a
separate, explicit, owner-authorized decision — deleting a real hosted
account, even a disposable one, is a materially different risk class from
the read-only pilot-funnel proof PR 7.4 already ran hosted-never.

## 15. Legal wording boundary

This document and every document it produces (`docs/46`, `docs/47`,
D-076–D-084) describe **technical MVP export/deletion behavior only**.
None of them claim "GDPR compliant," "fully satisfies the right to
erasure," or any equivalent legal conclusion. Where a genuine legal
question exists (retention obligations, lawful basis, statutory hold
periods, audit-reason redaction under §8), it is explicitly flagged as
**"MVP technical [export/deletion] path; legal review required"** rather
than silently resolved. The `/privacy`, `/terms`, `/impressum` placeholder
pages added in PR 7.4 remain unreviewed placeholders — Slice 8 planning
does not update their content, since doing so would itself be a legal
claim this document is not positioned to make.

## 16. Summary of open questions carried into decisions (D-076 onward)

Every numbered question from the kickoff message (A–Z) is answered
directly in §2–§15 above; the proposed decisions in `docs/10-decisions.md`
distill these into 9 coherent, individually-acceptable contracts (§16 of
the kickoff maps to D-076 through D-084 — see `docs/10-decisions.md` and
`docs/47-slice-8-data-removal-proposal.md`).

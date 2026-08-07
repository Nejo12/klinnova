# Slice 7 Discovery — Admin Moderation to Audit Event

> Analysis artifact. No migrations, RLS, RPCs, generated types, or application
> code land here. **Status:** Planning in progress. Slice 6 is locally complete
> (`docs/39-slice-6-exit-proof.md`); hosted Slice 6 proof remains deferred.

**Outcome to enable (`docs/13-implementation-plan.md`):** Stint can be
operated safely for a controlled Berlin pilot.

**Related:**

- Build plan: `docs/42-slice-7-build-plan.md`
- Moderation/audit proposal: `docs/43-slice-7-moderation-and-audit-proposal.md`
- Slice 5 discovery/build-plan/schema: `docs/34`–`docs/36`
- Slice 6 closure: `docs/37`–`docs/40`
- Decisions: D-001–D-070 in `docs/10-decisions.md` (all Accepted). **D-071
  is the next available decision number.**

---

## 1. Current-state inventory

| Fact | Evidence |
|---|---|
| Slice 0–6 implementation complete locally | `docs/14-founder-dashboard.md`, `docs/39-slice-6-exit-proof.md` |
| Migration count | 12 (unchanged through Slice 6) |
| Operator concept exists | `verification_operators` table (PR 5.2, `20260805110000_verification_and_vacancy_publication.sql`) |
| Operator read contract exists | `is_current_user_verification_operator()`, `list_pending_employer_verifications()`, `get_employer_verification_review(uuid)` (PR 5.3a) |
| Operator write contract exists | `approve_employer_verification`, `reject_employer_verification`, `revoke_employer_verification` (PR 5.2) |
| Operator UI exists | `/internal/verification`, `/internal/verification/[employerProfileId]` (PR 5.3b) — approve/reject only; **no revoke UI** |
| General `audit_events` table | **Does not exist** — confirmed by `grep -rl "audit_events" supabase/migrations` returning nothing |
| Vacancy-scoped event table exists | `vacancy_lifecycle_events` (PR 5.2) — employer-visible, RLS-based, closed 7-value `event_type` enum |
| Application-status history exists | `application_status_history` (PR 6.1/D-070) — zero-authenticated-grant, RPC-mediated only |
| Employer suspension flag | **Does not exist** on `employer_profiles` (full column list inspected) |
| Candidate suspension flag | **Does not exist** on `candidate_profiles` (full column list inspected) |
| Vacancy moderation state | **Does not exist** — only employer-controlled `publication_state` (`draft\|published\|paused\|filled\|withdrawn\|expired`) |
| Analytics/PostHog integration | **Does not exist** — zero matches in `src/` or `package.json` |
| Transactional email (Resend) integration | **Does not exist** — zero matches; only Supabase Auth's built-in email flow (local: Mailpit) |
| Legal/privacy routes (Impressum, Datenschutz, Terms) | **Do not exist** — zero matches under `src/app` or `src/components` |
| Report/abuse-intake schema | **Does not exist** |

---

## 2. Existing operator architecture (audit)

### 2.1 What "operator" means today

`public.verification_operators` is a standalone allow-list table:

```
user_id uuid primary key references auth.users(id) on delete cascade
created_at timestamptz not null default now()
created_by uuid references auth.users(id)
active boolean not null default true
```

Zero grants to `public`/`anon`/`authenticated` — only `service_role` and
internal `SECURITY DEFINER` functions can touch it directly. There is
**no application RPC or UI path to insert, update, or deactivate a row in
this table** — this is an intentional D-056 boundary ("Temporary operations
may use an owner-controlled authenticated script or restricted internal
invocation. Full admin review queue remains Slice 7."). Today, becoming an
operator requires a direct database action by the repository owner (or, in
tests, the `provisionLocalVerificationOperator` local-Postgres helper).

The single source of truth for "is this session an operator" is:

```sql
create or replace function public._is_active_verification_operator(p_uid uuid)
returns boolean language sql stable security definer
set search_path to pg_catalog, public
as $$ select exists (select 1 from public.verification_operators vo where vo.user_id = p_uid and vo.active) $$;
```

— internal only (revoked from all roles), consumed by every
verification-mutation RPC, and re-exposed narrowly to the client as
`is_current_user_verification_operator()` (PR 5.3a — takes no parameters,
derives identity from `auth.uid()`, returns a bare boolean, exposes no list
contents).

### 2.2 Answers to the required audit questions

1. **What does "operator" mean in the current system?** An authenticated
   `auth.users` row with an `active = true` entry in `verification_operators`.
   It is a flat allow-list, not a role/permission system — there is exactly
   one privilege level ("is an operator" / "is not"), no operator sub-roles,
   no scoping to a subset of employers.
2. **How is an operator authorized?** Server-side only, via
   `_is_active_verification_operator(auth.uid())` inside every operator RPC,
   and via the thin `is_current_user_verification_operator()` read RPC for
   client-side gating decisions (redirects, generic-unavailable rendering).
   Never via a client-supplied id, a JWT custom claim, or a cookie flag.
3. **Is operator authorization stored in database state or configuration?**
   Database state (`verification_operators` rows), not environment
   configuration or code.
4. **Is it already suitable as the Slice 7 admin authorization foundation?**
   **Yes**, structurally. The mechanism (allow-list table + `SECURITY
   DEFINER` boolean check + Auth-bound RPC + a reusable server gate,
   `requireActiveOperator` in `src/lib/internal/verification/operator-gate.ts`)
   is exactly the shape D-056/D-066 already established and Slice 6 reused
   for its own `requireCompletedEmployer`-style gates. The one real gap is
   operational, not architectural: **there is still no RPC or UI to
   grant/revoke operator status itself** — every operator today is
   provisioned by direct database action by the repository owner. For a
   small, trusted, single-operator (founder) pilot team this is acceptable
   and arguably a feature (D-056 explicitly chose this over a self-service
   admin-management UI as out of scope for Slice 5). Slice 7 does not need
   to add operator self-management to meet its own exit criteria; this
   discovery flags it as an explicit non-goal (§13, §"Open questions").
5. **Does any separate admin role already exist?** No. There is no
   `role` column, no `is_admin` flag, no second allow-list. `verification_operators`
   is the only privileged-identity table in the schema.
6. **Are operator actions currently audited?** Partially and inconsistently:
   - Verification approve/reject/revoke actions are captured as **source-row
     evidence only** on `employer_profiles` itself
     (`verification_reviewed_at`, `verification_reviewed_by`,
     `verification_review_reason`) — this captures the *current* state's
     last reviewer, but **not a full history** (a second review overwrites
     the first review's evidence; there is no append-only trail of every
     verification decision made for an employer over time).
   - `revoke_employer_verification`'s side effect of pausing published
     vacancies **is** captured as an immutable event
     (`vacancy_lifecycle_events`, `event_type='paused'`,
     `metadata={"reason":"verification_revoked"}`) — but only the vacancy
     side of that action, not a first-class "verification revoked" event
     itself.
   - This exactly matches D-065's own accepted scope: "Slice 5 does not add
     the general `audit_events` platform planned for Slice 7."
7. **Is verification approval/rejection already an auditable lifecycle?**
   Only as current-state evidence on `employer_profiles`, not as an
   append-only history. A second approve/reject/revoke cycle for the same
   employer (e.g. verified → revoked → re-requested → re-reviewed) loses the
   detail of the *first* review the moment the second one lands. This is a
   real, if narrow, gap — Slice 7's general audit ledger (§5) can close it
   without any change to the Slice 5 RPCs themselves, by having those RPCs'
   *future* PR 7.2 variant additionally write an audit event (see
   `docs/43`).
8. **Can verification currently be revoked?** **Yes** —
   `revoke_employer_verification(p_employer_profile_id uuid, p_reason text)`
   already exists (PR 5.2, merged), is operator-only, row-locks the employer
   profile, requires `verification_state = 'verified'` as a precondition,
   and atomically pauses every currently-published vacancy the employer
   owns (with a `vacancy_lifecycle_events` entry per paused vacancy).
9. **Is there UI for revocation?** **No.** `/internal/verification/[employerProfileId]`
   (PR 5.3b) renders Approve/Reject controls only, for `verification_state = 'pending'`
   rows. There is no operator-facing control anywhere in the app that calls
   `revoke_employer_verification`. This is a genuine, concrete UI gap — not
   a new database capability Slice 7 needs to invent, just a missing UI
   surface for an RPC that already exists and is already pgTAP-tested
   (`24_verification_revocation_and_rls_test.sql`).
10. **Which parts of employer moderation already exist?** Verification
    approve/reject/revoke (RPC + partial UI). Nothing else — no suspension,
    no vacancy removal distinct from employer-controlled withdraw, no
    report intake, no operator-initiated vacancy action of any kind.

---

## 3. Employer moderation capability audit

| Capability | Exists today? | Mechanism |
|---|---|---|
| Verification request | Yes | `request_employer_verification()` — employer-initiated |
| Verification approval | Yes | `approve_employer_verification` — operator RPC, **no dedicated UI beyond the existing approve button** (has one) |
| Verification rejection | Yes | `reject_employer_verification` — operator RPC + UI |
| Verification revocation | Yes (RPC only) | `revoke_employer_verification` — **no UI** |
| Employer account state (suspend/ban) | **No** | no column, no RPC |
| Prevent an employer from publishing | Partial, indirect only | Revoking verification pauses currently-published vacancies and (since publish requires `verification_state = 'verified'`) blocks *new* publishes — but this is a side effect of trust-gate revocation, not a direct "block this employer" primitive, and it does not stop a `pending`/`unverified`/`rejected` employer from creating/editing drafts |
| Hide/remove a currently public vacancy | Partial, indirect only | An operator can revoke the owning employer's verification (pauses all their published vacancies) — there is no way to pause/remove *one specific vacancy* without touching the employer's verification state at all |
| Distinguish moderation action from normal employer-controlled state | **No** | `vacancy_lifecycle_events`'s `paused` event type is shared between employer-initiated pause and the revocation side effect; the `metadata.reason` field is the only differentiator, and it is not queryable/filterable by any operator UI today |
| Restore a moderated employer/vacancy | Partial | An employer can resubmit for verification after revocation (`revoked → pending` via `request_employer_verification`, requires operator re-approval) and can resume a paused vacancy themselves (`resume_employer_vacancy`) — but there is no operator-initiated "undo this moderation action" primitive distinct from those employer-initiated ones |

### 3.1 Employer mutation mechanism audit — RPC-only is not the whole picture

A first draft of this planning package assumed every employer mutation runs
through a `SECURITY DEFINER` RPC (the D-066 pattern). **That assumption was
wrong and has been corrected.** Grepping every `.update(`/`.insert(`/
`.upsert(`/`.delete(` call across `src/app/employer` and
`src/lib/employer`, cross-referenced against the actual RLS policies in
`20260803200000_employer_profiles_and_company_ownership.sql`, found the
employer-mutation surface is a genuine mix of two mechanisms:

- **RPC-mediated** (the majority): every vacancy mutation
  (`create_employer_vacancy_draft` through `renew_employer_vacancy_to_draft`),
  `request_employer_verification`, `bootstrap_organisation_employer`
  (organisation profile + company creation), and
  `complete_employer_onboarding`.
- **Direct authenticated table write under plain RLS** (three real call
  sites, all on `employer_profiles`, none on `vacancies` or `companies`):
  `savePrivateEmployerAction`, `completeEmployerOnboardingAction`'s private
  branch, and `setLawfulHiringDeclared` — all in
  `src/app/employer/onboarding/actions.ts` — each issuing a plain
  `.from("employer_profiles").update(...)` authorized entirely by the
  `employer_profiles_update_own` RLS policy (`auth.uid() = id`, nothing
  about suspension state). A private employer's profile-detail edits
  (display name, Berlin locality, phone, website, lawful-hiring
  declaration) never touch an RPC at all.

**This matters directly for Slice 7's suspension design.** A suspension
enforced only by adding checks inside RPCs would leave these three direct
write paths completely unblocked — a suspended private employer could
still freely edit their public-facing profile detail. Closing this
requires narrowing the `employer_profiles_update_own` RLS policy itself,
not only adding new RPCs. This is a genuine, if narrow, required RLS
change for PR 7.2 — see `docs/43` §4.1/§6 for the exact enumeration and
the proposed policy narrowing. `companies` has no direct-write path at all
(only a read in `load-employer.ts`), and `vacancies` mutation is 100%
RPC-mediated (verified: the three `src/lib/employer/vacancies/*` files are
read-only loaders with zero write calls) — so the RLS gap is narrow and
fully enumerated, not an open-ended architectural problem.

**"Verification revoked" is not equivalent to "employer suspended."** Concretely:

- Revocation only fires from `verification_state = 'verified'` — it cannot
  touch an `unverified`, `pending`, or `rejected` employer at all, so it
  cannot be used as a general-purpose "stop this bad actor" tool against an
  employer who never got verified in the first place.
- Revocation is reversible entirely by the employer's own action
  (resubmit → operator re-approves) — it is a trust-gate reset, not a
  punitive hold that only an operator can lift.
- Revocation's side effect (pausing published vacancies) is a *consequence*
  of losing the verification gate, not a first-class "you are suspended"
  state — an employer whose vacancies were paused this way can still edit
  drafts, still receive/review applications on already-submitted
  applications (Slice 6 employer review does not require current
  verification — D-070), and still resume other lifecycle actions once
  re-verified.
- A genuine suspension likely needs to work regardless of the employer's
  current verification state, and likely needs to be operator-lift-only
  (not reversible by employer resubmission alone).

---

## 4. Vacancy moderation model audit

Current `vacancies.publication_state` values:
`draft | published | paused | filled | withdrawn | expired`. All six
transitions are employer-initiated via `_transition_employer_vacancy`
(single dispatcher RPC, row-locked, deterministic result discriminants),
except that `revoke_employer_verification` can *also* drive a vacancy from
`published → paused` as a side effect.

**Can today's model represent Slice 7's moderation needs?**

| Need | Representable today? |
|---|---|
| Operator removal of an unsafe vacancy | No first-class primitive — an operator would have to revoke the *employer's* verification (blast radius: all their published vacancies, not just one) |
| Temporary moderation hold | No — `paused` already means something employer-controlled; overloading it for operator holds would make "who paused this and why" ambiguous without a new field |
| Permanent moderation removal | No — `withdrawn` is employer-controlled and reversible only via `renew_employer_vacancy_to_draft`; using it for operator removal would let the employer's own `renew`/`resume` actions bypass a moderation hold |
| Stale vacancy handling | Effectively already covered — see §6 |
| Reason for moderation | No field exists on `vacancies` for this; `vacancy_lifecycle_events.metadata` *could* carry it but the table's `event_type` enum has no moderation-specific values |
| Actor | `vacancy_lifecycle_events.actor_user_id` already exists and is populated correctly for every existing event type, but it is **also directly readable by the owning employer** via `vacancy_lifecycle_events_select_owner` RLS — an operator-authored moderation event written into this table would leak the operator's `auth.users.id` to the employer being moderated |
| Timestamp | `occurred_at` pattern already established and reusable |
| Restoration | No — none of the six states currently represents "temporarily removed, can be operator-restored" |

**Recommendation (elaborated in `docs/43`): do not overload `withdrawn` or
`paused` for moderation.** The existing `vacancy_lifecycle_events` table's
open employer-readable RLS makes it unsuitable as-is for operator-authored
events without either (a) hiding the actor for moderation-sourced rows only
(inconsistent, error-prone), or (b) a parallel employer-invisible mechanism.
The narrowest correct design is a small, additive moderation-state field
(or a tiny separate moderation table) that composes with — rather than
replaces — the existing `publication_state`, plus operator events written
to a *new*, Slice-6-style zero-authenticated-grant audit table rather than
into `vacancy_lifecycle_events`. Full design in `docs/43`.

---

## 5. Audit/event infrastructure inventory

| Table | Purpose | Actor | Timestamp | Reason/metadata | Append-only? | `authenticated` grant | RLS | Writers |
|---|---|---|---|---|---|---|---|---|
| `vacancy_lifecycle_events` | Vacancy publication-lifecycle history | `actor_user_id` (nullable, **owner-readable**) | `occurred_at` | `metadata` jsonb, unconstrained shape beyond `jsonb_typeof = 'object'` | Yes (insert-only via internal helper; no update/delete RPC exists) | `SELECT` only, owner-scoped RLS | Yes (`vacancy_lifecycle_events_select_owner`) | `_append_vacancy_lifecycle_event` (internal, called by lifecycle RPCs) |
| `application_status_history` | Application status timeline | `actor_user_id`, `actor_role` (never client-exposed) | `occurred_at` | `reason` (rejected-only, employer-visible only) | Yes | **None** (zero grant) | N/A (moot, no grant) | RPC-mediated only |
| `employer_profiles` (verification columns) | Current verification state + last review | `verification_reviewed_by` | `verification_reviewed_at`, `verification_requested_at`, `verification_attested_at` | `verification_review_reason` | **No** — a column set, not a history; a second review overwrites the first's evidence | N/A (not a history table) | N/A | RPC-mediated only |
| `audit_events` (general) | — | — | — | — | — | — | — | **Does not exist** |

**No general `audit_events` model exists.** Per D-065, this was explicitly
deferred to Slice 7 ("Full moderation and administrative audit remain
Slice 7").

### Recommendation: (A) one general administrative audit ledger

Trade-offs considered:

- **(A) One general ledger** (e.g. `admin_audit_events`) for every
  operator-initiated sensitive action (suspend/unsuspend, vacancy
  moderate/restore, and optionally re-emitting verification
  approve/reject/revoke as first-class events too) — pros: one place to
  query "what has this operator done," one schema/RLS/grant pattern to get
  right once, avoids repeating the `vacancy_lifecycle_events`
  owner-readable-actor mistake for operator actions; cons: a generic
  `target_kind`/`target_id` design is slightly less type-safe than a
  dedicated column per domain, and cannot use a declarative cross-table
  FK/CHECK for integrity (PostgreSQL cannot express that) — integrity
  becomes procedural, proven by pgTAP instead (§5's corrected note below).
- **(B) Extend domain-specific histories only** (add moderation columns to
  `vacancy_lifecycle_events`, add a parallel `employer_moderation_events`)
  — pros: keeps each domain's history colocated with its table; cons:
  `vacancy_lifecycle_events`'s existing owner-readable RLS is wrong for
  operator actions (see §4), so this still requires either widening that
  table's exposure rules per-row (fragile) or a second parallel table
  anyway — which is most of ledger (A)'s cost without its query-once
  benefit.
- **(C) Hybrid** — a general ledger for operator actions on
  employers/candidates (suspend/unsuspend, account-level), plus a small,
  purpose-built vacancy-moderation table (state + reason + actor +
  timestamp, employer-invisible) that is *also* mirrored into the general
  ledger for a single audit view — pros: gets a correct, employer-invisible
  moderation-state read path for the effective-public computation (§4)
  *and* a single cross-domain audit query surface; cons: two writes per
  moderation action (state table + ledger) unless done in one transaction,
  which is a solved pattern already (Slice 6's atomic
  application+initial-history insert).

**Recommendation: (C), narrowly.** A single `admin_audit_events` ledger
(`event_type`/`target_kind`/`target_id`/`actor_user_id`/`reason`/`occurred_at`,
zero `authenticated` grant, RPC-read-only for operators) covers suspension
and gives one place to browse "what operators have done." Vacancy
moderation additionally needs a small `vacancy_moderation` state (not a
second event stream) so the effective-public/candidate-visibility
computation can join against it directly and cheaply, with every
moderation *transition* also appended to the same general ledger for a
unified history view. Full column-level design in `docs/43` (proposal
only, no SQL).

**Corrected referential-integrity note.** An earlier draft of this
document (and `docs/43`) assumed a CHECK constraint could validate that
`target_id` exists in whichever table the event's target implies.
**PostgreSQL CHECK constraints cannot perform cross-table existence
queries** — that claim has been withdrawn from `docs/43`. The actual
integrity guarantee is procedural: every audit-producing RPC resolves and
locks its target *before* writing the event, and `target_kind` is
hard-coded per RPC rather than caller-supplied, so a mismatched or
nonexistent-target event is structurally unreachable through any approved
RPC — proven by pgTAP, not by a declarative constraint. Full detail in
`docs/43` §2.3/§11.

---

## 6. Stale-vacancy analysis

Existing mechanism (Slice 5, D-063):

- `expires_at` is required once `published`; default 30 days, max 90 days
  (`publish_employer_vacancy`).
- `is_vacancy_effectively_public`/the effective-public read RPCs already
  evaluate `expires_at > now()` as part of "is this vacancy visible" —
  candidates stop seeing an expired vacancy immediately, without any
  operator action.
- `materialize_employer_vacancy_expiry` lazily flips the stored
  `publication_state` to `expired` (and appends an `expired`
  `vacancy_lifecycle_events` row) so the UI's *displayed* status catches up
  with the *effective* one; this is triggered by normal page loads, not a
  background job.
- `renew_employer_vacancy_to_draft` lets the employer bring an expired
  vacancy back through draft → readiness → publish with a fresh expiry.

**Recommendation: Slice 7 does not need a new stale-vacancy subsystem.**
Expiry + lazy materialization + renewal already fully covers "stale or
misleading vacancies are removed quickly" for the *time-based* staleness
case (`docs/04-mvp.md`'s own success-criteria wording). The distinct
concept Slice 7 actually needs is **operator-initiated removal of a
vacancy that is *not* expired but is unsafe/misleading** — that is
moderation (§4), not staleness. Definitions, for clarity in `docs/43`:

- **Expired** — `expires_at` has elapsed; fully automatic, no operator
  involved; already solved.
- **Stale** — colloquial term for "expired but not yet materialized";
  already solved by the effective-public computation being the actual
  authority (the stored `publication_state` lagging behind is a display
  nuance, not a visibility bug).
- **Abandoned** — an employer-owned vacancy left in `draft` or `paused`
  indefinitely; not a safety issue (drafts/paused vacancies are already
  private/non-public), so out of scope for Slice 7's *safety* exit
  criterion; not recommended for this slice.
- **Moderated** — an operator determined the vacancy itself is
  unsafe/misleading regardless of its expiry state; this is the actual new
  Slice 7 concept (§4).

---

## 7. Reports scope

No `reports`-style table, UI, or NOT_NOW-listed intake flow exists.
`docs/04-mvp.md`'s Administration MVP lists "report review" as included, but
does not specify *who* files the report or how it reaches an operator.

Options evaluated:

- **(A) User-submitted abuse/report workflow** — full candidate/employer-
  facing "report this vacancy/employer" UI + intake schema. This is a
  meaningfully sized feature (new public-facing form, spam/abuse
  rate-limiting considerations, a queue) for a controlled pilot with a
  small, founder-known employer set.
- **(B) Operator-created moderation case only** — an operator, upon
  learning of a problem through any channel (manual outreach, direct
  observation, a future support inbox), opens a moderation action directly
  against the employer/vacancy using the Slice 7 admin UI (§4/§6 above);
  no user-facing report *intake* UI is built in Slice 7.
- **(C) No report intake at all, moderation initiated manually** —
  effectively the database/manual-script equivalent of (B) without even an
  operator UI convenience; too narrow given the plan explicitly asks for
  operator-usable moderation tooling.
- **(D) Another narrow form** — e.g. a `mailto:` contact link plus (B).

**Recommendation: (B), optionally paired with a `mailto:`/contact-link
placeholder (D) for how a report would currently reach the operator out of
band.** A full user-submitted report *intake* workflow is not required for
the stated exit criteria ("administrators can suspend unsafe actors and
remove vacancies; sensitive admin actions are audited") — those describe
the *moderation* action, not the *reporting* channel. Building a full
ticketing/case-management system is explicitly out of scope per this
document's own instruction. A pilot-scale, founder-operated moderation
workflow does not need self-service report intake yet; revisit with real
pilot evidence.

---

## 8. Analytics assessment

Zero PostHog or any analytics integration exists (`NOT_NOW.md` explicitly
parks "PostHog (or equivalent privacy-conscious product analytics)
scaffolding" as an "Ideas inbox" item, not yet promoted).

The Slice 7 exit criterion is **"pilot funnel events are measurable"** — not
"a product-analytics platform is integrated." Every funnel step listed in
the kickoff (candidate registered, onboarding completed, application
submitted → reviewing → shortlisted → accepted/rejected, employer
registered, employer verified, vacancy published) is **already fully
derivable from existing database state**:

- candidate registered → `auth.users` + `candidate_profiles` existence
- onboarding completed → `candidate_profiles.onboarding_completed_at`
- application submitted/status → `applications.submitted_at`/`.status`,
  `application_status_history`
- employer registered/verified → `employer_profiles.created_at`/`.verification_state`/`.verification_reviewed_at`
- vacancy published → `vacancies.published_at`

**Recommendation: (C), deferred — but only the third-party *integration* is
deferred, not the exit criterion itself.** "No PostHog" must not silently
become "no funnel measurement." The exit criterion is proven instead by a
concrete, committed deliverable: a deterministic, read-only funnel-proof
script run against existing tables/columns only (proposed
`scripts/proof/pilot-funnel.mts`, one query per funnel stage listed above,
exact scope locked in `docs/42` PR 7.4 / D-075), with a documented sample
run recorded in the eventual Slice 7 exit-proof doc — the same evidentiary
pattern `pnpm proof:migrations` already uses for the migration-count
criterion. Do not integrate a third-party analytics SDK in Slice 7 — that
would also require a fresh privacy/consent review this document is
explicitly told not to perform casually. If a future slice wants live,
ongoing product analytics (as opposed to one-off pilot measurement), that
is a distinct, separately-decided feature, not a Slice 7 moderation/audit
dependency.

---

## 9. Transactional-email assessment

No Resend (or any) transactional-email integration exists. All current
email (registration confirmation) is handled entirely by Supabase Auth's
built-in flow; locally that's Mailpit, and Slice 3's Production hosted
proof already validated real confirmation email delivery through Supabase
Auth alone — no custom send path exists or has ever been needed.

`NOT_NOW.md` explicitly parks "Verification / publish transactional email
completeness" as a Slice 5→7 deferral, with the stated rationale: "Core
journey must work without email; Slice 7 owns completeness."

**What would "completeness" minimally mean for pilot readiness?** The
candidate/employer journeys already work end-to-end without any
status-change email (Slice 6 delivered in-app status visibility instead —
D-070 explicitly excluded notifications). The only email gap with any
plausible pilot-operational value is an **operator-facing** one: today, an
operator only learns a verification request exists by loading
`/internal/verification` themselves — there is no "you have a new pending
verification request" notice of any kind, for operator *or* employer.

**Recommendation: no candidate/employer-facing transactional email
(status, marketing, or otherwise) belongs in Slice 7** — that remains
explicitly excluded by D-070's non-goals and this document's own
instruction not to add messaging/notifications. If a minimal email is ever
justified, it would be a founder-facing "new pending verification"
operator notice — but even that is not required to meet the stated Slice 7
exit criteria (suspend/remove/audit/measurable funnel), so this document
recommends deferring it entirely rather than including it in Slice 7's PR
decomposition. State explicitly: **none are necessary for the Slice 7
moderation/audit exit criteria.**

---

## 10. Legal/privacy placeholder assessment

Zero Impressum, Datenschutz/privacy, Terms/AGB, or contact-information
routes/footer content exist anywhere in `src/app` or `src/components`.

A German-market pilot (per `docs/04-mvp.md`'s Berlin/Germany framing)
conventionally expects at minimum an Impressum link before any real public
traffic — but this document is explicitly instructed not to write legal
claims or treat placeholder text as legal advice.

**Recommendation:** the minimum defensible unit is **route placeholders +
footer links + explicit "draft — legal review required" text**, not real
legal content. This is a small, low-risk addition (a handful of static
routes) that can be its own narrow PR at the end of the Slice 7 sequence,
separate from moderation/audit work, and should not block moderation/audit
delivery. It is explicitly **not sufficient today** (nothing exists yet) —
but it is also explicitly **not urgent relative to moderation/audit**,
since the pilot is "controlled" (founder-selected employers), not open
public traffic yet.

---

## 11. Security threats (Slice 7–specific)

| Threat | Mitigation direction |
|---|---|
| A suspended (unsafe) employer retains candidate-snapshot read access | **Corrected finding.** Suspension must block the three Slice 6 employer applicant-review RPCs (`list_current_employer_applications`, `get_current_employer_application`, `transition_current_employer_application_status`), not exempt them — an operator-judged-unsafe employer should not keep reading candidate PII (display name, languages, work-authorisation declaration, availability, etc.) via `get_current_employer_application` for the duration of a punitive hold. Each RPC reuses its own existing deny-branch result (zero rows / `{"status":"unavailable"}` / `{"result":"employer_unavailable"}`) — no new oracle. See `docs/43` §4.2. |
| Direct-table employer mutation bypassing RPC-only suspension checks | **Corrected finding.** `employer_profiles_update_own`'s RLS policy grants direct authenticated `UPDATE` independent of any RPC (§3.1) — an RPC-only suspension design would not block it. The narrowed policy itself is the mitigation; see `docs/43` §4.1/§6. |
| Unauthorized internal route access | Reuse `requireActiveOperator` exactly as-is for every new `/internal/*` route; non-operator and unauthenticated both collapse to the existing generic-unavailable/redirect pattern already proven in `/internal/verification` |
| IDOR across employers/vacancies | Every new RPC must re-derive its target row server-side from the caller-supplied id and re-check operator status inside the function body — never trust a route param alone, exactly the D-066 pattern already used everywhere |
| Client-supplied operator identity | Never accept a `p_operator_id`/`p_actor_*` parameter on any write RPC — derive from `auth.uid()` only, exactly the Slice 5/6 precedent |
| Client-supplied timestamps | Never accept `p_occurred_at` — use `clock_timestamp()` server-side only, exactly the Slice 6 precedent |
| Moderation bypass by employer | The employer's own lifecycle RPCs (`resume_employer_vacancy`, `renew_employer_vacancy_to_draft`, `request_employer_verification`) must be re-audited once moderation state exists, to confirm none of them can silently clear an operator-set moderation hold — this is the central design constraint for `docs/43` |
| Accidental Production-wide action | No hosted command in this or any Slice 7 planning/implementation PR without the same explicit-authorization runbook discipline established in `docs/40-slice-6-hosted-proof-runbook.md` |
| Audit event mutation/deletion | Zero `UPDATE`/`DELETE` grant on the audit table for any role except `service_role`, mirroring `application_status_history` |
| Public leakage of moderation reason | Moderation reason is operator-facing only by default; candidate/employer visibility of *any* reason text requires a new, explicit, separately-decided product feature — do not expose by default, mirroring D-070's rejection-reason precedent |
| Service-role leakage | No service-role client in any browser/SSR runtime path — reuse the exact `SECURITY DEFINER` + Auth-bound-RPC pattern throughout; this document found zero existing service-role usage in application runtime code to begin with |
| Cross-tenant reads | Every new read RPC scopes by the caller's own operator status, never by a caller-supplied "which employer's data" filter without a server-side ownership/target check |
| Operator self-grant | Structurally impossible today (no RPC exists to write `verification_operators`) — Slice 7 must not add one without a new, explicit decision, since that would materially change the current "owner-only provisioning" trust boundary |
| Stale form race/concurrency | Row-lock (`FOR UPDATE`) + re-read live state pattern, exactly Slice 5/6's established convention (§12 below) |
| Double action/idempotency | Deterministic `already_in_state`/`invalid_transition`-style result discriminants, exactly Slice 6's transition RPC convention |
| Restoration after concurrent employer lifecycle change | Any restoration RPC must re-check the *current* live state (not a client-cached one) before restoring, and must define precisely what happens if the employer's own action already changed the row underneath the moderation hold — a `docs/43` design question, not resolved here |

---

## 12. Concurrency/idempotency model

Recommend directly reusing the exact pattern already proven twice
(Slice 5's `_transition_employer_vacancy`, Slice 6's
`transition_current_employer_application_status`):

- Row-lock the target with `FOR UPDATE` inside the RPC.
- Re-read live state inside the same transaction — never trust a
  client-supplied "expected current state."
- Return a deterministic result discriminant
  (`ok`/`updated` vs `already_in_state` vs `invalid_state`/`invalid_transition`
  vs `unavailable`/`forbidden`), never a raw exception, for every
  predictable outcome.
- Write the state change and its audit-ledger event atomically, in the same
  transaction and using the same captured timestamp — exactly Slice 6's
  "shared `ts` variable" proof pattern (`docs/39` §"shared-timestamp
  proof").

---

## 13. Open questions (not resolved by this discovery — for build-plan/decision review)

1. Should operator grant/revoke itself gain an RPC in Slice 7, or remain
   owner-only-via-direct-database-action indefinitely? **Recommendation:
   remain owner-only; out of scope for this slice's stated exit criteria.**
2. Should the general audit ledger also retroactively capture Slice 5/6
   verification approve/reject/revoke events (closing the "second review
   overwrites first review's evidence" gap in §2.7), or is that a nice-to-
   have deferred past Slice 7? **Recommendation: include it — it is a
   small addition to already-existing RPCs (one more insert each) and
   directly serves the "sensitive admin actions are audited" exit
   criterion, which those RPCs' actions clearly qualify for.**
3. Exact vacancy-moderation state shape — a boolean-plus-reason on
   `vacancies` itself, or a tiny separate `vacancy_moderation` table? Both
   are compatible with the "cannot be bypassed by employer lifecycle
   actions" requirement; the tradeoff is schema simplicity (inline column)
   vs. clean separation of employer-owned vs. operator-owned state
   (separate table). **Recommendation in `docs/43`: separate table** — it
   keeps `vacancies` itself, and every employer-facing RLS/RPC that already
   reads it, completely untouched, minimizing regression risk to Slice 3–6.
4. Should employer suspension block login entirely, or only block
   platform *actions* (create/edit/publish) while still allowing the
   employer to see their own account state? **Recommendation: block
   actions, not login** — Supabase Auth session/login itself is outside
   this application's RLS/RPC boundary to safely gate without deeper Auth-
   hook work not evidenced as necessary yet; blocking at the RPC/RLS layer
   (every mutating employer RPC checks "not suspended") is sufficient for
   the stated exit criterion and matches the existing pattern where
   verification/completion gates are enforced at the RPC layer, not the
   session layer.

---

## 14. Explicit non-goals for Slice 7 (carried forward and narrowed)

- Candidate suspension (employers-only for this slice; no product evidence
  of candidate-side abuse yet; explicitly not added for symmetry).
- Operator self-management (grant/revoke operator status) — remains
  owner-only/manual.
- User-submitted abuse/report intake UI — operator-initiated moderation
  only.
- A new stale-vacancy subsystem — already solved by existing expiry/renewal.
- Any candidate/employer-facing transactional email (status, marketing, or
  otherwise).
- Third-party analytics/tracking integration.
- Real legal content (Impressum/Datenschutz/Terms text) — placeholders only.
- Messaging, interviews, scheduling, CV/document workflows, Storage,
  scoring/ranking/AI, payroll, invoicing, contracts (unchanged from every
  prior slice's non-goals).
- Any hosted mutation, Preview configuration, or Production change in the
  planning unit or the eventual database-contract PR's local-only proof
  phase.
- Slice 8.

---

## 15. Stop-condition check

None of the stop conditions in the kickoff were triggered:

- Current operator identity/authorization **was** determinable (§2) —
  clear, single, well-evidenced mechanism.
- Existing verification architecture does **not** conflict with Slice 7
  admin needs — it is directly reusable (§2.4).
- Suspension does **not** require `auth.users`/service-role runtime access
  — it can be enforced entirely at the RLS/RPC layer against
  `employer_profiles` and the employer's own mutating RPCs (§13, open
  question 4).
- Vacancy moderation **can** be made non-bypassable without a major
  redesign — a small additive moderation-state table composes cleanly with
  the existing `publication_state` machine without touching it (§4, §13).
- The existing audit/event model (`vacancy_lifecycle_events`,
  `application_status_history`) does **not** expose sensitive information
  beyond its already-accepted design — the one real design flag
  (`vacancy_lifecycle_events`'s owner-readable actor) is a reason to route
  *new* operator events through a separate table, not evidence of an
  existing leak in already-shipped code.
- No unresolved documentation contradiction was found that materially
  changes Slice 7 scope — D-055/D-056/D-065's Slice-7 deferrals are fully
  consistent with `docs/04-mvp.md`'s Administration MVP list and
  `docs/13-implementation-plan.md`'s Slice 7 entry.

**No stop condition applies. Planning may proceed to the build plan and
proposal documents.**

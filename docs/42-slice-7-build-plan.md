# Slice 7 Build Plan — Admin Moderation to Audit Event

> **Status:** Planning Accepted; PR 7.1 merged (#64); PR 7.2 (database
> contract) merged (#65); PR 7.3 (employer/vacancy moderation UI) merged
> (#66). PR 7.4 (pilot funnel + legal placeholders + local exit proof) is
> implementation-complete locally, awaiting review/merge — no new migration,
> migration count remains 13, pgTAP remains 1136/1136. Local exit proof:
> `docs/44-slice-7-exit-proof.md`. Slice 7 is not formally Done until PR 7.4
> merges. Discovery: `docs/41-slice-7-discovery.md`.
> Moderation/audit proposal: `docs/43-slice-7-moderation-and-audit-proposal.md`.
> Decisions D-071–D-075 below (see "Accepted decisions" at the end of this
> document) are **Accepted** (2026-08-07) in `docs/10-decisions.md`, the
> authoritative record — the text here is retained as full supporting
> rationale/history, not re-litigated.

**Outcome (`docs/13-implementation-plan.md`, unchanged):** Stint can be
operated safely for a controlled Berlin pilot.

**Exit criteria (`docs/13-implementation-plan.md`, unchanged):**

- administrators can suspend unsafe actors and remove vacancies;
- sensitive admin actions are audited;
- pilot funnel events are measurable.

**Locked Slice 7 MVP boundary (this plan's narrowing of the broader
implementation-plan intent — see `docs/41` for the full audit trail):**

Employer suspension + vacancy moderation + one general operator-audit
ledger, built entirely on the existing `verification_operators`/
`requireActiveOperator`/`_is_active_verification_operator` authorization
foundation from Slice 5. Reports, analytics, transactional email, and legal
placeholders are addressed with the *minimum* recommended treatment from
`docs/41` (mostly: not needed yet, or a small separate final PR), not full
features. Candidate suspension, operator self-management, and a new
stale-vacancy subsystem are explicit non-goals (see `docs/41` §14).

---

## Source of truth

| Doc | Role |
|---|---|
| `docs/04-mvp.md` | Administration MVP scope boundary |
| `docs/13-implementation-plan.md` | Slice 7 outcome/exit criteria (unchanged by this plan) |
| `docs/41-slice-7-discovery.md` | Full current-state audit and rationale for every narrowing below |
| `docs/43-slice-7-moderation-and-audit-proposal.md` | Proposed schema/RPC/state-machine contract |
| D-056, D-065, D-066 | Operator authorization, audit-model deferral, RPC security boundary — all reused, none re-litigated |

---

## Dependencies and reuse (do not rebuild)

- **Authorization:** `verification_operators`, `_is_active_verification_operator(uuid)`,
  `is_current_user_verification_operator()`, and the server-side
  `requireActiveOperator` gate (`src/lib/internal/verification/operator-gate.ts`)
  are reused as-is. No new role/permission model. No operator
  grant/revoke RPC.
- **RPC security pattern:** row-lock + re-read-live-state + deterministic
  result discriminant + server-derived actor/timestamp — the exact
  Slice 5/6 pattern, reused without modification.
- **UI conventions:** `/internal/verification`'s generic-unavailable
  collapse for both unauthenticated and non-operator callers; the existing
  `internal-verification` SCSS module and component structure, extended
  rather than duplicated where the underlying data shape matches.
- **E2E conventions:** the existing `internal-verification-journey.spec.ts`
  two-context (operator + subject) pattern, and Slice 6's
  `local-operator-proof.ts`/`employer-application-fixture.ts`-style local
  fixture helpers.

---

## PR decomposition

Four PRs, not five — `docs/41`'s audit found no justification for a
separate "audit view" PR distinct from the moderation UI itself (an
operator reviewing a suspended employer or moderated vacancy needs to see
that target's own audit trail *inline*, not through a second, disconnected
dashboard), and no justification for forcing pilot-readiness items
(analytics/email/legal) into this slice's core moderation work at all.

### PR 7.1 — Slice 7 planning and decisions (this unit)

**Status:** Decisions Accepted (D-071–D-075, 2026-08-07, after two
corrective review passes); this PR is ready for/under final merge.

**Includes:** `docs/41-slice-7-discovery.md`, this build plan, `docs/43`
proposal, D-071–D-075 recorded Accepted in `docs/10-decisions.md`,
founder-dashboard update.

**Excludes:** everything database/runtime/UI.

**Exit criteria:** decisions reviewed and Accepted (or revised) before PR
7.2 starts — **met**; PR 7.2 is authorized once this PR merges.

---

### PR 7.2 — Admin moderation/audit database contract

**Status:** Merged (PR #65). One
additive migration (13th,
`20260807090000_admin_moderation_and_audit_contract.sql`) and one new
pgTAP file (`29_admin_moderation_and_audit_contract_test.sql`, 222
assertions) implement this section exactly as specified below, with three
implementation-time corrections:

1. `is_vacancy_effectively_public` is the *only* function that needed a
   body change for visibility (§4.4's full delegation chain —
   `list_effective_public_vacancies`, `get_effective_public_vacancy[_languages]`,
   `visible_public_vacancy_ids`, `resolve_current_candidate_vacancy_match`,
   `list_current_candidate_vacancy_matches`, `submit_candidate_application`
   — all inherited both new conditions automatically, confirmed against the
   merged migration, not just the plan).
2. **RLS suspension check corrected from an arbitrary-id to a self-derived
   helper.** An earlier draft of this migration granted `authenticated`
   EXECUTE on `_is_employer_suspended(uuid)` (arbitrary caller-supplied
   employer id) so the `employer_profiles_update_own` RLS policy could call
   it. That is an authenticated suspension-status oracle — any authenticated
   user could have probed whether an *arbitrary* employer is suspended, not
   only their own. Corrected: `_is_employer_suspended(uuid)` now has zero
   grants of any kind (fully internal, called only from within other
   `SECURITY DEFINER` function bodies); a new `_is_current_employer_suspended()`
   — zero arguments, identity from `auth.uid()` only — is the sole helper
   granted `authenticated` EXECUTE, and is the only one the RLS policy or
   the public `is_current_employer_suspended()` self-check RPC may call.
3. **Operator list RPCs are now bounded, not unlimited.** `list_employers_for_operator()`
   and `list_employer_vacancies_for_operator(uuid)` (§ below — beyond the
   original `docs/43` planning scope, added during implementation per "the
   DB contract must be complete enough for PR 7.3 UI without another
   migration") now take `p_limit integer default 50, p_offset integer
   default 0`, hard-clamped to `[1, 100]` for the limit and `>= 0` for the
   offset, with deterministic `created_at desc, id asc` ordering — so
   neither can be turned into an unrestricted table dump by a caller-
   controlled limit.

Not yet merged; PR 7.3 remains unauthorized until this PR merges.

**Objective:** the additive migration + pgTAP proof for everything PR 7.3's
UI needs — no UI in this PR, mirroring the Slice 6.1/6.2 split that already
proved valuable twice this project.

**Includes (see `docs/43` for exact proposed shapes — no SQL is written
here):**

- one general `admin_audit_events` ledger table
  (`event_type`/`target_kind`/`target_id`/`actor_user_id`/`reason`/`occurred_at`,
  zero `authenticated` grant, RPC-mediated only, append-only; `event_type`/
  `target_kind` pairing is CHECK-constrained declaratively (same-row,
  implementable); `target_id` existence has **no** polymorphic FK or
  cross-table CHECK — that integrity is procedural, proven by pgTAP,
  per `docs/43` §2.3);
- an employer-suspension state (`employer_suspension`, a narrow parallel
  table with a real FK to `employer_profiles` — current-state row, not
  audit history);
- a vacancy-moderation state (`vacancy_moderation`, same pattern, real FK
  to `vacancies`);
- operator-only `SECURITY DEFINER` RPCs: suspend/unsuspend employer,
  moderate/restore vacancy, plus read RPCs for "is this employer
  suspended," "is this vacancy moderated," and a paginated/bounded audit
  event read for a given target;
- suspension enforcement across **every authoritative employer mutation
  path**, not only RPCs — `docs/43` §4.1's audit found the employer
  mutation surface is a mix of `SECURITY DEFINER` RPCs (the majority) and
  direct-table `UPDATE` paths on `employer_profiles` authorized by the
  existing `employer_profiles_update_own` RLS policy alone. This PR
  therefore includes **one narrowing change to that RLS policy** in
  addition to the internal RPC-body checks — the narrowing applies at the
  policy level, so it blocks every own-row `UPDATE` that policy governs
  (including the pre-lock `employer_type` path, `docs/43` §4.1) with no
  per-call-site exception list to maintain; this is a real RLS policy
  change and must be reported as one, not described as "no RLS changes";
- suspension enforcement extended to the three Slice 6 employer applicant-
  review RPCs (`list_current_employer_applications`,
  `get_current_employer_application`,
  `transition_current_employer_application_status`) — corrected from an
  earlier, mistaken exemption; see `docs/43` §4.2 for the exact
  deny-branch reuse (no new result discriminant, no new existence oracle);
- suspension enforcement extended to **public/candidate discoverability**,
  not only to the employer's own access — the canonical
  `is_vacancy_effectively_public` predicate gains an `employer_not_suspended`
  condition composed alongside D-073's `vacancy_not_moderated` condition
  (`docs/43` §4.3/§4.4/§5.3), inherited automatically by every function
  that delegates to it (public list/detail, candidate match list/detail,
  application submission) — without rewriting `publication_state`, and
  without a new candidate-facing "suspended" result reason;
- full pgTAP coverage: authorization, RLS/grants (including the narrowed
  `employer_profiles_update_own` policy), concurrency
  (row-lock/re-read/idempotent-result), audit-event correctness (actor
  DB-derived, timestamp DB-derived, append-only, no direct authenticated
  access, same-row `event_type`/`target_kind` CHECK rejection, nonexistent-
  target impossibility through any approved RPC), restoration semantics,
  historical-retention behavior (no `ON DELETE CASCADE` from the ledger to
  its targets), suspension-driven effective-public visibility (published →
  suspend → hidden across every `docs/43` §4.4 function → unsuspend →
  visible only if current live state independently qualifies, composed
  correctly with a separate vacancy-moderation hold), and a proof that
  suspension cannot be bypassed by any existing employer-initiated mutation
  or read path — RPC or direct-table — enumerated exactly, not asserted
  once and assumed to generalize.

**Excludes:** any UI; analytics; email; legal placeholders; candidate
suspension; operator self-management.

**Database effects:** one additive migration (13th). Generated types
regenerate. No change to any Slice 0–6 table's existing column set beyond
the additive suspension field(s) this PR itself introduces. **One RLS
policy change** (`employer_profiles_update_own`, narrowed to add a "not
suspended" condition) — this is the sole proposed RLS change in the entire
Slice 7 contract; see `docs/43` §4.1/§6.

**Route effects:** none.

**Tests:** pgTAP only, following the exact structure/rigor of
`28_application_status_and_review_contract_test.sql`.

**Exit criteria:** full pgTAP green; migration count 13; generated types
regenerate cleanly; no regression in the existing 914 assertions.

---

### PR 7.3 — Employer/vacancy moderation UI

**Status:** Merged (PR #66). No new migration — built entirely on the
merged PR 7.2 operator RPCs; migration count remains 13, pgTAP remains
1136/1136, generated types unchanged.

**Objective:** the smallest operator-usable UI on top of PR 7.2's RPCs,
extending `/internal/verification`'s established architecture rather than
building parallel navigation.

**Includes (routes finalized in `docs/43`/at PR-start time against the
actual PR 7.2 contract, not guessed here):**

- `/internal/employers` — operator-only list of employers with suspend
  state and verification state both visible (reusing
  `list_pending_employer_verifications`'s "operator sees only the minimum
  needed fields" convention, extended to *all* employers, not only
  pending-verification ones);
- `/internal/employers/[employerProfileId]` — detail + suspend/unsuspend
  action + that employer's audit-event history + (closing the `docs/41`
  §2.9 gap) a **revoke-verification control**, since the RPC already
  exists and only lacks UI;
- `/internal/vacancies/[vacancyId]` (or a moderation action reachable from
  the employer detail page, if `docs/43`'s audit at PR-start time finds no
  standalone list is needed for pilot scale) — moderate/restore action +
  that vacancy's audit-event history.

**Excludes:** a generic dashboard; bulk actions; candidate moderation;
report intake UI.

**Database effects:** none.

**Route effects:** the routes above only.

**Tests:** Vitest/Testing Library for loaders/components; static-security
test (no service-role, no caller-supplied operator/actor identity, no
direct audit-table read outside approved loaders, approved-RPC-name
allowlist — the exact Slice 6 static-security pattern); Playwright covering
suspend→verify-blocked→unsuspend, moderate→verify-hidden→restore,
non-operator/unauthenticated denial, and audit-event visibility for both
target types.

**Exit criteria:** an operator can suspend an unsafe employer and see their
publish path blocked; an operator can moderate an unsafe vacancy and see it
disappear from public/candidate visibility while the employer's other
vacancies are unaffected; both actions are visible in that target's audit
history; a non-operator gets the same generic-unavailable page as today;
full local suite green.

---

### PR 7.4 — Pilot-readiness surface (only the accepted minimum)

**Status:** Implementation complete locally, awaiting review/merge. No new
migration; migration count remains 13, pgTAP remains 1136/1136, generated
types unchanged. Local exit proof: `docs/44-slice-7-exit-proof.md`.

**Objective:** close out the *non*-moderation Slice 7 exit-criteria items
that `docs/41` found genuinely necessary or low-risk, without expanding
scope.

**Includes, per `docs/41`'s recommendations:**

- legal/privacy route placeholders + footer links ("draft — legal review
  required" text only, no real legal content);
- **a pilot funnel-measurement proof** — not a third-party analytics
  integration. Concretely: `scripts/proof/pilot-funnel.mts` (or an
  equivalent named script, final naming decided at PR 7.4 start), a
  read-only, local-and-hosted-safe script that runs one deterministic
  query per funnel stage listed in `docs/41` §8 (candidate registered →
  onboarding completed → application submitted → reviewing → shortlisted
  → accepted/rejected → employer registered → employer verified → vacancy
  published) against existing tables/columns only, and prints a count per
  stage. "Deterministic" is enforced at the database level, not merely by
  the SQL being SELECT-only: the whole measurement runs inside one
  Postgres `REPEATABLE READ READ ONLY` transaction, so every stage
  describes the identical database snapshot and shares one
  transaction-stable measurement instant (`transaction_timestamp()`)
  rather than several independently observed states. This is the literal
  deliverable that satisfies "pilot funnel events are measurable" without
  a new third-party integration — deferring PostHog is not the same as
  deferring measurability, and this script is the concrete proof that the
  exit criterion is met by DB evidence alone.
  Committed as a script + a documented sample run in the eventual Slice 7
  exit-proof doc, exactly the same way `pnpm proof:migrations` already
  proves the migration-count criterion today.
- **no** transactional email (deferred — not required for the stated exit
  criteria, per `docs/41` §9).

If review of this plan concludes analytics or email genuinely belong in
Slice 7 after all, that is a scope change to be decided explicitly before
PR 7.4 starts — not something to fold in silently.

**Database effects:** none.

**Route effects:** the legal placeholder routes only.

**Tests:** Vitest for the new static routes/footer; no new Playwright
journey needed (a static-content check is sufficient).

**Exit criteria:** footer links resolve; placeholder pages render with
explicit draft/legal-review-required text; full local suite green.

---

## Acceptance conditions (all PRs)

- No PR introduces a second admin/operator identity model.
- No PR allows a client-supplied operator/actor identity or timestamp on
  any write RPC.
- No PR exposes an audit-event actor to the moderated employer/candidate.
- No PR lets an employer-initiated RPC silently clear an operator-set
  suspension or moderation hold (PR 7.2's pgTAP suite must prove this
  negatively for every existing employer-mutating RPC, not just assert it
  in prose).
- No PR adds a service-role browser/runtime dependency.
- No PR touches candidate suspension.
- No PR begins Slice 8.

## Test strategy (overall)

- **PR 7.2:** pgTAP is the primary proof — authorization, concurrency,
  audit-event integrity, non-bypassability.
- **PR 7.3:** Vitest/Testing Library for loaders/components/schemas +
  static-security + Playwright for the two core moderation journeys +
  denial paths.
- **PR 7.4:** Vitest only; no new Playwright journey.
- **Every PR:** full existing local suite (format/lint/typecheck/build/
  Vitest/pgTAP/migration-inventory/type-drift/all prior Playwright suites)
  must stay green, exactly the discipline established across Slice 5/6.

## Local exit proof

Each implementation PR (7.2, 7.3, 7.4) runs the same command sequence
established in `docs/39-slice-6-exit-proof.md`, extended with whatever new
Playwright script PR 7.3 adds (e.g. `test:e2e:internal-moderation`). A
Slice 7 closure PR, mirroring PR 6.4, produces `docs/4x-slice-7-exit-proof.md`
once PR 7.4 merges.

## Hosted-proof strategy

Not executed by any PR in this decomposition. Local proof first, always.
When hosted proof is eventually authorized:

- disposable Supabase project preferred, exactly `docs/40`'s model;
- no Preview→Production resource connection;
- Production proof only under a new, separate, explicit authorization —
  never inherited from an earlier Slice's authorization;
- a Slice-7-specific hosted-proof runbook (mirroring `docs/40`'s structure)
  is written as part of a future Slice 7 closure PR, not this planning
  unit.

## Scope exclusions (this plan)

Candidate suspension; operator self-management (grant/revoke); user-
submitted report intake UI; a new stale-vacancy subsystem; any candidate/
employer-facing transactional email; third-party analytics integration;
real legal content; messaging; interviews; scheduling; CV/document
workflows; Storage; scoring/ranking/AI; payroll; invoicing; contracts;
hosted mutation of any kind; Slice 8.

---

## Accepted decisions

The five decisions below are **Accepted** (2026-08-07) — see
`docs/10-decisions.md` D-071–D-075 for the authoritative record. The text
here is the full supporting rationale and revision history for each,
retained rather than trimmed after acceptance. Full supporting evidence is
in `docs/41-slice-7-discovery.md`.

### D-071 (Accepted) — Slice 7 boundary and admin authorization reuse

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** `docs/13-implementation-plan.md`'s Slice 7 entry lists a
broader set of capabilities (admin authorization, employer review/
approval, vacancy moderation, reports, suspension, stale-vacancy handling,
audit events, transactional email completeness, privacy/terms/Impressum
placeholders, basic funnel analytics) than this plan's first implementation
contract covers. Employer verification review/approval is already Done
(Slice 5). Per `AGENTS.md`'s conflict-reporting rule, this narrowing is
recorded here rather than silently resolved, following the identical
precedent of D-039/D-046/D-055/D-070 narrowing their own slices' earlier
`docs/13` descriptions.

**Decision:** Slice 7's first implementation contract is: employer
suspension, vacancy moderation, and one general operator-audit ledger,
built entirely on the existing `verification_operators`/
`_is_active_verification_operator`/`requireActiveOperator` authorization
foundation from D-056 — no second admin/operator identity model, no
operator self-management (grant/revoke) RPC. Reports, analytics,
transactional email, and legal placeholders receive the minimum treatment
identified in `docs/41` (mostly deferred, or a small separate final PR),
not full features. Candidate suspension and a new stale-vacancy subsystem
are explicit non-goals.

**Alternatives:** Build the full `docs/13` list in one slice (rejected —
no product evidence most of it is needed for a controlled pilot's safety
exit criteria, and it would violate this planning unit's own instruction
not to force five PRs or build a generic dashboard); add a second,
general-purpose "admin" role distinct from "verification operator"
(rejected — `docs/41` found the existing mechanism already generalizes
cleanly with no naming or authorization conflict).

**Consequences:** Slice 7 exit criteria ("administrators can suspend
unsafe actors and remove vacancies; sensitive admin actions are audited;
pilot funnel events are measurable") are met by the narrower contract
above; funnel measurability is satisfied by existing database evidence
(D-075) rather than a new analytics integration.

---

### D-072 (Accepted) — Employer suspension semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** No suspension concept exists today. `verification_revoked` is
not equivalent to suspension (`docs/41` §3) — it only fires from
`verified`, is reversible by employer resubmission alone, and is a
trust-gate reset rather than a punitive hold. A revised audit
(`docs/41` §3.1, `docs/43` §4.1) additionally found that the employer
mutation surface is not RPC-only: three direct-table `UPDATE` paths on
`employer_profiles` are authorized by RLS alone, and an earlier draft of
this decision incorrectly cited D-070's "review survives verification
revocation" precedent to exempt Slice 6 employer applicant-review access
from suspension — that citation was a reasoning error, since D-070
describes *revocation*, not a punitive *suspension* imposed on an actor
already judged unsafe.

**Decision:** A new, independent employer-suspension state (proposed
`employer_suspension` table, `docs/43` §2.1): two states only (suspended /
not suspended), operator-only, required reason, DB-derived actor/
timestamp. While an employer is suspended:

- Supabase Auth login/session is **not** disabled;
- historical data remains stored, untouched;
- the employer's own UI may render a neutral suspended state (exact
  wording is PR 7.3 work);
- **every authoritative employer mutation path is blocked** — this means
  every `SECURITY DEFINER` RPC in `docs/43` §4.1 Mechanism A (draft edit,
  publish/pause/resume/fill/withdraw/renew, new verification requests,
  organisation bootstrap, onboarding completion) **and** the three direct-
  table `employer_profiles` `UPDATE` paths in Mechanism B, closed by a
  narrowing change to the `employer_profiles_update_own` RLS policy itself
  (not achievable by RPC-body checks alone, since those paths never call
  an RPC);
- **application status transitions are blocked** —
  `transition_current_employer_application_status` returns its existing
  `employer_unavailable` result while suspended;
- **employer applicant list/detail access is blocked** —
  `list_current_employer_applications` returns zero rows and
  `get_current_employer_application` returns `{"status":"unavailable"}`,
  both reusing existing deny-branch results, while suspended;
- **no candidate snapshot is returned** to a suspended employer through
  any Slice 6 employer-review RPC, for as long as the suspension is active
  (`docs/43` §4.2's privacy rationale);
- candidate-owned application/history views (Slice 6 candidate side) are
  **unaffected** — a candidate can still see their own application and its
  status timeline regardless of the employer's suspension state;
- operator moderation/audit surfaces continue to work regardless of any
  employer's suspension state;
- **unsuspension restores ordinary employer access** according to the
  employer's *current live* verification/vacancy/application states at
  the moment of unsuspension — it does not resurrect or replay any state
  that changed, or would have changed, during the suspension window;
- **suspension itself does not mutate `verification_state`**;
- **suspension itself does not mutate any `applications.status` value**;
- **suspension itself does not rewrite any `vacancies.publication_state`
  value** — a currently-published vacancy stays `published` in the
  database; suspension never touches stored lifecycle state;
- **all of the suspended employer's vacancies nonetheless become
  non-effective-public while the suspension is active** — corrected from
  an earlier, unacceptable draft that treated "does not rewrite
  `publication_state`" as equivalent to "leaves public/candidate
  visibility unaffected." An operator-imposed suspension means the
  employer has been judged unsafe; candidates must not continue
  discovering or applying to that employer's vacancies while the hold is
  active. This is achieved **without** rewriting `publication_state`: the
  canonical `is_vacancy_effectively_public` predicate (`docs/43` §4.4/§5.3)
  gains an independent `employer_not_suspended` condition, composed
  exactly the same way vacancy moderation (D-073) already narrows the same
  predicate — `effective_public = existing_conditions AND
  employer_not_suspended AND vacancy_not_moderated`. Every public/candidate
  read and write path that delegates to that one predicate (public
  list/detail, candidate match list/detail, application submission —
  `docs/43` §4.4's full inventory) is covered automatically, with no
  candidate-facing "employer suspended" reason exposed — a suspended
  employer's vacancy is simply `'unavailable'`, the same discriminant
  already used for paused/expired/withdrawn/unverified-employer vacancies;
- **unsuspension does not republish anything and does not restore any
  captured state** — it only removes the suspension gate; each vacancy
  becomes visible again solely if its current live publication/
  verification/expiry/moderation state independently qualifies it.

Suspension is independent of `verification_state`; suspending does not
itself change verification, and revoking verification does not itself
suspend. This is a **stronger** hold than verification revocation — an
explicit operator safety action against an actor already judged unsafe,
not a trust-gate reset.

**Alternatives:** Reuse `verification_state = 'revoked'` for suspension
(rejected — conflates two different concepts with different reversal
rules, per `docs/41` §3); block Auth login (rejected for MVP — would
require deeper Auth-hook work not evidenced as necessary; RLS/RPC-layer
enforcement is sufficient for the stated exit criterion); exempt Slice 6
applicant-review access from suspension by analogy to D-070's revocation
precedent (rejected — this was the original, now-corrected error; D-070
governs revocation, not suspension, and a suspended employer's continued
candidate-snapshot access is a real privacy exposure, not a candidate-
protective one); enforce suspension only via RPC-body checks (rejected —
`docs/41` §3.1's audit found this would leave three direct-table
`employer_profiles` update paths completely unblocked); leave public/
candidate visibility unaffected by suspension, blocking only mutations and
reads (rejected — this was the original, now-corrected error; an
operator-judged-unsafe employer's vacancies remaining publicly discoverable
and applicable-to defeats the purpose of the safety hold; `docs/43`
§4.3/§5.3 corrects this by adding an `employer_not_suspended` condition to
the canonical effective-public predicate, composed the same way as vacancy
moderation, D-073).

**Consequences:** One new small table with a real FK to `employer_profiles`;
every Mechanism A RPC and all three Slice 6 employer RPCs gain one
additional internal check; **one existing RLS policy
(`employer_profiles_update_own`) is narrowed** — this is a real, if small,
RLS change, and PR 7.2's migration/build-plan description must state it
explicitly rather than claiming no RLS changes; the canonical
`is_vacancy_effectively_public` predicate also gains one additional
condition (`docs/43` §4.4/§5.3) — a `SECURITY DEFINER` function-body
change, not a further RLS change — which every public/candidate read and
write path inherits automatically by delegation, with no per-path
duplication and no new candidate-facing "suspended" oracle, and without
rewriting any stored `publication_state` value.

---

### D-073 (Accepted) — Vacancy moderation semantics

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** No operator-initiated, single-vacancy hold exists today. The
closest existing mechanism (revoking the owning employer's verification)
has blast radius across every published vacancy that employer owns, not
one specific unsafe listing, and none of the six existing
`publication_state` values cleanly represents an operator hold without
overloading employer-controlled semantics (`docs/41` §4).

**Decision:** A new, independent vacancy-moderation state (proposed
`vacancy_moderation` table, `docs/43` §2.2/§5.2), composing with rather
than replacing `publication_state`. Effective public/candidate visibility
(the canonical `is_vacancy_effectively_public` predicate, `docs/43`
§4.4/§5.3) gains one additive narrowing condition: a vacancy is never
effectively public while moderated, regardless of its `publication_state`.
Restoration re-reads the vacancy's *current* live `publication_state`
rather than assuming a prior one, so a since-withdrawn vacancy is not
resurrected by restoration alone (`docs/43` §10). Operator-authored
moderation events are written to the new general audit ledger (D-074),
never to `vacancy_lifecycle_events` (whose owner-readable RLS would leak
the operator's identity to the employer being moderated — `docs/41` §4).

**Relationship to D-072 — two independent gates, deliberately not
collapsed.** Employer suspension (D-072) and vacancy moderation (D-073)
are kept as two separate concepts with two separate tables, because they
operate at different scopes: suspension is an **actor-level** safety gate
that narrows visibility for every vacancy a suspended employer owns;
moderation is a **vacancy-level** safety gate that narrows visibility for
one specific vacancy regardless of who owns it. Both compose into the same
canonical predicate without either subsuming the other:

```
effective_public =
  existing_publication_conditions
  AND employer_not_suspended   -- D-072
  AND vacancy_not_moderated    -- D-073
```

Both conditions can be independently true or false for the same vacancy
(e.g. a moderated vacancy owned by a suspended employer is hidden by both;
restoring only one leaves it hidden by the other). This composition is the
same principle already used for `publication_state`/expiry, extended by
one more independent AND-clause per safety gate, not a new pattern.

**Alternatives:** Overload `withdrawn` or `paused` for moderation
(rejected — both remain employer-reversible via existing RPCs, which would
let an employer silently undo an operator's moderation hold); write
moderation events into `vacancy_lifecycle_events` (rejected — that table's
RLS already exposes `actor_user_id` to the owning employer).

**Consequences:** One new small table; one additive (narrowing-only)
change to the single canonical `is_vacancy_effectively_public` predicate,
inherited by delegation across every function in `docs/43` §4.4's
inventory (not only the three PR 5.5a public-read RPCs), with every
existing pgTAP assertion about them required to keep passing unchanged.

---

### D-074 (Accepted) — Admin audit ledger architecture

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.2

**Context:** D-065 explicitly deferred the general `audit_events` platform
to Slice 7 rather than building it in Slice 5. No such table exists today.
Two narrower audit patterns already exist and diverge:
`vacancy_lifecycle_events` (owner-readable RLS, closed event-type enum)
and `application_status_history` (zero-grant, RPC-mediated, actor never
client-exposed).

**Decision:** One general, append-only `admin_audit_events` ledger
(`docs/43` §2.3/§3), following `application_status_history`'s zero-
`authenticated`-grant, RPC-mediated pattern — not `vacancy_lifecycle_events`'s
owner-readable pattern. Fields: `id`, `event_type`, `target_kind`,
`target_id`, `actor_user_id`, `occurred_at`, `reason`, bounded `metadata`.
`event_type` is the closed action/event discriminator
(`employer_suspended | employer_unsuspended | vacancy_moderated | vacancy_restored | verification_approved | verification_rejected | verification_revoked`);
`target_kind` is an independently bounded enum (`employer | vacancy`) —
**not** the same field as `event_type`, and not derived from it by string
matching. Covers employer suspend/unsuspend, vacancy moderate/restore, and
(closing a narrow existing gap) re-emits verification approve/reject/
revoke as first-class events from the three already-shipped Slice 5 RPCs,
whose parameters/result contracts/existing pgTAP assertions remain
unchanged.

**`event_type`/`target_kind` pairing is declaratively CHECK-constrained
(same-row, unlike `target_id`).** `event_type` and `target_kind` are both
columns of the same row, so — unlike `target_id`'s cross-table problem
below — their legal pairing is an ordinary same-row CHECK constraint, the
same class already used for `application_status_history`'s
`reason`/`to_status` pairing. Both enums are closed and the pairing is
fixed: `target_kind = 'employer'` only for `event_type in
('employer_suspended', 'employer_unsuspended', 'verification_approved',
'verification_rejected', 'verification_revoked')`; `target_kind =
'vacancy'` only for `event_type in ('vacancy_moderated',
'vacancy_restored')`. Exact SQL is PR 7.2 implementation work.

**Corrected: `target_id` existence has no polymorphic FK or cross-table
CHECK.** An earlier draft claimed a CHECK constraint could validate
`target_id` against whichever table `target_kind` implies — **PostgreSQL
CHECK constraints cannot perform cross-table existence queries**, so that
claim is withdrawn. Referential integrity for `target_id` is procedural
instead: every audit-producing RPC resolves and locks its target *before*
writing the event; `target_kind` is hard-coded per RPC, never
caller-supplied (and is additionally constrained by the same-row CHECK
above, so it cannot even be self-inconsistent with `event_type`);
`target_id` is the id of the row the RPC just locked, never a separately
re-typed parameter; **there is no generic client-callable "append an audit
event" RPC** — every event is a side effect of a specific,
already-authorized domain RPC. PR 7.2's pgTAP suite proves all of this
behaviorally: an invalid `event_type`/`target_kind` pairing is rejected by
the table CHECK directly; a valid pairing succeeds only through an approved
domain RPC; a nonexistent target cannot create an event through any
approved RPC; `target_kind` cannot be caller-supplied independently by any
domain RPC; actor/timestamp remain DB-derived; no direct `authenticated`
INSERT/UPDATE/DELETE succeeds against the table.

Actor and timestamp are always DB-derived (`auth.uid()`,
`clock_timestamp()`); reason is required for punitive event types,
optional/absent for restorative ones; no event's `reason` is exposed to
the moderated employer or any candidate by default. State transition and
its audit event are written atomically, sharing one captured timestamp —
the Slice 6 shared-timestamp pattern, re-proven for this table.

**Retention is deliberately not `ON DELETE CASCADE` from the target.**
`target_id` remains historical evidence even if the employer/vacancy row
it refers to is later deleted — this document does not decide Slice 8's
final GDPR retention/deletion policy, but locks the constraint Slice 8
must respect: Slice 8 must explicitly reconcile administrative-audit
retention with account-deletion requirements, and PR 7.2 must not
accidentally erase the ledger merely because a domain row is deleted. This
is distinct from the two *current-state* tables (`employer_suspension`,
`vacancy_moderation`), which legitimately use real FKs with `on delete
cascade`, since they represent live state tied to a still-existing row,
not durable cross-domain audit history.

**Alternatives:** Extend domain-specific histories only (rejected —
`vacancy_lifecycle_events`'s existing RLS is unsuitable for operator
actions without either weakening it per-row or building a second table
anyway, per `docs/41` §5); land the full general ledger in Slice 5 instead
(rejected already, by D-065, prior to this document); a literal polymorphic
foreign key or cross-table CHECK on `target_id` (rejected — not
implementable in PostgreSQL; procedural integrity via the RPC boundary is
the corrected design).

**Consequences:** One new table with no FK to any domain table (by
design — see retention above), but with a same-row `event_type`/
`target_kind` CHECK constraint (a normal, implementable constraint, unlike
the rejected cross-table one); three existing Slice 5 RPCs gain one
additional insert each inside their existing transactions, with no change
to their external contracts; PR 7.2's pgTAP suite carries the full
`target_id`-existence integrity burden that a declarative constraint
cannot express, while the CHECK constraint carries the `event_type`/
`target_kind` pairing burden declaratively.

---

### D-075 (Accepted) — Slice 7 pilot-readiness scope (reports, analytics, email, legal)

**Status:** Accepted
**Accepted:** 2026-08-07
**Must accept before:** PR 7.4 (does not block PR 7.2/7.3)

**Context:** `docs/13-implementation-plan.md`'s Slice 7 entry also lists
reports, stale-vacancy handling, transactional-email completeness, basic
funnel analytics, and (via `docs/04-mvp.md`'s Administration MVP) implies
legal/privacy readiness. `docs/41` audited each and found the current
state is zero integration for analytics/email/legal, and no report-intake
schema, while stale-vacancy handling is already fully solved by existing
Slice 5 expiry/renewal.

**Decision:** Reports: operator-initiated moderation only (D-073's
`moderate_vacancy`/employer-suspension RPCs), no user-submitted report-
intake UI in Slice 7. Stale-vacancy handling: no new subsystem — existing
expiry/renewal already satisfies it. **Analytics: no third-party
integration in Slice 7 — but the "pilot funnel events are measurable" exit
criterion is not deferred along with it.** It is proven instead by a
concrete, committed deliverable: a deterministic, read-only funnel-proof
script (`docs/42` PR 7.4, one query per funnel stage against existing
tables) plus a documented sample run recorded in the Slice 7 exit-proof
doc. Deferring PostHog is explicitly not the same decision as deferring
measurability — this ledger row exists specifically so that distinction is
never silently collapsed. Transactional email: none added in Slice 7 for
candidates or employers (unchanged from D-070's own notification
non-goal); no operator-facing email either, since it is not required to
meet the stated exit criteria. Legal/privacy: route placeholders + footer
links with explicit "draft — legal review required" text only, in a small
final PR (7.4), containing no real legal content.

**Alternatives:** Build a full user-submitted report/ticketing workflow
now (rejected — no pilot evidence of need, disproportionate for a
founder-operated, controlled Berlin pilot); integrate PostHog or similar
now (rejected — existing DB evidence already satisfies "measurable" for
pilot scale; introduces an unreviewed privacy/consent surface); treat "no
PostHog" as "no funnel measurement" and drop the exit criterion entirely
(rejected — the exit criterion is binding regardless of which mechanism
proves it; the funnel-proof script is the mechanism); add status-change
emails now (rejected — D-070 already excluded notifications as a Slice 6
non-goal, and the core journeys already work without email).

**Consequences:** PR 7.4 is small and low-risk (static routes + one
read-only proof script); the "pilot funnel events are measurable" exit
criterion is met with a named, verifiable deliverable rather than an
implicit claim; a future slice may still add live product
analytics or transactional email as its own, separately-decided feature.

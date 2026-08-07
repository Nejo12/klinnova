# Slice 7 Build Plan — Admin Moderation to Audit Event

> **Status:** Planning in progress. No PR has started implementation.
> Discovery: `docs/41-slice-7-discovery.md`. Moderation/audit proposal:
> `docs/43-slice-7-moderation-and-audit-proposal.md`. Decisions D-071–D-075
> below (see "Proposed decisions" at the end of this document) are
> **Proposed**, not Accepted — `docs/10-decisions.md` is not modified by
> this PR. D-070 remains the highest currently Accepted decision.

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

**Status:** In progress (this document).

**Includes:** `docs/41-slice-7-discovery.md`, this build plan, `docs/43`
proposal, proposed decisions (see below), founder-dashboard update.

**Excludes:** everything database/runtime/UI.

**Exit criteria:** decisions reviewed and Accepted (or revised) before PR
7.2 starts.

---

### PR 7.2 — Admin moderation/audit database contract

**Objective:** the additive migration + pgTAP proof for everything PR 7.3's
UI needs — no UI in this PR, mirroring the Slice 6.1/6.2 split that already
proved valuable twice this project.

**Includes (see `docs/43` for exact proposed shapes — no SQL is written
here):**

- one general `admin_audit_events`-style ledger table (zero
  `authenticated` grant, RPC-mediated only, append-only);
- an employer-suspension state (additive column(s) on `employer_profiles`
  or a narrow parallel table — decided in `docs/43`);
- a vacancy-moderation state (separate small table per `docs/41` §13,
  composing with — not replacing — `publication_state`);
- operator-only `SECURITY DEFINER` RPCs: suspend/unsuspend employer,
  moderate/restore vacancy, plus read RPCs for "is this employer
  suspended," "is this vacancy moderated," and a paginated/bounded audit
  event read for a given target;
- every existing employer-mutating RPC path that must now also check "not
  suspended" (audited and enumerated exactly in `docs/43`, not guessed at
  UI time);
- full pgTAP coverage: authorization, RLS/grants, concurrency
  (row-lock/re-read/idempotent-result), audit-event correctness (actor
  DB-derived, timestamp DB-derived, append-only, no direct authenticated
  access), restoration semantics, and a proof that suspension cannot be
  bypassed by any existing employer-initiated RPC.

**Excludes:** any UI; analytics; email; legal placeholders; candidate
suspension; operator self-management.

**Database effects:** one additive migration (13th). Generated types
regenerate. No change to any Slice 0–6 table's existing column set beyond
the additive suspension field(s) this PR itself introduces.

**Route effects:** none.

**Tests:** pgTAP only, following the exact structure/rigor of
`28_application_status_and_review_contract_test.sql`.

**Exit criteria:** full pgTAP green; migration count 13; generated types
regenerate cleanly; no regression in the existing 914 assertions.

---

### PR 7.3 — Employer/vacancy moderation UI

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
  stage. This is the literal deliverable that satisfies "pilot funnel
  events are measurable" without a new third-party integration — deferring
  PostHog is not the same as deferring measurability, and this script is
  the concrete proof that the exit criterion is met by DB evidence alone.
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

## Proposed decisions

The highest currently **Accepted** decision is **D-070** (`docs/10-decisions.md`).
The five decisions below are **Proposed** — drafted for owner review, not
yet Accepted, and `docs/10-decisions.md` is not modified by this PR. Full
supporting evidence for each is in `docs/41-slice-7-discovery.md`.

### D-071 (Proposed) — Slice 7 boundary and admin authorization reuse

**Status:** Proposed
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

### D-072 (Proposed) — Employer suspension semantics

**Status:** Proposed
**Must accept before:** PR 7.2

**Context:** No suspension concept exists today. `verification_revoked` is
not equivalent to suspension (`docs/41` §3) — it only fires from
`verified`, is reversible by employer resubmission alone, and is a
trust-gate reset rather than a punitive hold.

**Decision:** A new, independent employer-suspension state (proposed
`employer_suspension` table, `docs/43` §2.1): two states only
(suspended / not suspended), operator-only, required reason, DB-derived
actor/timestamp. Enforced at the RPC layer against every existing
employer-mutating RPC enumerated in `docs/43` §4.1 — suspension blocks new
employer-initiated changes (draft edit, publish, pause/resume/fill/
withdraw/renew, new verification requests). Suspension does **not** block
Supabase Auth login/session, and does **not** gate Slice 6's employer
applicant-review RPCs (list/detail/transition of already-submitted
applications) — a suspended employer may still respond to candidates who
already applied, consistent with D-070's "review survives verification
revocation" precedent. Suspension is independent of `verification_state`;
suspending does not itself change verification, and revoking verification
does not itself suspend.

**Alternatives:** Reuse `verification_state = 'revoked'` for suspension
(rejected — conflates two different concepts with different reversal
rules, per `docs/41` §3); block Auth login (rejected for MVP — would
require deeper Auth-hook work not evidenced as necessary; RPC/RLS-layer
enforcement is sufficient for the stated exit criterion); also suspend
applicant review (rejected — worse outcome for candidates who already
applied in good faith, and inconsistent with D-070).

**Consequences:** One new small table, no change to `employer_profiles`'
existing column set or CHECK constraints; every employer-mutating RPC
gains one additional internal check.

---

### D-073 (Proposed) — Vacancy moderation semantics

**Status:** Proposed
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
(the existing Slice 5 `is_vacancy_effectively_public`/
`get_effective_public_vacancy`/`list_effective_public_vacancies`
functions) gains one additive narrowing condition: a vacancy is never
effectively public while moderated, regardless of its `publication_state`.
Restoration re-reads the vacancy's *current* live `publication_state`
rather than assuming a prior one, so a since-withdrawn vacancy is not
resurrected by restoration alone (`docs/43` §10). Operator-authored
moderation events are written to the new general audit ledger (D-074),
never to `vacancy_lifecycle_events` (whose owner-readable RLS would leak
the operator's identity to the employer being moderated — `docs/41` §4).

**Alternatives:** Overload `withdrawn` or `paused` for moderation
(rejected — both remain employer-reversible via existing RPCs, which would
let an employer silently undo an operator's moderation hold); write
moderation events into `vacancy_lifecycle_events` (rejected — that table's
RLS already exposes `actor_user_id` to the owning employer).

**Consequences:** One new small table; one additive (narrowing-only)
change to three already-shipped Slice 5 read functions, with every
existing pgTAP assertion about them required to keep passing unchanged.

---

### D-074 (Proposed) — Admin audit ledger architecture

**Status:** Proposed
**Must accept before:** PR 7.2

**Context:** D-065 explicitly deferred the general `audit_events` platform
to Slice 7 rather than building it in Slice 5. No such table exists today.
Two narrower audit patterns already exist and diverge:
`vacancy_lifecycle_events` (owner-readable RLS, closed event-type enum)
and `application_status_history` (zero-grant, RPC-mediated, actor never
client-exposed).

**Decision:** One general ledger (proposed `admin_audit_events`,
`docs/43` §2.3/§3), following `application_status_history`'s zero-
`authenticated`-grant, RPC-mediated, append-only pattern — not
`vacancy_lifecycle_events`'s pattern. Covers employer suspend/unsuspend,
vacancy moderate/restore, and (closing a narrow existing gap) re-emits
verification approve/reject/revoke as first-class events from the three
already-shipped Slice 5 RPCs, whose parameters/result contracts/existing
pgTAP assertions remain unchanged. Actor and timestamp are always
DB-derived (`auth.uid()`, `clock_timestamp()`); reason is required for
punitive event types, optional/absent for restorative ones; no event's
`reason` is exposed to the moderated employer or any candidate by default.

**Alternatives:** Extend domain-specific histories only (rejected —
`vacancy_lifecycle_events`'s existing RLS is unsuitable for operator
actions without either weakening it per-row or building a second table
anyway, per `docs/41` §5); land the full general ledger in Slice 5 instead
(rejected already, by D-065, prior to this document).

**Consequences:** One new table; three existing Slice 5 RPCs gain one
additional insert each inside their existing transactions, with no change
to their external contracts.

---

### D-075 (Proposed) — Slice 7 pilot-readiness scope (reports, analytics, email, legal)

**Status:** Proposed
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

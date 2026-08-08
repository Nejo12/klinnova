# Slice 8 Build Plan — Account Deletion to Confirmed Data Removal

> **Status:** Implementation active. PR 8.1 (this document + `docs/45`/
> `docs/47` + `docs/10-decisions.md` D-076–D-084) merged. Decisions
> D-076–D-089 are **Accepted** in `docs/10-decisions.md` — D-085
> (whole-account deletion across capabilities), D-086 (current-state
> moderation removal), and D-087 (deleted-candidate application transition
> boundary) were discovered and Accepted during PR 8.2's own
> implementation. **PR 8.2 (deletion/tombstone/request/access-gate
> database contract) is merged** — 14 migrations, no Auth Admin API call,
> no service-role application code, no UI. **D-088 (account exports are
> role-scoped, including for dual-capability accounts) and D-089 (employer
> export gets a dedicated narrow application-process read RPC) were
> Accepted 2026-08-08**, discovered during PR 8.3 implementation start —
> D-077 left dual-capability export scope unresolved (unlike deletion,
> which D-085 already covers), and no existing RLS/RPC could satisfy the
> employer export's narrow application-process requirement without
> exposing candidate-identifying fields. **PR 8.3 is split into PR 8.3a
> (narrow employer export application-process read contract) and PR 8.3b
> (role-scoped candidate/employer export API + download UI)** — an
> explicit D-076 decomposition update, not a silent scope broadening. **PR
> 8.3a is merged** — one additive migration (15th), adding only
> `list_current_employer_export_applications()`. **PR 8.3b is
> implementation-complete locally, awaiting review** — `GET
> /candidate/account/export` and `GET /employer/account/export` Route
> Handlers, each independently authorized and returning only its own role's
> data (D-088); no new migration. PR 8.4/8.5 have not started.

**Outcome (`docs/13-implementation-plan.md`, unchanged):** candidates and
employers can request export and deletion; removal can be confirmed.

**Exit criteria (`docs/13-implementation-plan.md`, unchanged):**

- core GDPR user actions work for the MVP surface
- deletion does not leave private documents publicly reachable

This build plan is the smallest reviewable decomposition that satisfies
both criteria without weakening any existing safety property established
in Slices 5–7 (RLS ownership boundaries, no-service-role ordinary
runtime, no-existence-oracle discipline, operator-scope narrowness). The
five-PR decomposition is accepted (D-076). If implementation evidence at
PR 8.2 start reveals a better split, update this planning record and
D-076 explicitly before proceeding — do not silently broaden a PR.

---

### PR 8.1 — Discovery, data-ownership inventory, export/deletion contract proposal, build plan (this unit)

**Objective:** establish the complete, evidence-based export/deletion
contract before any code is written.

**Includes:** `docs/45-slice-8-discovery.md` (full data-ownership
inventory, FK/cascade graph, mechanism comparisons); `docs/47-slice-8-data-removal-proposal.md`
(distilled contract); `docs/10-decisions.md` D-076–D-084 (**Accepted**,
2026-08-07); this build plan; Slice 7 documentation closure (`docs/44`
post-merge note, `README.md`/`docs/13`/`docs/14`/`docs/42` factual
updates).

**Database effects:** none. **Route effects:** none. **Tests:** existing
baseline retained (no runtime code touched).

**Exit criteria for this PR:** the decisions are complete, internally
consistent, and Accepted by independent review; no implementation has
started.

---

### PR 8.2 — Deletion/export database contract

**Status: implementation-complete locally, awaiting review.** One
additive migration (14th, `20260807220000_account_deletion_tombstone_and_request_contract.sql`);
pgTAP 1306/1306 (1136 prior + 170 new, `supabase/tests/database/30_account_deletion_tombstone_and_request_contract_test.sql`);
generated types regenerated, no drift. Not merged.

**Gated by:** D-078 (candidate deletion semantics), D-079 (employer
deletion semantics), D-080 (Auth deletion mechanism — schema-readiness
half, and the `account_deleted_at` database gate), D-081 (deletion-request
state machine — schema half, including the concurrency contract and
processing-phase evidence), D-082 (audit-event retention/redaction),
D-085 (whole-account deletion across capabilities — discovered and
Accepted during this PR's own implementation), D-086 (current-state
moderation removal — discovered and Accepted during this PR's own
implementation), D-087 (deleted-candidate application transition boundary —
discovered and Accepted during this PR's own implementation: a preserved
application remains a frozen historical record once its candidate is
deleted, not an ongoing recruitment workflow; D-070 remains authoritative
while the candidate account is active).

**Objective:** the additive migration + pgTAP proof for everything PR
8.3a/8.3b/8.4's UI needs, following the exact PR 7.2 precedent
(schema/RPCs/pgTAP first, UI later, no mixing).

**Proposed contents — a conceptual inventory, not SQL (subject to the
gating decisions' exact acceptance wording; materially larger than "one
table + two RPCs" per the D-080/D-081 corrections):**

- `account_deleted_at timestamptz` (nullable) added to `candidate_profiles`
  and `employer_profiles` directly — no shared `profiles` table
- canonical self-scoped deleted-account helper functions,
  `_is_current_candidate_deleted()`/`_is_current_employer_deleted()`
  (and public wrappers if the RLS-composition pattern needs them),
  mirroring the existing `_is_current_employer_suspended()`/
  `is_current_employer_suspended()` shape from PR 7.2 exactly
- RLS policy and `SECURITY DEFINER` RPC changes composing the above gate
  into every surface enumerated in `docs/45` §3.3 (candidate profile/
  languages/onboarding/matching/applications/status-history; employer
  profile/company/onboarding/vacancy-lifecycle/verification/applicant-
  review) — a double-digit number of individual policies/RPCs, not a
  handful
- D-087: `transition_current_employer_application_status` additionally
  denies (existing `unavailable` result) once the *application's own
  candidate* — not the employer — has `account_deleted_at` set;
  `get_current_employer_application` returns `allowed_transitions: []` for
  that same case. This is a distinct check from the employer-deletion gate
  above — the employer may be fully active while a specific applicant's
  account is deleted
- a `deletion_requests` table: owner-scoped by `user_id` (the whole Stint
  account, not a role, per D-085), `pending`/`processing`/`completed`/
  `failed` status, an active-request uniqueness constraint (at most one
  `pending`/`processing` row per `user_id`), two evidence-marker columns
  (`domain_scrubbed_at`/`auth_deleted_at` or equivalent), no caller-supplied
  target user and no caller-supplied role/scope column
- request/cancel/claim/process transition RPCs (or an equivalent RPC
  surface) implementing D-081's exact concurrency contract (row-locked
  claim, cancel-only-while-pending, no cooling-off) and the six-phase
  processing order
- one processor-bound, `deletion_request_id`-scoped domain-anonymization
  operation (not two independently-invocable ones) implementing D-085:
  resolves `request.user_id`, determines which profile(s) exist, and runs
  D-078's candidate field matrix and/or D-079's employer field matrix
  (tombstone rows, `candidate_languages` deletion, versioned
  `candidate_snapshot` tombstone, deterministic `deleted-company-<uuid>`
  slug, vacancy withdrawal, D-082 audit-`reason` redaction, D-086
  current-state `employer_suspension`/`vacancy_moderation` removal) in one
  atomic transaction when both profiles exist
- a narrow, manually-invoked privileged reconciliation operation (D-081)
  for the Auth-succeeded-but-evidence-write-failed case — not a scheduled
  background worker
- no change to any existing `ON DELETE` FK action anywhere in the schema
  — D-079's whole point is preserving the existing `NO ACTION`/`RESTRICT`
  defaults, not weakening them
- no change to `admin_audit_events`'s schema or grants (D-082's redaction
  is a data write during deletion processing, not a schema change)
- narrow read RPCs for export if existing RLS-scoped `select`s are
  insufficient (candidate/employer export largely reads through existing
  own-row RLS already; only genuinely new projections need a new RPC)

**Explicitly not included:** any `auth.users`-affecting code (that is
PR 8.4, isolated per D-080); any UI.

**Tests:** pgTAP is the primary proof — authorization (self-scoping,
no-caller-supplied-target on both request-creation and processing paths),
the fixed anonymization contract (both field matrices exactly), the
`account_deleted_at` gate actually blocking every enumerated surface once
set, the concurrency contract (duplicate-request dedup, row-locked claim,
cancel-only-while-pending), idempotency (re-running against
already-anonymized data is a no-op), the audit-`reason` redaction
contract, and — critically — a negative proof that candidate
`applications`/`application_status_history` rows are unchanged by
employer anonymization and vice versa, mirroring PR 7.2's own "no
employer-mutating RPC can silently clear an operator hold" negative-proof
convention.

**Database effects:** one additive migration (14th). **Route effects:**
none.

---

### PR 8.3a — Employer export application-process read contract

**Gated by:** D-077 (export format and scope), D-089 (narrow employer
export read RPC).

**Objective:** the single narrow database primitive D-089 requires,
discovered as missing when PR 8.3 implementation started: `applications`
has no employer-scoped SELECT RLS, and the existing employer-facing
review RPCs return candidate-identifying fields D-077 forbids in bulk
export.

**Includes:** `list_current_employer_export_applications()` — zero
arguments, `auth.uid()`-scoped, returns exactly `application_id`/
`vacancy_id`/`status`/`submitted_at` for the caller's own owned
vacancies' applications, deterministically ordered. Composes only the
deleted-employer gate (`_is_employer_deleted`) — deliberately not
suspension or verification state, per D-089's own-data-access reasoning.

**Tests:** pgTAP — grants (authenticated-only, no anon/service_role/no
new `applications` RLS policy), ownership isolation (cross-employer),
suspension/verification-state non-gating, deleted-employer stale-JWT
denial, deleted-candidate application preservation as a process record,
exact result-column shape, candidate-PII absence in the serialized
result, deterministic ordering, no mutation.

**Database effects:** one additive migration (15th) — the RPC plus its
grants/comment only; no table, column, index, RLS policy, trigger, or
view. **Route effects:** none — no export route, no download UI, no
export builder (PR 8.3b).

---

### PR 8.3b — Role-scoped account export API + download UI

**Status: implementation-complete locally, awaiting review.**

**Gated by:** D-077 (export format and scope), D-088 (exports are
role-scoped), D-089 (employer export's application data source).

**Objective:** implement the candidate and employer export payloads
exactly as bounded in `docs/47` §2 and D-088's role-scoped-download
contract, built on PR 8.2's existing RLS/RPCs plus PR 8.3a's narrow
employer application-process RPC.

**Implemented:** `src/lib/account-export/` (schemas, the D-085 whole-account
deleted gate via `_is_current_stint_account_deleted()`, the candidate and
employer builders, a pure HTTP-response mapper, filename/messages helpers);
`GET /candidate/account/export` and `GET /employer/account/export` Route
Handlers (`Content-Type: application/json; charset=utf-8`, `Content-Disposition:
attachment; filename="stint-<role>-export-YYYY-MM-DD.json"`, `Cache-Control:
no-store`, `force-dynamic`); a "Download candidate data"/"Download employer
data" link on the candidate matches page header and the employer home page
respectively (plain `<a>`, not `next/link` — a real file download, not a
client-side transition). No new migration.

**Includes:** one export route per role, each returning its own versioned
JSON envelope (`docs/47` §2); the employer export's applications section
sourced exclusively from `list_current_employer_export_applications()`,
never `list_current_employer_applications`/`get_current_employer_application`;
a field-by-field re-audit of `candidateSnapshotV1Schema`/`vacancySnapshotV1Schema`
against the export boundary (`docs/45` §13) at implementation time.

**Tests:** Vitest/Testing Library for each export payload shape, boundary
exclusions (no candidate snapshot in employer export, no operator/PII
fields anywhere, no candidate/employer cross-contamination per D-088),
and authorization (own-user-only, no target parameter, no role
parameter). A static-security test proving the employer export code path
never reads `candidate_snapshot`, mirroring the PR 7.3/7.4 static-security
convention. Playwright coverage for the download control per role space.

**Database effects:** none. **Route effects:** the export route(s) and
their minimal download-control UI only.

---

### PR 8.4 — Deletion request + processing UI

**Gated by:** D-080 (Auth deletion mechanism — the Auth-scrub processing
half), D-081 (deletion-request state machine — UI/confirmation half).

**Objective:** the user-visible request/cancel/confirm flow, plus the one
isolated, server-only processing path that performs the Auth Admin API
scrub — the only code in the whole Slice 8 surface touching
`service_role`-equivalent privilege.

**Includes:** request-creation UI (destructive-confirmation pattern,
matching PR 7.3's suspend/moderate convention — checkbox/typed
acknowledgement, not a bare button); cancel-while-pending UI; the
six-phase processing trigger (claim, anonymize, record domain-scrub
evidence, invoke Auth soft delete via the isolated module, verify, record
Auth-deletion evidence + complete — D-081); the manual reconciliation
operation for the Auth-succeeded-but-evidence-write-failed case; a final
processing/success confirmation screen shown **before** the local session
ends (not deferred to a later sign-in attempt, per D-081's corrected
session semantics) — no special post-delete login-page state is built,
since future login attempts use the ordinary generic Auth failure path;
independent local verification of `deleteUser(userId, true)`'s exact
behavior against this project's local Supabase stack (D-080).

**Tests:** Vitest for the state-machine transitions (pending → completed/
failed, idempotent retry, duplicate-request handling); a static-security
test proving `service_role`/Auth Admin credential usage is confined to
exactly the one isolated processing module and never imported by any
client component or ordinary Server Action, mirroring PR 7.3/7.4's
static-security discipline exactly. One focused Playwright journey if the
UI complexity warrants it (decided at implementation time, following the
PR 7.4 precedent of "Vitest only" where a static-content-style check is
sufficient — deletion's stateful UI likely does warrant one, unlike PR
7.4's static legal pages).

**Database effects:** none beyond what PR 8.2 already added. **Route
effects:** deletion request/cancel routes, the isolated processing
module (not a public route).

---

### PR 8.5 — Local exit proof + Slice 8 closure

**Gated by:** D-083 (private-document interpretation — evidence only, no
build), D-084 (local proof boundary).

**Objective:** mirror the PR 6.4/PR 7.4 closure pattern exactly — full
local regression proof, a new local deletion/export proof script, a
closure document mapping both Slice 8 exit criteria to evidence.

**Includes:** `scripts/proof/account-deletion.mts` (or an agreed
equivalent name) implementing the full assertion list in `docs/45` §14 /
`docs/47` §12; `docs/48-slice-8-exit-proof.md` (next available number at
that time — confirm before creating); full regression sweep (format/lint/
typecheck/Vitest/build/pgTAP/migration-inventory/type-drift/all Playwright
suites, exactly the discipline established since Slice 5).

**Explicitly not included:** hosted proof of any kind (D-084); Storage
work (D-083 — proof of absence only).

**Database effects:** none beyond PR 8.2/8.3a. **Route effects:** none
beyond PR 8.3b/8.4.

---

## Acceptance conditions (all Slice 8 PRs)

- No PR weakens an existing `ON DELETE` FK action to make a deletion
  "work" (the specific failure mode `docs/45` §3/§7 warns against).
- No PR introduces `service_role`/Auth Admin credentials outside the one
  isolated processing module built in PR 8.4.
- No PR allows a caller-supplied target user ID on any export or deletion
  path.
- No PR lets employer deletion touch `applications`/`application_status_history`.
- No PR includes `candidate_snapshot` content in an employer export.
- No PR adds transactional email (D-075 remains unchanged).
- No PR adds Storage scaffolding (D-083).
- No PR runs hosted proof, configures Preview, or mutates Production.
- No PR begins work outside Slice 8.

## Local exit proof

PR 8.5 produces `docs/48-slice-8-exit-proof.md` (number to be confirmed
at that time), following the exact command sequence and pass-totals format
established in `docs/39`/`docs/44`.

## Hosted-proof strategy

Not scheduled for Slice 8. Per D-084, hosted deletion/export proof is a
distinct, separately-authorized unit of work if ever pursued — Slice 8 can
be marked Done locally without it, exactly mirroring Slice 7's own
closure.

# Slice 8 Build Plan — Account Deletion to Confirmed Data Removal

> **Status:** Planning active; decisions Accepted. PR 8.1 (this document +
> `docs/45`/`docs/47` + `docs/10-decisions.md` D-076–D-084) is complete —
> no implementation PR has started. Discovery: `docs/45-slice-8-discovery.md`.
> Data-removal proposal: `docs/47-slice-8-data-removal-proposal.md`.
> Decisions D-076–D-084 below are **Accepted** (2026-08-07) in
> `docs/10-decisions.md`. **PR 8.2 is the first authorized implementation
> unit; this PR (8.1) does not itself begin it.**

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

**Gated by:** D-078 (candidate deletion semantics), D-079 (employer
deletion semantics), D-080 (Auth deletion mechanism — schema-readiness
half, and the `account_deleted_at` database gate), D-081 (deletion-request
state machine — schema half, including the concurrency contract and
processing-phase evidence), D-082 (audit-event retention/redaction).

**Objective:** the additive migration + pgTAP proof for everything PR 8.3/
8.4's UI needs, following the exact PR 7.2 precedent (schema/RPCs/pgTAP
first, UI later, no mixing).

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
- a `deletion_requests` table: owner-scoped, `pending`/`processing`/
  `completed`/`failed` status, an active-request uniqueness constraint
  (at most one `pending`/`processing` row per user), two evidence-marker
  columns (`domain_scrubbed_at`/`auth_deleted_at` or equivalent), no
  caller-supplied target user
- request/cancel/claim/process transition RPCs (or an equivalent RPC
  surface) implementing D-081's exact concurrency contract (row-locked
  claim, cancel-only-while-pending, no cooling-off) and the six-phase
  processing order
- a self-scoped `SECURITY DEFINER` candidate-anonymization RPC
  implementing D-078's exact field matrix (tombstone `candidate_profiles`
  row, `candidate_languages` row deletion, versioned `candidate_snapshot`
  tombstone shape)
- a self-scoped `SECURITY DEFINER` employer-anonymization RPC
  implementing D-079's exact field matrix (tombstone `employer_profiles`
  row, deterministic `deleted-company-<uuid>` company slug, vacancy
  withdrawal via the existing `withdraw_employer_vacancy` pattern, and the
  D-082 audit-`reason` redaction as part of the same transaction)
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

### PR 8.3 — Account export UI/API

**Gated by:** D-077 (export format and scope).

**Objective:** implement the candidate and employer export payloads
exactly as bounded in `docs/47` §2, built entirely on PR 8.2's RPCs (or
existing RLS reads where sufficient).

**Includes:** an export route/Server Action per role, returning the
versioned JSON envelope from `docs/47` §2; a field-by-field re-audit of
`candidateSnapshotV1Schema`/`vacancySnapshotV1Schema` against the export
boundary (`docs/45` §13) at implementation time, since that boundary
cannot be finally verified until the current schema shape is read fresh.

**Tests:** Vitest/Testing Library for the export payload shape, boundary
exclusions (no candidate snapshot in employer export, no operator/PII
fields anywhere), and authorization (own-user-only, no target parameter).
A static-security test proving the employer export code path never reads
`candidate_snapshot`, mirroring the PR 7.3/7.4 static-security convention.

**Database effects:** none (unless PR 8.2 under-provisioned a read RPC,
in which case that gap surfaces here, not silently patched by adding
ad hoc client-side joins). **Route effects:** the export route(s) only.

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

**Database effects:** none beyond PR 8.2. **Route effects:** none beyond
PR 8.3/8.4.

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

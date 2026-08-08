# Slice 8 Exit Proof (Local)

Owner-facing local exit evidence for Slice 8 — Account export to confirmed
data removal.

**Local exit proof status:** Pass (this document, 2026-08-08 UTC).
**Hosted Slice 8 proof:** Not performed. **Production authorization was not
used. Preview was not configured or touched.**
**Slice 8's implementation PRs (8.1–8.4) are all merged. This document is
PR 8.5 — the closure/proof unit. Slice 8 is not marked Done until PR 8.5
merges** — per the established Slice 3/4/6/7 pattern, hosted proof remains
a separately authorized follow-up and is not a precondition for local
closure (see "Hosted status" below).

Related:

- Decisions: D-076–D-090, `docs/10-decisions.md`
- Discovery: `docs/45-slice-8-discovery.md`
- Build plan: `docs/46-slice-8-build-plan.md`
- Data-removal proposal: `docs/47-slice-8-data-removal-proposal.md`

## Scope delivered (implementation PRs)

| Capability | Status |
|---|---|
| Slice 8 planning (D-076–D-084 drafted; discovery; build plan; data-removal proposal) | Merged (PR #68) |
| Deletion/tombstone/request/access-gate database contract (D-078–D-082, D-085–D-087) | Merged (PR #69) |
| Employer export application-process narrow read contract (D-089) | Merged (PR #70) |
| Role-scoped candidate/employer account export API + download UI (D-077, D-088) | Merged (PR #71) |
| Whole-account deletion request UI + privileged Auth processing + stranded-processing recovery (D-090) | Merged (PR #72) |
| Local exit proof + Slice 8/M4 closure | This unit (PR 8.5) |
| Owner-run hosted proof | Not performed — separately authorized follow-up |
| Slice 8 Done | Not yet — pending PR 8.5 review/merge |

## Pull requests

| PR | GitHub | Status |
|---|---|---|
| 8.1 Slice 8 planning (D-076–D-084 drafted) | #68 | Merged |
| 8.2 Deletion/tombstone/request/access-gate database contract | #69 | Merged |
| 8.3a Employer export application-process read contract | #70 | Merged |
| 8.3b Role-scoped account export API + download UI | #71 | Merged |
| 8.4 Whole-account deletion request UI + privileged Auth processing | #72 | Merged |
| 8.5 Local exit proof + closure | this unit | In progress |

## Accepted decisions

D-076–D-090 (Accepted 2026-08-07/2026-08-08) remain **Accepted** and are
not modified by this PR. D-084 specifically gates this unit ("**Must
accept before:** PR 8.5") — its scope (local-only proof, reusing the
existing `local-environment-guard`/localhost-only discipline, an explicit
stale-JWT test, no hosted proof authorized) is implemented exactly as
decided below, with no contradiction found. D-090, discovered and Accepted
during PR 8.4 implementation, is re-verified below as part of this
closure's independent re-proof from merged main.

## Proof environment (local)

| Field | Value |
|---|---|
| Base SHA (branch start) | `925d7d8c2d27f3ffb3b8b122cbb5682adc9caed5` (PR #72 merge commit) |
| Branch (at proof) | `docs/slice-8-exit-proof-and-m4-closure` |
| Environment | Local project-local Supabase CLI + `pnpm build`/`pnpm start` |
| Hosted commands run in PR 8.5 | None |
| Production mutation | None |

## Commands

```bash
git checkout main && git pull --ff-only origin main

pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run

rm -rf .next
pnpm build

pnpm supabase:db:reset
pnpm supabase:test:db
pnpm db:types:check
pnpm proof:migrations
pnpm proof:pilot-funnel

pnpm exec playwright test e2e/account-export-journey.spec.ts
STINT_DB_INTEGRATION=1 SUPABASE_SERVICE_ROLE_KEY=<local-demo-key> \
  pnpm exec vitest run src/lib/account-deletion/deletion-processing.integration.test.ts

E2E_AUTH_JOURNEY=1 pnpm exec playwright test --workers=1 \
  e2e/auth-journey.spec.ts \
  e2e/onboarding-journey.spec.ts \
  e2e/completion-journey.spec.ts \
  e2e/matches-journey.spec.ts \
  e2e/candidate-application-status-journey.spec.ts \
  e2e/account-export-journey.spec.ts \
  e2e/employer-onboarding-journey.spec.ts \
  e2e/employer-vacancy-draft-journey.spec.ts \
  e2e/employer-vacancy-lifecycle-journey.spec.ts \
  e2e/employer-verification-journey.spec.ts \
  e2e/internal-verification-journey.spec.ts \
  e2e/employer-applicant-review-journey.spec.ts \
  e2e/admin-moderation.spec.ts \
  e2e/account-deletion-journey.spec.ts

# Final reproducibility check
pnpm supabase:db:reset
pnpm supabase:test:db
pnpm db:types:check
pnpm proof:migrations
pnpm proof:pilot-funnel
pnpm test:run

git diff --check
```

## Pass totals

Recorded on `docs/slice-8-exit-proof-and-m4-closure` at base
`925d7d8c2d27f3ffb3b8b122cbb5682adc9caed5` (2026-08-08 UTC).

| Suite | Result |
|---|---|
| Format / lint / typecheck | Pass |
| Vitest | **983 passed** / 3 skipped (147 files) — unchanged from the merged-main baseline; PR 8.5 adds no new Vitest test |
| Build | Pass — all deletion/export routes registered dynamic (`ƒ`), no static/dynamic regression |
| Local DB reset | Pass (all 16 migrations) |
| pgTAP | **1441 passed** across 33 files — 1437 unchanged from the PR 8.2/8.3a/8.4 baseline, **plus 4 new assertions** added by this unit's own test-only correction to the existing `30_account_deletion_tombstone_and_request_contract_test.sql` file (closing the processing-cancellation-denial proof gap); no new pgTAP file added |
| Generated types check | Pass (no drift) |
| Migration proof | `count=16` |
| Pilot-funnel proof | Pass |
| Account-export E2E | **3 passed** (candidate, employer, dual-capability) |
| Local Auth Admin integration | **2 passed** (dual-capability deletion; D-090 stranded-processing recovery) — real `deleteUser`/`getUserById`, not mocks |
| Full regression E2E sweep (14 spec files) | **38 passed** — auth, onboarding, completion, matches, candidate-application-status, account-export, employer-onboarding, employer-vacancy-draft, employer-vacancy-lifecycle, employer-verification, internal-verification, employer-applicant-review, admin-moderation, account-deletion |
| Final reset reproducibility check | Pass — pgTAP 1441/1441, types no drift, migrations 16, pilot-funnel Pass, Vitest 983/3 skip, re-run after the test-only correction |
| `git diff --check` | Clean |
| Hosted proof | Not performed — see "Hosted status" |

This closure unit is a **re-proof**, not new product implementation. It
introduces exactly one test-only correction — four pgTAP assertions
closing a proof gap identified during independent review (§ "Exit
criterion 1 (continued) — cancellation proof") — with no migration, no
schema change, no generated-type change, and no application runtime
change. Every other count above matches the merged-main (PR #72) baseline
exactly.

## Exit criterion 1 evidence — "core GDPR user actions work for the MVP surface"

Per `docs/13-implementation-plan.md`'s accepted Slice 8 exit criteria. This
criterion is evidenced by both halves of Slice 8: role-scoped account
export (D-077/D-088/D-089, PR 8.3a/8.3b) and whole-account deletion
(D-078–D-082/D-085–D-087/D-090, PR 8.2/8.4).

### Export sub-proof

**Candidate export** (`e2e/account-export-journey.spec.ts`, re-run from
merged main this session, Pass):

| Requirement | Evidence |
|---|---|
| `version` field | `1` |
| Account metadata | `account.email`/`account.created_at` present — no `last_sign_in_at`, phone, `user_metadata`, `app_metadata`, identities, or session/token material (D-077) |
| Candidate section present | `toHaveProperty("candidate")` |
| Employer section absent | `not.toHaveProperty("employer")` |
| No operator-facing fields leaked | serialized payload does not match `/verification_state/` (an employer-only field) |

**Employer export** (same spec, Pass):

| Requirement | Evidence |
|---|---|
| `version`/account metadata | Same as candidate |
| Employer section present, candidate section absent | `toHaveProperty("employer")` / `not.toHaveProperty("candidate")` |
| Application-process rows are exactly the narrow D-089 shape | `application_id`/`vacancy_id`/`status`/`submitted_at` only — proven directly by the builder unit test `"application process rows have exactly four fields — nothing else"` (`src/lib/account-export/employer-export.test.ts`) |
| Candidate-identifying data absent | serialized payload does not match `/candidate_snapshot/`, `/candidate_id/`, or a planted candidate-secret marker |

**Dual-capability role-scoping** (same spec, Pass): one identity with both
capabilities produces two independently-downloaded files — the employer
surface's file has an `employer` key and no `candidate` key; the candidate
surface's file has a `candidate` key and no `employer` key. No combined
envelope. No role query/body selector exists anywhere in either Route
Handler (`src/app/candidate/account/export/route.ts`,
`src/app/employer/account/export/route.ts` both take no parameters; role
is fixed by which route is called).

### Deletion sub-proof

Evidenced in full in "Exit criterion 1 (continued) — deletion" below,
since deletion is the larger half of this exit criterion.

## Exit criterion 1 (continued) — whole-account deletion

Proven via `src/lib/account-deletion/deletion-processing.integration.test.ts`,
re-run this session against a disposable local Auth stack
(`STINT_DB_INTEGRATION=1`, gated by `assertLocalSupabaseApiUrl()` to
`127.0.0.1`/`localhost` only) — both tests Pass.

### Candidate domain anonymization (D-078)

| Requirement | Evidence |
|---|---|
| Tombstone set | `account_deleted_at` non-null |
| Identifying fields scrubbed | `display_name` becomes the fixed `"Deleted candidate"` marker; `german_comfort`/`city` become null; `job_categories` becomes `[]` |
| `candidate_languages` deleted | row count becomes `0` |
| Application preserved | the candidate's own application row (submitted against a different party's vacancy) still exists |
| `status` preserved | unchanged, exact string equality |
| `created_at` preserved | exact `Date.getTime()` equality against the pre-deletion value — not approximate |
| `updated_at` preserved | exact equality |
| `submitted_at` preserved | exact equality |
| `vacancy_snapshot` preserved | exact deep equality against the pre-deletion value |
| `candidate_snapshot` tombstoned | becomes exactly `{"deleted": true}` |

### Employer domain anonymization (D-079/D-082/D-086)

| Requirement | Evidence |
|---|---|
| Tombstone set | `account_deleted_at` non-null |
| Identifying fields scrubbed | `display_name` becomes `"Deleted employer"`; `organisation_legal_name` becomes null |
| Company tombstoned | `name` becomes `"Deleted company"`; `slug` becomes the deterministic `deleted-company-<company id>` form, derived only from the company's own immutable id |
| Owned vacancy withdrawn | `publication_state` becomes `"withdrawn"`, `withdrawn_at` non-null — immediately stops being effective-public |
| `employer_suspension` current-state row removed | row count becomes `0` |
| `vacancy_moderation` current-state row removed | row count becomes `0` |
| Audit rows structurally preserved | exactly 2 preserved `admin_audit_events` rows targeting the deleted employer/vacancy |
| Audit reason redacted | both preserved rows' `reason` becomes exactly `"[redacted after account deletion]"` — `event_type`/`target_kind`/`target_id`/`actor_user_id`/`occurred_at` unchanged (D-082) |
| Unrelated party's application untouched | a different candidate's application against the deleted employer's vacancy keeps its own unrelated `candidate_snapshot` unchanged — deletion never touches another party's data |

### Whole-account / dual-capability proof (D-085)

One disposable identity with both `candidate_profiles` and
`employer_profiles`: **one** `request_account_deletion()` call, **one**
`processAccountDeletionRequest()` invocation. Both domain anonymization
contracts commit inside the same domain-scrub transaction before the Auth
soft-delete step runs — proven by the candidate and employer tombstone
assertions above both being satisfied from a single processing call, with
no second role-specific request ever created or needed.

### Stale pre-delete JWT proof (D-080, core exit evidence)

Using access tokens captured **before** deletion processing began:

| Surface | Read | Mutation |
|---|---|---|
| Candidate | denied — `data: []` from the stale-JWT client | denied — zero rows affected; a direct privileged DB read independently confirms `display_name` remains the tombstoned value, proving the attempted mutation had no effect |
| Employer | denied — `data: []` | denied — zero rows affected; direct privileged DB read confirms `display_name` remains `"Deleted employer"` |

This proves the database's `account_deleted_at`-gated RLS is the
authoritative denial mechanism — not merely "the user can no longer sign
in," which alone would not address an already-issued, still-cryptographically-valid
token.

### Auth soft-delete and verification proof (D-080)

| Requirement | Evidence |
|---|---|
| `deleteUser(userId, true)` | called against the real local Auth Admin API; succeeds |
| Independent verification before evidence | Supabase Auth soft deletion is independently confirmed because `getUserById(userId)` **still resolves** the Auth user object and reports a non-null `data.user.deleted_at` after `deleteUser(userId, true)` — this resolution happens **before** `_record_deletion_auth_evidence` is ever invoked (proven by unit-level call-order assertions in `processor.test.ts`, and exercised for real in the integration proof). `getUserById` is never observed to return a not-found/null result for this account. |
| Fresh login fails generically | fresh `signInWithPassword` fails generically after Auth soft deletion — the ordinary generic Auth failure path, no account-enumeration wording. This is a separate fact from Auth-row resolution: the credentials no longer authenticate, but the underlying `auth.users` row is untouched and still independently readable by `getUserById`. |
| Hard-delete not used | the Auth `auth.users` row itself is never deleted, removed, or physically erased — this is an accepted soft delete (`deleted_at` marker only), not a claim of hard deletion or physical Auth-row removal |

### Deletion request durable-evidence proof (D-081)

Final `deletion_requests` row state for the successfully processed
identity, read directly from the local database:

| Field | Value |
|---|---|
| `status` | `completed` |
| `domain_scrubbed_at` | non-null |
| `auth_deleted_at` | non-null |
| `completed_at` | non-null |
| `failure_code` | `null` — both `_claim_deletion_request` and `_record_deletion_auth_evidence` explicitly clear `failure_code` on every successful transition (confirmed directly in the merged migration SQL); pgTAP (`30_account_deletion_tombstone_and_request_contract_test.sql`) independently proves the full `failure_code` lifecycle, including the fixed allow-list CHECK constraint |

These are internal durable timestamps, never exposed in ordinary
candidate/employer-facing UI.

## Exit criterion 1 (continued) — D-087 preserved-application read-only proof

Fully covered by the already-merged, re-verified pgTAP file
`supabase/tests/database/30_account_deletion_tombstone_and_request_contract_test.sql`,
Section D.2 ("D-087: deleted-candidate application transition boundary").
No new test was added for D-087 specifically — the existing suite is
authoritative and was re-run as part of this session's PART B pgTAP pass
(1441/1441, including this file; the 4 new assertions added elsewhere in
this same file target the separate processing-cancellation-denial proof
gap, not D-087).

| Requirement | Evidence (pgTAP assertion) |
|---|---|
| Employer can still read the preserved application/process record | `list_current_employer_applications()`/`get_current_employer_application()` both truthfully mark the row `candidate_deleted` rather than omitting it |
| Deleted candidate presented neutrally | the same `candidate_deleted` marker, no fabricated live candidate attribute |
| Allowed transitions empty | `get_current_employer_application(...) -> 'allowed_transitions'` is an empty array for a deleted candidate's application |
| Status-transition attempt denied | `transition_current_employer_application_status(...)` returns the existing `unavailable` result — no new result variant |
| No status mutation | `application.status` unchanged after a denied transition attempt |
| No `updated_at` mutation | byte-exact unchanged |
| No new history row | no `application_status_history` row appended |
| No reason/audit mutation | the supplied transition reason is never persisted for a denied deleted-candidate transition |
| Control proof | an unrelated application whose candidate account remains active transitions normally per the ordinary D-070 state machine — proving the denial is specific to deleted-candidate applications, not a general regression |

## Exit criterion 1 (continued) — D-090 stranded-processing recovery proof

Re-run this session (`src/lib/account-deletion/deletion-processing.integration.test.ts`,
second test) against real local Auth, reproducing the exact crash window:

1. a disposable request is created;
2. claimed directly (simulating a process that owns it and then
   disappears);
3. no domain scrub or failure recording ever runs;
4. `processing_lease_started_at` is backdated via a direct local
   test-database connection — **test setup only**; production runtime
   never writes to `deletion_requests` directly;
5. the real, imported `reconcileAccountDeletionRequest(requestId)` is
   invoked;
6. the stale reclaim succeeds;
7. the target user is derived exclusively from the persisted, reclaimed
   request row;
8. domain scrub completes;
9. Auth soft-delete completes;
10. `getUserById` independently confirms `deleted_at`;
11. durable evidence is recorded;
12. the request reaches `completed`.

Also confirmed directly, both via this session's independent database
reproduction (raw SQL, before any code was trusted) and via the 34-case
pgTAP file `32_deletion_processing_lease_and_recovery_test.sql`
(re-run this session, part of the 1441/1441 total; unmodified by this
session's test-only correction):

| Requirement | Evidence |
|---|---|
| A fresh processing lease cannot be reclaimed | `_reclaim_stale_deletion_request` returns `no_op` for a just-claimed row |
| A failed-request legitimate retry refreshes the lease | `processing_lease_started_at` becomes a fresh value on retry-claim |
| **Critical:** an old historical `processing_started_at` does not make a just-retried processor stale | a request retry-claimed immediately after its `processing_started_at` was artificially aged to 2 days old is still correctly treated as non-stale — staleness is judged from `processing_lease_started_at` alone, never from `processing_started_at` (this is the exact defect the original, rejected recovery proposal would have introduced) |
| Fixed 5-minute DB-owned threshold | hardcoded SQL constant; no caller-supplied interval/timeout exists anywhere in the TypeScript call chain |
| Reclaim ACLs | `SECURITY DEFINER`, fixed `search_path`, `service_role`-only EXECUTE, no PUBLIC/anon/authenticated grant |
| No direct `service_role` table DML | empirically reconfirmed — `SET ROLE service_role; SELECT ...` on `deletion_requests` still fails with `permission denied` |

## Exit criterion 1 (continued) — destructive-confirmation boundary proof

| Requirement | Evidence |
|---|---|
| Checkbox field name | `confirmAccountDeletion` |
| Checkbox field value | `yes` — verified live in the E2E journey via `toHaveAttribute` |
| Button disabled before acknowledgement | `toBeDisabled()` |
| Button enabled after acknowledgement | `toBeEnabled()` |
| Candidate: missing confirmation | `{status: "confirmation_required"}` — no Supabase server client created, no `request_account_deletion` reached, no privileged processor reached (unit-asserted) |
| Candidate: wrong confirmation value | same denial |
| Candidate: exact valid confirmation | normal deletion flow proceeds |
| Employer: identical three behaviors | proven independently for the employer action (unit-asserted) |
| Static confinement | a dedicated static-security assertion proves the confirmation check runs before `confirmAccountDeletion(...)` in both destructive action files, and that no other file in the repository calls `confirmAccountDeletion(...)` |

## Exit criterion 1 (continued) — cancellation proof

| Requirement | Evidence |
|---|---|
| Pending request can be cancelled | `cancel_account_deletion_request()`, self-scoped through `auth.uid()`, no `service_role`, no caller-supplied target — pgTAP (`30_account_deletion_tombstone_and_request_contract_test.sql`, lines ~479–496): a pending request owned by employer C returns `'status': 'cancelled'`, and the `deletion_requests` row is confirmed physically deleted (`count = 0`) immediately after — no durable `cancelled` status is introduced |
| Repeat cancel on no pending row | same pgTAP block, line ~484–488: cancelling again with no pending request returns the deterministic `'not_cancellable'` result, not an error |
| Processing request cannot be cancelled | **pgTAP-asserted (PR 8.5 correction).** Same file, immediately following the pending-cancellation block: employer C creates a second, independent pending request, it is claimed into `processing` via the privileged `_claim_deletion_request(...)` primitive, and employer C then calls `cancel_account_deletion_request()` through the ordinary authenticated self-service path (the same `auth.uid()`-derived caller, never `service_role`). The RPC returns `'status': 'not_cancellable'`; a direct read immediately after confirms the `deletion_requests` row still exists (`count = 1`) and its `status` is unchanged at `'processing'` — no fake `cancelled` status appears, and no mutation occurs. This closes the previously-recorded proof gap. |

Both sides of cancellation are now independently proven: a `pending`
request can be cancelled and its row physically removed; a `processing`
request cannot be cancelled through the self-service RPC, and its row is
left completely intact. No `cancelled` status exists anywhere in the
schema (`deletion_requests.status` remains `pending | processing |
completed | failed`), and `service_role` has no role in the self-service
cancellation call at any point.

## Exit criterion 2 evidence — "deletion does not leave private documents publicly reachable"

**Absence proof**, per D-083 — no user-upload/private-document Storage
surface exists anywhere in the current MVP, confirmed by direct
re-audit of merged main this session:

| Search | Result |
|---|---|
| `storage.from(` | zero occurrences in `src/` |
| `supabase.storage` | zero occurrences |
| `createSignedUrl` | zero occurrences |
| `.upload(` / `.download(` / `.remove(` (Storage API usage) | zero occurrences |
| Configured Storage buckets | none — `supabase/config.toml`'s `[storage]` block has no active bucket definition |

No PR from 8.1 through 8.4 introduced any Storage bucket, upload path, or
public/signed document URL. Since no private document exists anywhere in
the product, there is nothing for account deletion to leave reachable —
the exit criterion is satisfied by proof of absence, exactly as D-083
establishes. This is unchanged from D-083's original PR 8.1 assessment;
this closure independently re-confirms it against the fully merged Slice
8 codebase rather than relying on the earlier planning-time audit alone.

## Static-security test evidence

| Test file | Scope |
|---|---|
| `src/lib/account-deletion/pr-8.4-static-security.test.ts` | `service_role`/Auth Admin credential confinement to the isolated privileged module; no `NEXT_PUBLIC` service-role exposure; no `listUsers`; no destructive GET route; `reconcileAccountDeletionRequest` never imported outside the account-deletion module; confirmation-boundary ordering; no alternate `confirmAccountDeletion` call site |
| `src/lib/account-deletion/privileged-supabase.test.ts` | Fails closed without `SUPABASE_SERVICE_ROLE_KEY`; never falls back to the publishable/anon key; correct client construction (no session persistence/refresh) |
| `src/lib/account-deletion/processor.test.ts` | Every crash-window/recovery branch; claim/reclaim ordering; Auth-verify-before-evidence ordering; fixed failure-code mapping; idempotency |

Passing as part of the 983/3-skip Vitest total, unchanged from the merged
PR 8.4 baseline — this closure adds no new test.

## Database and workflow invariants

No migration, no schema change, no generated-type change, and no
`.github/workflows` change in PR 8.5 — confirmed by empty
`git diff --name-only` against `supabase/migrations`,
`src/types/database.ts`, `.github/workflows`, `package.json`, and
`pnpm-lock.yaml`. Migration count remains **16**.

PR 8.5 does contain exactly one test-only change: 4 new pgTAP assertions
added to the existing `supabase/tests/database/30_account_deletion_tombstone_and_request_contract_test.sql`
file (`git diff --name-only -- supabase/tests/database` shows exactly
this one file), closing the processing-cancellation-denial proof gap
identified during independent review. No RPC behavior, no status value,
and no cancellation semantics changed — the existing merged implementation
is proven correct by this addition, not modified. pgTAP is now **1441/1441
across 33 files** (1437 + 4).

## Hosted status

- Local exit proof: **PASS** (this document).
- No hosted command was run in PR 8.5 — every command targeted
  `127.0.0.1`/`localhost` only, enforced by `assertLocalSupabaseApiUrl()`
  and the existing `STINT_DB_INTEGRATION=1` gate.
- Preview intentionally remains unconfigured (unchanged since Slice 5).
- Production is untouched.
- No hosted destructive-deletion proof was authorized or run — per D-084,
  this is a separately authorized future follow-up, not a precondition
  for local Slice 8 closure.

## Slice 8 overall scope matrix

| PR | Delivered |
|---|---|
| 8.1 | Planning + decisions (D-076–D-084) |
| 8.2 | Deletion/tombstone/request/access-gate database contract (D-078–D-082, D-085–D-087) |
| 8.3a | Employer export narrow application-process read contract (D-089) |
| 8.3b | Role-scoped candidate/employer export API + download UI (D-077, D-088) |
| 8.4 | Whole-account deletion request UI + privileged Auth processing + D-090 stranded-processing recovery |
| 8.5 | Local exit proof + Slice 8/M4 closure |

## Deferred / non-goals (unchanged from accepted decisions)

Hosted destructive deletion proof (D-084 — separately authorized future
follow-up); Storage/private-document handling (D-083 — no current surface,
future work triggers its own review); a cooling-off period before
processing (D-081 — explicitly none for MVP); a background
worker/cron/scheduled sweep for stranded-request recovery (D-090 —
recovery remains a narrow, manually-invoked, privileged reconciliation
operation); combined whole-account export envelope (D-088 — exports
remain role-scoped even for dual-capability accounts, distinct from
deletion's whole-account scope). None of these were added in PR 8.5.

## Slice 8 closure decision

**Slice 8 local exit criteria: PASS.**

Both accepted exit criteria (`docs/13-implementation-plan.md`) are
demonstrably satisfied by the merged/local implementation, independently
re-proven from clean merged main in this unit:

1. **"Core GDPR user actions work for the MVP surface"** — PASS. Account
   export (candidate, employer, role-scoped for dual-capability accounts)
   and whole-account deletion (request, confirm, cancel, domain
   anonymization, Auth soft-delete, independent verification, stale-JWT
   denial, preserved-application read-only behavior, stranded-processing
   recovery) are all implemented and locally proven above.
2. **"Deletion does not leave private documents publicly reachable"** —
   PASS, by proof of absence (D-083, re-confirmed above).

This is **MVP account-data export/deletion controls implemented and
locally proven** — not a claim of GDPR compliance, full statutory
obligation fulfillment, or legal review. No such claim is made anywhere in
this document or the shipped product copy.

All local format/lint/typecheck/build/Vitest/pgTAP/migration/type-drift/E2E
gates pass at the exact expected counts, re-derived independently from
merged main rather than carried forward from prior PR reports, including
the four additional pgTAP assertions added by this unit's own correction
pass (below). **Slice 8's local implementation is complete.** Slice 8 is
not marked Done in this document until PR 8.5 is independently reviewed
and merged — per the established Slice 3/4/6/7 pattern, that is the point
at which a slice's full PR sequence, including its closure unit, is
merged. No hosted proof is required by the accepted Slice 8 exit criteria
before Slice 8 may be marked Done; hosted verification remains a
separately authorized, not-yet-scheduled follow-up that does not block
this closure.

## M4 closure decision

Per `docs/13-implementation-plan.md`'s milestone mapping: **M4 Trust and
beta readiness** spans **Slices 7–8**, with the accepted checkpoint
**"Ops and GDPR basics work."**

| Component | Status |
|---|---|
| Slice 7 (admin moderation to audit event) | Done locally (`docs/44-slice-7-exit-proof.md`) — all three accepted exit criteria PASS |
| Slice 8 (account export to confirmed data removal) | Done locally as of this document — both accepted exit criteria PASS |
| Other M4 blocker | None identified |

Both Slices composing M4 have their accepted exit criteria satisfied
locally, and no other M4-scoped blocker exists in `docs/13`. **M4
verdict: COMPLETE**, contingent on this PR 8.5 merging (the same
"complete once merged" convention already established for Slice 8 itself
and for prior slice closures) — M4's own accepted checkpoint ("ops and
GDPR basics work") is fully evidenced by the Slice 7 and Slice 8 local
proof records taken together.

### Local proof run record

| Field | Value |
|---|---|
| Commands | see "Commands" above |
| Result | Pass |
| Date (UTC) | 2026-08-08 |
| Base SHA | `925d7d8c2d27f3ffb3b8b122cbb5682adc9caed5` |
| Notes | Vitest 983/3 skip (147 files); pgTAP 1441/1441 across 33 files (1437 + 4 processing-cancellation-denial assertions added by this unit's test-only correction); migrations 16; types no drift; pilot-funnel proof pass; account-export E2E 3/3; local Auth Admin integration 2/2 (dual-capability deletion, D-090 recovery); full regression E2E sweep 38/38 across 14 spec files; final reset reproducibility check identical post-correction; no hosted commands run |

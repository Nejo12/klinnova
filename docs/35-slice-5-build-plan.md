# Slice 5 Build Plan

> **Status:** Decisions D-055–D-067 **Accepted** 2026-08-05. PR 5.1 is Done.
> PR 5.2 database foundation is in progress; no UI or hosted mutation is included.

**Goal:** Deliver verified-employer publication of public vacancies, public and
candidate visibility for eligible employer jobs, and lifecycle controls
(pause / resume / fill / withdraw / expire / renew), without applicant review
(Slice 6) or full admin product (Slice 7).

**Baseline:** Slice 4 Done (`docs/33`). Decision-acceptance base:
`effd79902ec569badfd15cca756c0a3100e1559d`.

**Active tracking:** `docs/14-founder-dashboard.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Product scope |
| `docs/13-implementation-plan.md` | Slice order |
| `docs/34-slice-5-discovery.md` | Discovery (planning Done) |
| `docs/36-slice-5-schema-and-publication-proposal.md` | Schema/RPC/RLS contract (locked) |
| `docs/10-decisions.md` | D-055–D-067 **Accepted** |
| `docs/33-slice-4-closure.md` | Preview isolation residual |
| `NOT_NOW.md` | Deferred ideas |

---

## Hard stops

- Do not start PR 5.2 until this PR 5.1 decision package merges.
- Do not add applicant review, messaging, or application status changes.
- Do not add full admin moderation/suspension UI (Slice 7).
- Do not store exact private residential addresses.
- Do not introduce document uploads / Storage (D-057).
- Do not point Preview at Production Supabase.
- Do not run Production hosted proof without a **new** explicit authorization.
- Do not begin Slice 6 / 7 / 8.
- Every PR leaves `main` deployable.

---

## Recommended PR sequence

```text
PR 5.1 Accepted decisions + locked schema contract  (this unit; docs only)
  -> PR 5.2 Verification + publication schema, RLS, RPCs, pgTAP
    -> PR 5.3 Employer verification request / status UI
      -> PR 5.3a Operator verification read contract (narrow RPCs, no UI)
        -> PR 5.3b Operator verification queue/review UI (approve/reject)
          -> PR 5.4 Employer publish + lifecycle controls UI
            -> PR 5.5 Public/candidate visibility + matching/apply integration
              -> PR 5.6 Local exit proof + hosted-readiness package
                -> PR 5.7 Hosted proof + closure (owner-authorized; isolated env)
```

---

## PR 5.1 — Decision acceptance and schema contract

**Objective:** Mark D-055–D-067 Accepted; lock `docs/34`–`docs/36`; update status.

**Includes:** Decision text refinements per owner acceptance; schema-contract
clarity for PR 5.2; dashboard/README status.

**Excludes:** Migrations, product code, types, SQL, RPCs, RLS, routes, UI, tests
beyond documentation.

**Database effects:** None.

**Route effects:** None.

**Tests:** Doc consistency / validation suite only.

**Exit criteria:** All Slice 5 decisions Accepted on `main`; next authorized unit
is PR 5.2.

**Hosted-operation boundary:** None.

---

## PR 5.2 — Verification / publication schema, constraints, RLS, RPCs, pgTAP

**Objective:** Encode Accepted trust and lifecycle gates in Postgres.

**Includes:** Concepts in `docs/36` PR 5.2 contract — verification states,
operator allow-list, attestation, lifecycle states/RPCs, effective-public helper,
apply eligibility integration, seed/draft/deletion compatibility, generated
types, pgTAP. Explicitly decide pause/resume narrow event table (D-065).

**Excludes:** Employer/candidate UI; applicant policies; Storage; admin queue UI;
hosted mutation.

**Database effects:** Migrations (authorized only after PR 5.1 merges).

**Route effects:** None.

**Tests:** pgTAP required for authorization, publication, verification gates,
effective visibility, verification-loss, draft privacy, seed compatibility.

**Exit criteria:** Unverified cannot publish; drafts invisible; revoked employer
vacancies non-public; seed path green; types check passes.

**Hosted-operation boundary:** No hosted mutation in this PR.

---

## PR 5.3 — Employer verification request / status UI

**Status:** Employer-facing UI Done. Operator UI moved to PR 5.3b — see below.

**Objective:** Employer can request verification and see status; operator can
approve/reject through the minimal Accepted path (not full Slice 7 queue).

**Includes:** Employer verification status surfaces (`/employer/verification`);
attestation-based request/resubmission Server Action; state-specific panels for
unverified/pending/verified/rejected/revoked; employer navigation entry.

**Blocked and excluded from this PR:** Operator review UI
(`/internal/verification`). Database-contract audit found no narrow, Auth-bound
RPC that lets an authenticated caller (a) confirm their own operator membership
or (b) list pending verification requests. `verification_operators` has no
authenticated SELECT policy, and `_is_active_verification_operator(uuid)` is
revoked from `authenticated` (service-role only). The existing
`approve_employer_verification` / `reject_employer_verification` RPCs
internally gate on operator membership and are safe to call, but there is no
safe way to *render* an operator route (auth-gate it or list pending rows)
without either a new narrow RPC or broadening RLS/grants — both out of scope
for this PR per the instruction not to add a migration or weaken RLS.

**Resolved by PR 5.3a** (database contract landed, `docs/36`):
`is_current_user_verification_operator()`,
`list_pending_employer_verifications()`, and
`get_employer_verification_review(uuid)` — three narrow, additive,
`SECURITY DEFINER` read RPCs gated on the existing operator helper. No
grant/RLS change, no operator-management RPC, no document upload, no
suspension UI, no reports, no moderation, no general admin dashboard, no UI
of any kind. Operator UI itself remains **PR 5.3b** — the next unit — built
on top of these three RPCs.

**Database effects:** None. No migration added.

**Route effects:** `/employer/verification` only. `/internal/verification`
implemented in PR 5.3b.

**Tests:** Vitest loader/action/view-resolver unit tests; Playwright employer
verification journey (request → pending, reload-safe). Operator tests moved
to PR 5.3b.

**Exit criteria:** Completed unverified employer can reach `pending`; rejected
employer can resubmit; revoked employer sees blocked state with no working
resubmit action. Operator verify/reject implemented in PR 5.3b.

**Hosted-operation boundary:** None.

---

## PR 5.3b — Operator verification queue and review UI

**Status:** In progress (this unit). Do not mark Done before merge.

**Objective:** Give an allow-listed operator the smallest safe operational
interface to review and decide pending employer verification requests, built
entirely on the PR 5.3a read RPCs and the PR 5.2 approve/reject RPCs.

**Includes:** `/internal/verification` queue (minimum fields, ordered by the
RPC, empty state); `/internal/verification/[employerProfileId]` review detail
(read-only for non-pending states, approve/reject controls for pending);
approve/reject Server Actions (`approve_employer_verification`,
`reject_employer_verification`) with explicit confirmation, Zod validation,
stale-`invalid_state` handling, and generic-safe error messages; a shared
`requireActiveOperator` gate calling
`is_current_user_verification_operator()` — never inferring authorization
from an empty list/detail result and never querying `verification_operators`
directly; `/internal/*` added to the proxy's protected-path set
(`isInternalPath`) so unauthenticated requests get the same
session-refresh + encoded-redirect treatment as `/candidate/*` and
`/employer/*`.

**Excludes:** Revocation UI (`verified → revoked` stays operator-mutation-only
via existing RPC, no UI in this PR); publication UI; public jobs routes;
applicant review; Storage/documents; a general admin dashboard; any new
migration or RLS/grant change; hosted mutation.

**Database effects:** None. Uses PR 5.2/5.3a RPCs unchanged.

**Route effects:** `/internal/verification`,
`/internal/verification/[employerProfileId]`. No public navigation link.

**Tests:** Vitest for the operator gate, both loaders, and both actions;
Playwright `internal-verification-journey.spec.ts` — unauthenticated redirect
(no journey gate needed), authenticated non-operator generic-unavailable, and
a full operator journey (register employer → complete onboarding → request
verification → provision a local-only operator fixture via
`withLocalPostgres` → approve → confirm queue/detail/employer-side update).
Operator fixture provisioning has no application RPC or UI path by design
(D-056); the E2E helper uses the same localhost-only direct-Postgres boundary
already established by `e2e/helpers/local-application-proof.ts`, never a
service-role client.

**Exit criteria:** Active operator can approve a pending request; active
operator can reject a pending request with a 1–500 character reason;
non-operators and unauthenticated callers cannot reach queue or detail
content; a stale pending view cannot bypass the mutation RPC's own
transition check; no sensitive field (reviewer identity, email, auth
metadata, exact address, candidate/application data) is ever rendered or
returned by a loader.

**Hosted-operation boundary:** None.

---

## PR 5.4 — Publish and lifecycle controls

**Status:** In progress (this unit). Do not mark Done before merge.

**Objective:** Verified employers publish ready drafts and manage lifecycle
including renewal from expired.

**Includes:** Publish (verified + ready); pause/resume; fill; withdraw;
materialize-expiry; renew `expired → draft`; employer manage-page and list
lifecycle UX at `/employer/vacancies/[vacancyId]` and `/employer/vacancies`
— on the seven existing PR 5.2 RPCs
(`publish_employer_vacancy`, `pause_employer_vacancy`,
`resume_employer_vacancy`, `fill_employer_vacancy`,
`withdraw_employer_vacancy`, `materialize_employer_vacancy_expiry`,
`renew_employer_vacancy_to_draft`), each called through its own narrow
Server Action with server-validated explicit confirmation. No expiry input
exposed to the employer — publish uses the RPC's own 30-day default; resume
passes a server-computed 30-day fallback that the RPC only uses when the
stored expiry has already elapsed. The `draft`/`paused` edit-loader
(`load-employer-draft.ts`) and the list loader
(`load-employer-drafts.ts`) were broadened from draft-only to their full
D-058 scope (edit: draft+paused; list: every lifecycle state); a new
`load-employer-vacancy.ts` loads any state read-only for the manage page.

**Excludes:** Applicant list; admin stale tools; public `/jobs` routes;
candidate matching/apply integration (PR 5.5); a caller-controlled expiry
input; revocation UI (unchanged from PR 5.3b — revoke stays operator-only).

**Database effects:** None beyond RPCs from 5.2. No migration.

**Route effects:** `/employer/vacancies` (list, broadened) and
`/employer/vacancies/[vacancyId]` (manage page, now shows every lifecycle
state instead of draft-only). No new routes; no public routes.

**Tests:** Vitest for both broadened loaders, the new manage-page loader, and
all seven lifecycle actions (ownership, stale-state `invalid_state`,
`incomplete`+missing-fields mapping, raw-error normalization, no
caller-controlled owner/state/timestamps); static-security proof extended to
the new files; Playwright
`employer-vacancy-lifecycle-journey.spec.ts` — full verified-employer
publish → pause → resume → withdraw journey using the PR 5.3a/5.3b operator
fixture path, plus the full pre-existing employer/candidate/auth regression
suite.

**Exit criteria:** Only verified + ready drafts publish; lifecycle matches
D-058; stale/duplicate transitions remain deterministic and
database-authoritative; editable states stay exactly `draft`/`paused`.

**Hosted-operation boundary:** None.

---

## PR 5.5 — Public / candidate visibility and matching integration

**Objective:** Effectively public vacancies appear in public and candidate
surfaces; apply works; drafts stay private.

**Includes:** `/jobs` + `/jobs/[vacancyId]`; expand matches loader; candidate
detail apply for employer jobs; Demo seed regression; privacy-safe location.

**Excludes:** Save/unsave; CV upload; employer applicant review; opaque ranking.

**Database effects:** None expected (uses 5.2 helpers).

**Route effects:** Public jobs routes; candidate matches/detail updates.

**Tests:** Playwright public/candidate visibility; isolation; Slice 3 regression;
matcher unit tests with employer fixtures.

**Exit criteria:** Candidates can match/apply to effectively public employer jobs;
canonical visibility contract shared; snapshots unaffected.

**Hosted-operation boundary:** None.

---

## PR 5.6 — Local exit proof and hosted-readiness package

**Objective:** Local orchestrated proof + hosted runbook for Slice 5 (D-067).

**Includes:** Local proof orchestrator; evidence matrix; hosted runbook with
isolation prerequisites; static security checks.

**Excludes:** Running hosted/Production proof; marking Slice 5 Done.

**Database effects:** None.

**Route effects:** None.

**Tests:** Full local proof gate.

**Exit criteria:** Local checklist green; runbook ready; Slice 5 Done only after
owner hosted proof.

**Hosted-operation boundary:** Runbook only; no mutation.

---

## PR 5.7 — Hosted proof and closure

**Objective:** Owner-authorized hosted proof on isolated Preview/disposable or
Staging; cleanup; closure docs; mark Slice 5 Done.

**Includes:** Exit proof updates + closure; status updates.

**Excludes:** Product changes; Production mutation without new authorization;
Preview→Production credential restore.

**Database effects:** Authorized hosted migrations/fixtures only per runbook.

**Exit criteria:** Hosted PASS + cleanup PASS + closure merged; Slice 5 Done.

**Hosted-operation boundary:** Requires explicit owner authorization for the
chosen environment; re-isolated Preview/disposable mandatory for preferred path.

---

## Local exit criteria (Slice 5)

1. Unverified / pending / rejected / revoked employers cannot publish
2. Verified + ready draft can publish with valid `expires_at`
3. Drafts never match, never detail-apply, never public
4. Paused / filled / expired / withdrawn block new applications
5. Existing applications remain candidate-readable via snapshots
6. Seed Demo path still works
7. Exact private address never public / not stored
8. Non-owner employers cannot mutate or read private drafts
9. Non-operators cannot approve verification
10. No applicant-review surface
11. format / lint / typecheck / Vitest / pgTAP / Playwright proof green
12. Hosted proof PASS under D-067

---

## Hosted-proof prerequisites (non-product)

Per Accepted D-067: new isolated DB; matching Preview/Staging env; alignment
verification; read-only preflight; separate authorization before mutation;
fictional fixtures; cleanup; durable evidence. Never silent Production fallback.

---

## Slice 5 close checklist

- [x] D-055–D-067 Accepted (PR 5.1)
- [x] PR 5.1 merged
- [ ] PR 5.2–5.6 merged; local proof green
- [ ] Hosted proof authorized and executed
- [ ] Cleanup complete
- [ ] Closure doc written
- [ ] Dashboard: Slice 5 Done → Slice 6 planned separately

Do not mark Slice 5 Done from decision acceptance alone.

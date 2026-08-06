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
            -> PR 5.5a Effective-public vacancy read contract (narrow RPCs, no UI)
              -> PR 5.5b Public vacancy discovery only (blocked on candidate matching)
                -> PR 5.5c Canonical candidate-matching/application-eligibility contract (planned)
                  -> PR 5.5d Candidate discovery UI + application integration (planned)
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

**Status:** Done (merged).

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

**Status:** Done (merged).

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

**Status:** Blocked, then split. UI implementation was correctly stopped
after auditing the database contract before writing any route: the PR 5.2
helpers (`is_vacancy_effectively_public`, `visible_public_vacancy_ids`)
return a boolean/ID-list only — `anon` has zero table-level `SELECT` grant
on `vacancies` or `vacancy_language_requirements` (revoked in the original
PR 2.1 migration and never re-granted), and no `authenticated` RLS policy
lets a candidate read another employer's effective-public row. This is
locked in, not incidental: `supabase/tests/database/23_effective_public_and_application_test.sql`
already asserts `throws_ok($$ select * from public.vacancies $$, '42501', ...,
'anon still cannot select vacancies table')`. "Database effects: None
expected (uses 5.2 helpers)" below was the original assumption for this
section and turned out to be wrong — the helpers prove eligibility but do
not project fields. Split into **PR 5.5a** (narrow read-contract migration)
and **PR 5.5b** (UI, on top of that contract).

**Objective:** Effectively public vacancies appear in public and candidate
surfaces; apply works; drafts stay private.

**Includes:** `/jobs` + `/jobs/[vacancyId]`; expand matches loader; candidate
detail apply for employer jobs; Demo seed regression; privacy-safe location.

**Excludes:** Save/unsave; CV upload; employer applicant review; opaque ranking.

**Database effects:** None expected (uses 5.2 helpers) — **superseded, see
Status above.** PR 5.5a adds the missing narrow read RPCs; PR 5.5b adds no
further database effects.

**Route effects:** Public jobs routes; candidate matches/detail updates.

**Tests:** Playwright public/candidate visibility; isolation; Slice 3 regression;
matcher unit tests with employer fixtures.

**Exit criteria:** Candidates can match/apply to effectively public employer jobs;
canonical visibility contract shared; snapshots unaffected.

**Hosted-operation boundary:** None.

---

## PR 5.5a — Effective-public vacancy read contract

**Status:** In progress (this unit). Do not mark Done before merge.

**Objective:** Add the missing narrow, field-explicit read path for
currently effective-public vacancies, callable by both `anon` and
`authenticated`, so PR 5.5b can build `/jobs` and the candidate matching
expansion without any RLS/grant work of its own.

**Includes:** `list_effective_public_vacancies()` (no arguments — confirmed
against `pg_proc` directly, single overload, `pronargs = 0`),
`get_effective_public_vacancy(p_vacancy_id uuid)`,
`get_effective_public_vacancy_languages(p_vacancy_id uuid)` — all three
`SECURITY DEFINER`, fixed `search_path`, every returned column explicitly
enumerated (no `SELECT *`, no `SETOF vacancies`, no JSON), gated exclusively
on the existing `is_vacancy_effectively_public(v.id, now())` helper — never
a caller-supplied visibility timestamp, so a row still stored `published`
after its expiry elapsed but before materialization cannot be surfaced by
passing an earlier instant. A separate languages RPC rather than an
embedded composite array, since Supabase's type generation for composite
arrays inside a `RETURNS TABLE` column is not reliably precise.

**Excludes:** Any UI; any anon table grant; any new/broadened RLS policy;
candidate-specific fields (matching eligibility, missing requirements,
application state) — those stay separate authenticated-only contracts in
PR 5.5b, never mixed into the public projection.

**Database effects:** One migration
(`20260805200000_effective_public_vacancy_read_contract.sql`), additive
only. No table grant change, no RLS policy change — confirmed by pgTAP
(anon `throws_ok` on direct table `SELECT` still passes unchanged).

**Route effects:** None.

**Tests:** pgTAP — privileges, list/detail eligibility across every
lifecycle-exclusion case (draft/paused/filled/expired/withdrawn/elapsed-
expiry/unverified/rejected employer), projection-safety (structural
absence of forbidden fields), public employer presentation (organisation
vs private company-name nullability, seed company name, seed
`employer_type` null), language projection, and live state-change removal
(pause/resume/fill/withdraw/verification-revocation).

**Exit criteria:** Both RPCs return exactly the approved public projection
for currently effective-public vacancies only, with anon/authenticated
executing identically (no role-based field difference); direct table
access remains exactly as narrow as before this PR.

**Hosted-operation boundary:** None.

---

## PR 5.5b — Public vacancy discovery (public-discovery-only)

**Status:** In progress (this unit). Do not mark Done before merge.

**Objective:** Deliver the public-facing half of the original PR 5.5
objective — `/jobs` and `/jobs/[vacancyId]` — built entirely on the PR 5.5a
read contract. The candidate-matching half was audited before any
candidate-facing code was written and found blocked; it is deferred rather
than worked around.

**Database-contract audit (candidate matching):** `resolveCandidateVacancyMatch()`
(`src/lib/matching/resolve-candidate-vacancy-match.ts`), shared by
`/candidate/matches`, `/candidate/jobs/[vacancyId]`, and the apply Server
Action, does a direct `supabase.from("vacancies").select(...)` requesting
`employment_types`, `shift_requirements`, `german_requirement`,
`available_from` — fields the deterministic matcher
(`matchCandidateToVacancy`) hard-requires. Grepping every RLS policy on
`vacancies` across all 10 migrations confirms exactly three authenticated
SELECT policies exist (`vacancies_select_completed_seed_active`,
`vacancies_select_own_employer_draft`, `vacancies_select_own_employer`) —
none let a candidate read another employer's row. Grepping every RPC
definition across all 10 migrations confirms none expose those four fields
for effective-public employer vacancies to `authenticated`. PR 5.5a's
projection deliberately excludes them (out of the approved public field
list). `submit_candidate_application` itself does not check
employment/shift/German/language fit — only completion, effective
visibility, category preference, and duplicate — so calling it without the
existing matcher pre-check would silently drop the eligibility guarantee
the product's "matches your profile" language relies on. This is exactly
the "schema incompatibility requiring a separately reviewed decision"
D-062 anticipated. No migration, RLS broadening, or ad hoc eligibility
logic was added to close this gap in PR 5.5b — it is reported here instead,
per instruction.

**Includes:** `/jobs` + `/jobs/[vacancyId]` (list + detail), loading only
through `list_effective_public_vacancies()`, `get_effective_public_vacancy(uuid)`,
`get_effective_public_vacancy_languages(uuid)`; public navigation ("Jobs"
link in `ShellHeader`); public metadata; safe plain-text description
rendering; safe http/https-only employer website links; a neutral
"Sign in to check your eligibility and apply." application-entry notice
(anonymous → `/login?next=/jobs/<id>`, authenticated → `/candidate`, no
eligibility claim); Demo vacancy labelling for `source=seed`; uniform
`notFound()` for malformed/unknown/non-public vacancy ids; local Playwright
public-discovery journey.

**Excludes:** `/candidate/matches` changes; `/candidate/jobs/[vacancyId]`
changes; `resolveCandidateVacancyMatch`/`matchCandidateToVacancy` changes;
candidate application Server Actions/components; `submit_candidate_application`
callers; already-applied state; employer applicant review; any new database
migration; RLS changes; service role.

**Database effects:** None (consumes PR 5.5a RPCs only).

**Route effects:** `/jobs`, `/jobs/[vacancyId]`. No candidate route changes.

**Tests:** Vitest for schemas/domain/labels/loaders/components (public list,
public detail, static security); Playwright focused public-discovery
journey (employer publish → anonymous sees it → employer withdraws →
anonymous no longer sees it, 404 on detail); full existing employer/auth
regression suite unchanged.

**Exit criteria:** Anonymous and authenticated visitors can browse
effectively public vacancies and reach a neutral sign-in entry point;
candidate matching/application behavior is provably unchanged; no migration.

**Hosted-operation boundary:** None.

---

## PR 5.5c — Canonical candidate-matching/application-eligibility database contract

**Status:** In progress (this unit). Do not mark Done before merge.

**Objective:** Close the exact gap PR 5.5b identified — give candidates a
safe, RLS-independent, field-complete eligibility contract for effectively
public employer vacancies (seed included), matching what the existing
deterministic TypeScript matcher requires, without broadening direct table
RLS, and enforce the same contract transactionally inside
`submit_candidate_application` (D-068).

**Includes:** One additive migration (11th) —
`_evaluate_candidate_vacancy_eligibility(p_candidate_id uuid, p_vacancy_id
uuid, p_at timestamptz)` (internal, `SECURITY DEFINER`, no anon/authenticated
grant, non-short-circuiting evaluator ported rule-for-rule from
`src/lib/matching/{rules,ranks}.ts`: category, employment type, shift,
German, other languages, availability); `resolve_current_candidate_vacancy_match(uuid)`
(authenticated-only, identity from `auth.uid()`, returns `status` in
`unavailable | incomplete | eligible | ineligible` plus
`eligible`/`missing_requirements`, mirroring the existing
`resolveCandidateVacancyMatch` status split so PR 5.5d does not regress
redirect behaviour); `list_current_candidate_vacancy_matches()`
(authenticated-only, no arguments, eligible-rows-only — mirrors
`/candidate/matches`'s existing hard-filter semantics — reusing the PR 5.5a
public projection field set plus `eligible`/`missing_requirements`,
`published_at desc, vacancy_id asc` ordering); `submit_candidate_application`
updated to call the same evaluator after the duplicate check and before
snapshot construction, returning `{"result":"ineligible","missing_requirements":[...]}`
for an ineligible submission instead of only checking category membership.

**Excludes:** Any candidate UI; any change to `/jobs`, `/candidate/matches`,
`/candidate/jobs/[vacancyId]`, `resolveCandidateVacancyMatch`,
`matchCandidateToVacancy`, or the candidate application Server Action;
removing the TypeScript matcher; expanding the anonymous public projection;
employer applicant review.

**Database effects:** One migration
(`20260806000000_candidate_eligibility_contract.sql`), additive only. No
table change, no RLS policy change. `submit_candidate_application`'s
signature (`p_vacancy_id uuid) returns jsonb`) is unchanged; its result
gains one new discriminant value (`ineligible`) that PR 5.5b's
`submitApplicationRpcResultSchema` does not yet parse (fails safely into
the existing generic `failure` state until PR 5.5d).

**Route effects:** None.

**Tests:** pgTAP — privileges/signatures, candidate identity handling,
effective-public exclusion parity with PR 5.5a, every matching rule
(positive/negative, multiple simultaneous failures, deterministic ordering,
null/empty semantics, seed/employer parity), list/detail RPC behaviour,
full application-transaction coverage (eligible/ineligible per rule,
duplicate idempotency, stale-page and verification-revocation races), and
full-suite regression (one pre-existing pgTAP fixture and one pre-existing
assertion updated — see PR 5.5c pre-commit report for exact justification).

**Exit criteria:** `_evaluate_candidate_vacancy_eligibility` agrees with the
TypeScript matcher's eligibility conclusion for every audited rule;
`submit_candidate_application` rejects every rule failure transactionally;
`/jobs`, `/candidate/matches`, `/candidate/jobs/[vacancyId]`, and the
existing application Server Action are provably unchanged; full local
pgTAP/Vitest/Playwright suites green.

**Hosted-operation boundary:** None.

---

## PR 5.5d — Candidate discovery UI + application integration (planned)

**Status:** Not started. Depends on PR 5.5c merging.

**Objective:** Expand `/candidate/matches` and the existing apply flow to
include effectively public employer vacancies on top of the PR 5.5c
contract, restoring the original PR 5.5 candidate-facing objective.

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

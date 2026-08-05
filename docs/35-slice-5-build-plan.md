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
    -> PR 5.3 Employer verification request / status UI (+ minimal operator path)
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

**Objective:** Employer can request verification and see status; operator can
approve/reject through the minimal Accepted path (not full Slice 7 queue).

**Includes:** Employer verification status surfaces; request/attestation; operator
approve/reject Server Actions bound to allow-list.

**Excludes:** Document upload; suspension UI; reports; moderation.

**Database effects:** None beyond using PR 5.2 RPCs.

**Route effects:** Employer verification status routes/sections as designed.

**Tests:** Vitest actions; Playwright verification journey; non-operator deny.

**Exit criteria:** Completed unverified employer can reach `pending`; operator can
verify/reject; non-operators cannot approve.

**Hosted-operation boundary:** None.

---

## PR 5.4 — Publish and lifecycle controls

**Objective:** Verified employers publish ready drafts and manage lifecycle
including renewal from expired.

**Includes:** Publish (verified + ready); pause/resume; fill; withdraw; expiry
selection; renew `expired → draft`; employer list/detail lifecycle UX.

**Excludes:** Applicant list; admin stale tools.

**Database effects:** None beyond RPCs from 5.2.

**Route effects:** Employer vacancy lifecycle actions.

**Tests:** Playwright publish/pause/fill/withdraw/renew; readiness + verification
gates; deterministic duplicate transitions.

**Exit criteria:** Only verified + ready drafts publish; lifecycle matches D-058.

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

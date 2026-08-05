# Slice 5 Build Plan

> Planning artifact only. No application code lands in this document.
> Execute as **sequential PRs** after D-055–D-067 are Accepted.
> **Status:** Discovery/planning. Slice 5 implementation has **not** started.

**Goal:** Deliver verified-employer publication of public vacancies, public and
candidate visibility for eligible employer jobs, and lifecycle controls
(pause / resume / fill / withdraw / expire), without applicant review (Slice 6)
or full admin product (Slice 7).

**Baseline:** Slice 4 Done (`docs/33`). Main tip at planning start:
`bab5a6af52078a80d2b1203dfdea1898425fc9dc`.

**Active tracking:** `docs/14-founder-dashboard.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Product scope |
| `docs/13-implementation-plan.md` | Slice order |
| `docs/34-slice-5-discovery.md` | Discovery answers |
| `docs/36-slice-5-schema-and-publication-proposal.md` | Schema/RPC/RLS contract |
| `docs/10-decisions.md` | D-055–D-067 Proposed → must Accept before schema PR |
| `docs/33-slice-4-closure.md` | Preview isolation residual |
| `NOT_NOW.md` | Deferred ideas |

---

## Hard stops

- Do not implement until D-055–D-067 are Accepted (or explicitly amended).
- Do not add applicant review, messaging, or application status changes.
- Do not add full admin moderation/suspension UI (Slice 7).
- Do not store exact private residential addresses.
- Do not require identity/business document uploads unless acceptance changes D-057.
- Do not point Preview at Production Supabase.
- Do not run Production hosted proof without a **new** explicit authorization.
- Do not begin Slice 6 / 7 / 8.
- Every PR leaves `main` deployable.

---

## Recommended PR sequence

```text
PR 5.1 Accepted decisions + locked planning package
  -> PR 5.2 Verification + publication schema, RLS, RPCs, pgTAP
    -> PR 5.3 Employer verification request / status UI (+ minimal operator approve path)
      -> PR 5.4 Employer publish + lifecycle controls UI
        -> PR 5.5 Public/candidate visibility + matching/apply integration
          -> PR 5.6 Local exit proof + hosted-readiness package
            -> PR 5.7 Hosted proof + closure (owner-authorized; isolated env)
```

Adjust only if Accepted decisions force a different split (e.g. no public `/jobs`).

**Authorization gate:** PR 5.2 and later are **not** authorized until D-055–D-067
are Accepted (via PR 5.1 or equivalent decision-acceptance change). This planning
PR does not accept those decisions.

---

## PR 5.1 — Accepted decisions and schema contract

**Objective:** Lock D-055–D-067 as Accepted; freeze planning docs; no runtime change.

**Includes:** Decision status updates; minor consistency edits to `docs/34`–`docs/36`,
`docs/13`, `docs/14`, README as needed.

**Excludes:** Migrations, product code, types, tests beyond doc-only.

**Database effects:** None.

**Route effects:** None.

**Tests:** Doc consistency review only.

**Exit criteria:** All Slice 5 decisions Accepted; planning package linked from
dashboard; implementation authorized to start at PR 5.2.

**Hosted-operation boundary:** None.

---

## PR 5.2 — Verification / publication schema, constraints, RLS, RPCs, pgTAP

**Objective:** Encode trust and lifecycle gates in Postgres.

**Includes (expected layers):**

- Expand `verification_state`; request/review columns; remove force-unverified trigger
- Operator allow-list mechanism (table or constrained config — per Accepted D-056)
- Expand `publication_state`; drop employer-draft-only publish ban
- RPCs: verification request/approve/reject/revoke; publish; pause; resume;
  mark_filled; withdraw; expire; readiness updates as needed
- Visibility helpers for seed + eligible employer published vacancies
- Expand `submit_candidate_application` eligibility for employer jobs
- RLS for public/candidate/employer select rules per D-060
- Generated types refresh
- pgTAP suites for states, transitions, isolation, verification loss

**Excludes:** Employer/candidate UI beyond what types require; applicant policies;
Storage buckets; admin queue UI.

**Database effects:** One or more migrations; high risk on visibility helpers.

**Route effects:** None (API/RPC only).

**Tests:** pgTAP required for authorization, publication state, verification gates,
candidate draft invisibility, application uniqueness unchanged.

**Exit criteria:** Unverified cannot publish; drafts invisible; revoked employer
vacancies non-public; seed path still green; types check passes.

**Hosted-operation boundary:** No hosted mutation in this PR.

---

## PR 5.3 — Employer verification request / status UI

**Objective:** Employer can request verification and see status; operator can
approve/reject through the minimal Accepted path (not full Slice 7 queue).

**Includes:** `/employer` verification status surfaces; request form/attestation;
operator approve/reject Server Actions bound to allow-list; copy that completion ≠
verification.

**Excludes:** Document upload; suspension UI; reports; moderation.

**Database effects:** None beyond using PR 5.2 RPCs.

**Route effects:** Employer verification status routes/sections as designed.

**Tests:** Vitest actions; Playwright employer verification journey; negative
non-operator deny.

**Exit criteria:** Completed unverified employer can reach `pending`; operator can
verify/reject; non-operators cannot approve.

**Hosted-operation boundary:** None.

---

## PR 5.4 — Publish and lifecycle controls

**Objective:** Verified employers publish ready drafts and manage lifecycle.

**Includes:** Publish control (only when verified + ready); pause/resume; mark
filled; withdraw; expiry selection at publish; employer list/detail lifecycle UX;
no Publish for unverified/unready.

**Excludes:** Applicant list; public SEO polish beyond functional routes; admin
stale tools.

**Database effects:** None beyond RPCs from 5.2.

**Route effects:** Employer vacancy list/detail/edit publish + lifecycle actions.

**Tests:** Playwright publish/pause/fill/withdraw; readiness + verification gates;
idempotent double-publish behaviour.

**Exit criteria:** Only verified + ready drafts publish; lifecycle transitions match
matrix; drafts remain editable where allowed.

**Hosted-operation boundary:** None.

---

## PR 5.5 — Public / candidate visibility and matching integration

**Objective:** Eligible published employer vacancies appear in public and candidate
surfaces; apply works; drafts stay private.

**Includes:** `/jobs` + `/jobs/[vacancyId]` (if Accepted); expand matches loader;
candidate detail apply path for employer jobs; Demo seed regression; privacy-safe
location only.

**Excludes:** Save/unsave; CV upload; employer applicant review; opaque ranking.

**Database effects:** None expected (uses 5.2 helpers).

**Route effects:** Public jobs routes; candidate matches/detail behaviour updates.

**Tests:** Playwright public/candidate visibility; isolation (draft/paused/etc.);
Slice 3 critical journey regression; matcher unit tests with employer fixtures.

**Exit criteria:** Candidates can match/apply to eligible employer jobs; anon rules
match D-060; existing applications/snapshots unaffected.

**Hosted-operation boundary:** None.

---

## PR 5.6 — Local exit proof and hosted-readiness package

**Objective:** Local orchestrated proof + hosted runbook for Slice 5.

**Includes:** `pnpm proof:slice5` (or equivalent); evidence matrix; hosted runbook
with isolation prerequisites from D-067; static security checks (no service-role
browser path; no unverified publish).

**Excludes:** Running hosted/Production proof; creating hosted fixtures in CI;
marking Slice 5 Done.

**Database effects:** None.

**Route effects:** None.

**Tests:** Full local proof gate (format/lint/typecheck/test/build/reset/pgTAP/e2e).

**Exit criteria:** Local checklist green; runbook ready; Slice 5 Done only after
owner hosted proof.

**Hosted-operation boundary:** Runbook only; no mutation.

---

## PR 5.7 — Hosted proof and closure

**Objective:** Owner-authorized hosted proof on isolated Preview/disposable or
Staging; cleanup; closure docs; mark Slice 5 Done.

**Includes:** `docs/` exit proof updates + closure; status updates.

**Excludes:** Product changes; Production mutation without new authorization;
Preview→Production credential restore.

**Database effects:** Authorized hosted migrations/fixtures only per runbook.

**Exit criteria:** Hosted PASS + cleanup PASS + closure merged; Slice 5 Done.

**Hosted-operation boundary:** Requires explicit owner authorization for the
chosen environment; re-isolated Preview/disposable mandatory for preferred path.

---

## Local exit criteria (Slice 5)

1. Unverified / pending / rejected / revoked employers cannot publish
2. Verified + ready draft can publish with `expires_at`
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

- Provision new isolated Supabase project or Staging
- Configure Preview env explicitly for that project
- Verify frontend/database alignment before mutation
- Never silently fall back to Production credentials
- New Production authorization text required if Production fallback is chosen

---

## Slice 5 close checklist (planning)

- [ ] D-055–D-067 Accepted
- [ ] PR 5.1–5.6 merged; local proof green
- [ ] Hosted proof authorized and executed
- [ ] Cleanup complete
- [ ] Closure doc written
- [ ] Dashboard: Slice 5 Done → Slice 6 planned separately

Do not mark Slice 5 Done from this planning package alone.

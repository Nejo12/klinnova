# Slice 3 Build Plan

> Planning artifact. Discovery in `docs/22-slice-3-discovery.md`.
> Schema/journey proposal in `docs/24-slice-3-schema-and-journey-proposal.md`.
> **Status:** Contracts Accepted 2026-08-03 (D-035–D-045). PR 3.1–3.4 merged
> (#33–#36). PR 3.5 local exit proof and hosted-proof readiness in progress on
> `chore/slice-3-exit-proof`. Hosted proof remains pending. Slice 3 is not Done.
> Slice 4 has not started.

**Outcome:** A completed candidate can open a matched Demo job, preview a
profile-based application, submit exactly once, and see reload-safe confirmation
(`docs/13`, narrowed by Accepted D-035).

**Tracking:** `docs/14-founder-dashboard.md`

**Decisions:** D-035–D-045 Accepted 2026-08-03 in `docs/10-decisions.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Candidate apply MVP intent (narrowed for this slice) |
| `docs/05-features.md` | Detail / apply / status vocabulary (narrowed) |
| `docs/07-architecture.md` | Authz, aspirational routes (candidate-gated override) |
| `docs/08-non-functional.md` | Privacy, a11y, performance |
| `docs/12-terminology.md` | job / vacancy / application / match |
| `docs/13-implementation-plan.md` | Slice order; exit criteria (narrowed) |
| `docs/21-slice-2-closure.md` | Hosted Demo fixture baseline |
| `docs/22` / `docs/24` | Discovery + schema/journey contracts |
| `docs/10-decisions.md` | D-020, D-023, D-031–D-034; Accepted D-035–D-045 |
| `NOT_NOW.md` | Do not implement |

---

## Intentional narrowings (Accepted)

| Broader doc statement | Slice 3 boundary |
|-----------------------|------------------|
| `docs/13` salary, distance, verification, save/unsave, CV, timeline, applications dashboard | Deferred; detail+submit+confirm+applied-state only (D-035) |
| Public `/jobs/[slug]` | Candidate-only `/candidate/jobs/[vacancyId]` (D-036) |
| Rich detail fields not in schema | Show schema-backed fields only (D-037) |
| Full status machine UI | Constrain and create only `submitted`; future statuses deferred (D-039) |
| Email/phone/CV on apply | Not stored or required in Slice 3 (D-043) |
| Employer review | Out of scope |

---

## Explicit exclusions

- Employer Auth / verification / applicant review / status transitions
- Save/unsave
- CV upload and Storage
- Messaging, interviews, offers, hire flows
- Public SEO job board
- Salary, experience, travel-distance matching, verification claims
- Application withdrawal UI or resubmission-after-withdrawal
- Pre-authorized future application statuses beyond `submitted`
- Full application history dashboard
- Automatic Production seeding of vacancies or applications
- Service-role in browser or ordinary SSR sessions
- Private residential address storage (D-034 unaffected)
- `NOT_NOW.md` items

---

## Exit criteria (Slice 3)

Operationalised from owner objective + Accepted D-035:

1. Completed candidate opens a matched Demo job at `/candidate/jobs/[vacancyId]`.
2. Detail shows schema-backed job facts, Demo label, match reasons, and
   work-authorisation notice.
3. Candidate previews the profile-based application and explicitly submits.
4. Confirmation is reload-safe and reads the stored application.
5. Exactly one application per candidate per vacancy (DB unique).
6. Duplicate submit returns safe deterministic already-applied behaviour.
7. Unauthenticated / incomplete candidates cannot view inventory detail or submit.
8. Invisible lifecycle vacancies cannot be submitted.
9. Non-matching vacancies cannot be submitted (Server Action match re-check).
10. Matches/detail show Applied after success.
11. Local CI: pgTAP + Vitest + Playwright critical journey green.
12. Hosted proof completed per Accepted D-045 before Slice 3 Done.
13. No employer product surfaces; no save/CV/timeline dashboard.

---

## Proposed PR sequence (five)

```text
PR 3.1 Application schema + constraints + RLS + pgTAP
  -> PR 3.2 Job-detail loader + /candidate/jobs/[vacancyId] + matches entry
    -> PR 3.3 Application preview + atomic submit (RPC + Server Action)
      -> PR 3.4 Confirmation, applied state, critical Playwright journey
        -> PR 3.5 Hosted proof procedure/evidence + closure docs
```

PR 3.5 is evidence/closure-oriented (like Slice 2 PR 2.4). It must not invent
automatic Production seeding. Adjust only if Accepted decisions change the
boundary.

---

## PR 3.1 — Application schema, constraints, RLS, database tests

**Intent:** Persist applications with ownership, uniqueness, and insert path.

**Status:** Done — merged.

**Includes:** `applications` table; FKs; permanent unique `(candidate_id, vacancy_id)`;
`status = 'submitted'` CHECK only; `snapshot_version` + `candidate_snapshot` /
`vacancy_snapshot` jsonb; Auth-bound `submit_candidate_application(vacancy_id)`
(no caller candidate ID or snapshot JSON); candidate SELECT-own RLS; no UPDATE;
privilege lockdown; pgTAP; regenerate types.

**Excludes:** UI routes; matcher changes; fixture SQL changes; employer policies.

**Depends on:** Accepted D-038–D-042; Slice 2 schema on `main`.

**Migration impact:** New migration only; no vacancy inventory changes.

**Security review:** No caller-supplied candidate UUID; `auth.uid()` only;
incomplete denied; invisible vacancy denied; no service-role SSR path.

**Tests:** Schema structure (flip `hasnt_table applications`); constraints;
RLS isolation; RPC success/deny matrix; unique/concurrent duplicate.

**Exit criteria:** pgTAP green; types updated; no UI.

---

## PR 3.2 — Job-detail loader and candidate detail route

**Intent:** Authenticated completed candidates can inspect one Demo job.

**Status:** Done — merged.

**Includes:** Dedicated detail loader; `/candidate/jobs/[vacancyId]` page;
matches card link to detail; Demo label; reasons; work-authorisation notice;
unavailable/not-found handling; Vitest loader/mapper/UI tests.

**Excludes:** Submit; applications write; save; public `/jobs`.

**Depends on:** PR 3.1 optional for read of application state — prefer loading
applied state in 3.2 only if types exist; otherwise stub “not applied” until 3.3/3.4.
Recommended dependency: after 3.1 so applied badge can query own applications.

**Migration impact:** None.

**Security review:** Same completion + RLS visibility gate as matches; no
inventory leak for incomplete/unauth.

**Tests:** Vitest detail loader (visible, missing, incomplete, unauth);
component a11y; Playwright smoke optional (full journey in 3.4).

**Exit criteria:** Completed candidate opens Demo detail with reasons; gates hold.

---

## PR 3.3 — Application preview and atomic submission

**Intent:** Preview essentials and submit exactly once.

**Status:** Done — merged.

**Includes:** Preview section/step; Server Action (session, completed profile,
RLS-visible vacancy, TypeScript matcher, `not_matching` reject, RPC with vacancy
ID only); RPC integrity path; error mapping (incomplete, unavailable, not
matching, already_applied); pending UI; disclosure copy without extra checkbox;
Vitest action/result mapping.

**Excludes:** Confirmation polish beyond redirect target; history dashboard;
employer notifications.

**Depends on:** PR 3.1, PR 3.2.

**Migration impact:** None unless RPC adjustments discovered.

**Security review:** Snapshot built server-side from Auth-owned rows; no client
trust for candidate identity or completion.

**Tests:** Vitest submit mapping; duplicate; lifecycle; match failure.

**Exit criteria:** Local submit creates one row; duplicate is deterministic.

---

## PR 3.4 — Confirmation, applied state, critical journey

**Intent:** Persistent confirmation and Applied state on matches/detail.

**Status:** Complete — merged as #36.

**Includes:** Confirmation view reading stored application; Applied on
matches/detail; Playwright confirmation/Applied coverage; update Slice 2 e2e
assertions that forbade detail/apply links.

**Excludes:** Hosted Production commands; employer UI; analytics product work.

**Depends on:** PR 3.3.

**Migration impact:** None.

**Security review:** Confirmation reveals only own application; no cross-candidate
read.

**Exit criteria:** Met on merge of #36.

---

## PR 3.5 — Local exit proof and hosted-proof readiness

**Intent:** Produce auditable local exit evidence for the complete Slice 3
candidate journey and prepare the owner-authorized hosted-proof runbook.
Does **not** mark Slice 3 Done.

**Status:** Implementation in progress on branch `chore/slice-3-exit-proof` —
local critical journey, static security proof, exit-proof doc, and hosted
runbook. Hosted commands are not executed in this PR. Slice 3 remains not Done
until hosted proof, evidence review, closure docs, and merge complete.

**Includes:** `e2e/slice3-critical-journey.spec.ts`; `pnpm test:e2e:slice3`;
static security assertions; `docs/25-slice-3-exit-proof.md`;
`docs/26-slice-3-hosted-proof-runbook.md`; README/dashboard/build-plan status.

**Excludes:** Hosted Supabase commands; Production proof; marking Slice 3 Done;
starting Slice 4; schema/RLS/RPC/migration changes; new product behaviour.

**Depends on:** PR 3.4 merged; Accepted D-045.

**Migration impact:** None expected.

**Security review:** No hosted credentials; no service-role path; ownership and
snapshot immutability proven locally.

**Exit criteria:** Local exit checklist green; CI green; hosted runbook ready;
Slice 3 still explicitly not Done.

---

## Testing matrix

| Layer | PR | Focus |
|-------|-----|--------|
| Schema / RLS / RPC | 3.1 | Constraints; unique; ownership; incomplete/invisible deny |
| Unit / component | 3.2–3.3 | Detail loader; preview; submit result mapping |
| Playwright | 3.4–3.5 | Apply journey + dedicated Slice 3 critical exit journey |
| Hosted | After 3.5 | Owner-run Preview (preferred) or Production per D-045 / `docs/26` |

### Playwright critical journey (required)

1. Register
2. Complete onboarding
3. Open a matched job
4. Inspect detail
5. Preview application
6. Submit
7. See confirmation
8. Reload confirmation
9. Revisit job / matches and see Applied
10. Attempt duplicate → safe deterministic behaviour

### Authorization / lifecycle proof

- Unauthenticated cannot submit
- Incomplete cannot submit
- Candidate cannot submit for another candidate
- Expired/withdrawn/future/invisible vacancy cannot be submitted
- Non-matching vacancy cannot be submitted

---

## Accessibility requirements

- One clear `h1` on detail and confirmation
- Semantic metadata (description list or equivalent) for job facts
- Preview grouped with accessible name
- Error summary before submit controls on failure
- Submit button disabled/pending state announced
- Duplicate and lifecycle errors in text, not color alone
- Keyboard-reachable submit and navigation
- Mobile-first stacked layout; touch targets adequate

---

## Analytics and audit

- **Implemented now:** `submitted_at` / `created_at` / `updated_at` on
  applications (and existing vacancy timestamps).
- **Documented only:** product events `job_detail_viewed`,
  `application_preview_viewed`, `application_submitted` for a later analytics
  slice.
- **Deferred:** PostHog/Sentry product wiring beyond existing baselines.

---

## Environment notes

- Local: CLI Supabase + existing Demo seeds.
- CI: deterministic seeds; no Production contact.
- Preview: preferred for hosted proof and iterative application-record testing
  (D-045).
- Production: permitted only after explicit owner authorization; Demo vacancies
  currently retained until 2026-09-02; applications created during proof need an
  owner cleanup policy before declaring Done if retained records are unacceptable.
- No service-role in candidate browser/ordinary SSR path.

---

## Slice 3 close checklist (planning)

- [x] D-035–D-045 Accepted (2026-08-03)
- [ ] PR 3.1–3.4 merged
- [ ] Local critical journey green
- [ ] Hosted proof recorded (D-045)
- [ ] No employer / save / CV / timeline dashboard shipped
- [ ] Dashboard: Slice 3 Done → next slice planned

PR 3.1–3.3 are merged. PR 3.4 implementation is in progress on branch; do not
mark PR 3.4 complete before merge. Do not mark Slice 3 Done until hosted exit
proof is recorded. Do not start the next PR yet.

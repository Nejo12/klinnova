# Slice 3 Discovery

> Analysis artifact. No migrations or application code land here.
> **Status:** Contracts Accepted 2026-08-03 (D-035–D-045). PR 3.1 is the next
> implementation unit; Slice 3 implementation has not started.

**Outcome to enable:** A completed candidate can open one matched Demo vacancy,
understand the job and why it matches, preview a profile-based application,
explicitly submit it, see confirmation, and be prevented from duplicating that
application (`docs/13-implementation-plan.md`, narrowed by D-035).

**Related:**

- Build plan — `docs/23-slice-3-build-plan.md`
- Schema + journey proposal — `docs/24-slice-3-schema-and-journey-proposal.md`
- Decisions — D-035–D-045 in `docs/10-decisions.md` (**Accepted** 2026-08-03)

---

## Verified baseline (do not re-litigate)

| Fact | Evidence |
|------|----------|
| Slice 0–2 complete | `docs/14-founder-dashboard.md`; Slice 2 closure `docs/21` |
| Vacancy schema + completed-candidate RLS on `main` | PR #26; migration `20260802190000` |
| Pure matcher + authenticated matches loader | PR #27 |
| `/candidate/matches` UI; no apply/detail controls | PR #28 |
| Local critical journey + hosted Demo fixture procedure | PR #29 |
| Hosted Production Demo fixtures retained until 2026-09-02 | `docs/21` |
| No `applications` table | `00_schema_structure_test.sql` asserts absence |
| No job-detail or application routes | App inventory |
| Salary, experience, address, CV, phone, verification absent from vacancy/candidate schema | Migrations + `docs/17` / `docs/20` |
| D-034 private/organisation employers Accepted; employer implementation deferred | `docs/10` |
| Matching is pure TypeScript; vacancy SELECT via RLS helpers | D-028, D-033 |
| Work-authorisation notice exact copy established | `WORK_AUTHORISATION_NOTICE` |
| Messaging, video interviewing deferred | `NOT_NOW.md` |

---

## Document tensions — resolved

AGENTS.md required reporting conflicts before inventing a resolution. T1–T6 were
resolved by Accepted D-035–D-045 (2026-08-03).

### T1 — Broad Slice 3 vs submission-only journey

| Source | Said |
|--------|------|
| `docs/13` Slice 3 | Job list/detail; salary; distance; verification; freshness; save/unsave; optional CV; confirmation; application timeline; candidate application dashboard |
| `docs/04` / `docs/05` | Rich detail (responsibilities, salary, CV requirement, interview language); status timeline; withdrawal |
| Owner Slice 3 objective | Open matched Demo vacancy → understand → preview → submit → confirm → prevent duplicate; ends at successful submission |
| Stop rules | No save/unsave, messaging, interviews/status timelines, salary/experience matching, employer Auth |

**Resolution (D-035 Accepted):** Narrow Slice 3 to authenticated candidate job
detail + profile-based submit + confirmation + Applied-state feedback. Defer
save/unsave, CV upload, application history dashboard, employer-facing status
transitions, salary/distance/verification fields, and interview workflows.

**Note:** D-032 previously said “Full job detail, save/unsave, and apply remain
Slice 3.” D-035 supersedes **only** the save/unsave placement in D-032; it does
not reinterpret the rest of D-032.

### T2 — Public `/jobs/[slug]` vs candidate-gated inventory

| Source | Said |
|--------|------|
| `docs/07-architecture.md` | Aspirational `/jobs` and `/jobs/[slug]` |
| D-033 | Seed vacancies are not an anonymous public board; SELECT only for completed authenticated candidates |
| Current app | Only `/candidate/*` candidate product surfaces |

**Resolution (D-036 Accepted):** Use `/candidate/jobs/[vacancyId]` and
`/candidate/applications/[applicationId]` under the existing candidate Auth
gate. Do not introduce a public SEO job board in Slice 3.

### T3 — Detail richness vs current schema

| Source | Said |
|--------|------|
| MVP / features | Salary, responsibilities, precise/privacy-safe district, experience, CV requirement, interview language, verification |
| Current schema | `title`, `summary`, `city=Berlin`, category, employment types, shifts, German, optional language requirements, `available_from`, `published_at`, `expires_at`, company name; Demo labelling via seed titles + UI |

**Resolution (D-037 Accepted):** Show only schema-backed fields and derived match
reasons. Explicitly defer missing MVP fields; do not invent columns in Slice 3
unless a later Accepted decision expands the schema.

### T4 — Full status machine vs submit-only

| Source | Said |
|--------|------|
| `docs/05` | submitted → viewed → shortlisted → interview\* → offer → hired / not selected / withdrawn |
| Owner objective | Create successful submission; employer review and status changes later |

**Resolution (D-039 Accepted):** Constrain and create only `submitted` in Slice 3.
Do not pre-authorize future workflow states in the CHECK. Future statuses
(viewed, shortlisted, interview\*, offer, hired, not selected, withdrawn) are
deferred; additive migrations may extend the constraint later after transition
ownership and authorization are defined. No withdrawal action in Slice 3.

### T5 — Roadmap Stage 1/2 wording vs vertical slices

| Source | Said |
|--------|------|
| `docs/09` Stage 1 | Job details + save job in “candidate discovery” |
| `docs/09` Stage 2 | Apply + CV + timeline |
| Vertical slices (`docs/13`) | Slice 2 matches; Slice 3 detail+apply |

**Resolution:** Treat `docs/09` as capability roadmap, not PR sequence.
Vertical-slice docs + Accepted D-035 win for delivery order. Roadmap notes
Accepted Slice 3 narrowings (no capability deletion from MVP intent).

### T6 — Email / phone / CV in applications

| Source | Said |
|--------|------|
| Features | Profile-based apply; optional CV; contact in later employer review |
| Schema | Email on `auth.users` only; no phone; no CV storage |

**Resolution (D-038 / D-043 Accepted):** Slice 3 snapshots do not copy email,
phone, CV, or precise address. Preview uses collected essentials only. Contact
sharing is a later employer-workflow decision.

---

## Capability inventory (current code)

### Routes

| Route | Behaviour |
|-------|-----------|
| `/candidate` | Complete → `/candidate/matches`; incomplete → onboarding CTA |
| `/candidate/onboarding` | Essentials + review + completion RPC |
| `/candidate/matches` | Completed inventory; incomplete redirected; unauth → login |
| Job detail / applications | **Missing** |

### Loaders

- `loadCandidateMatches` — session, completion gate, RLS vacancy list, pure matcher, reasons.
- No single-vacancy detail loader.

### Schema relevant to Slice 3

- Readable vacancy + company + language requirements under D-033 helpers.
- Candidate essentials sufficient for preview/snapshot without new collections.
- No applications table; structure test currently asserts absence.

### Fixtures

- Local: nine active Demo vacancies including
  `22222222-2222-4222-8222-222222222201` — Morning kitchen support.
- Hosted Production: company `…1111`, vacancies `…201` / `…206`, language `…301`,
  expiry 2026-09-02 — sufficient for detail/apply proof if still active.

---

## Resolved discovery answers (Accepted)

### 1. Job-detail route and authorization

- **Route:** `/candidate/jobs/[vacancyId]` (UUID). Stable; aligns with match card
  `vacancy.id`; avoids implying a public `/jobs` board.
- **Access:** Candidate Auth proxy + completed onboarding (same gate as matches).
- **Unauthenticated:** Redirect to `/login?next=…`. No public vacancy HTML.
- **Incomplete:** Redirect to onboarding. No inventory/detail.
- **Non-matching but RLS-visible vacancy:** Detail may load (deep link / stale
  prefs). Submit refuses unless currently matching (D-041).
- **Loader:** Dedicated server-only detail loader (one vacancy by id under RLS) +
  reuse pure matcher for that vacancy’s reasons. Do not reuse the list loader as
  the sole path.
- **Missing / not RLS-visible (withdrawn, expired, future, deleted):** Not found /
  unavailable — no vacancy leakage.
- **Completion invalidated while open:** Next navigation/submit treats as
  incomplete → onboarding; submit RPC denies.
- **Demo label:** Remains visible on detail.

### 2. Detail content boundary

**Include (schema-backed):**

- job title; employer display name; Demo vacancy label; Berlin; summary;
  employment types; shifts; German requirement; additional language requirements;
  available-from; why it matches (reason codes); work-authorisation notice;
  freshness via `published_at` / `expires_at` where useful.

**Defer (MVP text exists; schema/product not ready):**

- salary; precise or district address beyond Berlin; experience requirements;
  employer verification state; interview language; CV requirement flag;
  structured responsibilities beyond `summary`; save/unsave; employer contact.

**Blocked:** none for a credible Demo journey under Accepted deferrals.

### 3–6. Application model, status, duplicates, RLS

See `docs/24` and D-038–D-042. Summary:

- Table `applications` with permanent `UNIQUE (candidate_id, vacancy_id)`.
- Snapshot strategy **C**: live FKs + RPC-generated immutable versioned jsonb
  snapshots (`snapshot_version = 1`; separate `candidate_snapshot` /
  `vacancy_snapshot` columns).
- Status constrained to `submitted` only; future states deferred (D-039).
- Auth-bound `submit_candidate_application(p_vacancy_id uuid)` + Server Action.
- Candidate SELECT own rows only; no UPDATE/DELETE; no anon access.
- No withdrawal; no resubmission-after-withdrawal.

### 7. Submit-time eligibility and authority split

| Layer | Authority |
|-------|-----------|
| TypeScript matcher (Server Action) | Product-level matching source of truth |
| RPC / database | Security, lifecycle, ownership, integrity source of truth |

Server Action: resolve session → load completed profile → load RLS-visible
vacancy → run matcher → reject `not_matching` → call RPC with vacancy ID only.

RPC: `auth.uid()` identity; ownership; completion; vacancy exists/visible/
active/published; not future/withdrawn/expired/deleted; seed inventory rules;
duplicate prevention; trusted snapshot construction; atomic insert or
`already_applied`. Candidate ID and snapshot JSON are never caller-supplied.
Slice 3 does not duplicate the full matcher in SQL. Stale state fails safely.

### 8–9. Preview and confirmation

- Preview as a section on the detail journey showing vacancy title/employer +
  candidate essentials + disclosure.
- Explicit Submit button; **no additional checkbox**.
- Confirmation reads historical snapshot values (reload-safe).
- `already_applied` routes to existing confirmation.
- Matches/detail show Applied; no full history dashboard in Slice 3 (D-044).

### 10. Lifecycle denials

Submit fails with stable error codes when vacancy invisible, incomplete, not
matching, or duplicate. Candidate-facing copy stays factual — no employer SLA.

### 11. Fixtures

Current Demo fixtures are sufficient; no fixture changes in discovery.

### 12–14. Privacy, a11y, analytics

- Versioned minimized snapshots; no email/phone/CV/precise address/Auth metadata.
- Semantic detail + error summary + pending submit + no color-only status.
- Analytics events documented only; DB timestamps suffice. No broad analytics
  platform work in Slice 3.

### 15–16. Testing and hosted proof

See build plan testing matrix and D-045: local pgTAP/Vitest/Playwright required;
Preview preferred for hosted proof; Production permitted only after explicit
owner authorization; cleanup risk recorded.

---

## Accepted owner choices (2026-08-03)

| Choice | Accepted |
|--------|----------|
| Save/unsave | Removed from Slice 3 (D-035 supersedes only D-032 save/unsave placement) |
| Status vocabulary | `submitted` only |
| Duplicate rule | Permanent candidate–vacancy uniqueness |
| Snapshots | DB/RPC-generated immutable versioned jsonb (`snapshot_version = 1`) |
| Snapshot exclusions | No email, phone, CV, or precise address |
| Checkbox | Not required; explicit Submit + disclosure sufficient |
| Hosted proof | Preview preferred; Production only after explicit authorization |

---

## Explicit non-goals for Slice 3

Do not implement:

- Employer Auth, verification, applicant review, or status updates
- Save/unsave
- CV upload / Storage
- Messaging, interviews, offer/hire flows
- Public anonymous job board
- Salary, experience, travel-distance, verification fields
- Application withdrawal UI or resubmission-after-withdrawal
- Full `/candidate/applications` history dashboard
- Pre-authorized future application status values beyond `submitted`
- Automatic Production fixture or application seeding
- Service-role browser/ordinary SSR paths
- D-034 private-address storage
- `NOT_NOW.md` items

---

## Accepted decision map

| # | Topic | Decision | Status |
|---|-------|----------|--------|
| 1 | Slice 3 boundary | D-035 | Accepted 2026-08-03 |
| 2 | Detail route + authz | D-036 | Accepted 2026-08-03 |
| 3 | Detail content / missing fields | D-037 | Accepted 2026-08-03 |
| 4 | Application schema + snapshot | D-038 | Accepted 2026-08-03 |
| 5 | Status vocabulary | D-039 | Accepted 2026-08-03 |
| 6 | Duplicate prevention + idempotency | D-040 | Accepted 2026-08-03 |
| 7 | Submit-time eligibility | D-041 | Accepted 2026-08-03 |
| 8 | Insertion + RLS | D-042 | Accepted 2026-08-03 |
| 9 | Preview + confirmation UX | D-043 | Accepted 2026-08-03 |
| 10 | Applied state + history boundary | D-044 | Accepted 2026-08-03 |
| 11 | Hosted proof strategy | D-045 | Accepted 2026-08-03 |

---

## Delivery order after acceptance

1. ~~Review discovery + schema/journey proposal~~ — done (PR #31).
2. ~~Accept D-035–D-045~~ — Accepted 2026-08-03.
3. Open PR 3.1 per `docs/23` (application schema first). Implementation has not
   started in this acceptance update.

---

## Stop rule

If implementation would diverge from Accepted Slice 3 decisions, reintroduce T1–T6
conflicts, or start employer workflows, stop and revise decisions — do not
implement around the conflict.

# Slice 4 Discovery

> Analysis artifact. No migrations or application code land here.
> **Status:** Discovery / planning. Decisions D-046–D-054 are **Proposed** —
> not Accepted. Implementation must not begin until owner acceptance and the
> build-plan sequence opens.

**Outcome to enable:** A private or organisation employer can register, create
the appropriate employer profile (and company profile only when organisation),
and save a structured private draft vacancy (`docs/13-implementation-plan.md`,
narrowed by Proposed D-046; product boundary D-034 Accepted).

**Related:**

- Build plan — `docs/29-slice-4-build-plan.md`
- Schema + journey proposal — `docs/30-slice-4-schema-and-journey-proposal.md`
- Decisions — D-046–D-054 in `docs/10-decisions.md` (**Proposed**)
- Prior Accepted boundary — D-034 (private vs organisation employers)

---

## Verified baseline (do not re-litigate)

| Fact | Evidence |
|------|----------|
| Slice 0–3 Done | `docs/14-founder-dashboard.md`; `docs/27-slice-3-closure.md` |
| Auth is email/password Supabase Auth; SSR session via `src/proxy.ts` | D-021; `src/app/auth/actions.ts` |
| No shared `profiles` table; no `profiles.role` | D-019; `src/types/database.ts`; migrations |
| Only `candidate_profiles` + `candidate_languages` for identity product data | Migration `20260801050157` |
| Every Auth flow creates/assumes a candidate profile | `ensureCandidateProfile`; `/register` → `/candidate` |
| `/candidate/*` Auth gate only; no `/employer/*` routes | `src/lib/supabase/proxy.ts`; app inventory |
| `companies` / `vacancies` / `vacancy_language_requirements` exist as **seed-only** inventory | Migration `20260802190000`; `source = 'seed'` CHECK |
| Vacancy ownership today is `vacancies.company_id → companies`; no Auth owner | Same migration; D-026 |
| `publication_state` ∈ {`published`,`withdrawn`}; no `draft` | `vacancies_publication_state_chk` |
| `expires_at` is `NOT NULL` on vacancies | Column definition |
| Completed-candidate SELECT only for active published seed vacancies | `visible_seed_*` helpers; D-033 |
| Applications + submit RPC exist; matcher is TypeScript | Slice 3 migrations / loaders |
| D-034 Accepted — private + organisation employers; company only for org; no public exact addresses | `docs/10-decisions.md` |
| Verification + publication = Slice 5; applicant review = Slice 6 | `docs/13` |
| Preview isolation not configured; Production fallback was Slice 3 exception | `docs/27` |
| Messaging, billing, scraping, marketplace, ATS deferred | `NOT_NOW.md`; `docs/11-anti-goals.md` |

---

## Source-document gaps (report only)

These paths were requested in the Slice 4 planning brief but **do not exist** in
the repository (current tree or as canonical replacements under those names):

- `docs/01-product-brief.md` → use `docs/01-vision.md`
- `docs/05-user-flows.md` → use `docs/05-features.md`
- `docs/06-information-architecture.md` → use architecture routes in `docs/07-architecture.md`
- `docs/07-domain-model.md` → use MVP + architecture + terminology
- `docs/08-security-and-privacy.md` → use `docs/08-non-functional.md` + decisions
- `docs/09-technical-architecture.md` → use `docs/07-architecture.md`
- `docs/11-auth-and-roles.md` → use D-019–D-024, architecture, AGENTS.md
- `docs/12-data-and-retention.md` → retention still pending; Slice 8 owns export/deletion

AGENTS.md: do not invent replacements beyond citing the living documents above.

---

## Document tensions — open (require owner decisions)

### T1 — Exclusive role vs dual capability

| Source | Says |
|--------|------|
| Architecture | Shared `profiles` + separate candidate/employer profile tables |
| D-019 | Deferred shared `profiles` until employer role |
| Current code | Candidate-only; `ensureCandidateProfile` on every login |
| MVP | Distinct candidate and employer journeys |

**Open:** Can one Auth user hold both capabilities? Is shared `profiles.role`
needed, or are additive profile tables enough?

**Recommendation (Proposed D-047):** Additive `employer_profiles` (1:1
`auth.users`) beside `candidate_profiles`. Dual capability allowed. No exclusive
`profiles.role` trap. Shared `profiles` remains optional / deferred if additive
tables suffice.

### T2 — Company-required vacancies vs private employers

| Source | Says |
|--------|------|
| Current schema | `vacancies.company_id NOT NULL` |
| D-034 / MVP | Company profile only for organisation employers |
| Seed model | Fictional companies own Demo vacancies |

**Open:** Must every vacancy keep a company FK? How do private employers own
drafts?

**Recommendation (Proposed D-048 / D-050):** Employer profile owns vacancies.
`company_id` required only for organisation employers; null for private.
Seed vacancies remain `source = 'seed'` with existing company FK and no Auth
owner.

### T3 — “Structured draft” vs progressive save

| Source | Says |
|--------|------|
| `docs/13` Slice 4 includes | Salary, language, privacy-safe location, contract, shift, expiry, … |
| Exit criteria | Eligibility fields explicit before publish is possible later |
| UX reality | Employers need resume; incomplete drafts should persist |

**Open:** Which fields are mandatory on first save vs publish-ready?

**Recommendation (Proposed D-051):** Allow incomplete draft persistence with a
small create minimum. Maintain an explicit publish-readiness checklist used by
Slice 5; do not implement publish in Slice 4.

### T4 — Terminology “verified employer” vs unverified drafter

| Source | Says |
|--------|------|
| `docs/12-terminology.md` | Employer often framed as verified |
| Slice 4 / Slice 5 | Unverified employers may draft; only verified may publish |

**Open:** Copy language for unverified employer accounts.

**Recommendation:** Product copy may say “employer account” / “draft”; never
claim verified. Placeholder `verification_state = unverified` only. No badges.

### T5 — Language vocabulary conflict

| Source | Says |
|--------|------|
| D-029 Accepted | Vacancy German: `none` \| `basic` \| `conversational` \| `comfortable`; no fluent / CEFR |
| `docs/12-terminology.md` | Still mentions “Fluent German”, “English accepted” |

**Open:** Employer-facing labels must map to Accepted D-029 codes.

**Recommendation:** Database + matcher keep D-029. UI labels may be friendlier
but must persist Accepted codes. Free-text language requirements prohibited.

### T6 — Stale plan status vs Slice 3 Done

| Source | Says |
|--------|------|
| Parts of `docs/13` / older Slice 3 headers | Historical “implementation has not started” wording in Accepted notes |
| Dashboard / closure | Slice 3 Done |

**Resolution for this package:** Treat dashboard + `docs/27` as current delivery
status. Update dashboard / README / plan pointers in this PR to Slice 4
discovery without rewriting Accepted Slice 3 decision history.

### T7 — Exact address collection timing

| Source | Says |
|--------|------|
| D-034 / MVP | Exact private residential addresses must not be public; disclose later with consent |
| Features | Privately handled location evidence for verification |

**Open:** Collect exact address in Slice 4 drafts?

**Recommendation (Proposed D-051):** Do **not** collect exact residential address
in Slice 4. Store privacy-safe district/locality only. Exact address deferred to
Slice 5+ with authorization and consent design.

---

## Current capability inventory (repository facts)

### Auth and identity

1. Identity = Supabase Auth user UUID (`auth.users`).
2. Product profile = `candidate_profiles.id = auth.users.id` (1:1).
3. Profile creation = application `ensureCandidateProfile()` (D-024); no
   `auth.users` triggers.
4. No application role column; JWT `role = authenticated` is Supabase DB role.
5. One Auth user cannot be an employer today — employer tables absent.
6. Role exclusivity absent (nothing to exclusive).
7. Candidate onboarding and login assume candidate intent.

### Guards and completion

8. Proxy protects only `/candidate` and `/candidate/*` via `getClaims()`.
9. Completion gate = `candidate_profiles.onboarding_completed_at` (D-020).
10. Match/detail/apply loaders and vacancy SELECT helpers require completion.
11. Application confirmation does **not** require current completion
    (snapshot-backed).

### Companies and vacancies

12. Tables: `companies`, `vacancies`, `vacancy_language_requirements`.
13. Ownership: `vacancies.company_id → companies.id ON DELETE RESTRICT`.
14. Lifecycle: `publication_state` `published` \| `withdrawn`; expiry via
    `expires_at` comparison (no stored `expired`).
15. RLS: authenticated completed candidates SELECT active seed inventory only;
    no authenticated INSERT/UPDATE/DELETE.
16. Source: CHECK `source = 'seed'` only.
17. No employer-specific tables.
18. D-034 Accepted in `docs/10-decisions.md`; no schema yet.
19. Constraints use text + named CHECKs (no Postgres enums).
20. Applications use immutable jsonb snapshots + Auth-bound RPC insert.
21. Forms: Server Actions + Zod; RPCs for atomic completion/submit.
22. Authorization tests: candidate ownership / vacancy visibility / applications;
    **no** employer role tests.
23. Hosted proof: Preview isolation missing; prefer fix before Production
    fallback.

### Routes today

`/`, `/login`, `/register`, `/auth/error`, `/candidate`,
`/candidate/onboarding`, `/candidate/matches`,
`/candidate/jobs/[vacancyId]`, `/candidate/applications/[applicationId]`.

No employer routes.

---

## Proposed Slice 4 outcome (narrow)

**In scope**

- Employer account entry (register / sign-in to employer area)
- Employer type selection: `private` \| `organisation` (D-034)
- Private employer profile
- Organisation employer profile + company profile
- Employer onboarding completion distinct from candidate completion
- Employer-owned draft vacancies (`publication_state = draft`)
- Structured draft fields with save vs publish-ready distinction
- Safe resume / edit of own drafts
- Draft invisibility to anon, candidates, unrelated employers, matchers, apply
- Verification **placeholder** only (`unverified`); copy that publication needs
  verification later
- Candidate regression safety for Slice 1–3 surfaces and seed Demo inventory

**Out of scope (explicit)**

- Employer verification approval / rejection / evidence upload / badges
- Vacancy publication, pause, expire-as-product-action, fill
- Public or candidate visibility of drafts
- Applicant review / status changes (Slice 6)
- Messaging, interviews, offers, hire
- Admin moderation / billing / scraping / cold outreach / ratings
- Exact residential address collection or publication
- Team membership / multi-user organisations
- Multiple organisations per user (MVP)
- Employer → private type conversion (deferred)
- Automatic Production seeding of employer business data
- Slice 5 / Slice 6 implementation

---

## Alternatives analysis

### Account capability models

| Model | Benefits | Risks | Migration | Authz complexity | Slice 5/6 fit | Rec |
|-------|----------|-------|-----------|------------------|---------------|-----|
| **A. Exclusive `profiles.role`** | Simple mental model | Irreversible trap; blocks dual use; forces shared profiles now | High (new root table + backfill candidates) | Medium | Awkward if later dual-role needed | No |
| **B. Additive capability tables** | Matches D-019 deferral; no role trap; candidate path untouched | Landing page when both exist; two completion gates | Medium (`employer_profiles`) | Medium | Good — verification on employer profile | **Yes** |
| **C. Organisation membership model** | Future teams | Overbuilt for MVP; private employers awkward | High | High | Good later, heavy now | Defer |

**Recommended:** B — `employer_profiles` 1:1 `auth.users`; optional coexistence
with `candidate_profiles`; no exclusive role column in Slice 4.

### Employer ownership models

| Model | Benefits | Risks | Migration | Authz | Slice 5/6 | Rec |
|-------|----------|-------|-----------|-------|-----------|-----|
| **A. Vacancy → employer_profile** | Matches D-034 private/org; clear RLS owner | Need nullable `company_id` for private | Alter vacancies | Clear owner checks | Publish still owner-gated | **Yes** |
| **B. Vacancy → company only** | Matches current FK shape | Private employers need fake companies; fights D-034 | Keep NOT NULL company | Ownership via company→user join | Messy private verification | No |
| **C. Unified employer entity** | Abstraction | Extra table without MVP need | High | Indirection | Possible later | Defer |

**Recommended:** A — `vacancies.employer_profile_id` for employer-sourced rows;
`company_id` required iff organisation; seed rows keep company FK and null
employer owner.

### Draft persistence models

| Model | Benefits | Risks | Fit | Rec |
|-------|----------|-------|-----|-----|
| **A. Direct RLS writes** | Simple; matches onboarding group saves | Multi-table atomicity (vacancy + languages + company) harder | Fine for profile; risky for complex vacancy save | Partial |
| **B. SECURITY DEFINER RPC only** | Atomic; central policy | Heavier; overkill for every field edit | Good for publish later | Partial |
| **C. Hybrid Action + RLS/RPC** | Zod at edge; RLS ownership; RPC when multi-row atomicity needed | Need clear taxonomy | Matches Slice 1/3 patterns | **Yes** |

**Recommended:** C — Server Actions + Zod always; direct RLS for employer
profile / single-row draft updates where safe; Auth-bound RPC when creating
organisation profile+company atomically or replacing language requirements as
a set.

---

## Discovery questions → proposed answers

| # | Question | Proposed answer | Status |
|---|----------|-----------------|--------|
| Q1 | Dual candidate+employer on one Auth user? | Allowed | Requires owner decision |
| Q2 | `profiles.role` exclusive? | No — additive profiles | Recommended |
| Q3 | Existing candidate become employer? | Yes, via employer onboarding | Recommended |
| Q4 | Employer also keep candidate profile? | Yes, optional | Recommended |
| Q5 | Employer type changeable? | Immutable after first save in Slice 4 | Requires owner decision |
| Q6 | Private → organisation conversion? | Deferred | Deferred |
| Q7 | Multiple orgs per user? | No in MVP | Recommended |
| Q8 | Team membership? | Deferred | Deferred |
| Q9 | Separate employer completion? | Yes (`employer_profiles.onboarding_completed_at`) | Recommended |
| Q10 | Multi-role landing? | Explicit chooser at `/` or post-login when both exist; else role home | Requires owner decision |
| Q11 | Draft state value? | `publication_state = 'draft'` | Recommended |
| Q12 | Draft deletion? | Soft-withdraw or hard delete own drafts with no applications — prefer hard delete only while draft & no applications | Requires owner decision |
| Q13 | Auto-save? | Explicit Save sufficient | Recommended |
| Q14 | Exact address in Slice 4? | Do not collect | Recommended |
| Q15 | Salary on first save? | Not required; required for publish-ready | Recommended |
| Q16 | Hosted proof env? | Prefer isolated Preview; do **not** authorize Production in planning | Recommended |
| Q17 | Route segment `/employer/vacancies` vs `/employer/jobs`? | Prefer `vacancies` (schema alignment); architecture still says `jobs` | Requires owner decision |
| Q18 | Accept or revise D-046–D-054 as a package? | Pending owner review — all remain Proposed | Requires owner decision |

### Owner decisions still required (do not treat recommendations as Accepted)

1. Dual candidate/employer capability coexistence (Q1 / D-047)
2. Employer-type immutability after initial profile creation (Q5 / D-047)
3. Landing behaviour for accounts with both capabilities (Q10)
4. Whether draft deletion is included in Slice 4 (Q12 / D-050)
5. `/employer/vacancies` versus `/employer/jobs` (Q17 / D-053)
6. Acceptance or revision of D-046–D-054 as a package (Q18)

---

## Decision map (Proposed)

| ID | Topic | Status |
|----|-------|--------|
| D-046 | Slice 4 boundary | Proposed |
| D-047 | Employer account capability model | Proposed |
| D-048 | Private/org profiles and company ownership | Proposed |
| D-049 | Employer onboarding completion | Proposed |
| D-050 | Draft lifecycle, source, ownership, visibility | Proposed |
| D-051 | Draft fields, salary, location, language, expiry | Proposed |
| D-052 | Form / Action / RPC persistence boundary | Proposed |
| D-053 | Routes and RLS authorization matrix | Proposed |
| D-054 | Slice 4 hosted proof strategy | Proposed |

None of D-046–D-054 are Accepted. Implementation may begin only after owner
acceptance (or an Accepted subset covering PR 4.1 dependencies).

---

## Candidate regression protections (planning requirements)

Slice 4 must not break:

- Candidate register / login / onboarding / completion RPC
- `/candidate/matches`, job detail, submit RPC, confirmation snapshots
- Seed Demo fixtures (`source = seed`) and completed-candidate SELECT helpers
- Existing `published`/`withdrawn` + expiry visibility rules
- Matcher TypeScript eligibility/ordering
- Application uniqueness and historical snapshots
- Proxy candidate gate behaviour for candidate paths

Regression proof belongs in PR 4.5 (and continuous pgTAP/e2e).

---

## Stop rules

Stop and report if:

- owner rejects dual-capability or ownership recommendation;
- product docs require exact-address storage in Slice 4;
- publication or verification approval is pulled into Slice 4;
- seed vacancy visibility rules would need weakening to support drafts;
- Preview/Production hosted proof is demanded without isolation decision.

Do not implement migrations or employer UI in this package.

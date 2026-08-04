# Slice 4 Build Plan

> Planning artifact for the PR sequence.
> **Status:** Contracts Accepted 2026-08-03 (D-046–D-054). PR 4.1–4.4 Done.
> PR 4.5 implementation prepared (local exit proof + hosted readiness); not Done
> until merge. Hosted proof not executed. Production authorization not granted.
> Publication and verification not started. Slice 4 not complete.

**Outcome:** Employer registration → employer profile (private or organisation) →
structured private draft vacancy.

**Related:** `docs/28-slice-4-discovery.md`, `docs/30-slice-4-schema-and-journey-proposal.md`

---

## Principles

1. Ship vertical slices inside Slice 4 (schema+RLS+UI+tests per PR where safe).
2. Prefer the smallest model that avoids an irreversible role trap (D-047).
3. Preserve seed Demo inventory and all candidate Slice 1–3 behaviour.
4. No publication. No verification approval. No applicant review.
5. Draft ownership is database-enforced.
6. Caller never supplies owner IDs, verification state, source, or illegal
   lifecycle transitions.
7. Hosted proof prefers isolated Preview (D-054); Production not authorized by
   D-054.

---

## PR sequence (accepted)

### PR 4.1 — Employer identity, profiles, company ownership, RLS

**Intent:** Persist employer capability without breaking candidates.
**Status:** Done.

**Includes:**

- `employer_profiles` (1:1 `auth.users`)
- `employer_type` (`private` \| `organisation`) with D-048 locking invariant
  (changeable only while incomplete and no employer company/draft; completion
  locks; server/database rejects later changes)
- private vs organisation field subsets
- organisation → exactly one `companies` row owned by that employer
- extend `companies` for employer-owned rows (`source` allow `employer`; owner FK)
- keep seed companies `source = seed` without Auth owner
- employer completion column + validation rules (server-owned)
- atomic organisation/company bootstrap RPC when required
- pgTAP: structure, constraints, type-locking, RLS isolation, dual-capability
  coexistence
- generated types
- documentation synchronization

**Excludes:** Employer onboarding UI; employer vacancy/draft schema; vacancy
routes; draft forms; publication; verification approval; hosted migration
execution; Slice 5 or Slice 6.

**Exit:** Authenticated employer can own profile (+ company when org) under RLS;
candidates cannot read/write employer rows; anon denied; type-lock invariants
proven.

### PR 4.2 — Employer registration and onboarding UI

**Intent:** Enter employer area, choose type, complete profile, resume safely.
**Status:** Done.

**Includes:**

- `/employer/register` (or Accepted equivalent) + shared `/login?next=/employer`
- post-auth `ensureEmployerProfile` / type selection flow
- `/employer` home + `/employer/onboarding` groups
- proxy protection for `/employer/*`
- candidate-only authenticated users redirected with clear next step to start
  employer onboarding (no silent candidate-profile creation from employer
  routes)
- dual-capability navigation when both profiles exist (intent/`next` first;
  role-choice when no intent; no hidden default-role — D-047)
- Vitest + Playwright happy path for profile completion
- copy: no verified claims

**Excludes:** Vacancy forms; publish; verification upload.

**Exit:** Private and organisation employers can complete onboarding and land on
employer home; incomplete employers cannot reach vacancy create.

### PR 4.3 — Draft vacancy schema, language requirements, RLS

**Intent:** Persist employer drafts invisible to candidates/public.
**Status:** Done.

**Includes:**

- `publication_state` adds `draft`
- `source` adds `employer` (seed unchanged)
- `employer_profile_id` ownership for employer rows
- nullable `company_id` rules (required for org employers’ vacancies)
- structured columns per Accepted D-051 (salary, locality, workplace,
  frequency, description, etc.)
- `expires_at` nullable while draft
- language requirements writable for owned drafts
- scoped draft deletion per D-050
- visibility helpers: drafts excluded from `visible_seed_*` / matcher loaders /
  submit RPC vacancy gates
- pgTAP RLS matrix for draft isolation + delete rules
- generated types

**Excludes:** Publish transitions; UI forms (may stub types only).

**Exit:** Database proves draft SELECT/INSERT/UPDATE only for owner;
candidates/anon/unrelated employers see none; seed published behaviour intact.

### PR 4.4 — Draft vacancy create/edit journey

**Intent:** Save and resume structured drafts.
**Status:** Implementation prepared on `feat/slice-4-employer-vacancy-ui`
(local validation); not Done until merge.

**Includes:**

- `/employer/vacancies`, `/new`, `/[vacancyId]/edit`
- Server Actions + Zod; hybrid RLS/RPC per D-052
- create minimum vs publish-ready checklist UI (non-blocking for save)
- ownership denials → generic unavailable
- language requirement editor mapped to D-029 codes
- privacy warning for private-home workplace type
- “Verification required before publishing” informational copy (no publish
  control)
- Vitest action tests + Playwright draft journey

**Excludes:** Publish button that mutates to published; verification admin.

**Exit:** Employer creates/edits/resumes own draft; other actors denied;
candidate surfaces unchanged.

### PR 4.5 — Exit proof and hosted readiness

**Intent:** Prove Slice 4 exit criteria locally; prepare hosted runbook.

**Includes:**

- `pnpm proof:slice4` local orchestrator (fail-fast; environment-guarded)
- local migration inventory (`pnpm proof:migrations`)
- evidence matrix mapping exit criteria to existing employer + Slice 3 suites
  (no redundant focused E2E duplication)
- static security assertions (no service-role browser paths; no caller-owned
  ownership/source/publication)
- `docs/31-slice-4-exit-proof.md` + `docs/32-slice-4-hosted-proof-runbook.md`
- Preview-isolation prerequisite recorded; Production fallback **not**
  pre-authorized

**Excludes:** Running hosted/Production proof; creating hosted fixtures;
starting Slice 5; marking Slice 4 Done.

**Exit:** Local checklist green via `pnpm proof:slice4`; runbook ready; Slice 4
Done only after owner hosted proof under Accepted D-054 (+ new authorization if
Production).

---

## Sequence rationale

Splitting identity (4.1–4.2) from draft schema (4.3–4.4) avoids blocking UI on
large vacancy migrations and keeps seed RLS changes reviewable. Exit proof is
last, matching Slice 2/3 cadence.

Alternative considered: combine 4.1+4.3 into one schema PR — rejected as too
large for solo review and riskier for candidate regression.

---

## Local exit criteria (Slice 4)

Must all pass before claiming local readiness:

1. Private employer registers, completes profile, saves draft
2. Organisation employer registers, creates company, saves draft linked to
   company
3. Incomplete employer cannot create vacancy
4. Draft invisible to anon HTML and candidate match/detail/apply paths
5. Unrelated employer cannot SELECT/UPDATE/DELETE draft
6. Seed Demo matches/apply still work for completed candidates
7. No publish transition available in UI or allowed RPC/policy
8. No verification approval path
9. No exact residential address field collected
10. Salary/language/location publish-ready requirements are explicit in UI/docs
11. Dual-capability account (if Accepted) can reach both homes without role trap
12. pgTAP + Vitest + Playwright critical journey green
13. format / lint / typecheck / build green

---

## Hosted proof recommendation

- Prefer isolated Vercel Preview + isolated Supabase branch/project
- Treat current Preview sharing Production DB vars as a **blocker for preferred
  hosted proof**, not as authorization for Production
- Do not authorize Production hosted proof in this planning PR
- If owner later authorizes Production fallback, require explicit decision update
  (same discipline as D-045)

---

## Accessibility and content checklist

- Employer type selection: radiogroup with clear private vs organisation help
- Required/optional indicated per field; error summary + field errors
- Keyboard operable; focus moves to first error on failed save
- Privacy warning when workplace type is private home / residential
- Informational verification-before-publish notice — never “you are verified”
- No employer-response, hire, or public-visibility promises on draft screens

---

## Test plan summary

| Layer | Focus |
|-------|--------|
| Unit | Zod schemas; view resolvers; publish-ready derivation |
| Action/loader | Auth gates; ownership; dual-role redirects |
| pgTAP | Constraints; RLS matrix; seed regression; draft invisibility |
| Playwright | Private + org happy paths; denials; candidate regression |
| Static | No service-role client; no caller-controlled verification/source/owner |

---

## Slice 4 close checklist (planning)

- [x] D-046–D-054 Accepted (2026-08-03)
- [ ] PR 4.1–4.5 merged
- [ ] Local critical journey green
- [ ] Hosted proof recorded under Accepted D-054 strategy
- [ ] No publication / verification approval / applicant review shipped
- [ ] Dashboard: Slice 4 Done → Slice 5 planned separately

Do not mark Slice 4 Done from the decision-acceptance package.
Do not start PR 4.1 inside the decision-acceptance package.

# Slice 1 Build Plan

> Planning artifact only. No application code, migrations, or auth implementation lands here.
> **Status:** PR 1.1 in progress — D-018, D-019, D-020, D-023, and D-024 Accepted (2026-08-01).
> D-021 and D-022 remain Proposed (required before PR 1.2). Auth UI and onboarding UI are out of scope for PR 1.1.

**Outcome:** A candidate can register and persist the minimum essential onboarding information required to continue toward matching (`docs/13-implementation-plan.md`).

**Schema proposal:** `docs/17-slice-1-schema-proposal.md`
**Tracking:** `docs/14-founder-dashboard.md`

---

## Source of truth

| Doc | Role |
|-----|------|
| `docs/04-mvp.md` | Essential onboarding data sequence; auth “email or social”; exclusions |
| `docs/05-features.md` | Onboarding UX (one decision per screen, auto-save, resume, step motif) |
| `docs/07-architecture.md` | Stack, RLS direction; shared-profiles direction (narrowed for Slice 1 — see schema) |
| `docs/08-non-functional.md` | Privacy, security, a11y |
| `docs/12-terminology.md` | Work-authorisation declaration; candidate |
| `docs/13-implementation-plan.md` | Exit criteria |
| `docs/17-slice-1-schema-proposal.md` | Tables, RLS, completion model |
| `docs/10-decisions.md` | D-018/019/020/023/024 Accepted; D-021/022 still Proposed |
| `NOT_NOW.md` | Do not implement |

### Document tensions (not silently invented)

| Tension | Proposed resolution for Slice 1 |
|---------|----------------------------------|
| MVP “email **or** social” | Email/password only; social deferred (D-021) |
| Architecture shared `profiles` + role tables | Slice 1 uses `candidate_profiles` keyed to `auth.users` only (D-019); shared `profiles` when employer role lands |
| “Verification gates from Slice 0/1” | Candidate ownership only; employer/vacancy gates in Slices 4–5 |
| MVP “six-step” sequence | **Data groups** from MVP; UI may use six screens provisionally; schema/APIs are **not** named by step number |

---

## What Slice 1 is not

- Complete candidate profile or progressive fields (phone, CV, experience, introduction)
- Matching, vacancy feed, applications, employer discoverability
- Admin review, jobs, companies
- Social login, magic links, phone auth, passkeys, MFA
- Production-scale account tooling beyond register/verify/login/logout/session/resume
- Sentry, PostHog, MSW (unless a concrete test needs MSW later)

---

## Exit criteria

1. Candidate registers with email/password and obtains a session (with email-verification behaviour defined below).
2. Candidate persists all **required essential fields** (schema proposal traceability table).
3. Progress resumes after reload or re-login without data loss.
4. No CV or phone required.
5. Fields needed as Slice 2 matching inputs are stored (languages, German comfort, work-authorisation declaration, Berlin + travel minutes, categories, available-from, employment types, shifts).
6. Cross-user reads/writes denied (RLS + server checks).
7. CI green; Preview/Production remain deployable.

---

## Data requirements vs UI grouping

MVP lists an essential **sequence** of six information groups. That is a product sequence, not a database schema.

| Layer | Rule |
|-------|------|
| Data | Required fields in `docs/17`; completion from field validity + `onboarding_completed_at` |
| UI | Provisional grouping may follow the six MVP bullets (one decision per screen, step motif) |
| Schema / API | No `step_1` columns, no status tied to screen count; regrouping screens must not need a migration |

---

## Proposed PR sequence (four)

```text
PR 1.1 Schema + RLS
  -> PR 1.2 Authentication foundation
    -> PR 1.3 Registration + essential persistence UI
      -> PR 1.4 Resume, completion gate, critical journey
```

**Why four (kept after review):**

| PR | Single review concern | Deployable alone? |
|----|----------------------|-------------------|
| 1.1 | Data model + RLS | Yes — shell unchanged; validate with local Auth users + SQL/RLS tests, **no app UI** |
| 1.2 | Session security + Auth routes | Yes — register/login without onboarding forms |
| 1.3 | Onboarding product UX + writes | Yes — complete essentials; completion screen (no fake matches) |
| 1.4 | Resume/gate proof + E2E | Yes — closes Slice 1 exit criteria |

Schema before Auth remains justified: RLS is tested against Supabase Auth users without shipping application authentication. Not split only to hit “four.”

---

## Authentication scope

| Capability | Classification | Notes |
|------------|----------------|-------|
| Email + password registration | **Required for Slice 1 exit** | Proposed method (D-021) |
| Email verification | **Required for Slice 1 exit** | Supabase confirmation; see behaviour below |
| Login / logout | **Required for Slice 1 exit** | |
| SSR session cookies + refresh | **Required for Slice 1 exit** | Official `@supabase/ssr` + middleware/proxy as required by current Next.js guidance |
| Protected `/candidate/*` | **Required for Slice 1 exit** | Anonymous redirected |
| Onboarding resume when session restores | **Required for Slice 1 exit** | |
| Password recovery | **Required before pilot** — not Slice 1 exit | May ship in 1.2 if cheap; must not block exit if register/login/verify/resume work |
| Social / magic / phone / passkeys / MFA | **Deferred** | |

### Behaviour proposals (require acceptance with D-021 / D-022)

- **Duplicate email:** Auth uniqueness; avoid account enumeration in copy where practical.
- **Unverified users:** May authenticate per project config; must **not** set `onboarding_completed_at` until email is verified (if confirmation is enabled).
- **Redirects:** After auth, incomplete → next missing field group UI; complete → Slice 1 completion screen (matches are Slice 2).
- **Session expiry:** Supabase defaults; document refresh path in PR 1.2.
- **Row creation:** Idempotent app upsert of `candidate_profiles` after signup (D-024) — not silent.

---

## Onboarding completion (summary)

See `docs/17` for full model. Proposed: `onboarding_completed_at` null/non-null; server-only completion; UI steps non-authoritative.

---

## PR 1.1 — Schema and RLS

**Intent:** Land approved tables/policies; no product Auth UI.

**Status:** In progress (implementation branch).

**Includes:** Migrations for `docs/17`; RLS; column privileges for server-owned timestamps; constraint/RLS pgTAP tests with two local Auth users; local/CI `supabase test db`; generated `src/types/database.ts`.

**Excludes:** App Auth UI, onboarding UI, Auth triggers, hosted project secrets in repo, allow-list product values.

**Depends on:** D-019, D-020, D-023, D-024 Accepted in `docs/10-decisions.md`.

**Acceptance:** Migrations apply locally; no job/employer tables; cross-user isolation proven; server-owned columns not client-writable; `main` shell still builds; CI schema/RLS job green.

**Deploy:** Placeholders fine; no service-role in Vercel client env.

---

## PR 1.2 — Authentication foundation

**Intent:** Email/password session path without onboarding field forms.

**Includes:** Register, verify handling, login, logout, SSR cookies/refresh, route protection stubs, idempotent `candidate_profiles` creation, owner checklist for hosted Auth URLs.

**Excludes:** Essential-field forms; social providers; employer signup completion.

**Password recovery:** Prefer include if low cost; **not** an exit blocker (before-pilot).

**Depends on:** PR 1.1.

**Acceptance:** Register → verify (local Mailpit/Inbucket OK) → login → logout; session survives refresh; protected routes reject anon; no browser service-role.

**Owner actions before Preview Auth works:** D-022 checklist (hosted project, Vercel public keys, site URL, redirect URLs, confirmation policy).

---

## PR 1.3 — Registration entry and essential persistence

**Intent:** Persist all required essentials with durable auto-save.

**Includes:** Candidate registration entry; provisional multi-screen UI over MVP data groups; Zod + server mutations; progress from **server field state**; completion screen without match feed.

**Excludes:** Matching, jobs, CV/phone, employer flows.

**Depends on:** PR 1.2; approved allow-lists for categories/languages/etc.

**Acceptance:** All required fields persist without CV/phone; back navigation keeps values; completion only via server validation + verified email policy; accessible forms.

---

## PR 1.4 — Resume, gate, critical journey

**Intent:** Prove resume and Slice 1 exit with E2E.

**Includes:** Resume routing; incomplete ≠ Slice-2-ready; Playwright journey; docs/dashboard update only when criteria truly met.

**Excludes:** Seed vacancies, match algorithm.

**Depends on:** PR 1.3.

**Acceptance:** Exit criteria met; journey green (CI email strategy documented); shell smoke still passes.

---

## Testing layers

| Layer | PR | Focus |
|-------|-----|--------|
| Schema / RLS | 1.1 | Constraints; two-user isolation; anon deny |
| Unit | 1.2–1.4 | Validation; completion rules |
| Component | 1.3 | Forms, progress, errors, a11y |
| Integration | 1.2–1.4 | Session + DB writes |
| Playwright | 1.4 | Register → verify → persist → reload → resume/complete |

---

## Environment and owner actions

| Stage | Supabase | Public env | Email |
|-------|----------|------------|-------|
| Local | CLI | From `supabase status` | Inbucket/Mailpit |
| Unit/CI build | None / mocks | Scaffold placeholders | N/A |
| Preview Auth demo | **Hosted** (owner) | Vercel → hosted URL + publishable key | Confirmation policy + redirects |
| Production | Hosted | Vercel → hosted | Configured delivery |

**Repository-owner actions (no credentials in git):**

1. Create/select hosted Supabase project.
2. Set Vercel Preview/Production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Configure Auth site URL and redirect allow-list.
4. Decide email-confirmation behaviour for Preview vs Production.
5. Configure Production email delivery when leaving default limits.
6. Decide CI strategy for confirmation (test project vs local-only e2e).

No service-role key in Vercel for the candidate browser/auth flow unless a later approved server operation requires it.

**Timing:** Required before PR 1.2 Preview verification of real Auth (local 1.2 can use CLI). Placeholders remain OK for shell-only builds.

---

## Decision gates

| Before | Decisions |
|--------|-----------|
| PR 1.1 | D-018, D-019, D-020, D-023, D-024 — **Accepted** (2026-08-01); follow `docs/17` |
| PR 1.2 | D-021, D-022 — still **Proposed** (Auth method + hosted Supabase timing) |
| PR 1.3 | Allow-lists; German comfort labels; radius options — still Pending product approval |

---

## Privacy

Data minimisation to essentials; work-authorisation wording Pending legal/product review; no discoverability consent until employers can see candidates; retention Pending; deletion Slice 8. Not legal advice.

---

## Slice 1 close checklist

- [ ] PRs 1.1–1.4 merged
- [ ] Exit criteria on Auth-capable environment
- [ ] RLS + critical journey green
- [ ] No Slice 2 matching or `NOT_NOW.md` items shipped
- [ ] Dashboard: Slice 1 Done → Slice 2 planning

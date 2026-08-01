# Decision Log

This file records product and technical decisions that should not be repeatedly reopened without new evidence.

## D-001 — Brand name

**Decision:** Stint

**Reason:** Short, memorable, international, and compatible with the idea that each period of work is one step in a larger journey.

## D-002 — Core brand emotion

**Decision:** Seen

**Reason:** The company exists to help people be recognised for what they can contribute.

## D-003 — Product expression

**Decision:** One step closer.

**Reason:** It describes meaningful progress across onboarding, applying, interviewing, hiring, and longer-term work journeys.

## D-004 — Initial market

**Decision:** Berlin first.

**Reason:** The problem is concrete, locally understood, and can be validated through direct candidate and employer relationships.

## D-005 — Initial user focus

**Decision:** People legally allowed to work in Germany who have limited German.

**Reason:** Language and application-system barriers create a specific, actionable access problem.

## D-006 — Initial product model

**Decision:** Verified employment-access and recruitment platform.

**Rejected alternatives:** unrestricted scraping platform; Helpling-style general gig marketplace; staffing agency; payroll platform.

**Reason:** Lower legal and operational risk, clearer employer responsibility, and faster MVP validation.

## D-007 — Candidate data sourcing

**Decision:** Candidates register voluntarily. External candidate profiles are never scraped.

## D-008 — Job data priority

**Decision:** Employer submissions, manual curation, and permitted feeds precede controlled aggregation.

**Reason:** Freshness, permission, and trust are more important than volume.

## D-009 — AI presentation

**Decision:** AI remains invisible labour.

**Reason:** Users should interact with useful outcomes such as simplification, translation, and explanation rather than technology labels.

## D-010 — Visual palette

**Decision:** Preserve the restrained oxblood, warm-neutral, clay, and olive system.

**Reason:** It creates a differentiated calm-editorial identity and avoids generic SaaS colouring.

## D-011 — MVP architecture

**Decision:** One Next.js application on Vercel with Supabase for PostgreSQL, authentication, and storage.

**Reason:** Supports public SEO pages, authenticated dashboards, and rapid solo development without premature infrastructure complexity.

## D-012 — Matching

**Decision:** Explainable deterministic matching first.

**Reason:** Initial matching criteria are structured, and candidates should understand why a job appears.

## D-013 — CV requirement

**Decision:** CV is optional by default.

**Reason:** Candidates should receive value and apply based on a reusable profile unless a role genuinely requires a CV.

## D-014 — Development method

**Decision:** Build vertical slices.

**Reason:** Each stage remains deployable and testable, reducing front-end/back-end drift and incomplete feature surfaces.

## D-015 — Scope control

**Decision:** Product documentation and the MVP exclusion list are the source of truth. New scope requires explicit evidence and a recorded decision.

## D-016 — Device strategy

**Decision:** Stint is a responsive web application. Candidate flows are mobile-first. Employer and admin flows are desktop-first, with functional mobile fallback. Native mobile applications are deferred until post-beta evidence.

**Reason:** Candidates primarily use phones; employers and admins primarily work on desktop. One responsive web app covers both without delaying beta for native clients.

## D-017 — Design token baseline

**Decision:** Stint v1 uses a compact two-layer token system consisting of primitive tokens and semantic tokens. The approved baseline defines exact colour, typography, spacing, breakpoint, radius, border, elevation, interaction, motion, layering, and step-motif values. Components and page-level SCSS should consume semantic tokens wherever a semantic equivalent exists. Primitive colour values must not be repeated in component styles.

**Reason:** PR 0.2 must encode the approved visual direction without implementers inventing foundational values. A restrained token baseline preserves visual consistency, accessibility, responsive behaviour, and solo-founder implementation speed while avoiding a premature full component library.

**Constraints:**

- SCSS Modules and CSS custom properties remain required.
- SCSS variables are used for media-query breakpoints because CSS custom properties are not suitable for standard media-query declarations.
- Candidate surfaces remain mobile-first.
- Employer and admin surfaces remain desktop-first with functional narrow-screen fallback.
- The UI uses a system sans-serif stack in Slice 0; no web font is installed.
- Dark mode is not part of the v1 baseline.
- Status must never be communicated by colour alone.
- The token set may be expanded later only in response to an implemented product need.

Exact values live in `docs/06-design-system.md` under **V1 design token baseline**.

## D-018 — Slice 1 PR decomposition

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Slice 1 needs schema, Auth, onboarding UI, and journey proof without oversized PRs.

**Decision:** Four PRs — (1.1) schema + RLS, (1.2) Auth foundation, (1.3) registration + essential persistence UI, (1.4) resume/gate + E2E. Details: `docs/16-slice-1-build-plan.md`.

**Alternatives:** Three PRs (merge 1.3+1.4); five PRs (split registration from onboarding).

**Consequences:** Schema/RLS reviewable without UI; Auth reviewable without forms; exit proven in 1.4.

**Acceptance note:** Accepted for Slice 1 delivery. PR 1.1 (schema + RLS) complete. Authentication decisions D-021 and D-022 Accepted with PR 1.2 (2026-08-01).

## D-019 — Slice 1 minimum candidate schema

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Architecture describes shared `profiles` + role tables; Slice 1 only has candidates.

**Decision:** Two tables — `candidate_profiles` (1:1 `auth.users`) and `candidate_languages` (1:N). No shared `profiles`, no `candidate_preferences` misc table, no jobs/employers. See `docs/17-slice-1-schema-proposal.md`.

**Alternatives:** Keep shared `profiles` + `candidate_profiles` now; put languages in arrays on one table.

**Consequences:** Simpler Slice 1; shared `profiles` deferred until employer role (Slice 4) needs it — intentional narrowing, not a silent architecture override.

**Acceptance note:** Accepted as the Slice 1 schema boundary for PR 1.1 migrations. Allow-lists and Auth-related decisions remain separate.

## D-020 — Onboarding completion model

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Resume and Slice 2 gating need a durable server signal without a workflow engine.

**Decision:** `onboarding_completed_at timestamptz` (null = incomplete). Server-only completion after validating required fields. UI screen count is not authoritative. See `docs/17`.

**Alternatives:** Three-value status enum; compute completion only (no stored marker).

**Consequences:** Avoids client-writable status; clearing timestamp handles invalidation after edits.

**Acceptance note:** Accepted for the `candidate_profiles` completion column and server-controlled write path in PR 1.1+.

## D-021 — Slice 1 authentication method

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.2

**Context:** MVP allows email or social authentication.

**Decision:** Email/password via Supabase Auth for Slice 1 exit: registration, email verification, login, logout, SSR sessions (`src/proxy.ts` cookie refresh), protected `/candidate/*`. Password recovery classified **before pilot** (not PR 1.2 acceptance). Social/magic/phone/passkeys/MFA deferred.

**Alternatives:** Add social in Slice 1; require password recovery for exit.

**Consequences:** Smaller Auth surface; recovery should land before Berlin pilot even if after Slice 1 exit.

**Acceptance note:** Accepted with owner confirmation for PR 1.2. Incomplete-candidate recovery uses idempotent `candidate_profiles` creation (D-024).

## D-022 — Hosted Supabase timing for Auth

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.2 Preview verification

**Context:** Placeholders cannot exercise real Auth email/redirects.

**Decision:** Local CLI for development and CI; hosted Supabase for Preview/Production Auth. Vercel holds browser-safe URL + publishable key. Site URL `https://stint.company` with redirect allow-list for localhost, production, and Preview wildcard. No service-role in browser or ordinary SSR session paths. No credentials in git.

**Alternatives:** Delay all Auth Preview until later; use only local forever (blocks real Preview Auth).

**Consequences:** Preview/Production Auth demos use the hosted project; local and CI remain on CLI.

**Acceptance note:** Accepted after owner confirmed hosted project, migration apply, Vercel env, Site URL, redirects, and email confirmation.

## D-023 — Slice 1 RLS ownership model

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Candidate PII must not be readable cross-user.

**Decision:** Owner-only select/insert/update with `USING` + `WITH CHECK` (`auth.uid()`); ownership keys immutable; anon denied; no admin policies; completion timestamp not broadly client-writable. See `docs/17`.

**Alternatives:** Looser select for “public profiles” (rejected for Slice 1).

**Consequences:** Matches least-privilege; tests must prove isolation.

**Acceptance note:** Accepted as the RLS model for PR 1.1 policy migrations and tests.

## D-024 — Candidate row creation strategy

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.1

**Context:** Auth user can exist briefly without a candidate row.

**Decision:** Application-controlled idempotent upsert of `candidate_profiles` after signup / first authenticated load. Database triggers on `auth.users` deferred unless later evidence requires them.

**Alternatives:** Trigger-only creation on `auth.users` insert.

**Consequences:** Explicit errors and tests; implementers must handle idempotency; not left unspecified in PR 1.1.

**Acceptance note:** Accepted for Slice 1. PR 1.1 must not add an `auth.users` insert trigger. Application upsert behaviour is implemented with Auth in PR 1.2/1.3; partial Auth-without-row state must be handled explicitly there.

## D-025 — Slice 1 onboarding allow-lists

**Status:** Accepted
**Accepted:** 2026-08-01
**Must accept before:** PR 1.3

**Context:** Essential onboarding needs stable constrained values for German comfort, travel time, job categories, employment types, shifts, languages, and proficiency before forms and database checks ship.

**Decision:** Use product-owned allow-lists with stable stored codes and candidate-facing English labels:

- **German comfort:** `none`, `basic`, `conversational`, `comfortable` (self-reported; not CEFR; no `fluent` in v1).
- **Travel time:** integer minutes `15`, `30`, `45`, `60` (maximum one-way travel time; not geographic radius).
- **Job categories:** `cleaning`, `hospitality`, `logistics`, `warehousing`, `food_production`, `moving`, `retail` (no unrestricted other).
- **Employment types:** `full_time`, `part_time`, `mini_job`, `temporary`.
- **Shift preferences:** `morning`, `daytime`, `evening`, `night`, `weekend`, `flexible`.
- **Language proficiency:** `basic`, `conversational`, `proficient`, `native`.
- **Language codes:** BCP-47/ISO-style lowercase set including Berlin-relevant languages plus `other` (no free-text language name in this PR).

Central typed module in application code; database check constraints enforce the same sets. Empty arrays and null scalars remain valid during partial onboarding.

**Alternatives:** Lookup tables; free-text categories; CEFR scale for German comfort.

**Consequences:** PR 1.3 migration + UI share one vocabulary; expansion requires a later decision and migration.

**Acceptance note:** Accepted for PR 1.3 allow-list constraints and essential onboarding persistence.

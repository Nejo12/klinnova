# Founder Dashboard

Operating view for solo delivery. Update this file when the active slice changes or a milestone checkpoint is reached.

Product scope stays in `docs/04-mvp.md`. Delivery order stays in `docs/13-implementation-plan.md`. Ideas that are not current work go in `NOT_NOW.md`.

## Current focus

| Field | Value |
|-------|--------|
| Active milestone | M1 — Candidate matching shell |
| Active slice | Slice 2 — Onboarding to seeded matches |
| Slice status | PR 2.1 in progress — vacancy schema, RLS, local/CI fixtures |
| Next slice | Slice 3 — Job detail to submitted application |
| Blockers | None. Matching UI / matcher (PR 2.2+) not started. |

## Slice 2 delivery

| Artifact | Status |
|----------|--------|
| `docs/18`–`docs/20` / D-026–D-033 | Locked / Accepted |
| PR 2.1 — Vacancy schema, RLS, local/CI fixtures | In progress (this branch) |
| PR 2.2 — Pure matcher + server loader | Not started |
| PR 2.3 — `/candidate/matches` UI | Not started |
| PR 2.4 — Critical journey + hosted fixture procedure | Not started |

## Slice 1 closure (complete)

| Checkpoint | Status |
|------------|--------|
| PR 1.1 — Candidate schema and RLS | Complete (merged) |
| PR 1.2 — Auth foundation | Complete (merged; PR #21) |
| PR 1.3 — Essential onboarding | Complete (merged; PR #22) |
| PR 1.4 — Completion gate and exit proof | Complete (merged; PR #23) |
| Hosted migration `20260801160000_complete_candidate_onboarding.sql` | Applied; no pending remote migrations |
| Local CI (Quality + Schema/RLS/Auth/onboarding/completion) | Confirmed green on PR #23 |
| Hosted production smoke (register → persist → complete → invalidate → resume → re-complete) | Confirmed by repository owner |
| No Slice 2 matching / jobs / applications / employer UI | Confirmed |
| D-018–D-025 | Accepted |

## Slice 0 closure (complete)

| Checkpoint | Status |
|------------|--------|
| PR 0.1 — App shell and toolchain | Complete (merged) |
| PR 0.2 — Design tokens and responsive shell | Complete (merged) |
| PR 0.3 — Environment validation and Supabase scaffolding | Complete (merged) |
| PR 0.4 — Tests, CI, and deployment | Complete (merged; PR #17) |
| CI green (lint, typecheck, unit tests, build, e2e) | Confirmed |
| Vercel Preview and Production | Confirmed working by repository owner |
| Registration / onboarding product behaviour | Complete (Slice 1) |

## Solo cadence

1. Keep **one** active slice.
2. Work until that slice’s exit criteria are met, or park a blocker note here.
3. Open PRs that leave `main` deployable.
4. After merge, update this dashboard before starting the next slice.
5. Put tempting extras in `NOT_NOW.md` instead of expanding the slice.

Suggested rhythm:

- **Daily:** advance the active slice; do not open a second slice
- **End of slice:** verify exit criteria, merge, update this file
- **Weekly:** answer the guiding questions below

## Guiding questions

Ask every week:

1. Can a Berlin candidate take one clearer step toward work than last week?
2. Is the active slice still the highest-leverage unfinished journey step?
3. Did anything land in the product that belongs in `NOT_NOW.md`?
4. Are trust, privacy, and authorization still intact on `main`?
5. What is the smallest demo I can show with seeded data?

## Pilot scoreboard

Fill during M5. Do not use these targets to justify pre-pilot feature expansion.

| Metric | Target | Current |
|--------|--------|---------|
| Participating employers | 20 | 0 |
| Verified vacancies | 100 | 0 |
| Candidates | 200 | 0 |
| Interviews | 10 | 0 |
| Confirmed hires | 3 | 0 |

## Slice board

| Slice | Outcome | Status |
|-------|---------|--------|
| 0 Foundation | Deployable shell + CI | Done — PR 0.1–0.4 merged; CI green; Production confirmed |
| 1 Onboarding | Register → persisted essentials | Done — PR 1.1–1.4 merged (#21–#23); hosted migration + production smoke confirmed; D-018–D-025 Accepted |
| 2 Matches | Essentials → seeded explainable matches | In progress — PR 2.1 (schema/RLS/fixtures); matcher/UI not started |
| 3 Apply | Job detail → submitted application | Not started |
| 4 Employer draft | Register → draft vacancy | Not started |
| 5 Publish | Verification → public vacancy | Not started |
| 6 Review | Applicant review → status update | Not started |
| 7 Trust ops | Admin moderation → audit | Not started |
| 8 Deletion | Export/delete → confirmed removal | Not started |

## Decision discipline

Record product/architecture choices in `docs/10-decisions.md`. Do not invent resolutions when documents conflict — stop and report.

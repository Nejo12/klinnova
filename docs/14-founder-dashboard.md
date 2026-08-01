# Founder Dashboard

Operating view for solo delivery. Update this file when the active slice changes or a milestone checkpoint is reached.

Product scope stays in `docs/04-mvp.md`. Delivery order stays in `docs/13-implementation-plan.md`. Ideas that are not current work go in `NOT_NOW.md`.

## Current focus

| Field | Value |
|-------|--------|
| Active milestone | M1 — Candidate matching shell |
| Active slice | Slice 1 — Registration to persisted onboarding |
| Slice status | In progress — PR 1.1 (schema + RLS) in progress |
| Next slice | Slice 2 — Onboarding to seeded matches |
| Blockers | None for PR 1.1. D-021 and D-022 remain Proposed (required before PR 1.2). No Auth UI or onboarding UI yet. |

## Slice 0 closure (complete)

| Checkpoint | Status |
|------------|--------|
| PR 0.1 — App shell and toolchain | Complete (merged) |
| PR 0.2 — Design tokens and responsive shell | Complete (merged) |
| PR 0.3 — Environment validation and Supabase scaffolding | Complete (merged) |
| PR 0.4 — Tests, CI, and deployment | Complete (merged; PR #17) |
| CI green (lint, typecheck, unit tests, build, e2e) | Confirmed |
| Vercel Preview and Production | Confirmed working by repository owner |
| Registration / onboarding product behaviour | Not started (Slice 1) |

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
| 1 Onboarding | Register → persisted essentials | In progress — PR 1.1 schema/RLS; D-018/019/020/023/024 Accepted; D-021/022 Proposed |
| 2 Matches | Essentials → seeded explainable matches | Not started |
| 3 Apply | Job detail → submitted application | Not started |
| 4 Employer draft | Register → draft vacancy | Not started |
| 5 Publish | Verification → public vacancy | Not started |
| 6 Review | Applicant review → status update | Not started |
| 7 Trust ops | Admin moderation → audit | Not started |
| 8 Deletion | Export/delete → confirmed removal | Not started |

## Decision discipline

- MVP inclusions/exclusions: `docs/04-mvp.md`
- Settled decisions: `docs/10-decisions.md`
- Anti-goals: `docs/11-anti-goals.md`
- Deferred ideas: `NOT_NOW.md`
- Slice 1 plan: `docs/16-slice-1-build-plan.md`
- Slice 1 schema proposal: `docs/17-slice-1-schema-proposal.md`

New scope requires evidence plus a decision-log entry. Until then, it is not current work.

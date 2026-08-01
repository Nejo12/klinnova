# Founder Dashboard

Operating view for solo delivery. Update this file when the active slice changes or a milestone checkpoint is reached.

Product scope stays in `docs/04-mvp.md`. Delivery order stays in `docs/13-implementation-plan.md`. Ideas that are not current work go in `NOT_NOW.md`.

## Current focus

| Field | Value |
|-------|--------|
| Active milestone | M0 — Engineering foundation |
| Active slice | Slice 0 — Engineering foundation |
| Slice status | Planning — see `docs/15-slice-0-build-plan.md` |
| Next slice | Slice 1 — Registration to persisted onboarding |
| Blockers | None |

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
| 0 Foundation | Deployable shell + CI | Planning (`docs/15-slice-0-build-plan.md`) |
| 1 Onboarding | Register → persisted essentials | Not started |
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

New scope requires evidence plus a decision-log entry. Until then, it is not current work.

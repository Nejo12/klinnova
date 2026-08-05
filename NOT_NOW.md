# Not Now

Parking lot for ideas that are out of the current solo delivery focus.

This file does **not** change product scope. MVP scope remains `docs/04-mvp.md`. Anti-goals remain `docs/11-anti-goals.md`. Delivery order remains `docs/13-implementation-plan.md`.

## Rules

- Add temptations here instead of expanding the active slice.
- Do not implement items from this file while an MVP slice is open.
- Promote an item only with: pilot/user evidence, an update to the relevant product doc if scope changes, and a `docs/10-decisions.md` entry.
- “Useful someday” is not a reason to start now.

## Deferred until after Berlin beta evidence

These remain explicitly post-validation unless a recorded decision says otherwise:

- native mobile applications
- real-time chat / messaging
- public reviews and ratings
- payroll and payment processing
- on-demand worker booking
- AI-branded product surfaces
- complex recommendation models / vector search
- dedicated search infrastructure
- multi-city or nationwide rollout
- staffing-agency or temporary-employment operations
- employer subscriptions and billing
- freelancer marketplace classification
- video interviewing
- public candidate directory
- employer cold outreach without consent
- document verification for passports or residence permits
- unrestricted job scraping as a growth strategy

## Ideas inbox

Capture new non-urgent ideas below. Keep each line concrete.

<!-- Example:
- Employer bulk vacancy CSV import
- Candidate interview prep checklist content
-->

- Sentry error-monitoring scaffolding
- PostHog (or equivalent privacy-conscious product analytics) scaffolding

## Recently parked from active work

Use when something is removed from a slice to protect focus.

| Date | Idea | Why parked | Related slice |
|------|------|------------|---------------|
| 2026-08-01 | Sentry scaffolding | Not required for Slice 0 exit criteria; keep foundation PRs focused on deployability | Slice 0 |
| 2026-08-01 | PostHog / product analytics scaffolding | Not required for Slice 0 exit criteria; revisit when funnel measurement is needed | Slice 0 |
| 2026-08-05 | Employer verification document uploads (Storage) | Slice 5 Proposed path uses profile fields + attestation only (D-057); document vaulting pulls retention/GDPR forward | Slice 5 planning |
| 2026-08-05 | Full admin verification queue / moderation UI | Trust gate proposed via operator allow-list RPCs in Slice 5; full admin product remains Slice 7 | Slice 5 / 7 |
| 2026-08-05 | Verification / publish transactional email completeness | Core journey must work without email; Slice 7 owns completeness | Slice 5 / 7 |

# Not Now

Parking lot for ideas that are out of the current solo delivery focus.

This file does **not** change product scope. MVP scope remains `docs/04-mvp.md`. Anti-goals remain `docs/11-anti-goals.md`. Delivery/operating order remains `docs/13-implementation-plan.md`.

For M5, the founder-approved beta boundary is in `docs/49-m5-beta-transition-and-measurement.md`. A deferred capability may remain longer-term product intent while still being outside the initial Cohort A gate.

## Rules

- This is a governed parking lot, not a blanket feature freeze.
- Do not implement an item merely because D-M5-23 unfroze product development.
- Reclassify each idea as BUILD NOW, DESIGN / SPEC NOW, WAIT FOR BETA, or PARK / REJECT.
- BUILD NOW requires a bounded issue/work unit and explicit Founder approval.
- Promote evidence-gated or high-risk items only with the required evidence and an updated recorded decision.
- “Useful someday” is not a reason to start now.

## Evidence-gated or parked capabilities

These remain outside automatic implementation unless a recorded decision explicitly reclassifies them:

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
- sophisticated analytics dashboards
- PostHog / session replay

## Previously deferred from the initial M5 Cohort A gate

D-M5-6 kept these as product capabilities outside the initial private-beta entry gate. D-M5-23 removes the blanket freeze, but neither item is automatically BUILD NOW:

- optional CV upload / private candidate document Storage
- save and unsave jobs

Other accepted implementation narrowings remain authoritative until a separate decision reopens them, including travel-time sophistication and experience-based matching.

## Beta-readiness exception: minimal Sentry

General observability-platform expansion remains out of scope. D-M5-5 specifically promotes **minimal, privacy-conscious Sentry error monitoring** into M5 beta-readiness planning before Cohort A external traffic.

That promotion does **not** authorize:

- session replay;
- PostHog;
- broad product analytics;
- request-body/application-content capture;
- a general observability platform.

Exact Sentry retention/region/PII settings still require founder approval before implementation. See `docs/51-m5-operating-plan.md`.

## Ideas inbox

Capture new non-urgent ideas below. Keep each line concrete and evidence-linked where possible.

<!-- Example:
- Employer bulk vacancy CSV import — requested by 4 beta employers
- Candidate interview prep checklist — repeated candidate feedback
-->

## Recently parked from active work

| Date | Idea | Why parked | Related slice/phase |
|---|---|---|---|
| 2026-08-01 | Sentry scaffolding | Not required for Slice 0 exit; M5 later promoted only a minimal privacy-conscious error-monitoring subset under D-M5-5 | Slice 0 / M5 |
| 2026-08-01 | PostHog / product analytics scaffolding | Not required for Slice 0; M5 explicitly keeps PostHog/session replay deferred | Slice 0 / M5 |
| 2026-08-05 | Employer verification document uploads (Storage) | Slice 5 uses profile fields + attestation; document vaulting pulls retention/privacy complexity forward | Slice 5 |
| 2026-08-05 | Full admin verification queue / moderation UI | Trust gate initially narrowed; relevant operator moderation UI later delivered in Slice 7 | Slice 5 / 7 |
| 2026-08-05 | Verification / publish transactional email completeness | Core journey works without email; not promoted into Cohort A without evidence | Slice 5 / 7 / M5 |
| 2026-08-09 | Optional CV upload | Founder-approved D-M5-6: not required for initial Berlin private beta; reconsider only with beta evidence | M5 |
| 2026-08-09 | Save / unsave jobs | Founder-approved D-M5-6: not required for initial Berlin private beta; reconsider only with beta evidence | M5 |

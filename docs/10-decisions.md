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

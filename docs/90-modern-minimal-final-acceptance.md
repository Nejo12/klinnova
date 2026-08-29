# Modern Minimal final acceptance

**Baseline `origin/main`:** `f677979c0f9842a774bebe274a96fddcbba702ab`  
**Pass date:** 2026-08-29  
**Figma authority:** 24:1013 Cross-platform Design Review — Modern Minimal v1 (not edited). Figma MCP was not connected; review used this document, merged slice implementation, `docs/06-design-system.md`, local runtime, and existing Playwright IA/responsive specs.

## Implemented slices (merged, not reopened)

01 Candidate navigation + states  
02 Candidate Matches  
03 Job detail + Apply + Submitted  
04 Candidate Applications  
05 Employer navigation + Home  
06 Employer Applications  
07 Vacancies + Draft + Readiness  
08 Verification + Employer States  

Also merged: public job moderation/404 route fix (`get_effective_public_vacancy` remains the visibility boundary; `/jobs/[vacancyId]` must not use a route `loading.tsx`).

No product, matching, verification, vacancy-lifecycle, or application-transition semantics were changed in this pass.

## Final acceptance matrix

| Area | Status | Notes |
|---|---|---|
| Shared design language | PASS | Warm paper/cream, oxblood for primary/active/link; tokens in `src/styles/tokens.css`. |
| Candidate nav | PASS | Matches / Applications / Profile / Account; no hamburger; 360 grid; e2e overflow + keyboard. |
| Candidate Matches | PASS WITH DOCUMENTED DEVIATION | Runtime fields only; no fake salary/shift/why-fit. |
| Candidate Job Detail/Apply | PASS | Saved-profile apply; one H1; public vs candidate context preserved. |
| Candidate Applications | PASS | Active vs closed from code vocabulary; rail + empty recovery. |
| Employer nav | PASS | Two-tier explicit destinations; 390 continuity; e2e overflow + keyboard. |
| Employer Home | PASS | Dynamic name; unseen before verification; no duplicate draft-readiness section; no application counts. |
| Employer Applications | PASS | Needs review / Open / Decided from loaded data. |
| Applicant Detail | PASS | Essentials, history, server-allowed transitions; Hired separate. |
| Vacancies | PASS | Live = published+paused; Not live = draft+filled+expired+withdrawn. |
| Draft/readiness | PASS | Checklist-authoritative; draft create not blocked by verification. |
| Verification | PASS | Five states distinct; Berlin timestamps; restriction ≠ revoked. |
| Restricted states | PASS | Notices on affected actions; public hide via effective-public + HTTP 404. |
| Public jobs | PASS | Listing + detail; not-found copy; 404 without detail `loading.tsx`. |
| Loading | PASS WITH DOCUMENTED DEVIATION | Unknown fields skeletoned. Public detail has no skeleton (404). Employer applications list loading omits static header (capabilities unresolved); vacancies/verification loading include header. |
| Empty/error | PASS | Real recovery (e.g. Vacancies from empty applications). |
| Responsive | PASS WITH DOCUMENTED DEVIATION | Public listing live at 360–1440, no overflow. Candidate/employer nav e2e at 360/390/430 + desktop. P36 public + candidate width matrix passed. Employer-responsive screenshot spec and P36 employer-route matrix did not complete cleanly this pass (see follow-ups). |
| Accessibility | PASS | Focus-visible global; status as text; 44px token on primary controls; public “View job” aligned to `--touch-target-min` in this pass. No axe/pa11y package in repo (not added). |
| Reduced motion | PASS | Global `prefers-reduced-motion` in `globals.scss`; Pulse handoff respects reduce. |

## Intentional deviations (do not “fix”)

- Figma illustrative salary, shift, why-fit, application counts, and fake review reasons are omitted; runtime data wins.
- Public `/jobs/[vacancyId]` has no `loading.tsx` so `notFound()` can set HTTP 404.
- Listing loading lives under `src/app/jobs/(browse)/loading.tsx`, not `src/app/jobs/loading.tsx`.
- Demo/seed vacancies remain labelled as demo; no richer production demo dataset.

## Viewport evidence

Live local `next dev` on 2026-08-29 (DOM `scrollWidth` vs `clientWidth`; View job measured 44px tall at 360). Authenticated candidate/employer pixels were not re-walked logged-in in the browser; overflow/keyboard/touch-target e2e remain the evidence for those surfaces.

| Surface | Viewport | Overflow | Hierarchy | Actions | Nav |
|---|---|---|---|---|---|
| `/jobs` | 360, 390, 430, 1280, 1440 | No | One H1: Jobs in Berlin | View job 44px min-height | Brand + legal |
| `/jobs/:id` published | 360 | No | One H1: job title | Sign in 48px | Brand + Back to jobs |
| `/jobs/:id` unknown UUID | n/a | — | H1 Job not found | Browse open jobs | Brand |
| 200% CSS zoom | `/jobs` @ 1280 | No | H1 retained | View job remains | Header wraps |
| Candidate nav e2e | 360, 390, 430, desktop | No | — | — | Four destinations |
| Employer nav e2e | 360, 390, 430, desktop | No | — | — | Two-tier, no hamburger |

## Remaining non-blocking follow-ups

- Optional richer **local/test-only** demo fixture for visual regression (not production).
- Employer applications **list** loading chrome could include the same static header pattern as vacancies if a later loading pass wants IA continuity without inventing capability flags.
- Stale comment in `src/app/candidate/matches/loading.tsx` still mentions `src/app/jobs/loading.tsx`.
- `e2e/job-detail-journey.spec.ts` “Applied state” can land a blank `/candidate/matches` after “Back to matches” (document title set, no H1). Follow-up; not caused by this pass’s listing CSS.
- `e2e/employer-responsive-layout.spec.ts` can miss in-place “Draft changes saved.” after Save (known vacancy-draft `useActionState` pending quirk). Follow-up; use POST+reload in that spec if it is re-run for screenshots.
- P36 employer-route responsive spec can exceed 12 minutes waiting for “Manage” under delayed navigations. Follow-up; public + candidate P36 width matrix passed in this pass.

## This pass code change

Public listing “View job” uses `min-height: var(--touch-target-min)` so the primary card action matches the 44px touch-target rule (`docs/06-design-system.md`).

Applicant-detail Playwright helpers wait for the status-transition POST, reload (same pending-`useActionState` workaround as vacancy draft E2E), then assert the Review region. Allowed transitions are unchanged.

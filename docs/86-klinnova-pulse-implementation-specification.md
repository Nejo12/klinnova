# Klinnova Pulse — D2 implementation specification

Status: **DESIGN-TO-IMPLEMENTATION SPECIFICATION / NO PRODUCT CODE CHANGES**  
Date: 2026-08-26  
Governing design direction: `docs/85-klinnova-pulse-experience-motion-discovery.md`

## 1. Purpose

Translate the approved Klinnova Pulse experience direction into a bounded implementation plan against the current Klinnova codebase.

This document does **not** authorize implementation, dependency installation, Production changes, data changes, external-user activity, or a broad visual redesign.

The immediate implementation target after this specification is one vertical slice only:

> **candidate onboarding completion → Ready for matching → matching/results**

The purpose of that slice is to prove that Klinnova can feel like a living matching system without making the product slower, less trustworthy, or less accessible.

## 2. Approved experience model

Klinnova Pulse communicates state transformation through this product grammar:

> **fragmented → understood → connected → progressed**

The canonical motion verbs remain:

1. **Gather** — related pieces organize into one meaningful object.
2. **Resolve** — ambiguity becomes a confirmed state.
3. **Connect** — an already-known input is visibly linked to what it influences.
4. **Advance** — the same object/context moves into its next meaningful stage.
5. **Reveal** — a newly available result becomes visible.
6. **Settle** — movement stops and the state reads as complete.

### Candidate journey grammar

- Profile: `Gather → Resolve → Settle → Advance`
- Matching: `Connect → Reveal → Settle`
- Application: `Advance → Resolve → Settle`

Each moment should hand off semantically to the next rather than reading as an independent animation.

## 3. Three-stage model — correction locked

The first-run journey uses exactly three system stages:

1. **Understanding**
2. **Connecting**
3. **Progressing**

The candidate's decision is **not** a fourth system stage.

When matching results are visible and the candidate has not yet applied, the journey remains within **Connecting**. Contextual guidance may say, for example:

> `Tap Apply on a role that fits.`

**Progressing** begins only after the candidate chooses to apply.

This preserves the intended product principle:

- Klinnova understands;
- Klinnova connects;
- the candidate decides;
- Klinnova progresses that decision.

The stage rail is a first-run onboarding-to-matching continuity device only. It should not become permanent Matches-page decoration.

## 4. Refined Claude-Design reference

The refined design reference supplied on 2026-08-26 established the following approved behaviors:

- one consolidated first-run journey;
- a three-segment `Understanding → Connecting → Progressing` rail;
- calm unresolved profile fragments: single-column offsets, no rotation;
- a persistent `Matching on your profile` strip rather than discarding the completed profile;
- profile values/chips visibly becoming matching inputs;
- no fade-to-blank between profile completion and matching;
- results eventually expose an explicit decision affordance instead of leaving the journey caption empty;
- the application keeps the same vacancy identity as it changes into an application record;
- the same six motion verbs can later map to the employer lifecycle without designing that lifecycle yet.

The prototype's temporary internal `Deciding` label is explicitly superseded by §3 of this document.

## 5. Current codebase reality

### 5.1 Candidate onboarding

Current route:

- `src/app/candidate/onboarding/page.tsx`

Current major components:

- `src/components/onboarding/onboarding-progress.tsx`
- `src/components/onboarding/onboarding-review.tsx`
- `src/components/onboarding/onboarding-review-table.tsx`
- `src/components/onboarding/complete-onboarding-form.tsx`
- group-specific forms under `src/components/onboarding/`

The route loads persisted onboarding data server-side and determines a current group or `review` state.

The current completion UI already exposes the saved profile through `OnboardingReviewTable` before confirmation. This is the natural source object for the first Pulse `Gather/Resolve` moment; do not invent a parallel profile model just for animation.

`CompleteOnboardingForm` is a client component using `useActionState`. Its current pending state changes the button from `Confirm essentials` to `Confirming…`.

The authoritative completion mutation remains `complete_candidate_onboarding` in `completeOnboardingAction`. On success it currently redirects to `/candidate`; `/candidate` then resolves completed candidates to `/candidate/matches`.

**Invariant:** Pulse must not weaken or bypass server-controlled completion. `onboarding_completed_at` / the existing completion RPC remains authoritative.

### 5.2 Candidate home handoff

Current routing helper:

- `src/app/candidate/resolve-candidate-home.ts`

A completed candidate is redirected to `/candidate/matches`.

The D3 implementation may change the UX handoff path, but should preserve the same server truth and authorization model. Any direct completion-to-matches route should be a presentation/routing refinement, not a new completion mechanism.

### 5.3 Matches route

Current route:

- `src/app/candidate/matches/page.tsx`

Current data path:

- `loadCurrentCandidateMatchesPage(...)`
- `resolveMatchesPageView(...)`
- `CandidateMatchesPage`

Current component layer:

- `src/components/candidate-matches/candidate-matches-page.tsx`
- `match-list.tsx`
- `match-card.tsx`
- `match-reasons.tsx`
- `match-count.tsx`
- `matches-empty-state.tsx`
- `matches-error-state.tsx`
- `work-authorisation-notice.tsx`
- `candidate-matches.module.scss`

`CandidateMatchesPage` already receives real vacancies plus `applicationsByVacancyId`. Pulse should decorate/explain this real state rather than manufacture a second matching-result state machine.

### 5.4 Existing Matches loading state

Current file:

- `src/app/candidate/matches/loading.tsx`

It deliberately renders the real static heading/lead and skeletons only genuinely unknown match-card data. It also explicitly documents that the skeleton count is representative, not a claim about actual matches.

This truthfulness principle is governing for Pulse.

The D3 slice may evolve this loading presentation, but must preserve these constraints:

- no fake result counts;
- no fake match score;
- no animated claim that a dimension is being computationally evaluated unless that dimension genuinely participates in matching/readiness logic;
- on genuinely slow data, an unresolved state may hold; it must not loop progress indefinitely to imply work that is not occurring.

### 5.5 Job detail and application path

Current candidate job-detail route:

- `src/app/candidate/jobs/[vacancyId]/page.tsx`
- `src/app/candidate/jobs/[vacancyId]/actions.ts`
- `src/app/candidate/jobs/[vacancyId]/resolve-job-detail-view.ts`

The Apply Pulse is **not** part of D3. It is the next candidate slice after the profile-to-matching slice is accepted.

The future implementation must preserve the real vacancy identity and application state instead of resolving into animation-only success.

## 6. D3 vertical slice — exact scope

D3 should implement only the first signature continuity slice.

### 6.1 Entry condition

Candidate is on onboarding review with persisted essentials valid and not yet marked complete.

### 6.2 Authoritative completion

Candidate confirms essentials.

Existing RPC/server validation remains authoritative.

Pending UI may communicate the action, but must not declare readiness before the server has confirmed completion.

### 6.3 `Resolve` — Ready for matching

After successful server completion, show a short, truthful confirmed state:

**Primary:** `Ready for matching`  
**Supporting copy:** should explain that the saved profile can now be used to find matching vacancies without claiming AI or a percentage score.

This state must be textually available; motion is enhancement only.

### 6.4 `Advance` — profile becomes basis

The completed profile should transition into the matching context without a fade-to-empty screen.

Preferred continuity device from the approved design:

> **Matching on your profile**

The implementation should reuse real candidate profile attributes already available to the product. The strip is not a new source of truth.

### 6.5 `Connect` — real dimensions only

Only show dimensions that map to actual saved/matching inputs.

Candidate onboarding currently includes, among other persisted domains:

- language / German comfort;
- work-authorisation declaration;
- Berlin/travel radius;
- job categories;
- availability date;
- employment types;
- shift preferences.

D3 must inspect the actual matching loader/domain logic and use only dimensions that truly affect eligibility/matching/result presentation.

A design mock label such as `Permission`, `Mitte`, or `Part-time` is not automatically an implementation requirement. Product data/domain truth controls the final labels.

### 6.6 `Reveal → Settle` — results

Real result cards become available.

No artificial delay should be introduced to let the animation finish.

If data returns before the presentation sequence completes, the UI may finish a short interruptible transition; user input must be able to skip/advance it.

If data is slow, the UI should hold at the unresolved truthful state rather than loop fake progress.

When results are ready, the first-run guidance can read:

> `Tap Apply on a role that fits.`

The stage remains **Connecting** until a future Apply slice actually begins.

### 6.7 Empty result state

Zero vacancies must remain a valid result, not be presented as failed matching.

The Pulse empty state should explain that no suitable published opportunities are currently available, while preserving the existing product's ability to guide the candidate toward useful next actions.

Do not animate indefinite `searching` after the query has truthfully returned zero results.

## 7. First-run continuity state

A bounded first-run marker is likely required so the full three-stage rail/profile handoff runs after successful onboarding but ordinary later visits to `/candidate/matches` remain direct and efficient.

D3 implementation should choose the lightest reliable mechanism after code review. Candidate options include:

- route/search-state created by the successful completion handoff;
- short-lived client navigation state;
- another non-sensitive, non-authoritative presentation marker.

Avoid adding database schema solely to remember that an animation has played unless a stronger product reason emerges.

The marker must never affect eligibility, matching, authorization, or onboarding completion truth.

## 8. Motion-token baseline

Approved reference baseline:

- one easing curve: `cubic-bezier(0.2, 0.8, 0.2, 1)`;
- `Advance`: approximately 240ms / ~8px directional movement;
- `Reveal`: approximately 200ms / ~10px rise;
- `Settle`: approximately 160ms / ~3px correction, no overshoot;
- opacity + transform as default animated properties;
- complete signature sequences should stay short (reference target: <= ~1.6s where practical);
- user interaction may interrupt/skip the presentation.

These are starting tokens, not a reason to delay server/navigation work.

Implementation should centralize Pulse tokens instead of scattering arbitrary durations through unrelated SCSS files.

## 9. CSS/native vs dedicated motion library

Current package dependencies do not include a dedicated motion library.

### 9.1 Default decision

Start D3 with **CSS/native browser capabilities** if the continuity can be implemented cleanly with:

- opacity;
- transform;
- color/border/background transitions;
- CSS keyframes;
- React state/classes;
- `prefers-reduced-motion`.

### 9.2 Escalation criterion

A dedicated motion dependency may be proposed only if D3 demonstrates a concrete need for capabilities such as:

- shared-layout projection across structurally separate component trees;
- coordinated enter/exit presence that becomes brittle in native CSS;
- reliable interruption/reversal across route/component boundaries;
- maintaining object continuity that cannot be expressed cleanly without duplicating DOM/state.

Do not add a library because it is fashionable or because the prototype used animated transitions.

Any dependency addition requires a separate explicit implementation decision/PR scope.

## 10. Accessibility contract

Pulse must satisfy all of the following:

1. Essential state is always represented in DOM text/semantics, never motion alone.
2. `prefers-reduced-motion: reduce` gets an equivalent state transition without spatial choreography.
3. Readiness/result/application state changes use appropriate live/status semantics where announcement adds value; avoid noisy repeated announcements.
4. Focus is not stolen simply because an animation completes.
5. A route/context change that materially changes the task should leave focus/navigation behavior predictable.
6. No rapid flashing, looping pulse, or decorative continuous motion.
7. Interactive controls remain available as soon as the underlying operation permits.

Reduced-motion version of the D3 handoff:

- confirmation returns;
- text state immediately becomes `Ready for matching`;
- matching profile strip is present without spatial contraction;
- real result content appears without staged movement;
- semantic/contextual copy remains identical.

## 11. Performance contract

> **Pulse may animate presentation; it may never block work.**

Rules:

- never delay a server action to finish a motion sequence;
- never delay navigation/data rendering solely for choreography;
- prefer compositor-friendly transform/opacity;
- avoid blur/filter/large paint-heavy continuous effects;
- no scroll-jacking;
- no automatic viewport movement while the user's finger/pointer is acting;
- keep first implementation smooth on modest mobile hardware;
- sequences must be interruptible/skippable by meaningful user action.

## 12. Testing contract

### 12.1 Unit/component tests

Add tests for:

- first-run Pulse state vs ordinary subsequent Matches render;
- `Ready for matching` semantic state;
- persistent matching-profile strip content derived from real data;
- zero-results behavior;
- reduced-motion branch/contract;
- no fourth `Deciding` stage;
- failure paths preserve existing behavior.

### 12.2 Existing business/domain tests

Do not rewrite matching/onboarding domain tests to accommodate visuals. Existing completion, match eligibility, application ownership, publication-readiness and auth behavior remain authoritative.

### 12.3 E2E tests

Extend the existing onboarding/matches critical journey with semantic assertions such as:

- completion succeeds;
- `Ready for matching` is reachable after server confirmation;
- candidate reaches Matches;
- matching basis copy/strip is present in first-run mode;
- real results or truthful empty state resolves;
- ordinary Matches remains usable afterward.

Do **not** write E2E assertions such as `wait 240ms then expect transform(...)`.

Animation timing is not product truth.

## 13. Proposed implementation PR sequence

### PR D3-A — Pulse foundation

Small infrastructure-only implementation.

Candidate scope:

- centralized motion tokens / SCSS variables or mixins;
- reduced-motion foundation;
- minimal shared Pulse presentation primitives only if real reuse is demonstrated;
- no major route-flow change;
- tests for reduced-motion/token contract where practical.

No new motion dependency by default.

### PR D3-B — Profile → Matching vertical slice

Main proof slice.

Candidate files likely touched after final code review:

- `src/components/onboarding/complete-onboarding-form.tsx`
- `src/components/onboarding/onboarding-review.tsx`
- onboarding SCSS / a bounded Pulse component module;
- completion handoff/routing presentation;
- `src/app/candidate/matches/page.tsx`
- `src/app/candidate/matches/loading.tsx` only if required by the truthful first-run presentation;
- `src/components/candidate-matches/candidate-matches-page.tsx`
- new bounded `matching-profile-strip` / Pulse components if warranted;
- corresponding unit/component tests;
- onboarding/matches E2E coverage.

Do not modify matching algorithms merely to satisfy the animation design.

### PR D3-C — acceptance remediation

Only issues found during hands-on preview/mobile/accessibility acceptance.

No automatic scope expansion.

### Later — D4 Apply journey

Only after D3 is accepted:

`match/job detail → Apply → same opportunity becomes application journey`

### Later — D5 employer extension

Only after candidate Pulse grammar proves useful:

`vacancy draft → requirements resolved → publish → candidates connected → decision/outcome`

## 14. Acceptance criteria for D3

D3 is accepted only when all are true:

1. The handoff feels continuous rather than page-by-page.
2. Candidate can understand the flow without seeing animation.
3. No fake AI, score, progress, availability, or computation is implied.
4. No `Deciding` fourth stage exists.
5. The completed profile remains visibly meaningful as matching begins.
6. The system never artificially waits for choreography.
7. Reduced-motion mode is complete, not an afterthought.
8. Mobile interaction remains stable and responsive.
9. Existing onboarding/matching/auth correctness is preserved.
10. CI and relevant E2E suites are green.
11. Founder hands-on preview acceptance is obtained before broader Pulse rollout.

## 15. Explicit holds

Until separately authorized, this specification does **not** permit:

- Production deployment specifically for Pulse;
- broad redesign of candidate or employer areas;
- v0 revival;
- database/schema changes for motion state;
- fake matching scores/AI claims;
- new motion dependency without demonstrated need;
- Apply journey implementation;
- employer Pulse implementation;
- external beta/outreach activity;
- funding submission or provider outreach;
- Production Sentry activation.

## 16. Next action after merge

After this D2 specification is merged, begin **D3-A — Pulse foundation** as a tightly bounded code PR, then **D3-B — Profile → Matching vertical slice**.

Stop before every merge for Founder review.
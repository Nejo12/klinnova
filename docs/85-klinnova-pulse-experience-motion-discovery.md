# Klinnova Pulse — Experience & Motion Discovery

**Status:** D1 design exploration only — no implementation authorized

**Date:** 2026-08-26

**Authority:** Founder-approved experience/motion discovery track. This record defines a bounded visual-interaction direction for Klinnova. It does not authorize Production changes, package additions, dependency changes, broad redesign, v0 revival, data changes, external user activity, or implementation.

## 1. Core objective

Klinnova should feel like a **living matching system**, not a conventional job board made more decorative.

The experience objective is:

> Make Klinnova feel as though it understands, connects and progresses people and opportunities — while remaining fast, trustworthy, accessible and practical on ordinary devices.

The goal is not spectacle. The goal is product identity through motion, state changes, progression and purposeful feedback.

## 2. The Klinnova Pulse

**Klinnova Pulse** is the working name for the product's signature motion language.

It should express a consistent visual idea:

- fragmented information becomes organized;
- relevant attributes converge;
- opportunities and people move toward connection;
- waiting states feel active but honest;
- progress resolves into a clear outcome;
- transitions communicate state change rather than decorate it.

The Pulse does not need to be a literal pulsing icon. It is a reusable motion grammar.

Possible visual behaviors:

- gentle convergence of related elements;
- staged resolution from low-emphasis to high-confidence states;
- subtle directional flow between person/opportunity information;
- short shared-element transitions when an object changes state;
- controlled highlighting of match-relevant attributes;
- progressive reveal instead of abrupt replacement.

## 3. Design principles

### 3.1 Motion must communicate

Every animation should answer at least one question:

- What changed?
- Where did this object go?
- What is Klinnova doing?
- What did the user's action accomplish?
- What should the user notice next?

If an animation cannot answer one of those, it is likely decorative and should be removed.

### 3.2 Fast first

Motion must never make the app feel slower.

- short transitions;
- no blocking choreography;
- no delayed primary actions;
- no mandatory scroll sequences;
- no animation that prevents rapid repeat use.

### 3.3 Calm, not futuristic theatre

Avoid default SaaS "wow" patterns that quickly become generic:

- excessive glassmorphism;
- neon/glow everywhere;
- animated gradients as a substitute for interaction design;
- floating cards without functional meaning;
- constant parallax;
- large page-intro animations;
- celebration effects on routine actions.

### 3.4 Accessible by design

Any future implementation must support `prefers-reduced-motion` and preserve:

- keyboard use;
- focus visibility;
- readable contrast;
- screen-reader semantics;
- performance on lower-end mobile devices;
- clear non-motion status communication.

### 3.5 Existing product remains recognizable

D1 is not a new information architecture, brand redesign or replacement app.

The task is to identify the few interactions that make the current Klinnova experience feel unmistakably Klinnova.

## 4. First three prototype moments

These are the highest-priority concepts for external design exploration.

### A. Profile Becoming Alive

**Current functional moment:** candidate completes onboarding/profile setup.

**Desired feeling:** Klinnova has understood enough about the candidate to begin working for them.

Concept direction:

1. During onboarding, selected information contributes to a compact live profile representation.
2. Skills, availability, language, location and work preferences should feel like pieces of one emerging work profile rather than isolated form fields.
3. On completion, these pieces resolve into a coherent profile state.
4. The interface transitions from **setup mode** to **matching mode**.
5. The transition should feel meaningful but take only a moment.

Avoid:

- game-like XP/progress effects;
- confetti;
- overly anthropomorphic AI language;
- implying that unsupported AI inference has occurred.

### B. Klinnova Searching for Matches

**Current functional moment:** candidate waits for matches/jobs to load or sees matching results.

**Desired feeling:** Klinnova is purposefully evaluating relevant factors, not merely fetching a list.

Concept direction:

1. Replace generic spinner behavior with purposeful staged loading.
2. Use honest factors already supported by the product, such as location, availability, role requirements or profile readiness.
3. Show these factors resolving into a result state without inventing a fake AI process.
4. Reveal matched jobs progressively.
5. Match-relevant attributes may subtly highlight as each card settles.

The signature Pulse can appear here most clearly: information converges, resolves and produces opportunities.

Avoid:

- fake percentages;
- fabricated "AI is thinking" messaging;
- fake live scanning of employers;
- unnecessarily long loading animations.

### C. Apply → Application Journey

**Current functional moment:** candidate applies to a vacancy.

**Desired feeling:** something consequential has moved forward.

Concept direction:

1. User triggers Apply.
2. The vacancy retains visual continuity during submission.
3. On success, the job visibly changes state rather than disappearing behind a generic toast.
4. The opportunity transitions into the candidate's application journey/status context.
5. Confirmation text and next action become immediately clear.

The motion should communicate movement from **opportunity** → **active application**.

Avoid:

- slowing submission while animation plays;
- ambiguous state changes;
- celebratory treatment that suggests an employer decision has already occurred.

## 5. Secondary signature moments

After the first three prove the direction, explore:

1. employer vacancy publishing — draft becomes an active opportunity ready for matching;
2. employer verification — trust state becomes visible and persistent;
3. match/job-card reveal — staged but fast;
4. application status progression;
5. meaningful empty states;
6. success/waiting/error states;
7. landing → role-selection transition;
8. navigation continuity where shared context exists.

## 6. Empty/loading-state philosophy

Generic states such as `No Jobs`, indefinite spinners or blank placeholders weaken the product personality.

Future state design should distinguish:

- **loading** — data is being retrieved;
- **empty** — no relevant result exists right now;
- **not ready** — candidate/employer input is incomplete;
- **waiting** — a human/external process is pending;
- **success** — a user action completed;
- **error** — something failed and needs recovery.

Each state needs its own visual behavior and copy. Motion can reinforce the distinction but must never obscure it.

## 7. Motion vocabulary to explore

Claude-Design should explore a small coherent vocabulary rather than unrelated effects:

- **Gather** — scattered attributes move into a coherent unit.
- **Resolve** — uncertain/loading information settles into a final state.
- **Connect** — two relevant entities or concepts gain visual relationship.
- **Advance** — an item moves to its next workflow state.
- **Reveal** — meaningful results appear progressively.
- **Settle** — motion ends quickly in a stable, readable interface.

These names are conceptual, not implementation APIs.

## 8. Claude-Design exploration brief

### Primary instruction

Design interaction concepts for Klinnova using the existing product as the base.

The central idea is **Klinnova Pulse**: a calm signature motion language that makes the platform feel like a living matching system that understands, connects and progresses people and opportunities.

Do **not** redesign the whole application.

Do **not** produce a new design system or information architecture.

Do **not** optimize for visual spectacle.

Optimize for the feeling that:

> Klinnova understands, connects and progresses things.

### Prototype only these three moments first

1. Candidate onboarding completion → **Profile Becoming Alive**.
2. Matches loading → **Klinnova Searching for Matches** → job reveal.
3. Apply action → **Application Journey** transition.

For each prototype provide:

- starting UI state;
- intermediate motion/state sequence;
- final state;
- approximate timing/tempo;
- what the motion communicates;
- reduced-motion alternative;
- mobile behavior;
- any copy changes required;
- why the interaction feels specific to Klinnova rather than generic SaaS animation.

### Constraints

- preserve existing brand and product structure;
- practical for React/Next implementation;
- fast on ordinary mobile hardware;
- no fake AI/thinking/scanning claims;
- no motion dependency assumption yet;
- no long blocking transitions;
- no confetti or game mechanics;
- no glass/neon redesign;
- no animation merely because an element entered the viewport;
- preserve accessibility and `prefers-reduced-motion` semantics.

### Deliverable standard

The first exploration succeeds only if the three concepts make the product feel meaningfully less like a standard job-board/SaaS interface **without requiring a wholesale redesign**.

If a concept relies mainly on visual styling rather than interaction/state behavior, reject and try another direction.

## 9. Technical observation

The current repository does **not** include a dedicated motion library in `package.json` as of this discovery. Current application dependencies include Next.js, React, Supabase, Sentry and Zod, with Sass available for styling.

This is not a recommendation to add a library.

Implementation technology should be selected only after the interaction concepts are accepted. Some effects may be better implemented with CSS/native browser transitions; a motion library should be introduced only if its value is demonstrated.

## 10. D1 acceptance criteria

D1 design discovery is successful when:

- the Founder approves the Klinnova Pulse direction;
- at least the first three signature moments have concrete visual/interaction concepts;
- concepts preserve current product architecture;
- reduced-motion behavior is defined;
- no fake product intelligence is implied;
- implementation can be decomposed into bounded product work;
- the design feels more memorable without reducing task speed or trust.

## 11. Implementation boundary

Before any code implementation:

1. review Claude-Design concepts;
2. choose/reject each interaction independently;
3. map approved concepts to existing screens/components;
4. write a technical motion specification;
5. decide CSS/native motion vs any dependency;
6. define performance and accessibility tests;
7. implement behind a bounded branch/PR;
8. Founder reviews before merge.

No implementation is authorized by D1 alone.

## 12. Current decision

**Klinnova Pulse is the approved working experience direction for exploration.**

The first design experiment is deliberately small:

- Profile Becoming Alive;
- Klinnova Searching for Matches;
- Apply → Application Journey.

The goal is to prove a distinctive interaction language before expanding it across the product.
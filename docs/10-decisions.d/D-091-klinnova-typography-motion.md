# D-091 — Klinnova typography and motion future direction

**Status:** Accepted

**Accepted:** 2026-08-13

**Implementation status:** FOUNDER APPROVED — DESIGN DIRECTION LOCKED. REPOSITORY IMPLEMENTATION NOT AUTHORIZED.

**Context:** Klinnova's current implemented design-token baseline remains D-017 in `docs/06-design-system.md`. The founder has reviewed and approved the current **Klinnova Typography Refinement** and **Klinnova Motion System** as the future refinement/superseding direction. This approval records design intent only; it does not authorize typography, motion, CSS, token, component, route, dependency, or hosted-environment implementation.

**Decision:** Treat typography and motion as one coherent Klinnova experience:

**Quiet confidence + Calm continuity**

## Typography — Quiet confidence

The approved typography direction is:

- Apple/system-inspired typographic discipline, without copying Apple;
- system-native-first font strategy;
- Apple platforms naturally use their native system typography through the system stack;
- cross-platform fallbacks remain native and appropriate;
- no bundling or redistribution of Apple SF Pro as a Klinnova webfont;
- lighter visual hierarchy primarily through size, spacing and restrained weight rather than excessive boldness;
- regular / medium / semibold form the principal weight hierarchy;
- essential/body text must not become excessively thin;
- mobile readability and accessibility take precedence over aesthetic thinness.

The approved **Klinnova Typography Refinement** is a refinement/superseding specification for Klinnova typography, not merely visual inspiration.

## Motion — Calm continuity

Motion must communicate state, continuity, hierarchy or feedback; it must not exist merely as decoration.

Approved constraints:

- no springs or overshoot as the default Klinnova motion language;
- no parallax;
- no scroll-jacking;
- no bouncing navigation;
- no continuous decorative animation;
- no gratuitous route transitions;
- no animation that delays interaction or navigation;
- submission-success treatment may be more expressive, but remains restrained and purposeful;
- route-transition scope stays narrow, preferring list → detail transitions rather than general page animation;
- reduced-motion behavior is mandatory and should preferably be centralized architecturally.

Approved motion timing hierarchy:

```text
instant     80ms
fast        160ms
standard    240ms
deliberate  380ms
```

The **240ms standard duration is founder-approved**.

The approved **Klinnova Motion System** is the future motion-system specification.

## Relationship to D-017

D-017 remains the **current implemented/runtime token baseline** until a separately authorized migration is reviewed and completed. This decision does not silently rewrite the historical D-017 values and does not make the current runtime implementation incorrect merely because the future direction is now approved.

When implementation is eventually authorized, the approved Klinnova typography/motion direction supersedes the relevant D-017 typography/motion direction for the migrated surfaces. Exact implementation tokens remain subject to the required discovery and founder review below.

## Required development gate

Future Development work is split into two separately bounded stages.

### KDS-TM1 — Typography + Motion Architecture Discovery

Read-only investigation only. It must inspect:

- existing typography implementation and token locations;
- current font-loading strategy;
- existing font-size, weight, line-height and letter-spacing values;
- hard-coded transition and animation values;
- existing motion primitives;
- current `prefers-reduced-motion` handling;
- loading-state architecture;
- modal, drawer and sheet transitions;
- form-validation transitions;
- candidate navigation transitions;
- application/status feedback;
- route/list → detail transition feasibility;
- focus-management implications;
- accessibility implications;
- likely migration blast radius.

Required output:

current state → gaps → proposed token architecture → components/primitives affected → migration strategy → accessibility strategy → test strategy → blast radius → smallest safe implementation sequencing.

KDS-TM1 performs **no implementation** and requires separate founder authorization before it begins.

### KDS-TM2 — Typography + Motion Implementation

KDS-TM2 may begin only after founder review and explicit authorization of KDS-TM1.

Expected implementation principle:

central design tokens first → shared primitives → bounded product surfaces → responsive/accessibility validation → reduced-motion verification → regression testing.

Completion of KDS-TM1 does not automatically authorize KDS-TM2. Merging documentation that records D-091 does not authorize either stage.

## Execution placement

KDS-TM is a separate Klinnova design-system track, not K2A/K2B and not a reopening or renumbering of completed K0–K5 units. It does not alter the durable M5 sequence in `docs/53-m5.1-beta-readiness-closure.md`.

Unit H remains the current execution focus. KDS-TM work must not block, interrupt or silently expand Unit H. After Unit H, KDS-TM1 may be separately authorized before or alongside Unit I if useful. Only a genuine accessibility/readiness dependency discovered during KDS-TM1 may be brought into Unit I through explicit founder review; the wider typography/motion refinement does not automatically become an M5 readiness requirement.

## Source artifacts

The approved source artifacts are the current supplied files:

- `Klinnova Typography Refinement.html`
- `Klinnova Motion System (1).html`

They are not yet persisted in the repository. Their approved design content must not be reconstructed or altered unnecessarily. Preferred repository paths are:

- `docs/design-artifacts/klinnova/klinnova-typography-refinement.html`
- `docs/design-artifacts/klinnova/klinnova-motion-system.html`

Until an exact file-preserving import path is available, the supplied original artifacts remain the authoritative visual source and this decision record preserves the approved direction and authorization boundary.

## Decision-log integration note

This file is an append-only D-091 fragment created because the available repository connector cannot safely append to the 172KB `docs/10-decisions.md` without replacing the entire file. It is **not a competing roadmap or independent decision namespace**. The next ordinary repository edit path that can preserve the full central decision log byte-for-byte should append this exact D-091 record to `docs/10-decisions.md` and then remove this fragment in the same change, without changing D-091's meaning or identifier.

**Acceptance note:** Founder approved the typography and motion future direction and this documentation-only persistence structure on 2026-08-13. No runtime implementation, KDS-TM1 discovery, KDS-TM2 implementation, Unit I work, K6 work, hosted configuration, or Production change is authorized by this decision.
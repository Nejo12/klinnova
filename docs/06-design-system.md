# Design System

## Brand foundation

- **Core emotion:** Seen
- **Product experience:** Progress
- **Human outcome:** Dignity
- **Tagline:** One step closer.

## Visual principle

The system should feel calm, editorial, restrained, human, and trustworthy. It should not resemble a generic blue SaaS product or a loud gig-work marketplace.

## Step motif

The step path is the primary visual and behavioural motif.

Use it for:

- app icon and favicon
- onboarding progress
- loading states
- application status
- profile progress
- empty states
- milestone acknowledgement

Do not use it as decorative filler.

## Colour direction

The v1 palette uses one disciplined accent family:

- deep oxblood as the primary brand colour
- warm paper and cream backgrounds
- clay for warm secondary emphasis
- muted olive for restrained supportive states
- high-contrast near-black text

Do not introduce unrelated blue, purple, teal, or bright green accents without a validated accessibility or product need.

Semantic states may use tuned variants of the existing palette, provided status is never communicated by colour alone.

## Typography

- serif wordmark may remain exclusive to the logo
- product UI uses a highly readable sans-serif
- maintain generous line height
- use clear hierarchy without excessive font sizes or weights
- body text must remain readable on small mobile screens

## Device strategy

Stint is a responsive web application. Candidate flows are mobile-first. Employer and admin flows are desktop-first, with functional mobile fallback. Native mobile applications are deferred until post-beta evidence.

## Layout and spacing

- candidate flows: mobile-first
- employer and admin flows: desktop-first, with functional mobile fallback
- generous whitespace
- restrained use of borders
- minimal shadows
- clear grouping through spacing before decoration
- touch targets of at least 44 by 44 CSS pixels
- cards should contain only decision-relevant information

## Components required for MVP

- button
- text input
- textarea
- select or combobox
- checkbox
- radio group
- chips and selectable cards
- progress indicator
- alert and inline validation
- modal or dialog
- drawer for mobile filters
- job card
- employer badge
- language badge
- application timeline
- empty state
- loading step path
- navigation header
- mobile bottom navigation where justified

## Job-card hierarchy

Prioritise:

1. job title
2. salary
3. language requirement
4. location or travel information
5. shift and contract
6. employer and verification
7. freshness

## Motion

Motion should communicate progress and state change.

- one measured step at a time
- no celebratory explosion or excessive bounce
- respect reduced-motion preferences
- loading marker may travel along the step path
- status changes may advance the step marker

## Voice and microcopy

Use plain, respectful, direct language.

Prefer:

- Let's start with what you can do.
- Applications do not need a CV to start.
- This job accepts English.
- One step closer.
- This one was not the right fit. Keep moving.

Avoid:

- unskilled worker
- low-skilled candidate
- AI-powered
- perfect match
- guaranteed job
- rejection language that implies personal inadequacy

## Accessibility

- WCAG 2.2 AA target
- visible keyboard focus
- semantic HTML
- screen-reader labels
- sufficient contrast
- colour-independent state communication
- reduced-motion support
- error messages linked to fields
- accessible dialogs, menus, and listboxes

## V1 design token baseline

Approved exact values for Slice 0 PR 0.2 and later product UI. Recorded as decision **D-017**. Colour direction above remains the narrative guide; this section is the implementable source of truth.

Stint v1 uses a compact two-layer token system:

- **Primitive tokens** define raw values.
- **Semantic tokens** map primitives to product meaning.

Components and page-level SCSS should consume semantic tokens wherever a semantic equivalent exists. Primitive colour values must not be repeated in component styles.

### 1. Primitive colours

```css
--color-oxblood-900: #4F121E;
--color-oxblood-800: #601824;
--color-oxblood-700: #6F1D2C;
--color-oxblood-600: #853044;
--color-oxblood-100: #F2E4E7;

--color-paper: #F7F1E7;
--color-cream: #FFFDF8;

--color-clay-700: #8A4C39;
--color-clay-500: #B56F55;
--color-clay-100: #F3E4DD;

--color-olive-800: #3F4935;
--color-olive-600: #66705A;
--color-olive-100: #E8EBE2;

--color-ink-900: #211A1B;
--color-ink-700: #4E4547;
--color-ink-500: #746B6D;

--color-line: #D8D0C5;
--color-line-strong: #B8ADA1;
--color-white: #FFFFFF;
```

### 2. Semantic colours

```css
--color-bg-page: var(--color-paper);
--color-bg-surface: var(--color-cream);
--color-bg-subtle: #F1EBE1;
--color-bg-inverse: var(--color-ink-900);

--color-text-primary: var(--color-ink-900);
--color-text-secondary: var(--color-ink-700);
--color-text-muted: var(--color-ink-500);
--color-text-inverse: var(--color-white);
--color-text-link: var(--color-oxblood-700);

--color-border-default: var(--color-line);
--color-border-strong: var(--color-line-strong);

--color-action-primary: var(--color-oxblood-700);
--color-action-primary-hover: var(--color-oxblood-600);
--color-action-primary-active: var(--color-oxblood-900);
--color-action-primary-text: var(--color-white);
--color-action-subtle: var(--color-oxblood-100);

--color-accent-warm: var(--color-clay-500);
--color-accent-warm-strong: var(--color-clay-700);
--color-accent-warm-subtle: var(--color-clay-100);

--color-support: var(--color-olive-600);
--color-support-strong: var(--color-olive-800);
--color-support-subtle: var(--color-olive-100);

--color-focus-ring: var(--color-oxblood-700);
--color-selection-bg: var(--color-oxblood-100);
--color-selection-text: var(--color-ink-900);
```

### 3. Initial status colours

```css
--color-status-info: var(--color-ink-700);
--color-status-info-bg: #EEEAE4;
--color-status-success: var(--color-olive-800);
--color-status-success-bg: var(--color-olive-100);
--color-status-warning: var(--color-clay-700);
--color-status-warning-bg: var(--color-clay-100);
--color-status-danger: var(--color-oxblood-700);
--color-status-danger-bg: var(--color-oxblood-100);
```

Status components must include text, an icon, or another non-colour signal. Status must never be communicated by colour alone.

### 4. Font families

```css
--font-family-ui:
  Inter,
  ui-sans-serif,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;

--font-family-mono:
  "SFMono-Regular",
  Consolas,
  "Liberation Mono",
  monospace;
```

Product UI remains sans-serif. PR 0.2 must not download, bundle, or add Inter as a dependency. Inter is only the first optional installed-font entry in the system stack. No web font is installed in Slice 0.

### 5. Font weights

```css
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### 6. Type scale

```css
--font-size-xs: 0.75rem;
--line-height-xs: 1rem;

--font-size-sm: 0.875rem;
--line-height-sm: 1.25rem;

--font-size-md: 1rem;
--line-height-md: 1.5rem;

--font-size-lg: 1.125rem;
--line-height-lg: 1.75rem;

--font-size-xl: 1.375rem;
--line-height-xl: 1.875rem;

--font-size-2xl: 1.75rem;
--line-height-2xl: 2.25rem;

--font-size-3xl: 2.25rem;
--line-height-3xl: 2.75rem;

--font-size-4xl: 3rem;
--line-height-4xl: 3.5rem;

--letter-spacing-tight: -0.02em;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.04em;
```

### 7. Spacing

```css
--space-0: 0;
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
--space-12: 3rem;
--space-16: 4rem;
--space-20: 5rem;
--space-24: 6rem;

--layout-gutter-mobile: var(--space-4);
--layout-gutter-tablet: var(--space-6);
--layout-gutter-desktop: var(--space-8);
--layout-section-gap: var(--space-16);
--layout-content-max: 75rem;
--layout-reading-max: 42rem;
```

### 8. SCSS breakpoints

Use SCSS variables for media-query breakpoints. CSS custom properties are not suitable for standard media-query declarations.

```scss
$breakpoint-sm: 30rem;
$breakpoint-md: 48rem;
$breakpoint-lg: 64rem;
$breakpoint-xl: 80rem;
```

Rules:

- Candidate surfaces use the narrow/mobile layout as the default.
- Candidate layout enhancements may begin at the medium breakpoint.
- Employer and admin surfaces retain a functional narrow fallback.
- Their intended desktop layout begins at the large breakpoint.
- Breakpoints should respond to content pressure, not device brand names.
- Do not create separate mobile and desktop component trees.

### 9. Radius, border, and elevation

```css
--radius-sm: 0.375rem;
--radius-md: 0.625rem;
--radius-lg: 1rem;
--radius-pill: 999px;

--border-width-default: 1px;
--border-width-strong: 2px;

--shadow-sm: 0 1px 2px rgb(33 26 27 / 0.06);
--shadow-md:
  0 8px 24px rgb(33 26 27 / 0.08),
  0 2px 6px rgb(33 26 27 / 0.04);
```

Spacing and borders establish grouping before shadows. Standard shell cards use at most the small shadow. The medium shadow is reserved for overlays or clearly raised surfaces.

### 10. Interaction and accessibility

```css
--control-height-sm: 2.75rem;
--control-height-md: 3rem;
--touch-target-min: 2.75rem;
--focus-ring-width: 3px;
--focus-ring-offset: 3px;
--opacity-disabled: 0.48;
```

Use `:focus-visible` for keyboard focus. Do not remove outlines without an accessible replacement. Interactive targets must meet at least `--touch-target-min` (2.75rem / 44 CSS px at the default root size).

### 11. Motion

```css
--duration-instant: 80ms;
--duration-fast: 140ms;
--duration-normal: 220ms;
--duration-slow: 360ms;

--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-enter: cubic-bezier(0, 0, 0.2, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

Reduced-motion mode removes non-essential travel, looping, and smooth scrolling while preserving visible state changes.

### 12. Layering

```css
--z-base: 0;
--z-sticky: 100;
--z-dropdown: 200;
--z-overlay: 300;
--z-modal: 400;
--z-toast: 500;
```

### 13. Step motif

```css
--step-size: 0.625rem;
--step-line-width: 2px;
--step-gap: var(--space-2);
--step-color-complete: var(--color-oxblood-700);
--step-color-current: var(--color-clay-500);
--step-color-upcoming: var(--color-line-strong);
```

The step motif communicates progression. It is not decorative filler.

### 14. Consumption rules

- Declare global CSS custom properties centrally during PR 0.2.
- Components and page SCSS consume semantic tokens whenever an appropriate semantic token exists.
- Primitive tokens may be used to define semantic aliases and controlled design-system internals.
- Do not repeat raw hexadecimal colours in component or page modules.
- Do not create tokens speculatively.
- Dark mode is deferred.
- The full MVP component library remains outside this decision and outside PR 0.2.

## Klinnova typography and motion refinement — founder-approved future direction

**Status:** FOUNDER APPROVED — DESIGN DIRECTION LOCKED. **REPOSITORY IMPLEMENTATION NOT AUTHORIZED.**

This section records a Klinnova refinement/superseding specification for future typography and motion implementation. It does not change the currently implemented D-017 token baseline above, does not authorize edits to application code or styles, and does not start design-system discovery or implementation.

The coherent experience principle is:

**Quiet confidence + Calm continuity**

### Typography — Quiet confidence

The approved direction is:

- use Apple/system-inspired typographic discipline without copying Apple;
- use a system-native-first font strategy;
- Apple platforms should naturally use their native system typography through the system stack;
- cross-platform fallbacks remain native and appropriate to their platforms;
- do not bundle or redistribute Apple SF Pro as a Klinnova webfont;
- create hierarchy primarily through size, spacing and restrained weight rather than excessive boldness;
- regular / medium / semibold form the principal weight hierarchy;
- avoid excessively thin essential or body text;
- mobile readability and accessibility take precedence over aesthetic thinness.

The approved **Klinnova Typography Refinement** artifact is a refinement/superseding specification, not merely visual inspiration. Until separately authorized implementation occurs, the existing typography tokens and runtime remain unchanged.

### Motion — Calm continuity

Motion must communicate state, continuity, hierarchy or feedback. Motion must not exist merely as decoration.

Approved constraints:

- no springs or overshoot as the default Klinnova motion language;
- no parallax;
- no scroll-jacking;
- no bouncing navigation;
- no continuous decorative animation;
- no gratuitous route transitions;
- no animation that delays interaction or navigation;
- submission-success treatment may be more expressive, but must remain restrained and purposeful;
- route-transition scope remains narrow, with list → detail transitions preferred rather than general page animation;
- reduced-motion behavior is mandatory and should preferably be centralized architecturally.

Approved motion hierarchy:

```text
instant     80ms
fast        160ms
standard    240ms
deliberate  380ms
```

The **240ms standard duration is founder-approved**.

The approved **Klinnova Motion System** artifact is the future motion-system source specification. Until separately authorized implementation occurs, the existing D-017 motion tokens and runtime remain unchanged.

### Required implementation gate

Future work is split into two separately bounded stages.

**KDS-TM1 — Typography + Motion Architecture Discovery** is read-only. It must investigate:

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

Its output must be:

current state → gaps → proposed token architecture → affected components/primitives → migration strategy → accessibility strategy → test strategy → blast radius → smallest safe implementation sequencing.

KDS-TM1 performs **no implementation**.

**KDS-TM2 — Typography + Motion Implementation** may begin only after founder review and explicit authorization of KDS-TM1. Its expected sequencing is:

central design tokens first → shared primitives → bounded product surfaces → responsive/accessibility validation → reduced-motion verification → regression testing.

Recording or merging this documentation does **not** authorize KDS-TM1 or KDS-TM2. Completion of KDS-TM1 does not automatically authorize KDS-TM2.

### Source-artifact preservation status

The founder-approved source artifacts are the current files named:

- `Klinnova Typography Refinement.html`
- `Klinnova Motion System (1).html`

At the time of this documentation update, they are **not yet persisted in the repository**. Their approved design content must not be reconstructed or altered unnecessarily. The preferred eventual repository locations remain:

- `docs/design-artifacts/klinnova/klinnova-typography-refinement.html`
- `docs/design-artifacts/klinnova/klinnova-motion-system.html`

Until those exact artifacts are imported through a binary-safe/file-preserving repository path, this section and D-091 preserve the approved decision and implementation boundary, while the supplied original artifacts remain the authoritative visual source.

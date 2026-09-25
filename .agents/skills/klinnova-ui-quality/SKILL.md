---
name: klinnova-ui-quality
description: Apply Klinnova-specific design quality checks when designing, reviewing, or refining candidate, employer, operator, or public UI. Use for UI briefs, audits, Figma proposals, and scoped interface changes.
---

# Klinnova UI quality

## Establish the brief

Identify the surface, audience, product task, approved Figma reference, brand/design-system constraints, and trust, accessibility, and privacy constraints before proposing visual changes. Do not default to familiar AI-generated aesthetics.

Follow this precedence: (1) Founder-approved decisions and current GitHub product truth; (2) approved Figma; (3) Nova-UI; (4) Klinnova tokens and existing SCSS/component conventions; (5) accessibility, privacy, security, and legal constraints; (6) this skill. Never use this skill to override a higher authority.

## Match the surface

For onboarding, applications, employer workflows, moderation, accounts/settings, metrics, and internal tools, prioritize usability, accessibility, predictability, task completion, information hierarchy, and approved product semantics. Public, marketing, and editorial surfaces may be more expressive when the approved brand and Figma support it.

Treat reflexive purple/blue gradients, generic glassmorphism, equal-card repetition without content justification, decorative controls, fake product screenshots, placeholder-only labels, gratuitous badges, needless motion, and every-section-as-card layouts as signals to inspect, not universal bans. Make each visual choice serve the brief.

## Audit and refine

For redesign or refinement, inspect the current design and implementation, identify concrete weaknesses, propose targeted fixes, and preserve working behavior and approved semantics. Do not start from a blank redesign by default.

Keep React/Next.js, strict TypeScript, SCSS Modules, Klinnova tokens, Nova-UI, current icons/fonts, and component architecture. Do not add Tailwind, Motion/GSAP, another design system, icon family, font, or component library merely to follow generic advice.

For forms, retain persistent explicit labels, semantic groups, useful support text, field-associated errors, keyboard operation, visible focus, touch-safe controls, and pending/disabled/error semantics. Never use placeholders as the only labels.

Use motion only to support understanding or feedback; respect `prefers-reduced-motion`. Do not add decorative motion to operational workflows without approval. Meet current Klinnova responsiveness and accessibility standards: no horizontal overflow; preserve semantic HTML and keyboard/focus behavior.

For meaningful unresolved UI/UX work, follow research/specification → Figma → Founder approval → implementation. If a recommendation exceeds the approved PR scope, stop and report it.

Adapted from selected principles of the MIT-licensed [TasteSkill/redesign-skill project](https://github.com/Leonxlnx/taste-skill). This is a Klinnova-specific derivative rule set, not a vendored upstream skill.

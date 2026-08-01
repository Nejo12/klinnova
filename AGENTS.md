# Stint Agent Instructions

Solo-founder workflow. One active vertical slice at a time. Product docs define scope; this file defines how to work.

## Source of truth

Read before proposing or implementing work:

1. `docs/04-mvp.md` — scope boundary
2. `docs/13-implementation-plan.md` — slice order and exit criteria
3. `docs/14-founder-dashboard.md` — current focus
4. `NOT_NOW.md` — deferred ideas (do not implement)
5. Active slice build plan when present (e.g. `docs/15-slice-0-build-plan.md` for Slice 0)
6. Supporting docs as needed: vision, principles, features, design system, architecture, non-functional, anti-goals, terminology

When documents conflict, stop and report the conflict. Do not invent a resolution.

## Working mode

- Plan the active slice, then edit.
- Ship vertical slices (UI + data + authz + tests), not layered micro-tasks.
- Keep one open slice; finish or park it before starting another.
- Prefer the simplest implementation that meets the slice exit criteria.
- Do not redesign product, brand, architecture, or terminology unless asked.
- Do not implement items in `NOT_NOW.md` or other deferred scope.
- Do not add dependencies without explaining why the current stack is insufficient.
- Do not create speculative abstractions or agent personas.

## Engineering rules

- Strict TypeScript; no `any`.
- Absolute imports; lowercase directories; one React component per file; minimal barrels.
- Server Components by default; Client Components only for required interactivity.
- SCSS Modules and CSS custom properties; no Tailwind.
- Semantic HTML and accessible primitives.
- Responsive web only: candidate flows mobile-first; employer and admin flows desktop-first with functional mobile fallback. No native apps until post-beta evidence.
- Validate external input with Zod.
- Authorize server-side and via Supabase RLS; never trust client-supplied role, ownership, verification, or application status.
- Keep candidate documents private; expose only via short-lived signed URLs.

## Tests

Vitest, Testing Library, MSW, and Playwright for critical journeys.

Require tests for: authorization, onboarding persistence, matching rules, application uniqueness, employer verification gates, vacancy publication state, candidate document privacy, account deletion.

## Product language

- Plain, respectful, concise candidate copy.
- Never define people by what they lack.
- Use `candidate`, `employer`, `vacancy` / `job`, `application`, and `match` per `docs/12-terminology.md`.
- Frame automation as outcomes, not AI features.
- Every interaction should reduce uncertainty or move someone one step closer.

## Definition of done

A slice (or PR) is done only when:

- slice exit criteria / acceptance criteria are met
- lint, type-check, relevant tests, and production build pass
- accessibility, security, and privacy implications were checked
- docs updated when necessary
- `main` remains deployable
- no unrelated changes

## Review checklist

Before merge, scan: product scope, UI quality, data integrity/authz, accessibility, privacy, edge cases, deployability.

Repository rules in this file take priority over generic agent workflows.

# Stint Agent Instructions

## Source of truth

Before proposing or implementing work, read:

1. `README.md`
2. `docs/01-vision.md`
3. `docs/02-principles.md`
4. `docs/04-mvp.md`
5. `docs/05-features.md`
6. `docs/06-design-system.md`
7. `docs/07-architecture.md`
8. `docs/08-non-functional.md`
9. `docs/11-anti-goals.md`
10. `docs/12-terminology.md`
11. `docs/13-implementation-plan.md`

When documents conflict, stop and report the conflict. Do not silently invent a resolution.

## Working mode

- Plan before editing.
- State assumptions explicitly.
- Keep changes scoped to the assigned issue.
- Prefer the simplest implementation satisfying the acceptance criteria.
- Do not introduce dependencies without explaining why existing platform capabilities are insufficient.
- Do not redesign the product, brand, architecture, or terminology unless the issue explicitly requests it.
- Do not implement deferred features.
- Do not create speculative abstractions for hypothetical future requirements.

## Engineering rules

- Use strict TypeScript. Do not use `any`.
- Use absolute imports.
- Keep one React component per file unless a tightly coupled private helper is trivial.
- Use lowercase directory names.
- Minimize barrel files.
- Prefer Server Components by default in Next.js.
- Use Client Components only where browser interactivity requires them.
- Use semantic HTML and accessible primitives.
- Use SCSS Modules and shared CSS custom properties; do not introduce Tailwind.
- Validate external input with Zod.
- Enforce authorization server-side and through Supabase Row Level Security.
- Never trust client-supplied role, ownership, verification, or application-status values.
- Keep candidate documents private and expose them only through short-lived signed access.

## Tests

Use:

- Vitest for unit tests
- Testing Library for components
- MSW for network boundaries
- Playwright for critical end-to-end journeys

Every business-critical change requires tests. Prioritize:

- authorization
- onboarding persistence
- matching rules
- application uniqueness
- employer verification gates
- vacancy publication state
- candidate document privacy
- account deletion

## Product and language rules

- Candidate-facing copy must be plain, respectful, and concise.
- Never define users by what they lack.
- Prefer `candidate`, `employer`, `vacancy`, `application`, and `match` as defined in `docs/12-terminology.md`.
- AI assistance must be framed as an outcome, not advertised as an AI feature.
- Every visible interaction should either reduce uncertainty or move the user one step closer.

## Definition of done

A task is complete only when:

- acceptance criteria are satisfied
- lint and type-check pass
- relevant automated tests pass
- production build succeeds
- accessibility implications were checked
- security and privacy implications were checked
- documentation was updated where necessary
- no unrelated changes are included

## Review perspectives

Use specialist perspectives as review checklists, not as autonomous competing architectures:

- product: scope and user value
- frontend: component boundaries and interaction quality
- backend: data integrity and authorization
- accessibility: keyboard, semantics, focus, labels, and contrast
- security/privacy: least privilege, private data, validation, abuse paths
- QA: edge cases and regression coverage
- operations: logs, failure recovery, and deployability

Do not create a separate collection of vague agent personas or reusable “superpowers” before a real repeated workflow justifies them. Repository-specific rules in this file take priority.
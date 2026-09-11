# Klinnova Agent Instructions

Klinnova is the public product and brand name. This repository may retain historical `stint` paths, package names, project names, domains, migrations, and documentation; do not rename them indiscriminately.

## Source Of Truth

- GitHub `main` after merge is authoritative for repository state.
- Durable approved plans, decision records, and closure documents are authoritative for scoped work.
- Current execution/readiness state lives in `docs/14-founder-dashboard.md` and especially `docs/53-m5.1-beta-readiness-closure.md` when later execution evidence supersedes older summaries.
- Before proposing or changing code, read the relevant current plan plus `docs/04-mvp.md`, `docs/13-implementation-plan.md`, `docs/14-founder-dashboard.md`, and `NOT_NOW.md`.
- When evidence conflicts and no document defines precedence, stop and report the conflict instead of inventing a resolution.

## Founder-Controlled Workflow

Default workflow for substantial changes:

1. Discovery/proposal.
2. Founder review.
3. Explicit implementation authorization for that exact scope.
4. Implementation.
5. Local verification.
6. Branch review.
7. Push only when authorized.
8. PR only when authorized.
9. Exact-head CI and hosted proof where applicable.
10. Stop before merge.
11. Founder manually approves and performs the merge.
12. Post-merge verification.

Never merge automatically. Never infer Founder approval from a prior task, a plan, a branch name, or a nearby conversation.

For coding-agent execution, follow `docs/agent/workflow.md`. Codex/Work should normally receive implementation-ready tasks only; discovery, unresolved product/schema/architecture decisions, and CI diagnosis stay in Chat unless the task explicitly requires agent investigation.

## Scope Discipline

- Do not implement deferred work from `NOT_NOW.md` or superseded/historical plans.
- Do not continue interrupted work unless the current task explicitly authorizes it.
- Do not silently widen scope, add product semantics, add statuses, alter pricing, change workflows, or make legal/compliance claims.
- Do not perform unrelated cleanup, refactors, dependency changes, or design-system rewrites.
- Preserve existing product truth unless an approved plan explicitly changes it.

## Git Safety

Without explicit authorization: no `reset --hard`, destructive clean, force push, branch deletion, history rewrite, merge, release/tag, or destructive stash/drop behavior.

Preserve interrupted and in-progress work. If the worktree is dirty, identify the dirty files before editing and avoid unrelated changes.

## External Systems

No Production, Preview, database, hosting, email, domain, GitHub, Vercel, Supabase, Sentry, Figma, or other external-service mutation unless the specific task explicitly authorizes that system and action.

Repository edits do not imply hosted-configuration authorization.

## Engineering Rules

- Strict TypeScript; no `any`.
- Absolute imports; lowercase directories; one React component per file; minimal barrels.
- Server Components by default; Client Components only for required interactivity.
- SCSS Modules and existing Klinnova/Stint design tokens; no Tailwind.
- Semantic HTML and accessible primitives.
- Responsive web only: candidate flows mobile-first; employer/admin flows desktop-first with functional mobile fallback.
- Validate external input with Zod.
- Authorize server-side and through Supabase RLS; never trust client-supplied role, ownership, verification, or application status.
- Keep candidate documents private; expose only through approved short-lived signed URLs.

## Product Language

- Use plain, respectful, concise candidate copy.
- Never define people by what they lack.
- Use `candidate`, `employer`, `vacancy` / `job`, `application`, and `match` according to `docs/12-terminology.md`.
- Frame automation as outcomes, not AI features.

## Verification

Use the smallest relevant local test loop during iteration. Vitest, Testing Library, MSW, and Playwright cover critical journeys. Before PR/final verification, run the plan-required checks. Do not weaken or delete tests to get green output.

Required scrutiny: authorization, onboarding persistence, matching rules, application uniqueness, employer verification gates, vacancy publication state, candidate document privacy, account deletion, accessibility, privacy, deployability, and no unrelated changes.

## Agent Support

Repository-specific Codex setup lives in `docs/agent/`. Use project-local Klinnova skills from `.agents/skills` when their trigger matches the task. Keep this file compact; put repeatable workflow detail in skills or `docs/agent/`.

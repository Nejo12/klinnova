---
name: klinnova-discovery
description: "Research Klinnova repository state, durable plans, and constraints before implementation. Use for discovery, audits, proposals, planning, or explicit 'do not implement' tasks."
---

# Klinnova Discovery

Use this skill for read-only investigation before product work.

## Workflow

- Verify `pwd`, branch, `git status --short`, HEAD, base/remote state, and any protected in-progress work before drawing conclusions.
- Read `AGENTS.md`, the relevant current plan, `docs/04-mvp.md`, `docs/13-implementation-plan.md`, `docs/14-founder-dashboard.md`, `docs/53-m5.1-beta-readiness-closure.md` when readiness state matters, and `NOT_NOW.md`.
- Inspect implementation reality with source reads and `rg`; do not rely on historical plans when code or later closure docs supersede them.
- Separate known facts, assumptions, unresolved decisions, conflicts, and recommended next steps.
- Do not modify product code, migrations, tests, hosted configuration, or external systems during discovery.
- If asked for a plan, produce a bounded implementation or verification plan with explicit non-goals, required approvals, and stop conditions.
- Stop before implementation unless the user explicitly authorizes the exact implementation scope after discovery.

Report stale Stint/Klinnova naming carefully: public product identity is Klinnova, but internal/historical `stint` identifiers may intentionally remain.

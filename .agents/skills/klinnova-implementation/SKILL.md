---
name: klinnova-implementation
description: "Execute an explicitly approved Klinnova implementation plan. Use only when the user authorizes implementation of a bounded plan or unit."
---

# Klinnova Implementation

Use this skill only after explicit implementation authorization for the current scope.

## Workflow

- Verify branch, base, `git status --short`, HEAD, and any in-progress protected work before editing.
- Read `AGENTS.md`, `docs/agent/governance.md`, the approved plan/decision record, and any closure or proposal documents the plan names.
- Implement only the approved tasks. Do not add product semantics, schema, statuses, pricing, legal language, hosted changes, or adjacent cleanup.
- Prefer the repository's existing patterns: strict TypeScript, Server Components by default, SCSS Modules, existing design tokens, server-side authorization, and Supabase RLS.
- Use focused test/fix loops during implementation; broaden verification when touching shared auth, RLS, privacy, matching, publication, account deletion, or user-facing workflows.
- If implementation requires an unresolved Founder/product/legal/privacy/schema/external-system decision, stop and report the exact blocker.
- Never merge. Push, PR creation, hosted proof, and external mutations each require separate explicit authorization.

When the plan is historical or conflicts with current docs/code, stop and request a fresh ruling instead of continuing from stale scope.

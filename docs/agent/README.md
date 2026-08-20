# Agent Setup

This directory explains the repository-local Codex operating setup for Klinnova. It is governance for agents and contributors, not product scope.

## Layers

- `AGENTS.md` is the compact instruction file Codex loads every session.
- `.codex/config.toml` holds repository-specific Codex defaults only.
- `.agents/skills/*` contains reusable Klinnova workflows for discovery, implementation, review, UI verification, PR readiness, and post-merge verification.
- Durable plans and decision records in `docs/` define actual product scope.

## Klinnova Skills

- `klinnova-discovery`: read-only investigation, proposal, audit, or planning before implementation.
- `klinnova-implementation`: execute an explicitly approved plan.
- `klinnova-review`: independent branch or diff review.
- `klinnova-ui-verification`: live browser/UI/accessibility/responsive verification.
- `klinnova-pr-readiness`: prepare a branch for Founder PR review and exact-head proof.
- `klinnova-merge-verification`: verify state after the Founder has merged.

See `governance.md` for safety rules and `workflow.md` for the standard delivery sequence.

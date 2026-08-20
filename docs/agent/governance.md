# Agent Governance

## Authority

Klinnova is the public product name. Historical `stint` repository names, paths, hosted project names, and documents may remain intentionally unchanged.

Authoritative state comes from merged GitHub `main`, accepted closure/proof documents, and current execution records. If older dashboard or README text conflicts with later execution evidence, use the document-defined precedence and report the mismatch.

## Founder Control

Substantial work requires discovery, Founder review, and explicit implementation authorization. Approval for discovery is not approval to implement. Approval to implement is not approval to push, open a PR, merge, deploy, mutate hosted services, or change Production.

Stop before merge. The Founder performs or explicitly authorizes any merge.

## Safety Boundaries

Do not perform destructive Git actions, history rewrites, force pushes, branch deletion, releases/tags, destructive stash/drop behavior, or external-service mutations without explicit task authorization.

External systems include GitHub, Vercel, Supabase, Sentry, email providers, DNS/domain providers, Figma, analytics, and Production/Preview environments. Repository changes do not authorize hosted changes.

## Scope

Do not implement deferred features, product semantics, status values, pricing, legal language, compliance claims, or design-system rewrites without an approved plan. Keep beta fixes evidence-driven and narrow.

When a task references a historical plan, verify whether it is still active before using it. Interrupted branch work is protected unless the current task explicitly resumes it.

# Architecture

## Recommended MVP stack

- Next.js App Router
- TypeScript in strict mode
- SCSS Modules and CSS custom properties
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel deployment
- React Hook Form and Zod
- Resend and React Email
- Vitest, Testing Library, MSW, and Playwright
- Sentry
- PostHog or equivalent privacy-conscious product analytics

## Architecture principle

Start with one deployable web application and one managed backend platform. Do not introduce microservices, a separate API service, Redis, a search cluster, or a native app until validated usage requires them.

## High-level flow

```text
Browser
  -> Next.js application on Vercel
      -> Server Components and Server Actions
      -> Route Handlers for webhooks and integrations
      -> Supabase Auth
      -> Supabase PostgreSQL
      -> Supabase Storage
      -> Email provider
      -> Analytics and error monitoring
```

## Application areas

```text
/
/jobs
/jobs/[slug]
/candidate/onboarding
/candidate/matches
/candidate/applications
/candidate/profile
/employer/company
/employer/jobs
/employer/jobs/new
/employer/applicants
/admin/verifications
/admin/reports
```

## Code organisation

Use feature-oriented modules with one component per file and minimal barrel files.

```text
src/
  app/
  components/
    ui/
  features/
    auth/
    onboarding/
    jobs/
    applications/
    employers/
    moderation/
  lib/
  server/
  styles/
  types/
```

## Data model direction

Core entities:

- profiles
- candidate_profiles
- employer_profiles
- companies
- jobs
- job_categories
- languages
- candidate_languages
- job_language_requirements
- candidate_preferences
- applications
- saved_jobs
- employer_verifications
- job_verifications
- reports
- audit_events

Use a shared profile identity and separate role-specific records. Avoid one large nullable account table.

## Authorization

- use Supabase Row Level Security
- candidates may read and change only their own private profile and applications
- employers may read applicants only for jobs belonging to their verified company
- administrators receive explicitly assigned elevated permissions
- sensitive actions must also be validated server-side

## Search and matching

Version one uses deterministic PostgreSQL filters and weighted ranking. No vector database is required.

Matching inputs:

- category
- language level
- location or travel radius
- availability
- shift preference
- employment type
- experience requirement
- work-authorisation declaration

The UI must explain why a vacancy appears.

## Job ingestion

Keep ingestion isolated from request handling. Each permitted source should have a dedicated adapter and common normalized model.

Store:

- source
- external identifier
- source URL
- content hash
- first seen
- last seen
- last verified
- expiry
- ingestion state

Employer-submitted and manually verified jobs remain the preferred sources for the MVP.

## Environment separation

Maintain separate local, preview/development, and production environments. Preview deployments must not write to the production database.

## Repository rules

- strict TypeScript; no `any` without documented justification
- absolute imports
- one component per file
- lowercase folders
- accessible primitives
- no unnecessary client components
- no business logic embedded in presentation components
- tests for authorization and core flows

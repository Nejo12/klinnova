# Non-functional Requirements

## Security

- least-privilege authorization
- Row Level Security for user-owned and employer-owned data
- server-side validation for every mutation
- rate limits for authentication, applications, vacancy creation, and reports
- private storage for CVs and candidate documents
- signed URLs for temporary document access
- audit sensitive administrative actions
- dependency and secret scanning in CI
- documented incident-response process before public launch

## Privacy

- data minimisation by default
- explicit consent for employer discoverability
- clear privacy notice
- account deletion and export process
- documented retention periods
- no scraping or importing candidate profiles
- no collection of identity or residence documents in MVP
- separate marketing consent from product communications

## Accessibility

Target WCAG 2.2 AA.

- semantic landmarks and headings
- complete keyboard operation
- visible focus indicators
- accessible names and descriptions
- colour-independent state communication
- 44 by 44 pixel minimum touch targets
- reduced-motion support
- correct field-error associations
- automated checks plus manual keyboard and screen-reader testing

## Performance

Initial targets:

- public job pages should load quickly on mid-range mobile devices
- avoid unnecessary client-side JavaScript
- optimise images and fonts
- paginate or progressively load large result sets
- avoid blocking network calls during onboarding transitions
- define performance budgets during foundation setup

## Reliability

- idempotent application submission
- duplicate-application prevention
- vacancy expiry and stale-data handling
- database backups and restoration procedure
- graceful degradation when email, analytics, or optional integrations fail
- user input preserved after recoverable errors

## SEO

- indexable public job pages
- canonical URLs
- structured `JobPosting` metadata where accurate
- unique titles and descriptions
- sitemap and robots configuration
- expired jobs removed from discovery and handled with appropriate status or replacement guidance

## Observability

- client and server error monitoring
- structured server logs without sensitive personal data
- analytics for critical funnels
- alerts for failed application submissions and ingestion jobs
- correlation identifiers for diagnosing cross-system failures

## Testing

- unit tests for deterministic business rules
- component tests for forms and interaction states
- integration tests for database authorization
- end-to-end tests for critical vertical journeys
- accessibility checks in component and E2E suites
- core-flow coverage target of at least 80 percent where meaningful

## Browser and device support

Support current major versions of:

- Chrome
- Safari
- Firefox
- Edge

The candidate flow must be usable on common mobile screen sizes. Progressive enhancement is preferred over browser-specific implementations.

## Internationalisation

- externalise all user-facing copy
- avoid concatenated translated strings
- support longer translated text without layout breakage
- store locale independently from language proficiency
- initial interface language may be English, but architecture must support additional locales

## Legal and moderation readiness

Before public launch, prepare:

- Impressum
- privacy policy
- terms
- employer content licence
- takedown process
- discrimination and vacancy-posting rules
- reporting and escalation procedure

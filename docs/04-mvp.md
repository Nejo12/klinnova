# MVP Scope

## Goal

Prove that Stint can help candidates with limited German find and apply to legitimate, suitable opportunities while helping Berlin employers receive better-matched applicants.

## Success criteria

The MVP is successful when it can demonstrate:

- candidates complete onboarding and receive relevant matches
- candidates understand why a job is suitable or unsuitable
- candidates submit applications without mandatory German-format CVs
- employers publish clear vacancies and review applicants
- stale or misleading vacancies are removed quickly
- interviews and confirmed hires can be attributed to Stint

## Candidate MVP

### Included

- email or social authentication
- six-step essential onboarding
- language selection and proficiency
- German comfort level
- work-authorisation self-declaration
- Berlin location and travel radius
- preferred job categories
- availability and preferred employment types
- candidate profile summary
- matched job feed
- job detail page
- filters for essential eligibility criteria
- save and unsave job
- simple profile-based application
- optional CV upload
- application confirmation
- application status timeline
- profile completion guidance
- account export and deletion request

### Essential onboarding sequence

1. Languages and German comfort level
2. Confirmation of legal ability to work in Germany
3. Berlin location and maximum travel time
4. Preferred job categories
5. Availability and start date
6. Employment types and shift preferences

The candidate should see job matches after these essentials. Experience, phone number, CV, references, and further profile details are requested progressively when required.

## Employer MVP

### Included

- employer registration
- company profile
- manual employer verification workflow
- create, edit, publish, close, and expire vacancy
- title, description, category, location, salary, contract, shift, and start date
- explicit language requirements
- experience and qualification requirements
- whether a CV is required
- whether the interview can be conducted in English
- applicant list
- candidate profile view
- application status updates
- interview invitation details
- vacancy closing and filled status

## Administration MVP

### Included

- employer verification queue
- vacancy moderation
- report review
- account suspension
- vacancy removal
- stale-vacancy controls
- basic audit events
- basic candidate and employer funnel metrics

## Job data for the MVP

Use the following priority:

1. employer-submitted vacancies
2. manually curated and verified vacancies
3. explicitly permitted feeds or APIs
4. source-linked aggregation where republication is allowed

Unrestricted scraping is not a foundational MVP dependency.

Candidate profiles must never be scraped from external sources.

## Matching v1

Use deterministic, explainable matching based on:

- job category
- language requirements
- location or travel radius
- availability
- employment type
- shift preference
- experience requirement
- work-authorisation declaration

The result should explain the match rather than expose an unexplained score.

## Explicitly out of scope

- payroll or worker payments
- invoicing and tax handling
- freelancer marketplace operations
- temporary-employment agency operations
- public candidate directory
- employer-to-candidate cold outreach without consent
- real-time chat
- native mobile applications
- video interviewing
- reviews and reputation scoring
- automated hiring or rejection
- complex recommendation models
- nationwide launch
- multi-city operations
- employer subscriptions and billing
- multilingual UI beyond the initial supported language set
- document verification for residence permits or passports

## MVP release boundary

A release candidate must support this complete vertical journey:

1. Candidate registers.
2. Candidate completes essential onboarding.
3. Candidate receives a suitable vacancy.
4. Candidate understands the requirements.
5. Candidate applies.
6. Employer reviews the candidate.
7. Employer updates the application status.
8. Candidate sees the progress.
9. Stint records interview or hire outcome.

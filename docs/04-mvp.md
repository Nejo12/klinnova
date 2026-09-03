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

Stint supports two employer profile models:

A. **Private employer profiles** — verified individuals or households hiring for legitimate work in a private home, apartment, residential property, shop, store, or similar premises.
B. **Organisation employer profiles** — verified businesses, nonprofits, or other organisations. A **company profile** applies only to organisation employers.

Every employer has an **employer profile**. Verification evidence differs by employer type. Private households do not need a legal company name, commercial website, or company registration merely to create an employer account. All jobs must still be legitimate and comply with the platform’s trust and moderation requirements.

Initial private-employer use cases include:

- recurring home or apartment cleaning
- one-off deep cleaning where legally supported
- common-area or managed-property cleaning
- shop or retail-premises cleaning

### Included

- employer registration for private and organisation employers
- employer profile (with company profile only for organisation employers)
- type-specific manual employer verification workflow
- create, edit, publish, close, and expire vacancy
- title, description, category, privacy-safe public location, salary, contract, shift, and start date
- employer type and workplace type where required for clarity
- work frequency (one-off or recurring) where relevant
- explicit language requirements
- experience and qualification requirements
- whether a CV is required
- whether the interview can be conducted in English
- applicant list
- candidate profile view
- application status updates
- interview invitation details
- vacancy closing and filled status
- controls so exact private residential addresses are not publicly exposed

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

## Initial M5 Berlin private-beta boundary

The lists above preserve the broader MVP/product direction. They are **not** a requirement that every listed capability must exist before the initial M5 Berlin private beta begins.

Founder-approved M5 boundary (D-M5-1 and D-M5-6; `docs/49-m5-beta-transition-and-measurement.md`):

- the merged M4 implementation is the minimum product boundary for Cohort A;
- capabilities deliberately narrowed/deferred during Slices 0–8 do not block the initial private beta unless observed beta evidence shows they are required;
- optional CV upload and save/unsave jobs remain deferred product capabilities and do not block Cohort A;
- broader matching intent such as travel-time sophistication and experience-based matching remains product direction, but accepted narrower matching contracts remain authoritative for the current beta until evidence justifies reopening them;
- interview/hire outcome measurement is a beta-measurement requirement and is investigated separately from application workflow status in M5.0;
- D-M5-23 ends the blanket product-development freeze: ideas now move through BUILD NOW, DESIGN / SPEC NOW, WAIT FOR BETA, or PARK / REJECT classification; implementation still requires a bounded Founder-approved unit.

A deferred capability is not deleted from the longer-term product direction merely because it is outside the initial beta gate. Design/specification may proceed under D-M5-23 without changing the current implementation or Cohort A entry baseline.

## Explicitly out of scope

- payroll or worker payments
- invoicing and tax handling
- freelancer marketplace operations
- temporary-employment agency operations
- public candidate directory
- employer-to-candidate cold outreach without consent
- real-time chat //TODO: this will be nearest future feature
- native mobile applications
- video interviewing
- reviews and reputation scoring //TODO: this will be nearest future feature
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

For M5, item 9 uses the founder-approved metric semantics in `docs/49` and the separate-outcome direction in `docs/50`; existing application status `accepted` must not be counted automatically as a confirmed hire.

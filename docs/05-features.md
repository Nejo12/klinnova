# Feature Specification

## Candidate onboarding

### Purpose

Collect the minimum information needed to produce useful job matches within a few minutes.

### Requirements

- one question or decision per screen
- visible progress using the step motif
- save progress automatically
- allow backward navigation without data loss
- allow skipping non-essential fields
- show matches immediately after essential onboarding
- explain why information is requested

## Job discovery

### Purpose

Show candidates only opportunities they can realistically consider.

### Job card must show

- job title
- employer name
- employer verification state
- salary or wage
- location and estimated travel information where available
- shift or schedule
- contract type
- language requirement
- freshness or verification date
- saved state

### Job detail must show

- plain-language summary
- responsibilities
- essential requirements
- language expectations
- salary and pay unit
- shift schedule
- contract type
- start date
- location
- application requirements
- whether a CV is required
- whether the interview can be conducted in English
- why the job matches the candidate
- report action

## Applications

### Purpose

Let candidates express interest without unnecessary German application conventions.

### Requirements

- profile-based application
- CV optional unless employer marks it essential
- application preview before submission
- confirmation after submission
- duplicate-application prevention
- status timeline
- withdrawal option where appropriate
- clear next action at every state

### Initial statuses

- submitted
- viewed
- shortlisted
- interview invited
- interview scheduled
- offer
- hired
- not selected
- withdrawn

## Candidate profile

### Purpose

Create a reusable representation of what the person can contribute.

### Initial fields

- display name
- languages and levels
- German comfort level
- work-authorisation declaration
- location and travel radius
- preferred categories
- availability
- employment-type preferences
- shift preferences
- experience by category
- optional phone number
- optional CV
- optional short introduction

## Employer vacancy creation

### Purpose

Produce clear, comparable vacancies with realistic eligibility requirements.

### Requirements

- structured fields before free-text description
- employer type (private or organisation)
- workplace type where relevant (for example private home, apartment, managed property, shop, or commercial premises)
- work frequency where relevant (one-off or recurring)
- salary required
- language requirement required
- privacy-safe public location required (approximate area or district for private homes and apartments)
- exact-location disclosure control so precise service locations are shared only at an appropriate, consented stage
- contract type required
- shift or schedule required
- expiry date required or automatically assigned
- employer confirms the vacancy is active and legitimate
- discriminatory wording warnings
- preview before publication

These vacancy fields are product requirements for a future employer slice. They are not Slice 2 implementation requirements.

## Employer applicant review

### Purpose

Make candidates easy to compare without reducing them to conventional CV signals.

### Candidate summary must show

- relevant experience
- languages
- location or travel fit
- availability
- employment preferences
- optional CV
- application date
- current status

## Verification and moderation

### Employer verification

Initial verification is manual and type-specific. Private-employer verification is not an endorsement. Both private and organisation employers remain subject to moderation, reporting, suspension, and vacancy expiry.

#### Private employer

Possible verification evidence may include:

- verified personal identity
- confirmed email and phone
- residential or service-location evidence handled privately
- job-location verification
- acknowledgement of lawful hiring and pay obligations

Do not require a company website or legal company name from a private household. Exact private residential addresses must not be publicly exposed. Job cards may show a safe approximate area or district. Precise service location should be disclosed only at an appropriate, consented stage.

#### Organisation employer

Possible verification evidence may include:

- legal organisation name
- registration or equivalent evidence
- business address
- public website or alternative evidence
- authorised contact person

### Vacancy quality

The system should support:

- expiry
- re-confirmation
- duplicate detection
- reporting
- removal
- suspension of repeat offenders

## Notifications

### Initial email notifications

Candidate:

- welcome
- application confirmation
- status update
- interview invitation
- vacancy no longer available where relevant

Employer:

- verification result
- vacancy published
- new applicant
- vacancy expiry reminder

## Empty, loading, and error states

- no spinner-only experiences when progress can be explained
- loading should reuse the step-path motion
- empty states should identify the next useful action
- rejection copy should be factual and respectful
- errors should preserve user input where possible

## Analytics events

Track at minimum:

- onboarding started
- onboarding step completed
- onboarding completed
- matches viewed
- job opened
- job saved
- application started
- application submitted
- employer vacancy started
- employer vacancy published
- applicant reviewed
- interview invited
- hire confirmed

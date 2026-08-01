# Design System

## Brand foundation

- **Core emotion:** Seen
- **Product experience:** Progress
- **Human outcome:** Dignity
- **Tagline:** One step closer.

## Visual principle

The system should feel calm, editorial, restrained, human, and trustworthy. It should not resemble a generic blue SaaS product or a loud gig-work marketplace.

## Step motif

The step path is the primary visual and behavioural motif.

Use it for:

- app icon and favicon
- onboarding progress
- loading states
- application status
- profile progress
- empty states
- milestone acknowledgement

Do not use it as decorative filler.

## Colour direction

The v1 palette uses one disciplined accent family:

- deep oxblood as the primary brand colour
- warm paper and cream backgrounds
- clay for warm secondary emphasis
- muted olive for restrained supportive states
- high-contrast near-black text

Do not introduce unrelated blue, purple, teal, or bright green accents without a validated accessibility or product need.

Semantic states may use tuned variants of the existing palette, provided status is never communicated by colour alone.

## Typography

- serif wordmark may remain exclusive to the logo
- product UI uses a highly readable sans-serif
- maintain generous line height
- use clear hierarchy without excessive font sizes or weights
- body text must remain readable on small mobile screens

## Layout and spacing

- mobile first
- generous whitespace
- restrained use of borders
- minimal shadows
- clear grouping through spacing before decoration
- touch targets of at least 44 by 44 CSS pixels
- cards should contain only decision-relevant information

## Components required for MVP

- button
- text input
- textarea
- select or combobox
- checkbox
- radio group
- chips and selectable cards
- progress indicator
- alert and inline validation
- modal or dialog
- drawer for mobile filters
- job card
- employer badge
- language badge
- application timeline
- empty state
- loading step path
- navigation header
- mobile bottom navigation where justified

## Job-card hierarchy

Prioritise:

1. job title
2. salary
3. language requirement
4. location or travel information
5. shift and contract
6. employer and verification
7. freshness

## Motion

Motion should communicate progress and state change.

- one measured step at a time
- no celebratory explosion or excessive bounce
- respect reduced-motion preferences
- loading marker may travel along the step path
- status changes may advance the step marker

## Voice and microcopy

Use plain, respectful, direct language.

Prefer:

- Let's start with what you can do.
- Applications do not need a CV to start.
- This job accepts English.
- One step closer.
- This one was not the right fit. Keep moving.

Avoid:

- unskilled worker
- low-skilled candidate
- AI-powered
- perfect match
- guaranteed job
- rejection language that implies personal inadequacy

## Accessibility

- WCAG 2.2 AA target
- visible keyboard focus
- semantic HTML
- screen-reader labels
- sufficient contrast
- colour-independent state communication
- reduced-motion support
- error messages linked to fields
- accessible dialogs, menus, and listboxes

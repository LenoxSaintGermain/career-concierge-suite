# Confidence Closure + Lucid Module Expansion Spec

## Status

Queued roadmap spec for the pass that gets the OS to `90%` baseline confidence and `90%` execution confidence without re-platforming.

This document distills:

- `docs/mvp/lucidchart_analysis.md`
- `docs/mvp/Jim's Notes - Key Requirements Extracted.md`
- `docs/mvp/Career_Concierge_V1_MVP_Spec_Complete.md`
- current roadmap, charter, and backlog state

## Executive Read

The path to `90/90` is not one new feature. It is one tightly-scoped closure pass across five workstreams:

1. finish the media pipeline operator boundary and admin ops
2. ship the staff control plane
3. ship the sample-persona harness
4. add the Lucid dashboard modules Jim introduced
5. close the public AI Concierge onboarding and booking gap

Anything less will keep the roadmap looking broad but still incomplete against Jim's baseline.

## Source Audit

### What Is Already Explicit In The Inputs

- conversational intake and intent routing
- Brief and Plan as editorial operating outputs
- AI Concierge pre-auth posture
- booking / date-time onboarding
- Firestore-first memory and operating logs
- admin/job-log expectations
- the Lucid dashboard modules:
  - `SkillSync AI TV`
  - `Flash Cards`
  - `Events & Networking`
  - `Telescope`

### What Was Not Explicit Enough Before This Spec

- detailed acceptance criteria for the Lucid-only modules above
- the operating role and scope of `SkillSync AI Team`
- how placeholder tiles should be governed without cluttering the grid
- the exact set of work needed to move both roadmap confidence metrics to `90%`

### Critical Position

We do **not** have fully sufficient AC in the older docs for all of the new Lucid tiles.

What we had before:

- direct module names from Lucid
- broad OS intent from Jim's notes and the MVP spec
- no committed story-by-story AC/test matrix for those modules

What this spec does:

- formalizes those missing stories
- labels which AC are directly sourced vs inferred
- keeps inferred scope narrow so the MVP does not sprawl

## One-Pass Path To `90/90`

### Target Outcome

After one coordinated delivery pass, the operator roadmap should be able to show:

- `90%+` baseline confidence because every Lucid/Jim baseline area has a mapped implementation path
- `90%+` execution confidence because the remaining high-value queued tasks are closed or intentionally deferred with proof

### Required Workstreams

| Workstream | Roadmap Mapping | Why It Must Ship In The Closure Pass |
| :--- | :--- | :--- |
| Media pipeline completion | `E09`, `MTL-11` | Jim's operator/admin expectations are not met without queue health, lineage, approvals, and final operator boundary. |
| Staff control plane | `E10`, `MTL-12` | The OS cannot honestly claim agentic governance until the staff roster, handoff graph, and controls are visible. |
| Sample persona harness | `E11`, `MTL-13` | Execution confidence will stay low if persona proof still depends on manual setup and recovery. |
| Lucid module expansion | `E12`, `MTL-14` | The dashboard parity gap remains visible until the added tiles are real backlog scope. |
| AI Concierge onboarding + booking | `E13`, `MTL-15` | This is still the largest uncovered baseline gap from Jim + Lucid. |

## New Lucid Modules

These modules should be treated as part of the editorial OS, not as disconnected tools.

### 1. SkillSync AI TV

Mission:

- deliver curated, premium, episodic video learning tied to the user's plan and current learning arc

Scope:

- editorial video library
- series/playlist grouping
- progress tracking
- handoff from Episodes and Plan

Source posture:

- direct module name from Lucid and MVP spec
- behavioral AC inferred from the existing micro-drama / learning-plan strategy

Acceptance criteria:

- the tile opens a dedicated video library surface rather than reusing the Episodes BTS/operator view
- content is grouped into editorial series or channels, not dumped as a flat feed
- at least one rail is personalized from the user's intent, role, or current plan
- free-tier users only see the starter/public subset
- operator copy such as prompt/model/art-direction language never appears in the client view

Positive tests:

- signed-in paid user opens `SkillSync AI TV` and sees curated series tied to current journey
- a user can launch a video and return to the OS without losing module state
- free-tier user sees only starter/public programming plus upgrade CTA

Negative tests:

- TV must not expose admin/operator lineage language
- TV must not duplicate the Episodes player one-to-one
- TV must not show paid-only series to free-tier users

### 2. Flash Cards

Mission:

- turn the current learning plan and recent episode content into spaced-review prompts

Scope:

- card decks
- progress state
- lightweight mastery tracking

Source posture:

- direct module name from Lucid and MVP spec
- detailed behavior inferred; Jim's notes do not define card mechanics

Acceptance criteria:

- each user sees one or more decks sourced from plan themes or recently completed learning episodes
- cards support flip/reveal and a simple confidence/self-rating action
- reviewed-card state persists
- free-tier users can access only the foundational deck set

Positive tests:

- completing an episode or viewing a plan theme yields a related deck
- card progress persists after reload
- paid/foundation deck visibility follows entitlement rules

Negative tests:

- cards must not require bespoke media generation to function
- empty-state users must see a guided seed prompt, not a blank surface
- card scoring must not imply formal certification

### 3. Events & Networking

Mission:

- connect the user's plan to relevant events, workshops, networking moments, and concierge follow-up actions

Scope:

- curated event list
- bookmark / interest / request-intro actions
- concierge follow-up trigger

Source posture:

- direct module name from Lucid and MVP spec
- Jim's notes support community, concierge, and operator-led workflow expectations

Acceptance criteria:

- the module surfaces events relevant to the user's role, intent, or target direction
- a user can save interest, bookmark, or request concierge help without leaving the OS
- operator/admin can see event-interest signals in the shared ledger
- free-tier access is limited to public or house events

Positive tests:

- TU2 sees promotion/leadership events relevant to internal-mobility goals
- TU3 sees exploratory beginner-friendly events
- saving interest writes a durable record tied to the user

Negative tests:

- no fake RSVP confirmation should be shown without a real booking path
- module must not imply external organizer integration when unavailable
- event cards must not show stale dates as active without validation state

### 4. Telescope

Mission:

- provide an opportunity horizon view: adjacent roles, skill signals, market themes, and next-step watchpoints

Scope:

- adjacent-role explorer
- market radar
- trend watchlist

Source posture:

- direct tile name from Lucid and MVP spec
- functionality was explicitly `TBD`; this spec narrows it to a market-radar module

Acceptance criteria:

- the module frames nearby roles, trends, or opportunity paths relative to the user's current intent
- it distinguishes `now`, `near`, and `later` horizons
- it links back into Plan, Episodes, or CJS rather than becoming a dead-end dashboard

Positive tests:

- TU1 sees adjacent internal-leverage pathways, not generic job-board noise
- TU3 sees exploratory path clusters and related learning moves
- a user can jump from Telescope into a supporting module with context preserved

Negative tests:

- Telescope must not become a raw job search screen
- it must not invent labor-market certainty beyond available evidence
- it must not duplicate Gaps or Plan verbatim

### 5. SkillSync AI Team

Mission:

- expose the concierge/staff support model in a high-trust way for the user, while keeping internal operator tooling separate

Scope:

- visible support roster
- role explanations
- escalation / handoff expectations

Source posture:

- sourced from the latest Lucid overlay additions rather than the older MVP spec text
- behavior inferred from the staffing model and MyConcierge human/AI semantics

Acceptance criteria:

- the module explains which support roles exist for the user and what each role can help with
- premium tiers can request or route into concierge help from this module
- the client-facing surface remains explanatory and action-oriented, not an admin control plane

Positive tests:

- paid user can see support-role descriptions and request help
- MyConcierge handoffs can reference the Team surface cleanly

Negative tests:

- Team must not expose internal prompts, policies, or run logs
- free-tier users must not see premium white-glove promises they cannot access

### 6. Placeholder Tile Governance

Mission:

- keep the editorial grid intentional when future placeholder tiles exist

Source posture:

- direct from Lucid placeholder tiles
- behavior inferred from the grid-brand system

Acceptance criteria:

- placeholder tiles are either hidden, operator-only, or clearly marked as upcoming
- numbering/order remain coherent
- placeholders never look broken or interactive if they are not ready

## New Epics And Stories

### Epic `E12` Lucid Module Expansion

- `E12-S01` SkillSync AI TV module
- `E12-S02` Flash Cards module
- `E12-S03` Events & Networking module
- `E12-S04` Telescope module
- `E12-S05` SkillSync AI Team module
- `E12-S06` Placeholder tile governance + launch rules

### Epic `E13` AI Concierge Onboarding + Booking

- `E13-S01` public AI Concierge pre-auth entry
- `E13-S02` booking + date/time Smart Start scheduling
- `E13-S03` human/AI MyConcierge handoff and concierge-service semantics
- `E13-S04` operator visibility for bookings, onboarding progress, and handoff state

## Acceptance Source Map

| Area | Direct From Inputs | Inferred / Distilled Here |
| :--- | :--- | :--- |
| AI Concierge pre-auth onboarding | Yes | refined into `E13-S01` |
| booking / date-time flow | Yes | refined into `E13-S02` |
| SkillSync AI TV | module exists directly | UX/entitlement AC formalized here |
| Flash Cards | module exists directly | deck mechanics and persistence formalized here |
| Events & Networking | module exists directly | save-interest / concierge-follow-up semantics formalized here |
| Telescope | tile exists directly, function was TBD | narrowed to horizon/radar role here |
| SkillSync AI Team | latest Lucid overlay | client-safe role/explanation semantics formalized here |
| placeholder tiles | direct | governance and launch rules formalized here |

## Demo And Test Coverage

The closure pass is only complete when the roadmap and QA stack include:

- positive tests for each new module
- negative tests for entitlement, empty-state, and operator/client boundary behavior
- persona-level proof for TU1 through TU4
- operator proof that baseline confidence and execution confidence moved upward for real reasons, not because stories were renamed

## Recommendation

Do not start these modules as isolated UI tiles.

Recommended implementation order:

1. finish `E09`
2. ship `E10`
3. ship `E11`
4. implement `E13`
5. implement `E12`

Reason:

- `E13` closes the most visible baseline gap
- `E12` is safer once onboarding, staff semantics, and reusable media rules are already explicit

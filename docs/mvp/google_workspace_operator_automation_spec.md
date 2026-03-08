# Google Workspace Operator Automation Spec

## Purpose

Define the best post-core use of Google Workspace CLI inside Career Concierge OS without turning it into a core runtime dependency.

## Source Constraint

This plan is based on the public `googleworkspace/cli` repo and the current OS architecture.

Important constraint:

- the Google Workspace CLI should be treated as an operator-side adapter
- it should not replace Firestore, Cloud Run, or the existing orchestration ledger
- it should remain optional and dry-run-capable until the core OS reaches stability

## What It Is Good For

### 1. Smart Start follow-up and scheduling payloads

Use persisted concierge requests to prepare:

- Gmail follow-up drafts
- Calendar event payloads
- operator-ready confirmation details

Why this fits:

- concierge requests already exist in Firestore
- operators still need human judgment before outbound communication
- Workspace is naturally suited for the final operator action

### 2. Google Docs briefing-pack drafts

Use Firestore-backed client data to draft:

- Smart Start briefs
- client handoff packets
- internal prep docs for human concierge sessions

Why this fits:

- Docs is useful as an editable output surface
- Firestore remains canonical for source data
- operator editing is expected, not a failure mode

### 3. Google Sheets ops mirror

Mirror selected operator-tracking fields into Sheets:

- request status
- preferred timing
- owner
- next step
- last updated

Why this fits:

- sales/ops teams often already live in Sheets
- this reduces duplicate entry
- stale Sheets data does not break the product because Firestore stays canonical

## What It Should Not Own

- primary client identity
- booking source of truth
- orchestration memory
- artifact generation truth
- user-facing runtime decisions
- core admin configuration

## Recommended Delivery Shape

### Adapter Boundary

Build a narrow Workspace adapter service with:

- enable/disable flag
- dry-run mode
- explicit product toggles: Gmail, Calendar, Docs, Sheets
- operator-triggered actions only

### Canonical Source of Truth

Keep canonical state in:

- Firestore for requests, orchestration state, and audit records
- Cloud Run API for orchestration and admin actions
- Cloud Storage for generated media assets

### Failure Policy

If Workspace automation fails:

- log the failure in operator-visible admin history
- keep the core OS request and status flow intact
- never block client journeys on Workspace side effects

## Backlog Mapping

- `E14-S01` Gmail + Calendar Smart Start follow-up adapter
- `E14-S02` Google Docs briefing-pack export
- `E14-S03` Google Sheets pipeline mirror
- `E14-S04` Workspace adapter governance + dry run
- `E14-S05` Admin Workspace automation console

## Recommendation

Do not pull this into the current 95%-confidence closure path.

Sequence:

1. finish `E12`
2. finish `E13`
3. close remaining `E10` / `MTL-12` telemetry and governance gaps
4. only then prototype Workspace automation as a constrained operator adapter

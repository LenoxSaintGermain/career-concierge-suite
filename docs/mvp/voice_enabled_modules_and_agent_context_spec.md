# Voice-Enabled Modules and Agent Context Substrate

## Purpose

Define:

- which suite modules should become voice-enabled
- which modules should remain voice-aware but not voice-driven
- how Gemini / Ghost should stay aware of the user's artifact stack across Firestore and Google Docs
- how Google Docs should be used as the client-facing receipt layer without turning Docs into the agent's system of record

## Current State

The strongest voice implementation is now `01 / Start Here`, where Gemini and ElevenLabs both receive:

- the active Smart Start section
- visible fields
- valid options
- deterministic UI action tools

That is why voice now feels materially more capable in Intake than elsewhere.

The rest of the suite still relies mostly on artifact fetch and general session context rather than module-specific action contracts.

## Recommendation

Do not attempt voice-enable the entire suite symmetrically.

Split the product into three classes:

1. `voice-driven`
2. `voice-assisted`
3. `voice-readable only`

## Module Tiers

### Tier A: Voice-Driven

These modules benefit from direct conversational control and deterministic tools.

- `01 / intake`
  - already the flagship voice surface
  - keep as the primary proving ground
- `11 / my_concierge`
  - natural fit for dialogue-first guidance
  - should open artifacts, summarize gaps, route to modules, and propose next moves
- `15 / cjs_execution`
  - high-value for voice because the user often needs guided execution, prioritization, and document routing while multitasking
  - tools should cover stage changes, asset selection, checklist completion, and interview / negotiation drills
- `17 / assets`
  - voice is useful for locating, summarizing, and opening the right asset quickly
  - voice should not rewrite assets blindly, but it should fetch and compare them

### Tier B: Voice-Assisted

These modules should not be fully driven by voice, but should be aware of the visible state and answer against it.

- `05 / brief`
- `06 / suite_distilled`
- `07 / profile`
- `08 / ai_profile`
- `09 / gaps`
- `10 / readiness`
- `16 / plan`
- `13 / telescope`
- `12 / events`

Recommended behaviors:

- summarize what is visible
- explain how to use the current module
- compare one module to another
- jump to the right section
- fetch the full artifact if the visible surface is compressed
- suggest the next move without free-driving the UI

### Tier C: Voice-Readable Only

These can expose context to the assistant, but should not receive first-pass UI tool contracts.

- `02 / episodes`
- `03 / tv`
- `04 / flash_cards`
- `14 / team`
- `18 / roadmap`

Notes:

- `episodes`, `tv`, and `flash_cards` can still support play / pause / next / recap later, but they are not the highest-value hardening target
- `roadmap` is operator-oriented and should stay low priority for client voice

## Recommended Rollout Order

1. `my_concierge`
2. `plan`
3. `brief`
4. `cjs_execution`
5. `assets`
6. `profile` / `gaps` / `readiness`

This order matches user value better than trying to voice-enable the entire artifact grid at once.

## Artifact Awareness Problem

The assistant should always feel like it knows the user.

Right now, that feeling is strongest when it has:

- current module context
- visible UI state
- direct tool access
- artifact fetch

But that is still not enough for full suite continuity.

The missing layer is a compact internal context substrate that the live assistant can load fast before or during a session.

## Recommendation: Add an Internal Agent Context Artifact

Do not create another heavy client-facing dossier.

Create one internal artifact:

- `agent_context`

This should live in Firestore, not Google Docs.

It should be:

- small
- aggressively normalized
- refreshed after intake and after major artifact updates
- safe for live-session preload

Suggested shape:

- identity
  - `display_name`
  - `email`
  - `tier`
  - `current_intent`
- strategic snapshot
  - one-paragraph summary
  - current thesis
  - current risk
  - current opportunity
- artifact digest
  - brief thesis
  - profile leverage points
  - gaps shortlist
  - plan next 72 hours
  - readiness tier
  - cjs execution stage
- market context
  - macro climate summary
  - target role cluster
  - compensation posture
- docs registry
  - artifact type -> google doc id/url/version/last synced
- session hints
  - preferred pace
  - preferred focus
  - last active module
  - modules already completed

This should be the live voice preload substrate.

## Firestore vs Google Docs Responsibilities

### Firestore should remain canonical

The assistant should reason from:

- `clients/{uid}`
- `clients/{uid}/artifacts/*`
- `clients/{uid}/doc_registry/*`
- internal `agent_context`

Why:

- faster and structured
- versionable
- safe for deterministic tool prompting
- easy to diff and validate

### Google Docs should remain the receipt layer

The Docs version is the user-facing copy:

- shareable
- printable
- emotionally legible
- human-readable proof of what the system produced

The assistant should be able to fetch Docs when needed, but Docs should not be the primary machine substrate.

## Best Google Docs Pattern

The best pattern is not “store hidden machine state in Docs.”

The better pattern is:

1. Firestore remains the source of truth
2. Google Docs are rendered receipts
3. Docs expose stable anchors so the assistant can cite or deep-link sections when needed

### Use these Google Workspace primitives

- `documents.get`
  - read full content when needed
- `documents.batchUpdate`
  - render and refresh docs atomically
- `Drive files.update`
  - keep names and app properties in sync
- `Drive appProperties`
  - keep machine indexing on the Drive file, not in the visible body

Official references:

- Docs concepts and methods: https://developers.google.com/workspace/docs/api/concepts/document
- Docs `batchUpdate`: https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate
- Drive `files.update` and metadata: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update

## Recommended Docs Hardening

### 1. Stable section anchors

Each generated Google Doc should use consistent heading structure and section labels.

Examples:

- `Executive Abstract`
- `Market Value`
- `72-Hour Plan`
- `Adaptive Assets`
- `Evidence Ledger`

That gives the assistant stable retrieval targets even if prose changes.

### 2. Drive metadata for machine lookups

Use Drive `appProperties` on the document file for:

- `cc_uid`
- `artifact_type`
- `artifact_version`
- `artifact_title`
- `last_synced_at`

Do not try to hide machine metadata inside the visible Google Doc body unless it is intentionally client-visible.

### 3. Optional machine appendix only when necessary

If a document needs agent-readable details beyond the main prose, add a final section such as:

- `System Appendix`

This should be:

- sparse
- normalized
- deliberately formatted

Use it only for fields the client can reasonably see.

Do not use it as the primary memory layer.

## Hardening Pass: Assistant Awareness

### Phase 1

- add `agent_context` generation/update after:
  - intake
  - DNA pass
  - plan refresh
  - cjs execution updates
- preload `agent_context` into Gemini / Ghost sessions
- extend `ghost/briefing` to merge:
  - artifact digest
  - doc registry
  - current module

### Phase 2

- add module adapters for:
  - `my_concierge`
  - `plan`
  - `brief`
  - `cjs_execution`
  - `assets`
- limit tools per module
- add visible section summaries for artifact modules

### Phase 3

- let the assistant cite either:
  - Firestore artifact
  - Google Doc receipt
- expose “open the receipt copy” for user trust and handoff moments

## Acceptance Criteria

- the assistant can answer from the current artifact stack without re-asking known facts
- the assistant can distinguish:
  - canonical artifact data
  - synced doc receipt
  - visible UI state
- the assistant can open or cite the receipt copy when the user wants “the doc version”
- voice works in high-value modules without forcing freeform UI inference
- Google Docs sync remains optional for reasoning, but useful for user trust and delivery

## Decision

Do not create another public artifact next to Professional DNA.

Create:

- one internal `agent_context` substrate in Firestore
- stable Google Docs receipts with consistent section anchors and Drive metadata

That gives the assistant durable memory without turning Google Docs into a fragile database.

# Career Concierge Front Door Pivot Handoff

## Purpose

This brief prepares the next implementation agent for a new Career Concierge front-door pass.

The goal is not to port Signal Card into this repo.
The goal is to make Career Concierge feel more seamless, guided, and high-trust from the first login and onboarding moment by borrowing a narrow set of proven interaction patterns from Signal Card.

This handoff assumes:

- Career Concierge remains the only product identity in scope.
- Existing Career Concierge services, routes, modules, and integrations remain the baseline.
- Signal Card is a pattern reference, not a feature bundle, runtime dependency, or naming source.

## Guardrails

### Keep Career Concierge Clear

Do not introduce:

- Third Signal ecosystem framing
- Signal Card naming as product truth
- Alfred-specific follow-up semantics
- operator-brief / contact-capture semantics copied directly from Signal Card
- new external integrations that are not already present in this repo

If a Signal Card concept is reused, reinterpret it in Career Concierge terms only.

### What "Borrow From Signal Card" Means Here

Allowed pattern borrowing:

- front-door tone and pacing
- high-trust guided onboarding posture
- stronger realtime UI grounding
- deterministic live action contracts
- concise reveal / routing behavior
- one best next step instead of equal-choice overload

Not allowed:

- importing Signal Card product architecture
- importing Signal Card ecosystem vocabulary
- treating external Signal Card files as implementation source of truth for Concierge Services

## Current Shipped Career Concierge Surfaces

### 1. Public Pre-Auth Entry

Current entry lives in [LoginView.tsx](../../components/LoginView.tsx).

What is already shipped:

- Public AI Concierge / Smart Start request intake is available on the login screen.
- The form captures:
  - name
  - email
  - company
  - goal
  - service interest
  - resume link
  - preferred date
  - preferred time
  - preferred timezone
  - fallback timing note
- Signed-in client access remains adjacent to this public entry instead of being a separate application.
- Public requests post to `POST /v1/public/concierge-request`.

Why it exists:

- Career Concierge already needed a public front door before authenticated suite access.
- This solved the baseline onboarding and booking gap without creating a second product surface.

Relevant runtime path:

- [api/index.js](../../api/index.js) -> `POST /v1/public/concierge-request`

### 2. Signed-In Landing / Journey Guide

Current landing behavior lives in [App.tsx](../../App.tsx).

What is already shipped:

- Signed-in users land in the main suite shell.
- A `Your Journey Guide` layer provides editorial orientation instead of a generic tutorial.
- The guide personalizes from client-safe context already on file.
- The guide highlights modules by act and routes users toward the next meaningful surface.
- Admin access is visibly gated with `Admin` / `Admin Locked`, rather than being silently hidden.

Why it exists:

- The suite had grown into a large modular surface.
- Users needed orientation that felt like a concierge briefing rather than dashboard training.

Supporting dated repo history:

- `2026-03-11` in [docs/progress-log.md](../progress-log.md): Journey Guide editorial concierge pass

### 3. Smart Start Guided Onboarding Workspace

Current onboarding lives in [IntakeFlow.tsx](../../components/IntakeFlow.tsx).

What is already shipped:

- Smart Start is no longer a plain form; it is a guided onboarding workspace.
- Live voice lanes can mount directly inside the intake surface.
- Gemini and ElevenLabs both operate against the same intake-safe UI action contract.
- Transcript extraction can map conversation back into empty intake fields.
- Paid intake completion can trigger post-intake Google Docs sync.
- Resume URLs and direct uploads bridge into Concierge Job Search assets.

Why it exists:

- Earlier intake UX was too static and too form-like.
- The product needed voice-assisted completion that could still preserve deterministic control over what changed on screen.

Supporting dated repo history:

- `2026-03-29` in [docs/progress-log.md](../progress-log.md): Smart Start voice lane cleanup + Gemini Live alignment
- `2026-03-30` in [docs/progress-log.md](../progress-log.md): Smart Start guided workspace hardening

## Current Live-Agent Runtime Stack

### Active Backend Routes

Current live/runtime entrypoints are in [api/index.js](../../api/index.js).

- `GET /v1/public/config`
  - supplies the public config used by the suite shell and intake
  - resolves the active public lane from `voice.public_panel_provider`
- `POST /v1/live/token`
  - issues Gemini Live ephemeral tokens for authenticated users
- `POST /v1/voice/elevenlabs/session`
  - issues signed ElevenLabs session URLs for authenticated users
- `POST /v1/intake/extract`
  - extracts structured intake fields from live transcript content
- `POST /v1/gws/sync-docs`
  - re-syncs client Google Docs after intake / artifact generation
- `POST /v1/public/concierge-request`
  - persists public AI Concierge / Smart Start requests

### Gemini Live Runtime

Primary client implementation lives in [GeminiLivePanel.tsx](../../components/GeminiLivePanel.tsx).

Primary token creation lives in [services/liveApi.ts](../../services/liveApi.ts) and [api/index.js](../../api/index.js).

Current important facts:

- Default live model is `gemini-3.1-flash-live-preview`.
- The route intentionally suppresses `2.5`-only behavior when `3.1` is selected.
- Tool calling is wired into live session setup so Gemini can act on visible Smart Start state instead of only narrating it.
- Compact Smart Start mode improved first-turn behavior, mic timing, and transcript handling.

Why this matters for the next pass:

- Any front-door redesign must preserve the existing Gemini live lane unless there is a Career Concierge-specific reason to replace it.
- The next pass should build on the existing deterministic action contract instead of inventing a parallel interaction system.

### ElevenLabs Runtime

Current client implementation lives in [ElevenLabsConvaiPanel.tsx](../../components/ElevenLabsConvaiPanel.tsx).

Session creation lives in [services/voiceApi.ts](../../services/voiceApi.ts) and [api/index.js](../../api/index.js).

Current important facts:

- The older widget-based lane has already been replaced with the ElevenLabs React SDK path.
- Signed sessions are created server-side.
- Contextual updates and intake-safe client tools are already wired in.
- This lane is a real runtime, not a placeholder.

Supporting dated repo history:

- `2026-03-29` in [docs/progress-log.md](../progress-log.md): Ghost SDK delivery

### Smart Start UI Action Contract

The canonical intake tool contract lives in [api/config/liveIntakeTools.js](../../api/config/liveIntakeTools.js).

Current tool names:

- `focus_intake_field`
- `jump_intake_screen`
- `set_intake_text_field`
- `set_intake_choice_field`
- `set_intake_multi_field`
- `set_intake_boolean_field`
- `clear_intake_field`
- `set_intake_intent`
- `set_support_preference`
- `summarize_intake_state`

Why this matters:

- This is already the deterministic action layer that an A2UI-style pass should build on.
- The next pass should not create a second contradictory live action grammar for onboarding.

### Google Docs Receipt Layer

Current sync client lives in [services/voiceApi.ts](../../services/voiceApi.ts).

Current server implementation lives in:

- [api/index.js](../../api/index.js)
- [api/gws/](../../api/gws)

Current important facts:

- Google Docs sync is already part of the Career Concierge production story.
- Firestore remains canonical.
- Google Docs act as the user-facing receipt layer, not the machine-native source of truth.

Supporting dated repo history:

- `2026-03-15` in [docs/progress-log.md](../progress-log.md): Google Workspace integration - document publisher agent

## Current Control Points To Preserve Or Consciously Revise

### Public / Client Config

Definitions live in [types.ts](../../types.ts).

- `PublicConfig.voice.active_panel`
  - public-facing lane actually mounted by the client
- `voice.public_panel_provider`
  - admin/runtime-side source for choosing `gemini_live` or `elevenlabs`
- `professional_dna.voice_model`
  - product-side voice model choice that must remain coherent with the public lane

Current config defaults and normalization live in [api/index.js](../../api/index.js), [api/config/voiceRuntime.js](../../api/config/voiceRuntime.js), and [services/adminApi.ts](../../services/adminApi.ts).

### Response Shapes

Definitions live in [types.ts](../../types.ts).

`GeminiLiveTokenResponse`

- `token_name`
- `model`
- `voice_name`
- `client_name`
- `activity_handling`
- `input_transcription_enabled`
- `output_transcription_enabled`
- `affective_dialog_enabled`
- `proactive_audio_enabled`
- `issued_at`
- `expires_at`

`ElevenLabsSessionResponse`

- `agent_id`
- `signed_url`
- `user_id`
- `client_name`
- `issued_at`

Why they matter:

- The next pass should preserve these contract shapes unless there is a clear migration reason.
- Any UI/front-door redesign must assume existing frontend services depend on these response formats.

## Shipped History Timeline

This repo has moved beyond the earlier GWS-only brainstorm phase.
The current state was shaped by multiple shipped passes:

### March 8, 2026

Source: [docs/progress-log.md](../progress-log.md)

- Public AI Concierge / Smart Start request path shipped on the login surface.
- Structured booking capture and operator visibility shipped.

### March 11, 2026

Source: [docs/progress-log.md](../progress-log.md)

- `Your Journey Guide` shipped as the signed-in editorial orientation layer.

### March 15, 2026

Source: [docs/progress-log.md](../progress-log.md)

- Google Workspace document publisher shipped.
- GWS became the shareable receipt layer for produced artifacts.

### March 29, 2026

Source: [docs/progress-log.md](../progress-log.md)

- Smart Start live-lane cleanup shipped.
- Gemini moved to `gemini-3.1-flash-live-preview`.
- ElevenLabs Ghost SDK lane shipped as a real runtime.

### March 30, 2026

Source: [docs/progress-log.md](../progress-log.md)

- Smart Start became a sectioned guided workspace.
- Gemini regained full runtime parity inside intake.
- Voice lanes were hardened around processing and transition states.

## New Pivot For The Next Pass

The next pass should make Career Concierge's front door feel more like the original Signal Card experience from the first login/onboarding moment, but without turning this product into Signal Card.

### Desired Direction

- A tighter front-door ceremony
- Less seam between pre-auth interest capture and live-guided onboarding
- Better realtime UI grounding during onboarding
- A stronger sense that the system knows the current moment and the one best next move
- Better orchestration between landing, live guidance, form state, and downstream artifact generation
- Keep the user inside one continuous Concierge experience for as long as possible instead of pushing them too quickly into a browse-the-grid pattern

### What Should Stay Intact

- Career Concierge naming and service boundaries
- Existing Smart Start / suite / CJS / GWS architecture
- Existing live voice lanes
- Existing route surface and operator infrastructure
- Firestore as canonical source of truth
- Google Docs as receipt layer

### What Should Be Reconsidered

- The seam between the public request surface and the signed-in guided experience
- Whether the first authenticated moment should feel more ceremonial and live-led
- Whether the intake UI should become more explicitly realtime-native instead of feeling like a guided form with voice attached
- Whether the journey-guide and intake layers should feel more continuous
- Whether the current module grid should behave more like the visible file system of the Career Concierge OS, while the primary user interaction happens through a live voice/chat layer that pulls context from the OS, Firestore, artifacts, interactions, and Google Docs as needed

## Additional Direction From Jim: Keep Users In The Experience

Jim's added direction is to keep people inside the guided Concierge experience as long as possible.

This should change how the next agent thinks about the current suite shell:

- The module grid should no longer be treated as the primary interaction model.
- The module grid can remain as the visible `file system` or `knowledge surface` of the Career Concierge OS.
- The primary user experience should shift toward a continuous conversational layer that:
  - knows what the user has already done
  - pulls the right context from the OS automatically
  - reveals underlying modules, artifacts, and documents selectively when needed
  - keeps routing through one guided thread instead of requiring the user to navigate the whole system manually

This is an interaction-priority change, not a mandate to delete the suite.

## Candidate Knowledge Architecture: Per-User Wiki Instead Of Raw File/Folder Thinking

Reference pattern:

- Andrej Karpathy, `LLM Wiki`, gist created April 4, 2026
- URL: `https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f`

Useful core idea from the gist:

- do not answer every question by rediscovering meaning from raw files each time
- instead, compile and continuously maintain a structured, persistent knowledge base
- let the knowledge base get richer with every source and every meaningful interaction

### Career Concierge Adaptation

For this repo, the next agent should evaluate replacing the current mental model of:

- files
- folders
- scattered artifacts
- one-off document retrieval

with a more useful internal abstraction:

- each client has a living Career Concierge wiki
- the wiki is maintained by the system as the user interacts
- the agent speaks from that compiled knowledge layer first
- raw sources still exist underneath it

The key shift is:

- not `folder + docs + artifact retrieval as the main memory model`
- but `compiled per-user wiki as the main operating knowledge model`

### What The Per-User Wiki Would Sit On Top Of

The wiki should compile from existing Career Concierge sources, not bypass them:

- Firestore client record
- intake answers and preferences
- artifact documents
- interactions ledger
- orchestration runs
- CJS assets and resume digests
- Google Docs receipt layer
- future live session summaries or transcript-derived updates

That means:

- Firestore and generated artifacts remain canonical operational sources
- Google Docs remain shareable receipts
- the wiki becomes the agent-friendly synthesis layer between raw system records and the live conversation

### How This Changes The Front Door

If adopted, the front door should feel less like:

- enter app
- open module
- inspect artifact
- move to next tile

and more like:

- enter Concierge line
- agent already has a compiled understanding of the user
- agent keeps building that understanding while onboarding continues
- modules and docs are opened only as supporting evidence, working surfaces, or reveal moments

### Important Constraint

This wiki idea should be treated as a Career Concierge adaptation of the pattern, not a direct port of the gist.

Do not turn the product into:

- a generic Obsidian clone
- a file-browser experience
- a raw markdown-wiki management tool for end users

The user-facing experience should remain premium, guided, and service-oriented.
The wiki is primarily an internal knowledge architecture and interaction substrate, even if parts of it eventually become inspectable.

### Practical Recommendation For The Next Agent

Treat this as a likely architectural direction to prototype in the briefed redesign:

- preserve the visible module OS
- demote it from primary interaction pattern to supporting system surface
- introduce a compiled per-user knowledge substrate
- let the live voice/chat layer treat that substrate as its first-stop operating memory
- continue to cite or open underlying artifacts, database-backed records, and Google Docs only when useful

Do not assume this requires deleting the current artifact system.
The better interpretation is:

- artifacts remain
- documents remain
- modules remain
- but the agent's effective memory and the user's primary path through the product become wiki-like and cumulative

## Signal Card-Inspired Patterns To Borrow

These are the only kinds of Signal Card borrowing in scope for this pass:

### 1. Front-Door Tone And Pacing

- Enter with more confidence and less dashboard explanation
- Speak as a guided concierge line, not a setup wizard
- Reduce ceremony after orientation is established

### 2. High-Trust Guided Onboarding

- Move the user forward through selective, well-timed prompts
- Avoid presenting too many equal-weight choices at once
- Use live context to keep questions anchored to what is visible now

### 3. Realtime UI Grounding

- The live agent should act on the visible UI state, not merely talk about it
- Visible state and deterministic action tools should remain first-class

### 4. Deterministic Action Contracts

- Preserve the current Smart Start tool grammar as the basis for live UI control
- If new actions are added, they should extend the existing contract rather than fork it

### 5. Concise Reveal / Routing Behavior

- Move toward one best next step
- Reduce verbose explanation
- Use selective reveals instead of overwhelming static framing

## Explicitly Out Of Scope

Do not port:

- Third Signal hierarchy
- Signal Card persona naming
- The Third Mark identity
- Alfred-specific operational paths
- operator brief filing semantics copied directly
- contact capture semantics copied directly
- ecosystem proof-surface routing language
- any new external services not already present in this repo

## A2UI v0.9 Opportunity For Career Concierge

This should be treated as a Career Concierge implementation opportunity, not a Signal Card dependency.

Reference:

- Google Developers Blog, `A2UI v0.9: The New Standard for Portable, Framework-Agnostic Generative UI`, published April 17, 2026
- URL: `https://developers.googleblog.com/a2ui-v0-9-generative-ui/`

The most relevant A2UI ideas for this repo are:

- portable UI intent
- client-defined functions
- client/server data sync
- resilient streaming UI updates
- framework-agnostic renderer posture

### Practical Interpretation For This Repo

The next pass should evaluate whether Career Concierge can:

- express live onboarding state as portable UI intent rather than only hardcoded panel transitions
- let the agent request UI changes through the existing deterministic tool grammar
- stream UI state changes in a way that feels native to onboarding rather than bolted onto a form
- preserve the existing React implementation while thinking in A2UI-style intent/render layers

### Important Constraint

Do not let "A2UI" become a reason to replace working Concierge infrastructure.
The correct use here is to strengthen the current guided front door, not to rebuild the entire stack around a speculative framework migration.

## Pattern References Only: Shared Signal Card Files

These references were useful for studying live-front-door patterns.
They are not Career Concierge implementation dependencies and should not be treated as product source of truth.

### `signalCardAgentSettings.ts`

Path:

- `/Volumes/Mini_2T/lenoxparis data/Dev/signal-card/shared/signalCardAgentSettings.ts`

Useful pattern:

- shared live agent settings for prompt version, voice name, turn-taking style, and identity resolution

Do not port directly:

- Signal Card identities, aliases, or product framing

### `thirdMark.ts`

Path:

- `/Volumes/Mini_2T/lenoxparis data/Dev/signal-card/shared/thirdMark.ts`

Useful pattern:

- concise live system-instruction construction
- strong opening posture
- reveal/routing discipline

Do not port directly:

- Third Mark identity
- Third Signal hierarchy
- red-phone / private-line brand language

### `signalCardLiveTools.ts`

Path:

- `/Volumes/Mini_2T/lenoxparis data/Dev/signal-card/shared/signalCardLiveTools.ts`

Useful pattern:

- explicit live tool declarations
- clear handoff boundaries
- disciplined "only promise follow-up when a real path exists" behavior

Do not port directly:

- operator brief semantics
- Alfred-specific routing
- contact capture semantics as-is

### `live-session.ts`

Path:

- `/Volumes/Mini_2T/lenoxparis data/Dev/signal-card/server/live-session.ts`

Useful pattern:

- clean separation between ephemeral token setup and live runtime config
- explicit resolution of live voice settings at session creation

Do not port directly:

- Signal Card-specific token rules or identity assumptions without checking Concierge runtime needs

### `useThirdMarkLive.ts`

Path:

- `/Volumes/Mini_2T/lenoxparis data/Dev/signal-card/client/src/hooks/useThirdMarkLive.ts`

Useful pattern:

- strong client-side live session orchestration
- audio lifecycle discipline
- explicit tool execution path

Do not port directly:

- Signal Card-specific tool semantics or persona-specific UX flows

## Suggested Next-Agent Mindset

Treat this work as a Career Concierge front-door refinement pass, not a product merger.

A good implementation outcome would:

- make the first moments feel more intentional and premium
- reduce seams between entry, orientation, and onboarding
- improve realtime guidance
- keep Career Concierge legible as Career Concierge
- leave existing services and integrations less confused, not more

A bad implementation outcome would:

- make the product sound like Signal Card
- import unrelated operator semantics
- introduce new integrations because they existed elsewhere
- replace working Concierge routes with pattern cargo culting

## Minimum Files The Next Agent Should Read First

- [components/LoginView.tsx](../../components/LoginView.tsx)
- [App.tsx](../../App.tsx)
- [components/IntakeFlow.tsx](../../components/IntakeFlow.tsx)
- [components/GeminiLivePanel.tsx](../../components/GeminiLivePanel.tsx)
- [components/ElevenLabsConvaiPanel.tsx](../../components/ElevenLabsConvaiPanel.tsx)
- [api/index.js](../../api/index.js)
- [api/config/liveIntakeTools.js](../../api/config/liveIntakeTools.js)
- [services/liveApi.ts](../../services/liveApi.ts)
- [services/voiceApi.ts](../../services/voiceApi.ts)
- [types.ts](../../types.ts)
- [docs/progress-log.md](../progress-log.md)
- [docs/backlog-ledger.md](../backlog-ledger.md)

## Final Reminder

The product in scope is Concierge Services.

Signal Card should influence:

- interaction sharpness
- live-guidance posture
- onboarding continuity
- UI-action discipline

Signal Card should not redefine:

- product identity
- service boundaries
- active integrations
- Career Concierge operating model

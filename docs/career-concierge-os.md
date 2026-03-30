# Career Concierge OS

## Purpose

Career Concierge OS is the production fork that grew out of Signal Atlas.
Signal Atlas established the editorial grid, module pattern, and agentic UI direction.
Career Concierge OS takes that pattern into a dedicated product for concierge-led career acceleration.

## Current State

The clean migration baseline now exists in the new production environment.

- canonical project: `ssai-f6191`
- Firestore DB: `career-concierge`
- API is deployed and publicly reachable at `https://career-concierge-api-tpcap5aa5a-ew.a.run.app`
- Firebase Auth and Firestore data have been moved off the original `third-signal` environment

The remaining work is product evolution and production hardening, not initial fork setup.

## Canonical Environment

- Canonical production GCP project: `ssai-f6191`
- Region: `europe-west1`
- Firestore database ID: `career-concierge`
- API service: `career-concierge-api`
- UI service: `career-concierge-suite`

## Product Surfaces

### Client Suite

The client-facing suite is a modular OS-style workspace built around:

- Smart Start Intake
- Concierge onboarding conversation
- Episodes / binge learning feed
- Brief
- Suite Distilled
- Profile
- AI Profile
- Gaps
- Readiness
- MyConcierge
- Plan
- ConciergeJobSearch execution

Intent routing now matters to the actual suite behavior:

- `current_role`: prioritize Episodes, AI Profile, Gaps, and internal-leverage planning
- `target_role`: prioritize ConciergeJobSearch, Assets, Brief, and promotion-ready execution
- `not_sure`: prioritize Profile, Gaps, MyConcierge, and exploration-first guidance

The home grid itself now stays in canonical module index order so the editorial OS remains legible. Intent changes the recommended path and downstream orchestration, not the visible tile numbering.

Tier routing also changes the visible surface:

- paid tiers unlock the full suite
- free foundation users see Intake, Episodes, SkillSync AI TV, AI Readiness, and SkillSync AI Team
- the free path uses a fixed starter playlist plus an upgrade CTA instead of the broader suite

The roadmap validation module is now treated as an operator/admin surface, not a standard client module.
It now behaves as a compact operator console rather than a single long scroll: a plan tab, charter tab, and validation tab share the same surface, and the charter confidence metrics update from live roadmap status instead of static prose alone.
That roadmap now also carries an explicit closure pass for the remaining baseline gaps:

- `E12` Lucid module expansion for `SkillSync AI TV`, `Flash Cards`, `Events & Networking`, `Telescope`, `SkillSync AI Team`, and placeholder-tile governance
- `E13` public AI Concierge onboarding plus Smart Start booking and operator booking visibility

Those tracks existed because the older Lucid analysis named the modules, but did not give the repo a committed story/AC/test stack for them. Both closure tracks are now live in product; remaining work is proof capture and polish rather than feature absence.

The Lucid-added client modules are now first-class suite surfaces:

- `SkillSync AI TV` for curated editorial programming and personalized rails
- `Flash Cards` for staged memory-route review runs tied to current themes, current plan, and local confidence persistence
- `Events & Networking` for operator-visible interest capture without fake RSVP state
- `Telescope` for `now`, `near`, and `later` opportunity framing
- `SkillSync AI Team` for client-safe explanation of the support roster and handoff options

The design target remains an editorial, cinematic workspace rather than a generic SaaS dashboard.
Modules should feel like guided surfaces inside one OS, not isolated product pages.
`Smart Start Intake` is now a guided two-column workspace instead of a generic long-form field stack:

- the voice rail now sits beside the intake form and follows the single admin-selected public lane instead of exposing a client-side lane switcher
- the form is organized into explicit sections and now shows one act at a time so the active voice lane can keep the user oriented
- Gemini Live sessions can extract structured intake signals back into empty form fields, with visible `from voice session` provenance tags
- Gemini Live now shares the same explicit intake-action tool contract as ElevenLabs Ghost, so the Google lane can focus fields, move acts, write values, clear values, update route/preferences, and summarize the visible form instead of only narrating those actions
- the compact Gemini intake rail now auto-starts the microphone when the live session opens so the client is not asked to connect twice
- Gemini Smart Start text prompts and context refreshes now flow through Live realtime text input instead of the older client-content turn path, which prevents `1007 invalid argument` socket closes during the opening question on `gemini-3.1-flash-live-preview`
- the ElevenLabs Ghost lane now uses the React SDK plus a signed-session API route, contextual updates, and intake-safe client tools so Donna can move screens, focus fields, write answers, and summarize the intake state live
- the client-facing Smart Start rail no longer renders the internal Ghost tool-action feed, and Gemini live transcript extraction now waits longer between passes so the UI does not thrash the extraction endpoint mid-conversation
- the live transcript surfaces in both Gemini and ElevenLabs now render inside explicit dark cards so in-session text stays readable against the editorial intake canvas
- the processing state now explicitly steps the active voice guide out before artifacts are available so the client is not left speaking into a dead transition
- after paid intake completes and core artifacts are written, the signed-in app now triggers a first-party Google Docs sync so the client Drive folder is repopulated without relying on the Ghost-secret-only sync endpoint
- Google Drive folder/doc creation no longer fails when the client email cannot accept Google sharing; those share errors are now treated as non-fatal so docs still render for operator/demo users with non-Google inboxes
- if post-intake Drive sync still fails, Smart Start now surfaces an explicit recovery state with `Retry Drive sync` and `Continue anyway` instead of silently handing off as if Drive publication succeeded
- the intake shell now uses a reduced Smart Start header so the form and live lane stay primary instead of losing height to module chrome
- the signed-in landing experience now pairs that intake with a lighter editorial `Your Journey Guide` surface that:
  - opens as an opt-in four-act concierge briefing instead of a tutorial modal
  - personalizes the invite copy, act headlines, and context lines from the client dossier/intake context already on file
  - highlights the live grid by act, lifting relevant modules and dimming the rest
  - uses an admin-configured journey-briefing video slot as the right-rail explainer surface

The `Brief` / `Profile` pair now also carries a research-grade Professional DNA posture:

- `The Brief` behaves as the abstract and decision memo
- `Your Profile` behaves as the full dossier
- the report now includes adaptation verdict, market-climate framing, directional market-value guidance, evidence classes, habitat recommendations, and a 90-day evolution path
- compensation is framed as a justified ask tied to scope, proof, and environment fit rather than a flat salary guess
- the client UI now renders that dossier as a terminal-grade intelligence surface rather than a restrained artifact page:
  - a top command bar with `Market Fit`, `Signal Clarity`, `Comp Index`, `Adapt Pressure`, and `Live Dossier`
  - a `Career Market Signal` panel with composite score, projection path, and four signal breakdown metrics
  - a `Market Demand Analysis` environment matrix comparing demand and fit by habitat
  - a three-rung compensation ladder (`Current`, `Narrative-Adjusted`, `Market Ceiling`)
  - a 72-hour war-room execution block and footer ticker for report freshness/evidence posture
- the Brief now degrades safely against older or partially enriched dossier artifacts instead of hard-crashing when newer telemetry fields are missing
- those UI metrics are source-backed or explicitly inferred from dossier evidence; the system no longer relies on decorative placeholder chart data

The Ghost + Google Workspace document lane now also follows a stricter identity policy:

- Ghost briefings and tool-assisted responses must use a human-readable client name or a generic fallback, never a Firebase UID
- Google Drive client folders and Google Doc titles now resolve from stored `display_name`, `demo_profile.name`, Firebase Auth profile data, or an email-derived readable label
- if older client records are sparse, the server backfills identity fields during Ghost briefing and document sync so the demo/user-facing experience stays legible

`Suite Distilled` is no longer a flat two-column strategic recap:

- the artifact now renders as a lighter editorial command-center surface instead of a simple `what I learned / what needs to happen` layout
- new intake runs and seeded personas now emit richer `suite_distilled` content with:
  - strategy thesis
  - current position vs future alpha
  - market frame and freshness note
  - career positioning matrix
  - lane recommendation
  - surgical AI playbooks
  - living sequence (`72 hours` + `2 weeks`)
  - advisor bridge
  - evidence ledger
- legacy `suite_distilled` artifacts still map into the new view safely so older client records do not crash or disappear
- current recalibration logic is still mostly artifact-driven rather than fully event-driven; the deeper live-feedback branch logic remains backlog work rather than pretending to be complete

The signed-in landing canvas now also carries a persistent `Your Journey Guide` anchor:

- the closed state is a restrained invite rail rather than a large instructional banner
- the open state is an editorial briefing, not a tutorial
- once dismissed, a small bottom-right pill remains available for re-entry
- hover/focus help for the guide uses the same ambient tooltip system as the rest of the suite so the behavior demos consistently on desktop

The suite shell is now driven by a shared brand config exposed through public config:

- official naming can change without code edits
- mint/charcoal editorial defaults can be tuned in admin
- module eyebrows, titles, and overlay quotes can be synchronized to workflow language
- a future official logo can be injected by URL and rendered in the shell header/prologue

### Admin Console

The admin console is the operational control plane for:

- runtime posture across Cloud Run, Firestore, and storage wiring
- API origin, deployment identity, and admin access mode visibility
- approval queue visibility across client ledgers
- agent registry visibility with read/write scope policy
- model routing
- voice provider routing
- Gemini Live transcription, interruption, and VAD tuning
- prompt appendices and ROM tuning
- Professional DNA research configuration for model path, prompt appendix, section lists, section order, company-posture notes, research domains, dossier refresh window, intake hero media, and Smart Start voice-agent controls
- media library targeting
- feature flags
- brand identity, color tokens, hierarchy, logo URL, and workflow-label copy
- external media configuration
- roadmap/spec progress visibility
- concierge request review
- sample persona launch/reset/proof operations
- sample persona fixtures now ship inside the API source so the Roadmap validation harness works in Cloud Run deployments
- Smart Start Intake now normalizes seeded persona answers before autofill so launch/reseed demos do not crash on sparse or mixed-shape intake payloads

This console is part of the product operating system.
It is not a temporary debug panel and should be documented and designed as a first-class surface.
The current layout is now a compact operator shell rather than a single long-form modal.
It uses:

- a left-rail navigation for section switching
- a lean left rail that acts as the operator index rather than a second dashboard
- a control-tower summary in the main canvas so runtime metrics and queue posture have enough width to read cleanly
- one active workspace at a time for generation, media, brand, voice, or governance edits
- a single-column editorial content stack so controls do not compress or overlap on medium-width laptop views
- a compact command header on smaller viewports so laptop and tablet operators still see active section context before the form fields
- a lane-readiness voice studio that treats ElevenLabs Ghost as the primary guided intake lane, Gemini Live as the parallel Google lane, Sesame as explicitly gated off, and Manus as future operator automation
- Cloud Run API env staging for Manus credentials plus ElevenLabs agent metadata so Admin can report Ghost-lane readiness without drifting back to the old conversational-widget posture
- the public concierge intake can now mount the configured ElevenLabs Ghost lane from API-served public config, and admin exposes a dedicated public-intake lane selector so operators can flip between Gemini and ElevenLabs Ghost without touching env vars
- the intake concierge step now follows the saved admin lane cleanly instead of showing a client-visible lane switcher
- the public-intake lane selector is now the persisted global default, so `/v1/public/config` reflects the saved admin choice instead of forcing Gemini when ElevenLabs Ghost is available
- a top-command client module shell instead of the old split left-rail modal so episodes, TV, and artifact modules have a wider presentation canvas
- the client module shell now keeps a stable editorial header and floating close rail instead of scroll-collapsing the header, which removes the desktop bounce/stutter issue when long module pages are scrolled
- mobile and tablet module shells now retreat secondary chrome so the narrative stage stays primary when media is present
- a persistent save rail with explicit unsaved-state feedback
- collapsible media-library editing so large libraries do not overwhelm the modal
- taxonomy shortcut chips inside the media-library editor so reusable media can be tagged consistently instead of relying only on free-form tag entry
- a one-click starter media pack so operators can seed reusable episode routes without hand-authoring every initial library item
- the Episodes module now loads routed curated media for free-tier/demo users as well, so the cinematic stage remains visible instead of dropping to text-only beats
- the Episodes client player now treats media as beat-aware stage slots rather than one persistent companion clip, and it renders designed fallback stills/cards whenever a beat has no routed asset yet
- Brand Studio preview now mirrors the actual suite shell plus module-overlay composition instead of a left-rail-only proof block
- the shared modal shell now follows a viewport-first density rule: compact editorial header, inline context chips, and paused-hover ambient guidance instead of oversized stacked framing blocks
- a future media-pipeline operations section that can inherit the same compact control-tower structure

The operating surface still comes first, but it now behaves like a structured backstage OS instead of a stacked settings page.
Brand Studio is now part of that write surface and is the canonical place to tune the editorial grid shell.
The `Experience` rail now also exposes the Professional DNA research lane directly, so operators can edit the dossier prompt appendix, choose the model path, change which report sections are generated, tune the research-domain list, and set the report refresh window without touching code.
That `Experience` rail is now a guided operator workspace rather than a raw config stack:

- a narrower content canvas keeps the section readable on laptop-width screens
- onboarding-style help cards explain what changes here, what is safe to edit first, and what the Professional DNA lane affects downstream
- dossier sections and research domains are now option chips instead of newline textareas
- dossier section order is now controlled through explicit up/down ordering rather than raw key editing
- prompt overlays remain editable, but are grouped into smaller field cards with scope-specific guidance
- intake hero video, fallback media, voice-lane defaults, transcript visibility, and voice-to-form autofill are now part of the same admin surface

The next planned admin expansion is a dedicated orchestration operating section for staff registry visibility, run monitoring, handoff-policy control, approvals, and evaluation state.
That orchestration operating section is now partially live in `Governance`: operators can inspect the expanded staff registry, the default intent/tier policy graph, and recent confidence-bearing orchestration runs without leaving Admin.
For demo/operator continuity, admin access now accepts Firebase `admin` or `staff` claims, allowlisted `ADMIN_EMAILS`, and a baked-in operator fallback for `operator@thirdsignal.ai` plus `gws@conciergecareerservices.com`.
The suite header now shows a visible `Admin Locked` state instead of silently hiding the control when the current account fails the admin check.
The admin API client now retries transient `502`/`503`/`504` and network fetch failures before surfacing a save/load error to the operator.
The roadmap validation rail now doubles as a sample-persona harness: operators can launch seeded personas with an admin-gated custom-token flow, reseed them deterministically, and record proof capture from one surface.
Sample persona launch is designed for a session-scoped preview tab so the original operator tab remains the admin control surface.

### Progress Log Discipline

Backlog-to-implementation status is tracked in `docs/progress-log.md`.
Story-level status plus execution history is tracked in `docs/backlog-ledger.md`.
Demo task sequencing by persona is tracked in `docs/mvp/demo_master_tasklist.md`.
The roadmap validation module mirrors these logs, so all three must be updated in the same pass as product changes.
The in-app roadmap now carries the shipped client-facing Episodes player plus the still-queued Content Director media pipeline so product delivery and future architecture work remain visible together.
The roadmap overview now prefers compact phase cards over full-width strips so the operator can scan more of the execution plan without extra scroll.

Episodes now default to a client-facing cinematic player. Admins can still access BTS media-routing and generation controls, but only through an explicit operator mode inside the Episodes module.
That operator rail now also surfaces the library-first media resolver summary:

- routed media still comes from the curated library
- the resolver checks the Phase A episode plan for reusable tags and bespoke candidates
- unresolved reusable tags are logged as reusable-kit gaps
- client-specific narrative needs are logged as bespoke gaps
- the decision summary is written back into `clients/{uid}/orchestration_runs/content_director_phase_a`

Generated media is no longer only an in-memory response. The current pipeline layer now persists:

- `clients/{uid}/media_jobs/{jobId}` for execution status
- `clients/{uid}/media_manifests/{manifestId}` for assembled episode-media records
- generated image binaries into Cloud Storage when a storage bucket is configured
- video-status refresh updates back into the same job/manifest pair

That queued media-pipeline track explicitly includes a future Admin Console operating section for queue monitoring, retries, approvals, library management, provider configuration, and failure inspection.
That admin media operating section is now partially live: operators can inspect recent jobs/manifests, prompt lineage, retry requests, review state, and reusable-versus-bespoke gap posture inside the `Media` section of Admin.
That media operating section now also supports worker-ready queue processing: operators can process an individual queued job or trigger the pending queue directly from admin without relying only on inline episode generation.
The public login surface now also serves as the AI Concierge / Smart Start request entry: leads can submit a concise request with service intent, optional resume link, and structured date/time/timezone preferences, and those requests persist into Firestore for operator review.
MyConcierge now makes the AI-versus-human concierge boundary explicit and can create a tracked human follow-up request from the authenticated client journey.
The boundary is now explicit in the product model as well:

- client-facing Episodes surfaces render final staged media only
- operator/admin surfaces carry queue state, prompt lineage, review decisions, and retry controls

The roadmap now also carries the shipped agentic staff operating model so the canonical roles, handoffs, and stack boundaries are explicit before more agents are added.
The same roadmap surface now visualizes the execution charter directly so operators can reference baseline confidence, staffing posture, and highest-risk gaps without leaving the modal.
The roadmap `Plan` view now uses a stacked execution brief instead of narrow sprint columns, so roadmap phases, gaps, and active work remain readable on laptop-width screens.
The confidence model itself now treats partially-modeled checkpoints as floors rather than hard caps, so closure-pass epics can raise baseline confidence as they are actually shipped.
With `E09` through `E13` now marked done in the roadmap data, the live operator modal sits above the original `90%` target for both baseline and execution confidence; the remaining climb toward `95%` depends on persona proof capture, mobile polish, and any residual approval-flow work in `E02`.

### API Layer

The Express API under `api/` handles:

- Firebase token verification
- admin config reads and writes
- public brand-config reads for the suite shell
- suite artifact generation
- intake transcript extraction for Smart Start voice sessions
- post-intake Professional DNA dossier enrichment with a dedicated `dna_research_analyst` role
- CJS execution rail endpoints (resume upload/review/strategy)
  - Smart Start can now convert a real `resume_source` URL into a CJS resume asset automatically after paid intake completion
  - intake-created resume links are stored as `intake_reference` assets, deduped by URL, and intentionally treated as lighter evidence than a true uploaded file
  - ConciergeJobSearch now prioritizes uploaded resume files over intake references when listing assets or generating `resume_review`, so repeat intake runs do not silently displace the real working resume
- interaction ledger + approval endpoints
- agent registry endpoint
- admin system overview endpoint for runtime + policy visibility
- explicit agent scope enforcement for core orchestration roles
- suite generation now runs in two layers for paid-suite users:
  - the core artifact pass
  - a Professional DNA research pass that upgrades `brief` and `profile` before downstream planning continues
- the live intake token route now appends a configurable seven-stage Smart Start interview arc to the Gemini Live system instruction
- the new `/v1/intake/extract` route converts Smart Start transcripts into high-confidence partial intake fields and falls back to deterministic extraction when the model path is unavailable
- the DNA research lane writes upgraded `brief` / `profile` content back into Firestore and logs an orchestration run so governance can inspect the handoff
- the DNA lane now hydrates a stricter dossier contract:
  - signal-strip metrics
  - market-signal composite + projection path
  - market-demand environment analysis
  - compensation ladder
  - report ticker metadata
  - source registry and evidence-node appendix
- the current source spine is official-public-data-first:
  - BLS Employment Situation
  - BLS JOLTS
  - BLS Occupational Outlook Handbook
  - O*NET role baselines
  - DOL WARN overview when supply-shock posture matters
- binge episode generation with persona-derived topic routing when no explicit target skill is supplied
- live token generation
- voice synthesis routing
- deterministic persona fixture seeding for demo/test (`api/scripts/seed_persona_fixtures.mjs`) with full account hydration
- shared sample-persona password reset on auth create/reseed for direct manual testing
- deploy-time bootstrap for `iamjimbutler@gmail.com` and `jazminbutler@me.com` so those users remain admin-eligible and default to the shared demo password
- operator speed-run intake autofill so seeded persona context can prefill or directly prepare a suite without hand-entering every intake field
- SkillSync AI TV now stages a real client-safe viewing surface with embed/direct-video support and a placeholder hero when no published reel exists
- the starter curated-media library now ships with local Veo-generated TV clips and auto-fills the runtime library whenever no saved curated library exists yet

## Architecture Summary

### Frontend

- Vite + React
- Firebase client SDK for Auth + Firestore access
- environment-driven Firebase configuration via `VITE_FIREBASE_*`

### Backend

- Cloud Run service built from `api/`
- Express + `firebase-admin`
- Gemini-backed generation routes
- ElevenLabs Ghost is now the primary guided intake lane when configured
- Sesame remains feature-flagged off until a dedicated service exists
- ElevenLabs Ghost is now a live selectable public-intake lane when the Cloud Run API env exposes an agent ID, an API key, and the saved admin config chooses it
- Gemini Live now defaults to Google’s current `gemini-3.1-flash-live-preview` model; the older `gemini-2.5-flash-native-audio-preview-12-2025` lane remains available only as a controlled fallback
- the public-intake lane decision now follows `voice.public_panel_provider` as the canonical saved source instead of letting stale Professional DNA voice settings override the operator choice
- Gemini public-lane voice selection now follows `voice.gemini_voice_name` directly; the older Professional DNA `voice_agent_voice_id` field is no longer allowed to shadow the saved Gemini voice
- `POST /v1/voice/elevenlabs/session` now creates signed ElevenLabs sessions for authenticated users so the Ghost lane can run as a real SDK surface instead of a widget-only fallback
- Manus remains a queued external lane, not an active runtime dependency
- Google Workspace doc sync now prefers human-readable folder/document names, refuses UUID-like display names during auth backfill, reuses matching docs when registry entries are missing, recreates cleanly when a registry entry points at a deleted/inaccessible Google Doc, and archives same-title duplicates into `_Legacy duplicates` during sync instead of spraying new docs into the active folder
- the Cloud Run API runtime now depends on Firestore data access via `roles/datastore.user` on the service account; without that role, admin config writes and admin telemetry surfaces will fail with `PERMISSION_DENIED`
- admin media-pipeline status messaging now translates known provider/config mismatches into operator-safe language instead of leaking raw Gemini option errors
- model routing is now governed by a shared Gemini/Veo catalog rather than ad hoc raw defaults, and Admin exposes quick presets for `Demo Quality`, `Balanced Production`, and `High Throughput`
- stable `Gemini 2.5` routes are now the production defaults for suite, episode, and still-generation work; `Gemini 3.x` and `3.1` preview ids remain visible as explicit migration/testing options rather than silent defaults
- the current Episodes audit is documented in `docs/mvp/episodes_hero_critical_audit_2026-03-09.md`; the headline conclusion is that the player is demo-ready but the backend is still not truly scene-native because media packs remain one-image/one-video per episode
- public HTTPS entrypoint expected for SPA and mobile clients

The frontend now resolves its API origin in this order:

1. explicit `VITE_CONCIERGE_API_URL` when it points at a non-canonical target
2. sibling Cloud Run API host derived from the current `career-concierge-suite-*` URL
3. canonical fallback API URL

This prevents repo-connected UI deployments in alternate Cloud Run environments from accidentally calling the wrong API service by default. `.env.production` intentionally leaves `VITE_CONCIERGE_API_URL` unset so sibling auto-discovery can work across environments.

For repo-connected Cloud Run deploys, the API service must build from `api/` using either `api/Dockerfile` or a buildpack context directory of `api`. Backend runtime imports must remain inside that subtree as well. If the deployed API URL returns the suite HTML shell, the service is misconfigured and browser admin checks will fail before auth logic is reached.

### Data Model

Primary collections:

- `system/career-concierge-config`
- `system/agent-registry`
- `clients/{clientId}`
- `clients/{clientId}/artifacts/{artifactType}`
- `clients/{clientId}/assets/{assetId}`
- `clients/{clientId}/interactions/{interactionId}`

Interaction ledger documents now carry client identity metadata so admin operators can work a global queue without losing ownership context.
The admin console now consumes a dedicated system overview surface so operators can inspect runtime target, queue pressure, and agent policy before editing raw configuration fields.
The planned next evolution is to extend that operator visibility from policy snapshots into a full orchestration control plane rooted in the same Firebase/GCP stack.
That evolution has now started for media orchestration: suite generation seeds `clients/{uid}/learning_plans/content_director_phase_a`, `clients/{uid}/episode_plans/content_director_phase_a`, and `clients/{uid}/orchestration_runs/content_director_phase_a` as soon as intake and first-order artifacts exist.

## Relationship To Signal Atlas

Signal Atlas remains the conceptual and design ancestor.
Career Concierge OS is not just a theme variant. It is its own operational product with its own:

- Firebase project
- Firestore data
- Cloud Run services
- admin configuration
- migration and deployment runbooks
- documentation standard tied to implementation changes

## Current Platform Constraints

### Public Cloud Run

This product assumes the browser can reach the UI and API over public HTTPS.
App-level auth is enforced inside the application and API.

That policy blocker existed during migration and has already been resolved for the API service in `ssai-f6191`.
If it reappears, treat it as a platform issue first, not an application bug.

### Password User Migration

Source password-hash settings from the legacy Firebase project were not recovered through the available admin config path.
The operational fallback is the password reset workflow documented in `docs/operations-runbook.md`.

## Design Direction

The intended experience is not a generic SaaS dashboard.
The product direction is an editorial, cinematic, OS-like workspace with:

- semantic color usage
- agent-guided progression
- media as narrative structure
- configurable multimodal outputs
- operator-grade admin controls behind a refined interface
- explicit staff governance rather than hidden prompt sprawl

## Documentation Rule

This product now treats documentation as part of the release surface.
If product behavior, deployment shape, Firebase wiring, admin controls, or migration status change, the matching docs must change in the same work.

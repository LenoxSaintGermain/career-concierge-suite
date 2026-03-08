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
- `Flash Cards` for lightweight reinforcement tied to current themes
- `Events & Networking` for operator-visible interest capture without fake RSVP state
- `Telescope` for `now`, `near`, and `later` opportunity framing
- `SkillSync AI Team` for client-safe explanation of the support roster and handoff options

The design target remains an editorial, cinematic workspace rather than a generic SaaS dashboard.
Modules should feel like guided surfaces inside one OS, not isolated product pages.

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
- media library targeting
- feature flags
- brand identity, color tokens, hierarchy, logo URL, and workflow-label copy
- external media configuration
- roadmap/spec progress visibility
- concierge request review
- sample persona launch/reset/proof operations

This console is part of the product operating system.
It is not a temporary debug panel and should be documented and designed as a first-class surface.
The current layout is now a compact operator shell rather than a single long-form modal.
It uses:

- a left-rail navigation for section switching
- a control-tower summary as the read-only operating surface
- one active workspace at a time for generation, media, brand, voice, or governance edits
- a single-column editorial content stack so controls do not compress or overlap on medium-width laptop views
- a lane-readiness voice studio that treats Gemini Live as the active rail, Sesame as explicitly gated off, and ElevenLabs/Manus as planned future lanes
- a top-command admin layout instead of a permanent desktop side rail so the operating canvas scales on laptop-width modals
- a top-command client module shell instead of the old split left-rail modal so episodes, TV, and artifact modules have a wider presentation canvas
- a persistent save rail with explicit unsaved-state feedback
- collapsible media-library editing so large libraries do not overwhelm the modal
- taxonomy shortcut chips inside the media-library editor so reusable media can be tagged consistently instead of relying only on free-form tag entry
- a one-click starter media pack so operators can seed reusable episode routes without hand-authoring every initial library item
- a future media-pipeline operations section that can inherit the same compact control-tower structure

The operating surface still comes first, but it now behaves like a structured backstage OS instead of a stacked settings page.
Brand Studio is now part of that write surface and is the canonical place to tune the editorial grid shell.
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
- CJS execution rail endpoints (resume upload/review/strategy)
- interaction ledger + approval endpoints
- agent registry endpoint
- admin system overview endpoint for runtime + policy visibility
- explicit agent scope enforcement for core orchestration roles
- binge episode generation with persona-derived topic routing when no explicit target skill is supplied
- live token generation
- voice synthesis routing
- deterministic persona fixture seeding for demo/test (`api/scripts/seed_persona_fixtures.mjs`) with full account hydration
- shared sample-persona password reset on auth create/reseed for direct manual testing
- operator speed-run intake autofill so seeded persona context can prefill or directly prepare a suite without hand-entering every intake field
- SkillSync AI TV now stages a real client-safe viewing surface with embed/direct-video support and a placeholder hero when no published reel exists

## Architecture Summary

### Frontend

- Vite + React
- Firebase client SDK for Auth + Firestore access
- environment-driven Firebase configuration via `VITE_FIREBASE_*`

### Backend

- Cloud Run service built from `api/`
- Express + `firebase-admin`
- Gemini-backed generation routes
- Gemini Live is the default active voice lane
- Sesame remains feature-flagged off until a dedicated service exists
- ElevenLabs and Manus remain queued external lanes, not active runtime dependencies
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

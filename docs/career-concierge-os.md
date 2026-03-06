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

Intent routing now matters to the actual suite order and behavior:

- `current_role`: prioritize Episodes, AI Profile, Gaps, and internal-leverage planning
- `target_role`: prioritize ConciergeJobSearch, Assets, Brief, and promotion-ready execution
- `not_sure`: prioritize Profile, Gaps, MyConcierge, and exploration-first guidance

Tier routing also changes the visible surface:

- paid tiers unlock the full suite
- free foundation users only see Intake, Episodes, and AI Readiness
- the free path uses a fixed starter playlist plus an upgrade CTA instead of the broader suite

The roadmap validation module is now treated as an operator/admin surface, not a standard client module.
It now behaves as a compact operator console rather than a single long scroll: a plan tab, charter tab, and validation tab share the same surface, and the charter confidence metrics update from live roadmap status instead of static prose alone.

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
- prompt appendices and ROM tuning
- media library targeting
- feature flags
- brand identity, color tokens, hierarchy, logo URL, and workflow-label copy
- external media configuration
- roadmap/spec progress visibility

This console is part of the product operating system.
It is not a temporary debug panel and should be documented and designed as a first-class surface.
The current layout is split into a read-only operating surface first, followed by the write surfaces for active config.
Brand Studio is now part of that write surface and is the canonical place to tune the editorial grid shell.
The next planned admin expansion is a dedicated orchestration operating section for staff registry visibility, run monitoring, handoff-policy control, approvals, and evaluation state.
For demo/operator continuity, admin access now accepts Firebase `admin` or `staff` claims, allowlisted `ADMIN_EMAILS`, and a baked-in operator fallback for `operator@thirdsignal.ai` plus `gws@conciergecareerservices.com`.
The suite header now shows a visible `Admin Locked` state instead of silently hiding the control when the current account fails the admin check.

### Progress Log Discipline

Backlog-to-implementation status is tracked in `docs/progress-log.md`.
Story-level status plus execution history is tracked in `docs/backlog-ledger.md`.
Demo task sequencing by persona is tracked in `docs/mvp/demo_master_tasklist.md`.
The roadmap validation module mirrors these logs, so all three must be updated in the same pass as product changes.
The in-app roadmap now also carries queued planning tracks for the client-facing Episodes redesign and the Content Director media pipeline so design/architecture work is visible before implementation begins.
That queued media-pipeline track explicitly includes a future Admin Console operating section for queue monitoring, retries, approvals, library management, provider configuration, and failure inspection.
The roadmap now also carries a queued agentic staff operating-model track so the canonical roles, handoffs, and stack boundaries are explicit before more agents are added.
The same roadmap surface now visualizes the execution charter directly so operators can reference baseline confidence, staffing posture, and highest-risk gaps without leaving the modal.

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

## Architecture Summary

### Frontend

- Vite + React
- Firebase client SDK for Auth + Firestore access
- environment-driven Firebase configuration via `VITE_FIREBASE_*`

### Backend

- Cloud Run service built from `api/`
- Express + `firebase-admin`
- Gemini-backed generation routes
- optional external voice routing
- public HTTPS entrypoint expected for SPA and mobile clients

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

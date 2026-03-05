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
- Plan
- ConciergeJobSearch execution
- Roadmap and validation module with epic/story testing grid

The design target remains an editorial, cinematic workspace rather than a generic SaaS dashboard.
Modules should feel like guided surfaces inside one OS, not isolated product pages.

### Admin Console

The admin console is the operational control plane for:

- model routing
- voice provider routing
- prompt appendices and ROM tuning
- media library targeting
- feature flags
- external media configuration
- roadmap/spec progress visibility

This console is part of the product operating system.
It is not a temporary debug panel and should be documented and designed as a first-class surface.

### Progress Log Discipline

Backlog-to-implementation status is tracked in `docs/progress-log.md`.
Story-level status plus execution history is tracked in `docs/backlog-ledger.md`.
Demo task sequencing by persona is tracked in `docs/mvp/demo_master_tasklist.md`.
The roadmap validation module mirrors these logs, so all three must be updated in the same pass as product changes.

### API Layer

The Express API under `api/` handles:

- Firebase token verification
- admin config reads and writes
- suite artifact generation
- CJS execution rail endpoints (resume upload/review/strategy)
- interaction ledger + approval endpoints
- agent registry endpoint
- explicit agent scope enforcement for core orchestration roles
- binge episode generation
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

## Documentation Rule

This product now treats documentation as part of the release surface.
If product behavior, deployment shape, Firebase wiring, admin controls, or migration status change, the matching docs must change in the same work.

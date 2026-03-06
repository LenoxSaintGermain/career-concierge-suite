# Career Concierge OS

Career Concierge OS is the production fork of Signal Atlas.
Signal Atlas established the editorial grid, module pattern, and agentic UX direction.
This fork carries that pattern into a dedicated concierge-led career acceleration product with its own Firebase project, Firestore data, Cloud Run services, and admin operating model.

## Canonical Production Environment

- Firebase / GCP project: `ssai-f6191`
- Region: `europe-west1`
- Firestore database ID: `career-concierge`
- API service: `career-concierge-api`
- UI service: `career-concierge-suite`
- Current API URL: `https://career-concierge-api-tpcap5aa5a-ew.a.run.app`
- Current UI URL: `https://career-concierge-suite-tpcap5aa5a-ew.a.run.app`

## Local Development

Prerequisites:

- Node.js

Setup:

1. Install dependencies:
   - `npm install`
2. Create local env:
   - `cp .env.local.example .env.local`
3. Set required values in `.env.local`:
   - `GEMINI_API_KEY`
   - `VITE_CONCIERGE_API_URL`
   - `VITE_FIREBASE_*`
4. Start the app:
   - `npm run dev`

## Voice Engine Routing

The onboarding flow supports concierge voice playback through `POST /v1/voice/synthesize` on the Cloud Run API.

Provider options:

- `sesame`
- `gemini_live`

API env options for `sesame`:

- `SESAME_API_URL`
- `SESAME_API_KEY`
- `SESAME_AUTH_HEADER`
- `SESAME_AUTH_PREFIX`
- `SESAME_TIMEOUT_MS`

API env options for `gemini_live`:

- `GEMINI_MODEL_LIVE_VOICE`
- `GEMINI_VOICE_NAME`
- `GEMINI_LIVE_TIMEOUT_MS`
- `GEMINI_LIVE_VAD_SILENCE_MS`
- `GEMINI_LIVE_VAD_PREFIX_MS`
- `GEMINI_LIVE_VAD_START`
- `GEMINI_LIVE_VAD_END`

Admin controls expose:

- provider toggle
- route/model selection
- prompt appendices
- speaker / temperature / max length

## Backlog Completion Pass (E2E Demo Surfaces)

Current pass shipped these backlog-critical features:

- CJS execution rail API + UI
  - resume upload
  - resume review generation
  - search strategy generation
- Chief of Staff interaction ledger in `Assets`
  - summary generation
  - pending approval queue
  - admin approve/reject actions
- Free-tier journey gating
  - simplified intake field set
  - limited module visibility
  - readiness resource guide + upgrade CTA
- Intent-based module ordering on suite home

New API routes:

- `GET /v1/agents/registry`
- `GET /v1/cjs/assets`
- `POST /v1/cjs/resume/upload`
- `POST /v1/cjs/resume/review`
- `POST /v1/cjs/search/strategy`
- `GET /v1/interactions`
- `POST /v1/interactions/chief-of-staff`
- `POST /v1/interactions/:interactionId/decision`
- `GET /v1/admin/system-overview`
- `GET /v1/admin/approval-queue`
- `POST /v1/admin/approval-queue/:clientUid/:interactionId/decision`

## Deployment

Deploy API:

- `bash scripts/deploy_api_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.api.yaml`

Deploy UI:

- `bash scripts/deploy_ui_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.ui.env`

Important:

- API must deploy from `./api`
- UI must deploy from repo root
- this architecture expects public Cloud Run reachability, with app-level auth enforced inside the API and frontend
- frontend Firebase defaults now target `ssai-f6191` if `VITE_FIREBASE_*` vars are missing at build time

## Demo Persona Fixtures (MTL-01)

Seed deterministic test personas from `docs/mvp/test_user_specs.md` mappings.
The seeder now hydrates full demo accounts:

- Auth identity (optional)
- client identity + intake profile
- all artifact modules (`brief`, `suite_distilled`, `plan`, `profile`, `ai_profile`, `gaps`, `readiness`, `cjs_execution`)
- `assets` seed records
- `interactions` seed summary

- fixture source: `config/demo/persona-fixtures.json`
- seed script: `api/scripts/seed_persona_fixtures.mjs`

Dry run:

- `npm run demo:fixtures:seed -- --dry-run --project ssai-f6191 --database-id career-concierge`

Write full hydrated Firestore records:

- `npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge`

Write hydrated Firestore + create/update Auth users (shared temporary password):

- `npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge --auth --password '<temporary-password>'`

Optional flags:

- `--no-artifacts`
- `--no-assets`
- `--no-interactions`
- `--no-intro-seen`

If ADC is stale before running:

- `gcloud auth login`
- `gcloud auth application-default login`

## Documentation Set

Core docs for this fork:

- `docs/career-concierge-fork.md`
- `docs/career-concierge-os.md`
- `docs/operations-runbook.md`
- `docs/ssai-production-migration.md`
- `docs/decision-log.md`
- `docs/progress-log.md`
- `docs/backlog-ledger.md`
- `docs/mvp/demo_master_tasklist.md`
- `docs/documentation-map.md`

## Documentation Workflow

Run the impact helper whenever production behavior changes:

- `npm run docs:impact -- <changed-file> [more-files...]`

This repo also has a dedicated local Codex skill:

- `career-concierge-docs`

Use it whenever architecture, deployment, Firebase/GCP, admin controls, modules, live voice/media, or migration state changes.

Roadmap discipline:

- Keep `docs/progress-log.md` updated in the same pass as feature work.
- Keep `docs/backlog-ledger.md` updated with story-level status and execution rows in the same pass.
- Keep `docs/mvp/demo_master_tasklist.md` aligned with test-user acceptance criteria and in-app roadmap tasks.
- The in-app Roadmap validation module reflects these logs and should not drift from implementation reality.

## Current Migration Status

- canonical target is now `ssai-f6191`
- Firestore database `career-concierge` exists in `europe-west1`
- Firestore data has been copied from `third-signal`
- Firebase Auth users have been imported
- API is deployed and publicly reachable
- password-based legacy users may still require the reset workflow documented in `docs/operations-runbook.md`

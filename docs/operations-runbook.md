# Operations Runbook

## Core Services

- API: `career-concierge-api`
- UI: `career-concierge-suite`
- Firebase project: `ssai-f6191`
- Firestore DB: `career-concierge`
- Region: `europe-west1`
- Public API URL: `https://career-concierge-api-tpcap5aa5a-ew.a.run.app`
- Public UI URL: `https://career-concierge-suite-tpcap5aa5a-ew.a.run.app`

## API Origin Resolution

The frontend now resolves API origin in this order:

1. explicit `VITE_CONCIERGE_API_URL` when it points at a non-canonical target
2. sibling Cloud Run API host derived from the current UI host
3. canonical fallback API URL

Operational implication:

- if UI and API are deployed as sibling `career-concierge-suite-*` and `career-concierge-api-*` services in the same Cloud Run environment, the UI should reach the matching API automatically
- you only need to set `VITE_CONCIERGE_API_URL` when intentionally pointing the UI at a non-sibling API
- `.env.production` should normally leave `VITE_CONCIERGE_API_URL` unset so repo-based Cloud Run builds do not pin alternate environments to the canonical `ssai-f6191` API host

## Local Auth Alignment

The local UI and API should authenticate against the same Firebase project:

- the frontend defaults to `ssai-f6191` when `VITE_FIREBASE_*` vars are missing
- the local API now also pins Firebase Admin verification to `ssai-f6191` unless `FIREBASE_PROJECT_ID` is set explicitly
- this prevents `401 invalid_token` failures on authenticated routes like `/v1/live/token` when your machine's active `gcloud` project is something else
- use `npm run dev:local` from repo root when you want the Vite UI and local API to come up together for browser validation

If local auth or Firestore calls still fail, refresh ADC:

```bash
gcloud auth login
gcloud auth application-default login
```

## Deploy API

```bash
bash scripts/deploy_api_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.api.yaml
```

For Cloud Run repository deployments, `career-concierge-api` must build from the `api/` subtree:

- Dockerfile source location: `api/Dockerfile`
- or buildpack context directory: `api`
- any backend runtime dependency imported by `api/index.js` must also exist inside `api/`

Failure signature:

- `https://career-concierge-api-<env>.run.app/v1/public/config` returns SPA HTML
- response banner shows `nginx`
- browser calls from the suite fail with CORS because the service is actually serving the UI container
- Cloud Run revision fails startup with `ERR_MODULE_NOT_FOUND` for files imported from outside the `api/` subtree

Admin overview behavior:

- `/v1/admin/system-overview` now degrades gracefully if queue telemetry reads are denied
- config editing remains available, while the UI shows a queue visibility warning instead of failing the full modal
- the `Experience` rail now also governs the Professional DNA research lane:
  - `professional_dna.enabled`
  - `professional_dna.base_model`
  - `professional_dna.research_model`
  - `professional_dna.prompt_appendix`
  - `professional_dna.enabled_sections`
  - `professional_dna.section_order`
  - `professional_dna.company_posture_notes_enabled`
  - `professional_dna.research_domains`
  - `professional_dna.refresh_window_days`
  - `professional_dna.hero_*`
  - `professional_dna.voice_agent_*`
  - `professional_dna.voice_transcription_visible`
  - `professional_dna.voice_to_form_autofill`
- the `Experience` rail is intentionally no longer a free-form textarea stack:
  - prompt overlays stay editable as scoped appendix cards
  - Professional DNA sections and research domains are toggled from predefined option sets
  - dossier section order is adjusted with explicit ordering controls
  - custom section/domain keys already stored in config are preserved and surfaced as preserved custom values
  - Smart Start hero video and voice-agent controls now live under the same `Professional DNA` rail instead of hidden env-only configuration

If using a standalone Cloud Build trigger instead of Cloud Run's repo-connected deploy, use `cloudbuild.api.yaml`. A single raw `docker build` trigger is insufficient because it does not roll the new image onto the `career-concierge-api` service.
That build config also sets `logging: CLOUD_LOGGING_ONLY` so triggers using a dedicated service account do not fail on logs-bucket validation.

## Deploy UI

```bash
bash scripts/deploy_ui_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.ui.env
```

## Donna Live Test Surface

Use these sibling-named services when you need a fresh Cloud Run URL for Donna/front-door testing while keeping the same `ssai-f6191` project and `career-concierge` Firestore database:

- API service: `career-concierge-api-donna-live`
- UI service: `career-concierge-suite-donna-live`
- Deterministic UI URL: `https://career-concierge-suite-donna-live-480846059254.europe-west1.run.app`
- Deterministic API URL: `https://career-concierge-api-donna-live-480846059254.europe-west1.run.app`
- Service alias UI URL: `https://career-concierge-suite-donna-live-tpcap5aa5a-ew.a.run.app`
- Service alias API URL: `https://career-concierge-api-donna-live-tpcap5aa5a-ew.a.run.app`

Current validated revisions as of 2026-05-08:

- UI: `career-concierge-suite-donna-live-00004-th7`
- API: `career-concierge-api-donna-live-00004-6zv`

Deploy both in one pass with:

```bash
bash scripts/deploy_donna_live_test.sh ssai-f6191 europe-west1
```

Local non-committed env files expected by that helper:

- `.context/deploy/ssai-f6191.donna-live.api.yaml`
- `.context/deploy/ssai-f6191.donna-live.ui.env`

The Donna UI env intentionally leaves `VITE_CONCIERGE_API_URL` unset so the browser can auto-target the sibling API URL for the fresh Cloud Run service.

Smoke checks after deploy:

```bash
curl -sSI https://career-concierge-suite-donna-live-480846059254.europe-west1.run.app
curl -sS https://career-concierge-api-donna-live-480846059254.europe-west1.run.app/health
curl -sS https://career-concierge-api-donna-live-480846059254.europe-west1.run.app/v1/public/config
```

`POST /v1/live/token` should return `401` without a Firebase user token. Validate the actual Gemini microphone/session path from an authenticated browser session.

## Public Access Requirement

Both Cloud Run services are expected to be publicly invocable.
If a deploy succeeds but public requests return `403`, check Cloud Run IAM and organization policy before changing app code.

Current state:

- API public access is working in `ssai-f6191`
- UI public access must be validated after each deploy
- if the API service is public but `/v1/public/config` returns HTML, fix the repo build target before debugging auth or CORS

## Firestore Rules

Deploy concierge rules with:

```bash
npx -y firebase-tools deploy --only "firestore:career-concierge" --project ssai-f6191
```

## Auth Migration Fallback

Password users requiring reset are derived from `.context/auth-export-ssai.json`.

Dry run:

```bash
npm run auth:resets:dry-run
```

Send reset emails:

```bash
node scripts/send_password_reset_emails.mjs \
  --api-key <ssai-f6191-web-api-key> \
  --send \
  --output .context/password-reset-report.sent.json
```

## Demo Persona Fixture Seeding (MTL-01)

Use deterministic persona fixtures for repeatable E2E and demo runs.
Seeder writes a full hydrated account surface (identity + intake + artifacts + assets + interaction seed).

Sources:

- `config/demo/persona-fixtures.json`
- `docs/mvp/test_user_specs.md`

Dry run (no writes):

```bash
npm run demo:fixtures:seed -- --dry-run --project ssai-f6191 --database-id career-concierge
```

Seed Firestore client docs:

```bash
npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge
```

Seed Firestore + Firebase Auth users:

```bash
npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge --auth
```

Default shared demo-persona password: `CareerDemo!2026`

Override it only if you explicitly need a different temporary password:

```bash
npm run demo:fixtures:seed -- --project ssai-f6191 --database-id career-concierge --auth --password '<temporary-password>'
```

Optional reduction flags:

```bash
--no-artifacts --no-assets --no-interactions --no-intro-seen
```

Output report (default):

- `.context/persona-seed-report.json`

If auth/Firestore calls fail with `invalid_rapt`, refresh local Google auth first:

```bash
gcloud auth login
gcloud auth application-default login
```

## Admin Access

Production admin access depends on API-side `ADMIN_EMAILS` and any future claims strategy.
Keep `ADMIN_EMAILS` populated in the API env file.

Optional external-lane envs in the API deploy file:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_AGENT_BRANCH_ID`
- `MANUS_API_KEY`
- `MANUS_API_URL`

These now support a live public-intake ElevenLabs Ghost lane plus Manus readiness visibility.
Gemini Live remains the Google first-party runtime. ElevenLabs Ghost now runs as an SDK-backed signed-session lane for intake and demo use.

Current public-intake behavior:

- if `ELEVENLABS_AGENT_ID` is present, `/v1/public/config` exposes the public agent ID
- admin voice controls expose a `Public intake lane` selector with `gemini_live` and `elevenlabs`
- `/v1/public/config` now follows the saved `voice.public_panel_provider` default from Firestore
- the intake concierge step follows that selector and mounts the chosen lane directly inside the Smart Start workspace
- the intake concierge step no longer exposes a client-visible lane switcher; the live lane is now fully controlled from Admin
- admin `Voice model` and `Public intake lane` controls now save in lockstep so the public lane does not drift from the saved Professional DNA voice choice
- Gemini Live now defaults to `gemini-3.1-flash-live-preview`, the current Google Live API model; `gemini-2.5-flash-native-audio-latest` and `gemini-2.5-flash-native-audio-preview-12-2025` remain available only as controlled fallback options
- Gemini Smart Start sessions now share the same explicit intake-action tool contract as ElevenLabs Ghost, so Google Live can move sections, focus fields, write values, clear values, update route/preferences, and summarize the visible form through deterministic tool calls
- Gemini compact Smart Start mode now suppresses live mic relay while Gemini is speaking, which prevents the lane from interrupting or clipping its own response mid-turn
- Gemini Live clients now treat `serverContent.interrupted` as an immediate playback drain: active audio stops, queued PCM/audio buffers clear, and mic suppression releases so the user can keep speaking
- Gemini Live `goAway` frames now surface an operator-visible reconnect warning instead of disappearing into console logs; if the socket closes after the warning, restart the voice session from the Smart Start rail
- Gemini compact Smart Start mode now opens with the first question on its own and only enables the mic after that opening turn, which removes the silent-start seam and reduces early session drops
- Gemini public-lane voice selection now follows `voice.gemini_voice_name` directly; do not use `professional_dna.voice_agent_voice_id` to reason about the public Gemini voice lane
- Gemini Live token hardening: keep intake tools out of ephemeral-token `liveConnectConstraints`. The token route should mint identity/model/system/VAD constraints only; the client `live.connect(...)` call owns the deterministic Smart Start tool declarations and tool config.
- `POST /v1/voice/elevenlabs/session` now provides signed ElevenLabs session URLs for authenticated users when `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` are present
- the ElevenLabs intake lane now runs on the ElevenLabs React SDK with contextual updates, action feed telemetry, and intake-safe client tools for screen movement and field entry
- the Smart Start workspace is now a single guided intake surface with:
  - sticky voice rail on the left
  - section navigation
  - one visible section at a time
  - section-aware field highlighting
  - a locked processing state that ends live voice before artifact generation
  - a compact intake header so module shell chrome no longer competes with the live form
  - compact Gemini mode auto-starts microphone capture once the live session connects, so operators do not have to perform a second mic enable step during demos
  - ElevenLabs transcript/action text now sits on dedicated dark surfaces instead of floating directly on the page background
- Smart Start Intake now also reads public-facing Professional DNA config for:
  - optional hero video / fallback image rendering
  - optional journey-guide video provider / ID / URL / title values for the signed-in home briefing overlay
  - Smart Start voice-lane enablement
  - transcript visibility inside Gemini Live
  - voice-to-form autofill behavior
- Gemini Live Smart Start sessions now hit `POST /v1/intake/extract` after session close to map transcript signals into empty intake fields without overwriting user edits
- paid Smart Start completion now also calls authenticated `POST /v1/gws/sync-docs`, so Drive docs are recreated immediately after artifact generation without requiring the Ghost-secret sync route
- paid Smart Start completion also converts a real `resume_source` URL into a CJS resume asset, but that asset is now classified as an `intake_reference` rather than a full uploaded resume
- Smart Start now also offers a direct resume file picker in the evidence act; if the user selects a PDF/DOCX there, the file is uploaded into CJS during paid intake processing
- repeated intake runs with the same resume URL now update the existing `intake_reference` asset instead of creating duplicate resume entries
- ConciergeJobSearch sorts uploaded resume files ahead of intake references and `resume_review` follows that same priority order, so file uploads remain the canonical working version for line-level review
- uploaded PDF/DOCX resume files now also generate a parsed resume digest on the client record, which the API uses as the canonical machine-readable basis for `resume_review`
- the API JSON limit is now `10mb`, which keeps direct Smart Start resume upload compatible with the existing `6mb` binary-upload ceiling after base64 expansion
- ElevenLabs Ghost Smart Start sessions can now:
  - jump between Smart Start screens
  - focus specific fields
  - set text, choice, multi-select, and boolean values
  - clear fields
  - set intent, pace, and focus preferences
  - summarize the intake state so far
- the signed-in home `Your Journey Guide` now uses two persistence keys in browser storage:
  - `career_concierge_journey_guide_dismissed`
  - `career_concierge_journey_guide_visits`
- operator implication:
  - the guide copy rotates by returning-visit count while staying client-context aware
  - the media slot is globally configured in admin and reused as the default briefing asset for new users

Ghost/GWS identity policy:

- user-facing Ghost and Google Workspace surfaces must never expose Firebase UIDs or internal document IDs
- preferred identity order is:
  - `clients/{uid}.display_name`
  - `clients/{uid}.demo_profile.name`
  - Firebase Auth `displayName`
  - email-local-part derived readable name
  - generic fallback like `Client`
- client folder names and Google Doc titles should use a human-readable name when available; raw UIDs are backend-only
- if a legacy client document is sparse, the server now attempts to backfill `email` and `display_name` from Firebase Auth during Ghost briefing and Google Doc sync
- Google Doc sync now reuses existing same-title docs when registry rows are missing, falls back to reuse-or-create when a registry row points at a deleted/inaccessible Google Doc, and archives same-title duplicates into `_Legacy duplicates` during sync
- Google Drive share failures caused by non-Google-account client emails are now non-fatal during folder/doc sync; the doc still renders, but sharing may be skipped for that user
- duplicate client folders are not merged automatically yet; exact-name folder reuse prevents new spray, but older duplicate folders still require manual cleanup or a dedicated migration pass

Current Professional DNA behavior:

- `/v1/suite/generate` now includes a post-intake `dna_research_analyst` pass for paid-suite users unless `professional_dna.enabled` is turned off in admin config
- that lane upgrades `brief` and `profile` into the richer dossier shape and records an orchestration run with `trigger = professional_dna_generate`
- if the DNA model path fails, the API falls back to a deterministic dossier shape rather than returning the shallow artifact pair
- the dossier now includes:
  - signal-strip metrics for `Market Fit`, `Signal Clarity`, `Comp Index`, `Adapt Pressure`, and `Live Dossier`
  - a `Career Market Signal` composite with four breakdown metrics and a clearly labeled projection path when no historical series exists yet
  - a `Market Demand Analysis` environment matrix
  - a compensation ladder, report ticker, source registry, and evidence-node appendix
- external market context is currently anchored to official public sources embedded in the API layer:
  - BLS Employment Situation

Current Suite Distilled behavior:

- Smart Start / local stub generation now emits a richer `suite_distilled` artifact instead of only three legacy fields
- the artifact includes:
  - strategy thesis
  - current position vs future alpha
  - market frame
  - positioning matrix
  - lane recommendation
  - surgical AI playbooks
  - living sequence
  - advisor bridge
  - evidence ledger
- the UI renderer remains backward compatible with old `suite_distilled` records, so reset users, old seeded personas, and older client documents still render without migration
- demo persona seeding now writes the richer `suite_distilled` shape as well
- Google Docs export for `suite_distilled` now prefers the command-center sections when present and falls back to the legacy sections otherwise
  - BLS JOLTS
  - BLS Occupational Outlook Handbook
- admin `Experience -> Professional DNA` now includes dedicated journey-guide media controls:
  - `professional_dna.journey_guide_video_provider`
  - `professional_dna.journey_guide_video_id`
  - `professional_dna.journey_guide_video_url`
  - `professional_dna.journey_guide_video_title`
- journey-guide resolution order:
  1. configured provider + `journey_guide_video_id`
  2. configured `journey_guide_video_url`
  3. fallback image/title stage using existing `professional_dna.hero_fallback_image_url`
  - O*NET
  - DOL WARN overview
- source-backed claims must remain distinguishable from inference-backed claims in both prompt output and UI copy

Current default admin list in the deploy template includes:

- `lenox.paris@outlook.com`
- `treble.design@gmail.com`
- `lenox@thirdsignal.ai`
- `iamjimbutler@gmail.com`
- `jazminbutler@me.com`

The API now also includes a baked-in operator fallback so these accounts still pass admin checks when environment allowlists drift:

- `operator@thirdsignal.ai`
- `gws@conciergecareerservices.com`

Runtime bootstrap also attempts to keep `iamjimbutler@gmail.com` and `jazminbutler@me.com` on the shared demo password `CareerDemo!2026` using the API service account.

Authorization paths are now:

- Firebase custom claims: `admin` or `staff`
- `ADMIN_EMAILS` allowlist from the API environment
- baked-in operator fallback emails above

UI behavior:

- allowed accounts see the `Admin` button normally
- disallowed accounts now see `Admin Locked` in the header rather than no admin affordance at all

## Media Resolver Checks

The current `E09-S03` implementation lives behind the authenticated media-library route:

- `GET /v1/media/library?surface=episodes`

Expected response shape additions:

- `resolver.strategy = library_first`
- `resolver.status = plan_backed` when `clients/{uid}/episode_plans/content_director_phase_a` exists
- `resolver.summary` with reused asset count plus reusable-kit and bespoke gap counts
- `resolver.episodes[]` with per-episode coverage, matched asset ids/titles, and gap analysis

Expected persistence side effect:

- `clients/{uid}/orchestration_runs/content_director_phase_a.media_resolution`

Quick operator check:

1. Sign in as a paid persona with completed intake.
2. Load Episodes operator mode.
3. Call `GET /v1/media/library?surface=episodes` with the user token.
4. Confirm the response includes `resolver`.
5. Confirm Firestore now shows `media_resolution` under `orchestration_runs/content_director_phase_a`.

Negative checks:

- free-tier or users without the Phase A episode plan should return `resolver.status = no_plan`
- if curated media exists but no tags match, the resolver should report reusable-kit gaps rather than pretending the episode is fully covered

Lineage boundary:

- non-admin clients should still receive routed library items, but resolver lineage stays off the normal client surface
- operator/admin surfaces are the place where prompt lineage and gap analysis are reviewed

## Media Job + Manifest Persistence

`POST /v1/binge/media-pack` now persists generated output into:

- `clients/{uid}/media_jobs/{jobId}`
- `clients/{uid}/media_manifests/{manifestId}`

Persistence expectations:

- generated image assets write to Cloud Storage when `CCS_STORAGE_BUCKET` / storage bucket config is available
- manifest/job records store asset status, prompt, model, and storage metadata
- `POST /v1/binge/media-pack/video-status` can update the same persisted job when `job_id` is supplied
- media jobs now track `attempt_count` and `worker_ready` so the queue can be processed outside the inline episode call

Quick operator check:

1. Generate a scene pack from Episodes operator mode.
2. Confirm the response includes `job_id`, `manifest_id`, and `pipeline_status`.
3. Inspect Firestore for matching `media_jobs` and `media_manifests` docs.
4. If video is queued, call `POST /v1/binge/media-pack/video-status` with both `operation_name` and `job_id`.
5. Use Admin -> `Media` -> `Process now` or `Run queue now` and confirm the queued job advances without creating a new manifest.
6. Confirm the existing job/manifest updates instead of a second job appearing.

## Admin Media Pipeline Console

Operator endpoints:

- `GET /v1/admin/media-pipeline`
- `POST /v1/admin/media-pipeline/jobs/:clientUid/:jobId/retry`
- `POST /v1/admin/media-pipeline/jobs/:clientUid/:jobId/process`
- `POST /v1/admin/media-pipeline/process-pending`
- `POST /v1/admin/media-pipeline/manifests/:clientUid/:manifestId/review`

Expected behavior:

- admin overview returns recent jobs/manifests plus summary counts for queue, retries, and reusable/bespoke gaps
- retry requests increment `retry_requested_count` on the target job and associated manifest
- review actions persist `review_state` across both manifest and associated job records when present

Quick operator check:

1. Open `Admin` -> `Media`.
2. Confirm `Pipeline monitor` loads recent jobs and manifests.
3. Request retry on one job and confirm the count increments after refresh.
4. Mark one manifest `approved` and one `needs_review`.
5. Confirm the updated review state persists across refresh.

## Admin Orchestration Control Plane

Operator endpoint:

- `GET /v1/admin/orchestration-control-plane`

Expected behavior:

- returns the expanded staff registry
- returns the default intent/tier orchestration policy
- returns recent orchestration runs with summary, confidence, approval state, evidence refs, and next-role data

Quick operator check:

1. Open `Admin` -> `Governance`.
2. Confirm `Orchestration control plane` loads without blocking the rest of the admin console.
3. Verify the current-stack chips reflect the existing web OS + Cloud Run + Firestore posture.
4. Verify recent run cards show confidence and next-role fields.

## Sample Persona Harness

Operator endpoints:

- `GET /v1/admin/sample-personas`
- `POST /v1/admin/sample-personas/:personaId/launch`
- `POST /v1/admin/sample-personas/:personaId/reseed`
- `POST /v1/admin/sample-personas/:personaId/proof`

Expected behavior:

- roadmap validation shows each seeded persona with launch readiness, hydration status, proof state, and next-gate notes
- launch mints an admin-gated custom token and opens a session-scoped preview URL
- reseed clears only the target persona’s seeded state before rebuilding deterministic fixture data
- proof toggle persists independently of the persona’s Firestore content so demo evidence can be tracked across runs

Quick operator check:

1. Open `Roadmap` -> `Validation`.
2. Confirm `Sample Persona Harness` lists all seeded personas.
3. Launch one persona and verify the preview tab signs into the requested demo account.
4. Reseed that persona and confirm hydration timestamps refresh.
5. Toggle proof capture and confirm the state persists after refresh.

## Public Concierge Request Flow

Public endpoint:

- `POST /v1/public/concierge-request`

Admin operator endpoint:

- `POST /v1/admin/concierge-requests/:requestId/status`
- `POST /v1/admin/orchestration-runs/:clientUid/:runId/review`

Expected behavior:

- login surface accepts a Smart Start / AI Concierge request without requiring an account
- requests persist service intent, optional resume link, structured date/time/timezone preferences, goal, and source into Firestore
- admin governance exposes those requests with `new`, `reviewed`, and `scheduled` states
- MyConcierge handoff requests land in the same operator queue with `source: my_concierge`

Quick operator check:

1. Submit a Smart Start request from the login surface.
2. Open `Admin` -> `Governance` and confirm the request appears under `Concierge requests`.
3. Confirm the request card shows service intent plus the structured slot fields when they were provided.
4. Mark it `reviewed`, then `scheduled`, and verify the state persists after refresh.
5. If a resume link was supplied, confirm the operator card renders it as an outbound link.
6. Trigger `Request human follow-up` from MyConcierge and confirm a second request appears with the authenticated client context.

## Starter Library Seeding

Admin now includes a one-click starter pack inside the `Media` section.

Operator workflow:

1. Open `Admin` -> `Media`.
2. Click `Load starter pack`.
3. Save config.
4. Refresh Episodes operator mode and confirm routed media now includes starter-pack entries where tags match the Phase A episode plan.

Guardrails:

- starter-pack load is append-only by `id`
- repeated loads should not duplicate entries
- manual library items should remain untouched

## CJS Rail + Ledger API Checks

After API deploy, validate these authenticated routes:

- `GET /v1/cjs/assets`
- `POST /v1/cjs/resume/upload`
- `POST /v1/cjs/resume/review`
- `POST /v1/cjs/search/strategy`
- `GET /v1/interactions`
- `POST /v1/interactions/chief-of-staff`
- `POST /v1/interactions/:interactionId/decision` (admin only)
- `GET /v1/admin/system-overview`
- `GET /v1/admin/approval-queue`
- `POST /v1/admin/approval-queue/:clientUid/:interactionId/decision`

The admin console should now expose the following before any config edits are made:

- API origin and Cloud Run deployment identity
- Firestore DB and storage bucket wiring
- admin access mode (`ADMIN_EMAILS` allowlist vs open mode)
- approval queue pressure and hydrated-account count
- agent registry policy with explicit read/write scopes
- model routing and prompt overlay presence
- Brand Studio controls for suite naming, colors, hierarchy, workflow labels, and logo URL

The admin modal is intentionally structured as an operator workspace now:

- left rail for section switching
- lean left rail for section switching without competing summary cards
- control-tower summary for runtime and queue visibility in the main canvas
- one active edit surface at a time
- compact command header on smaller viewports so section identity and save posture stay visible before the edit fields
- single-column section layouts so controls do not compress on laptop-width views
- persistent save rail with unsaved-state feedback
- collapsible media-library editing for lower scroll overhead
- taxonomy shortcut chips for faster structured media tagging
- Brand Studio preview now mirrors the live shell + module overlay instead of the legacy left-rail proof
- the module overlay header collapses on scroll in the client shell so cinematic content is not pinned under persistent chrome
- Episodes client view now assigns stage treatment per beat and falls back to designed placeholder stills/cards when a routed media asset is missing

If the console regresses into a single stacked form, treat that as a UX bug, not a cosmetic preference.
While a save request is in flight, the active edit surface is now locked to prevent silent overwrite of later keystrokes, and reload now explicitly confirms before discarding unsaved admin edits.
The admin API client now retries transient `502`/`503`/`504` and browser-level fetch failures before surfacing an operator error.
Cloud Run service account requirement: the API runtime service account must have `roles/datastore.user` in `ssai-f6191`; without it, `GET /v1/admin/media-pipeline`, `GET /v1/admin/orchestration-control-plane`, `GET /v1/admin/sample-personas`, and `PUT /v1/admin/config` will fail with Firestore `PERMISSION_DENIED`.
Admin model routing now uses a shared Gemini/Veo catalog plus four presets: `Gemini 3 Experimental`, `Demo Quality`, `Balanced Production`, and `High Throughput`.
The catalog includes current Gemini 3 family routes (`gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-flash-image-preview`) while keeping stable Gemini 2.5 routes available for fallback and controlled regression checks.
Operator guidance: do not present Episodes as fully scene-native yet. The player is beat-aware, but the backend media pack still emits one image route and one video route per episode.

## Brand Studio Operating Notes

Use Admin -> Brand Studio for shell-level branding changes.

Current scope:

- suite and product naming
- logo URL + alt text
- mint/charcoal palette overrides
- editorial hierarchy controls
- suite-home shell copy
- per-module eyebrow/title/overlay quote copy
- display toggles for indices, status chips, descriptions, quotes, glow, and callout rail

Operator guidance:

- tune values top-down: identity -> colors -> hierarchy -> shell copy -> module copy
- use the live preview before saving
- logo injection is URL-based for now; broken or empty URLs should fall back to text-only branding
- deeper artifact-body copy still lives in the module/view implementations and is not yet admin-driven

If resume upload is enabled for binary upload, set one of:

- `CCS_STORAGE_BUCKET`
- `STORAGE_BUCKET`
- `FIREBASE_STORAGE_BUCKET`

## High-Risk Failure Modes

### Wrong Source Path During Deploy

- API must deploy from `./api`
- UI must deploy from repo root

If the API is deployed from the wrong source path, Cloud Run may serve the wrong container entirely.

### Wrong Firebase Project

This fork must point to `ssai-f6191`.
Do not reuse `third-signal` frontend config for production.

### Organization Policy Drift

If public access breaks unexpectedly, re-check:

- Cloud Run IAM bindings
- `iam.allowedPolicyMemberDomains`

### Password Login Drift

If imported legacy users cannot log in with their old password, do not assume the import failed.
The likely cause is unrecovered legacy hash parameters from the source project.
Use the reset workflow instead of repeating blind imports.

## Post-Deploy Smoke Checks

- `GET /health`
- `GET /v1/public/config`
- login with a migrated user
- intake persistence
- admin config load
- admin system overview load
- suite generation creates `learning_plans/content_director_phase_a`
- suite generation creates `episode_plans/content_director_phase_a`
- suite generation creates `orchestration_runs/content_director_phase_a`
- brand save + reload from Admin Brand Studio
- logo propagation into header/prologue when configured
- roadmap + validation tile visibility for admin users only
- sample persona launch/reseed/proof controls in Roadmap validation
- shared sample-persona password visible in Roadmap validation for direct manual login
- validation now explicitly instructs operators to reseed first, then launch, and only use manual login after a successful reseed
- the sample persona fixture file must live under `api/config/demo/persona-fixtures.json` because the API Cloud Run deploy packages `./api` as the service source
- Smart Start Intake now normalizes seeded sample-persona answers before operator autofill so the intake module stays stable during launch/reseed walkthroughs
- admin/operator intake now supports `Autofill intake`, `Autofill + jump`, and `Autofill + prepare suite` for seeded persona speed runs
- public Smart Start request intake on login surface
- admin concierge-request review and status updates
- MyConcierge visibility and response flow for paid `not_sure` users
- the main client module modal now uses a top-command single-canvas layout rather than a persistent left rail
- MyConcierge human follow-up request path
- episode generation
- narrated episode playback for auditory-learning personas
- suite generation
- live token generation
- Gemini Live should remain the active real-time voice provider for demo readiness
- ElevenLabs Ghost can be the active public-intake presentation lane for demo readiness when the team wants the Chief of Staff agent lane instead of Gemini Live
- Sesame should remain feature-flagged off until its dedicated Cloud Run service exists
- SkillSync AI TV should render an actual staged viewing surface in client mode, not only metadata cards
- if no curated library has been saved yet, the API should fall back to the shipped starter pack, which now includes local Veo-generated clips under `public/demo-media/`
- Episodes should continue to load routed curated media for free-tier/demo users so the sample journey still feels cinematic
- if a beat has no routed clip or still, the player should show a designed fallback stage rather than repeat one unrelated companion asset across the whole episode
- Gemini API Veo requests should omit unsupported Gemini-API-only fields such as `generateAudio` and `enhancePrompt`
- admin queue and pipeline UI should translate known provider/config mismatches into operator-safe guidance instead of surfacing raw SDK option strings
- CJS upload/review/strategy flow
- free-tier dashboard should only expose Intake, Episodes, and AI Readiness
- Assets ledger summary + decision flow

## Recommended Release Sequence

1. Deploy API
2. Confirm `/health` and `/v1/public/config`
3. Deploy UI
4. Confirm login
5. Confirm intake write to `clients/{uid}`
6. Confirm Admin loads and saves config
7. Confirm episodes, MyConcierge, tier-gated suite visibility, and live voice surfaces

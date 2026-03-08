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

If using a standalone Cloud Build trigger instead of Cloud Run's repo-connected deploy, use `cloudbuild.api.yaml`. A single raw `docker build` trigger is insufficient because it does not roll the new image onto the `career-concierge-api` service.
That build config also sets `logging: CLOUD_LOGGING_ONLY` so triggers using a dedicated service account do not fail on logs-bucket validation.

## Deploy UI

```bash
bash scripts/deploy_ui_cloudrun.sh ssai-f6191 europe-west1 .context/deploy/ssai-f6191.ui.env
```

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

Current default admin list in the deploy template includes:

- `lenox.paris@outlook.com`
- `treble.design@gmail.com`
- `lenox@thirdsignal.ai`
- `iamjimbutler@gmail.com`

The API now also includes a baked-in operator fallback so these accounts still pass admin checks when environment allowlists drift:

- `operator@thirdsignal.ai`
- `gws@conciergecareerservices.com`

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
- control-tower summary for runtime and queue visibility
- one active edit surface at a time
- single-column section layouts so controls do not compress on laptop-width views
- persistent save rail with unsaved-state feedback
- collapsible media-library editing for lower scroll overhead
- taxonomy shortcut chips for faster structured media tagging

If the console regresses into a single stacked form, treat that as a UX bug, not a cosmetic preference.
While a save request is in flight, the active edit surface is now locked to prevent silent overwrite of later keystrokes, and reload now explicitly confirms before discarding unsaved admin edits.
The admin API client now retries transient `502`/`503`/`504` and browser-level fetch failures before surfacing an operator error.

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
- Sesame should remain feature-flagged off until its dedicated Cloud Run service exists
- SkillSync AI TV should render an actual staged viewing surface in client mode, not only metadata cards
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

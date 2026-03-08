# Progress Log

This log tracks implementation progress against the V1 MVP backlog plus the queued enhancement specs under `docs/mvp/`.
Detailed story-level status and pass-by-pass execution entries now live in `docs/backlog-ledger.md`.
Update both files in each delivery pass so roadmap visuals and implementation status stay aligned.

## 2026-03-05

### Delivery: Roadmap Validation Surface + Log Foundation

- Added `Roadmap` module (`12`) as a shared validation surface for signed-in users.
- Expanded `RoadmapView` with epic cards and story-level validation grid for manual QA guidance.
- Removed frontend lockout pattern that could hide admin entry points during transient access-check failures.
- Expanded shared module ID enums/lists to include `roadmap` for consistent routing and config validation.

### Delivery: Demo Master Tasklist + Persona Tracks

- Added canonical demo tasklist at `docs/mvp/demo_master_tasklist.md`, mapped to roadmap epics/stories and all four test-user specs.
- Expanded `RoadmapView` with:
  - test-user demo readiness tracks (`TU1` through `TU4`)
  - in-product master tasklist cards (`MTL-01` through `MTL-08`)
  - delivery pulse summary for active/queued/blocked demo tasks
- Bound roadmap log guidance to include `docs/mvp/demo_master_tasklist.md` alongside backlog/progress logs.

### Delivery: MTL-01 Deterministic Persona Fixture Seeding

- Added canonical fixture source: `config/demo/persona-fixtures.json`.
- Added seed workflow: `api/scripts/seed_persona_fixtures.mjs`.
- Added npm entrypoint: `npm run demo:fixtures:seed`.
- Dry-run validated against `ssai-f6191` target with report output to `.context/persona-seed-report.dry-run.json`.

### Delivery: MTL-01 Full Persona Account Hydration

- Upgraded seed workflow to hydrate full persona accounts from email identity:
  - Auth reconciliation by email/uid
  - `clients/{uid}` identity + intake + state
  - complete artifact set in `clients/{uid}/artifacts/*`
  - seeded `assets` and `interactions` subcollections
- Added operator flags for partial seeding (`--no-artifacts`, `--no-assets`, `--no-interactions`, `--no-intro-seen`).
- Current execution blocker: local ADC token expired (`invalid_rapt`) during write run; requires `gcloud auth application-default login`.

### Delivery: CJS Execution Rail + Chief of Staff Ledger + Free-Tier Gating

- Added new API routes for backlog-critical E2E flows:
  - CJS assets, resume upload, resume review, search strategy
  - interaction ledger list, Chief of Staff summary logging, admin approve/reject decisions
  - agent registry endpoint for orchestration role definitions
- Replaced placeholder CJS module with an operational UI:
  - resume upload input
  - persisted resume version list
  - resume review generation output
  - search strategy generation output
- Added `Assets` module execution ledger surface:
  - Chief of Staff summary creation
  - pending-approval queue view
  - admin approve/reject actions
  - in-product agent registry cards
- Implemented free-tier path constraints:
  - simplified Smart Start Intake field set
  - module visibility gating to Intake/Episodes/Readiness/Roadmap
  - readiness resource guide + upgrade CTA
  - episodes upgrade CTA surface
- Added persona QA runbook: `docs/mvp/demo_validation_checklist.md`.

### Delivery: Agent Policy Enforcement + Global Admin Queue

- Added explicit scoped policy metadata for core agents:
  - `chief_of_staff`
  - `resume_reviewer`
  - `search_strategist`
- Enforced scoped read/write access inside API before agent-backed routes execute.
- Added global admin approval queue:
  - cross-user pending approval listing
  - cross-user approve/reject actions
  - richer interaction metadata (`client_uid`, `client_email`, `client_name`, `source`, `decided_by`)
- Tightened mobile layout on `Assets` and `ConciergeJobSearch` surfaces so core actions stack cleanly on narrow viewports.

### Delivery: MyConcierge + Persona-Routed Episodes + Free-Tier Workflow Sync

- Added `MyConcierge` as a first-class paid-suite module with conversational, intent-aware guidance and direct handoff into Profile, Gaps, Plan, and Episodes.
- Updated suite routing and visibility to align more closely with the Lucidchart/user workflows:
  - intent-based module order now elevates `MyConcierge` for direction-seekers
  - roadmap is now treated as an operator/admin surface instead of a client-facing tile
  - free-tier users now only see Intake, Episodes, and AI Readiness
- Shipped episode behavior upgrades:
  - persona-derived topic routing into `/v1/binge/episode`
  - narrated delivery trigger on the Episodes surface for auditory-learning personas
  - fixed 3-episode starter playlist for free-tier users
- Tightened CJS behavior by intent so current-role users see passive/internal-mobility framing, target-role users see promotion-first strategy, and direction-seekers see exploratory positioning rather than a generic search rail.
- Updated the roadmap/task docs and runbooks to match the shipped workflow model.

### Delivery: Editorial Grid Brand Studio + Lucid Overlay Sync

- Added a shared `brand` configuration surface spanning:
  - identity
  - color system
  - editorial hierarchy
  - shell copy
  - module eyebrow/title/overlay copy
  - display toggles
- Exposed a new `Brand Studio` section inside Admin with ordered controls and a live preview of the header, overlay rail, and editorial grid.
- Extended public config so the suite shell now consumes saved branding instead of relying on hard-coded POC shell copy.
- Updated the shell to reflect the Lucidchart-style overlay treatment:
  - light editorial grid on suite home
  - dark left-rail overlay treatment in module modal
  - official workflow labels as tile eyebrows
  - optional URL-driven logo propagation into the header and prologue
- Added a dedicated MVP spec for the brand studio and workflow-label mapping.

### Planning: Client-Facing Cinematic Episodes Player

- Defined the next Episodes enhancement as a queued design/product epic.
- Captured the required separation between:
  - client-facing cinematic learning player
  - admin/operator/investor BTS surface
- Added a dedicated spec covering:
  - cinematic vertical player structure
  - editorial desktop/mobile layouts
  - context overlays and challenge cards
  - brand-system compliance rules for future agent work

### Planning: Content Director Media Orchestration Pipeline

- Defined a queued media-orchestration epic for reusable versus bespoke episode media.
- Locked the architecture direction:
  - Content Director agent plans learning arcs and episode manifests
  - library-first retrieval happens before new generation
  - binary media should live in Cloud Storage
  - metadata, lineage, tags, and job state should live in Firestore
  - long-running generation should move through a dedicated media-pipeline service boundary
  - Admin must expose an end-to-end operating section for pipeline monitoring, retries, approvals, library management, and configuration
- Added a dedicated spec for:
  - the planning trigger point after intake
  - taxonomy/tagging rules
  - reusable-kit vs bespoke thresholds
  - operator lineage visibility versus client-final output

### Planning: Agentic Staff Operating Model

- Reviewed the newly added research notes and rejected a direct import of the alternate stack assumptions:
  - no ClawWork runtime migration
  - no Supabase re-platform
  - no WhatsApp- or Slack-native client journey requirement for MVP
  - no PWA install hard-gate as a launch dependency
- Published a canonical staffing spec aligned to the live product direction:
  - one Chief of Staff orchestrator
  - a constrained specialist roster rather than many loosely defined agents
  - Firestore-grounded memory and evidence before optional vector infrastructure
  - explicit separation between agents, services, and human operators
  - a dedicated Admin orchestration operating section distinct from Brand Studio
- Mapped the staffing work into a new queued roadmap epic and task so future dev work has one source of truth for roles, handoffs, approvals, and stack boundaries.

### Audit: Jim + Lucid Stakeholder Baseline Check

- Ran a final baseline audit against:
  - `docs/mvp/lucidchart_analysis.md`
  - `docs/mvp/Jim's Notes - Key Requirements Extracted.md`
- Published an operator-facing execution charter with:
  - coverage confidence scoring
  - gap analysis on roadmap versus live implementation
  - recommended agent deployment count
  - shared notebook / orchestration ledger protocol for cross-role coordination
- Audit outcome:
  - roadmap/spec coverage is strong
  - live implementation is still gated by Episodes V2, media operations, staffing control plane, and onboarding/admin polish
  - only two material baseline gaps remain under-modeled: public AI concierge onboarding and concierge scheduling/onboarding workflow

### Delivery: Compact Roadmap Charter Surface

- Refactored the roadmap modal away from one long backlog scroll into a denser operator layout with three modes:
  - `Plan`
  - `Charter`
  - `Validation`
- Added live confidence scoring derived from epic/task state so the admin/operator view updates as delivery progresses.
- Brought the execution charter into the roadmap surface directly:
  - lane-level baseline summaries
  - highest-risk checkpoint callouts
  - recommended staffing posture
  - compact sprint blocks and internal-scroll validation panes

### Delivery: Admin Access Fallback + Visible Locked State

- Added a backend operator-email fallback so the known operator accounts can still reach admin when environment allowlists drift:
  - `operator@thirdsignal.ai`
  - `gws@conciergecareerservices.com`
- Replaced the silent hidden-admin state in the suite header with a visible `Admin Locked` state when the current user fails the admin check.
- This makes auth failures obvious in the deployed product instead of looking like missing code.

### Delivery: Environment-Safe API Origin Resolution

- Added a shared frontend API-origin resolver used by admin, suite, CJS, Episodes, live, and voice services.
- Resolution order is now:
  - `VITE_CONCIERGE_API_URL` when it targets a non-canonical API
  - sibling Cloud Run API host inferred from the current UI host
  - canonical fallback API URL
- `.env.production` now leaves `VITE_CONCIERGE_API_URL` unset so repo-based UI builds do not pin alternate Cloud Run environments to the canonical API host.
- This fixes the case where a repo-connected UI deploy in a secondary Cloud Run environment was still calling the hard-coded canonical API service by default.

### Delivery: Repo-Connected API Build Guardrail

- Added `api/Dockerfile` so `career-concierge-api` can be pointed at a concrete API-specific build artifact in repository deployments.
- Documented the operator check: if `/v1/public/config` returns HTML with an `nginx` banner, the API service is deploying the UI container rather than the Express backend.
- Moved backend brand-config runtime imports under `api/` so the repo-based API build context can start successfully on Cloud Run.
- Relaxed `/v1/admin/system-overview` so queue telemetry permission failures no longer block the full admin console.
- Added `cloudbuild.api.yaml` so a repository trigger can build, push, and deploy the API service instead of stopping at image build.
- Updated `cloudbuild.api.yaml` to use `CLOUD_LOGGING_ONLY`, which satisfies Cloud Build triggers that run under a specified service account.

### Backlog Status Snapshot

| Epic | Status | Notes |
| :--- | :--- | :--- |
| E01 Smart Start Intake & Professional DNA | Done | Intake + suite generation flow is operational. |
| E02 Agentic Framework & Orchestration | In Progress | Scoped policy enforcement and global queue shipped; outbound-action approval coverage still incomplete. |
| E03 Binge Learning Episode Generation | In Progress | Persona routing and narrated delivery are shipped; persona QA and polish remain. |
| E04 Core Suite Artifacts & UI | In Progress | Core views ship, including MyConcierge; mobile polish and persona QA remain active. |
| E05 Admin Console & System Ops | In Progress | Core config controls ship; roadmap/admin experience now extended. |
| E06 ConciergeJobSearch Execution Rail | Done | Upload, resume review, and strategy generation are shipped in API + UI. |
| E07 Editorial Grid Brand OS | In Progress | Shared brand config and Brand Studio shipped; deeper artifact-body copy harmonization is still open. |
| E08 Client-Facing Cinematic Episodes Player | Done | Client-facing cinematic player shipped; admin/operator BTS controls are now separated behind explicit operator mode. |
| E09 Content Director Media Pipeline | In Progress | Phase A planning trigger, starter library seeding, resolver, and persisted media jobs/manifests are live; dedicated worker execution, richer lineage, and admin media ops remain. |
| E10 Agentic Staff Operating Model | Queued | Canonical staffing spec and roadmap now exist; implementation has not started. |

### Next Implementation Priority

1. Run persona QA checklist in `docs/mvp/demo_validation_checklist.md` and capture evidence for TU1/TU3/TU4 against the newly shipped flows.
2. Validate `MTL-09` with brand edits, logo injection, and Lucid overlay parity checks across suite home and module overlays.
3. Finish `MTL-07` with real device regression checks on MyConcierge, Episodes, and free-tier surfaces.
4. Run persona proof capture for shipped `MTL-10` and note any residual polish gaps in the validation package.
5. Continue `MTL-11` with dedicated worker execution, richer lineage, and admin media ops now that the first persisted media-pipeline layer is live.
6. Start `MTL-12` so the staff roster, handoff graph, admin operating section, and evidence model are explicit before orchestration scope expands.

### Delivery: Admin Console Save Guard + Content Director Phase A Seed

- Locked the active admin edit surface while saves are in flight so late keystrokes cannot be overwritten by a stale save response.
- Added a reload confirmation when unsaved admin edits would be discarded.
- `POST /v1/suite/generate` now seeds:
  - `clients/{uid}/learning_plans/content_director_phase_a`
  - `clients/{uid}/episode_plans/content_director_phase_a`
  - `clients/{uid}/orchestration_runs/content_director_phase_a`
- The first Content Director seed is phase-A only: it captures learning themes, episode blueprints, reusable asset tags, and bespoke candidates from intake + first-order artifacts.
- Added `content_director` to the live agent registry so the admin console reflects the new orchestration role.

### Backlog Addition: Sample Persona Test Harness

- Added a queued `E11 / MTL-13` track for one-click sample persona launch, reset/reseed controls, and persona-aware validation shortcuts.
- This keeps the operator testing need visible in the roadmap instead of leaving it as tribal knowledge around seeded fixture emails.

### Delivery: Home Grid Order Fix + Media Taxonomy Shortcuts

- Restored the suite home grid to canonical numeric tile order so the editorial layout no longer drifts by intent.
- Started `E09-S02` by adding structured taxonomy shortcut chips to the admin media-library editor.
- Reusable media tagging now has a guided vocabulary for concept, scene type, environment, intent, modality, reuse scope, and rights metadata.

### Delivery: Library-First Resolver + Gap Analysis

- Completed `E09-S03` by upgrading `GET /v1/media/library` from a simple filtered library list into a plan-backed resolver.
- The resolver now:
  - reads `clients/{uid}/episode_plans/content_director_phase_a`
  - ranks reusable media by shared tags
  - classifies unresolved reusable tags as `reusable_kit`
  - classifies bespoke narrative needs as `bespoke`
  - writes the summary back into `clients/{uid}/orchestration_runs/content_director_phase_a`
- Episodes operator mode now exposes a compact resolver summary so demos can show why media was reused versus flagged for bespoke follow-up.

### Delivery: Starter Media Library Seeding

- Completed `E09-S02` by adding a reusable starter media pack and a one-click admin seeding action.
- Operators can now bootstrap the curated library without hand-authoring the first reusable routes.
- The starter pack is append-only by stable ids, so repeated loads do not duplicate entries or overwrite manual curation.

### Delivery: Persisted Media Jobs + Manifests

- Started `E09-S04` and `E09-S05` by adding persisted media jobs/manifests to the episode media-pack flow.
- `POST /v1/binge/media-pack` now returns pipeline ids and writes:
  - `clients/{uid}/media_jobs/{jobId}`
  - `clients/{uid}/media_manifests/{manifestId}`
- Generated image binaries now save to Cloud Storage when a bucket is configured.
- Video-status polling can now update the same persisted job/manifest pair when the caller includes `job_id`.

### Delivery: Admin Save Retry + Single-Column Layout

- Flattened the admin section content into a single-column editorial stack so medium-width laptop views no longer feel cramped or overlap.
- Added transient retry handling to admin config/overview fetches and saves for `502`/`503`/`504` plus browser fetch failures.

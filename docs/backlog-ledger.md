# Backlog Ledger

This is the end-to-end backlog tracker and execution ledger for Career Concierge OS.
Source of truth backlog:

- `docs/mvp/Career_Concierge_V1_MVP_Spec_Complete.md`
- queued enhancement specs under `docs/mvp/` that have been mapped into the roadmap and execution ledger

## Status Legend

- `Done`: shipped and validated in product flow
- `In Progress`: partially shipped or actively being implemented
- `Queued`: planned, not started
- `Blocked`: cannot proceed due to external dependency

## End-to-End Backlog Board

| Story | Epic | Priority | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| E01-S01 New User Intake | E01 | P0 | Done | Intake flow and Firestore persistence are live. |
| E01-S02 Returning User Intake | E01 | P0 | Done | Intake routing is in place for returning users. |
| E01-S03 Suite Artifact Generation Trigger | E01 | P0 | Done | `/v1/suite/generate` flow is wired and artifacts are generated. |
| E02-S01 Agent Role Definition | E02 | P0 | Done | Agent registry endpoint now serves typed role definitions and persists to `system/agent-registry`. |
| E02-S02 Agent DNA Access | E02 | P0 | Done | Scoped agent read/write policy is now enforced in API for Chief of Staff, Resume Reviewer, and Search Strategist. |
| E02-S03 Agent Summary and Logging | E02 | P0 | Done | Chief of Staff summary logging now writes to `clients/{uid}/interactions`. |
| E02-S04 Human-in-the-Loop Validation | E02 | P0 | In Progress | Global admin approval queue and cross-user approve/reject are live; broader outbound-action workflow still open. |
| E03-S01 Pilot Episode Generation | E03 | P0 | In Progress | Episode generation ships; full demo orchestration still being refined. |
| E03-S02 Episode Template Engine | E03 | P0 | In Progress | Structured prompt/schema exists; ongoing quality/polish work remains. |
| E03-S03 Model Cost Control | E03 | P0 | In Progress | Admin model routing exists; final cost guardrails still evolving. |
| E04-S01 Module Grid Dashboard | E04 | P1 | Done | Grid with lock/unlock flow is live. |
| E04-S02 Artifact Views | E04 | P1 | Done | Core artifact views are implemented. |
| E04-S03 Mobile-First Responsive Design | E04 | P1 | In Progress | Mobile works but refinement and QA passes remain. |
| E05-S01 Secure Admin Access | E05 | P1 | In Progress | Email allowlist and admin API gating active; claims strategy still open. |
| E05-S02 Prompt Management | E05 | P1 | Done | Prompt overlays editable from admin console. |
| E05-S03 Feature Flags | E05 | P1 | Done | Module toggles are active via public/admin config. |
| E06-S01 Resume Upload | E06 | P2 | Done | CJS resume upload endpoint + UI are live with asset persistence. |
| E06-S02 Resume Review Agent | E06 | P2 | Done | Resume review generation now writes `resume_review` artifact and approval interaction. |
| E06-S03 Search Strategy Generation | E06 | P2 | Done | Search strategy generation now writes `search_strategy` artifact and approval interaction. |
| E07-S01 Shared Brand Token System | E07 | P1 | Done | Public/admin config now carries brand identity, palette, hierarchy, toggles, and module copy. |
| E07-S02 Admin Brand Studio + Preview | E07 | P1 | Done | Admin now exposes ordered brand controls with a live editorial-grid preview. |
| E07-S03 Logo Propagation | E07 | P1 | Done | Optional logo URL now propagates through the suite shell and prologue. |
| E07-S04 Workflow Label + Overlay Sync | E07 | P1 | In Progress | Suite shell and overlays are synced to the Lucid workflow language; artifact-body copy is still separately owned. |
| E08-S01 Client Episodes View vs BTS Mode | E08 | P1 | Done | Default Episodes experience now hides operator-generation apparatus from normal users and keeps BTS controls in admin-only operator mode. |
| E08-S02 Cinematic Vertical Micro-Drama Player | E08 | P1 | Done | Episodes now read as a cinematic cold-open-to-resolution player rather than a BTS lesson surface. |
| E08-S03 Editorial Context Overlays + Challenge Cards | E08 | P1 | Done | Context notes and challenge cards now teach concepts without exposing backend-generation language. |
| E08-S04 Mobile/Desktop Editorial Adaptation | E08 | P1 | Done | The player now preserves portrait-forward focus on small screens and a structured editorial balance on desktop. |
| E08-S05 Brand-System Design QA Guardrails | E08 | P1 | Done | Episodes now inherit the shared brand system and expose explicit positive/negative validation coverage. |
| E09-S01 Content Director Planning Trigger | E09 | P1 | Done | Suite generation now seeds `learning_plans`, `episode_plans`, and `orchestration_runs` as soon as intake + first-order artifact signal exist. |
| E09-S02 Reusable Media Library + Taxonomy | E09 | P1 | Queued | Generic concepts should be served from a tagged reusable library rather than regenerated. |
| E09-S03 Library-First Resolver + Gap Analysis | E09 | P1 | Queued | Resolve existing assets first, then classify missing needs as reusable-kit or bespoke. |
| E09-S04 Cloud Run Media-Pipeline Service | E09 | P1 | Queued | Long-running generation should move through a dedicated async media worker/service boundary. |
| E09-S05 Cloud Storage + Firestore Metadata Model | E09 | P1 | Queued | Binary media should live in Cloud Storage and metadata/state in Firestore. |
| E09-S06 Operator Lineage vs Client Output Boundary | E09 | P1 | Queued | Operator mode should expose provenance while client mode only sees final assembled media. |
| E09-S07 Admin Media-Pipeline Console | E09 | P1 | Queued | Admin should monitor queue health, library operations, approvals, failures, and pipeline config end to end. |
| E10-S01 Canonical Staff Registry + Contracts | E10 | P1 | Queued | Every MVP staff role should have explicit trigger, scope, IO, and approval rules. |
| E10-S02 Intent/Tier Handoff Graph | E10 | P1 | Queued | The orchestrator should explain which downstream staff roles were selected and why. |
| E10-S03 Firestore Orchestration Memory Model | E10 | P1 | Queued | Orchestration runs, evidence, and evaluation state should live in Firestore before optional vector infrastructure. |
| E10-S04 Admin Orchestration Control Plane | E10 | P1 | Queued | Admin should expose staff roster, orchestration runs, policies, and evaluation state in one operating section. |
| E10-S05 Human Escalation + Approval Discipline | E10 | P1 | Queued | Sensitive outbound and bespoke actions should route into role-aware approval and escalation flows. |
| E10-S06 Current-Stack Channel/Runtime Policy | E10 | P1 | Queued | Staffing roadmap should stay aligned to web OS + GCP/Firebase rather than imported multi-channel architecture. |
| E10-S07 Staff Effectiveness Telemetry | E10 | P1 | Queued | Operators should be able to inspect confidence and evaluation signals across staff outputs. |

## Demo-Critical Sequence

Investor-critical sequence:

1. Smart Start Intake submitted
2. Professional DNA persisted
3. Core artifacts generated (Brief, Plan, Profile, AI Profile, Gaps)
4. Binge episode generated
5. Chief of Staff summary logged

Current blocker in this sequence: approval workflow hardening (`E02-S04`) still needs broader outbound-action coverage beyond current ledger items.

## Demo Master Tasklist Snapshot

Canonical demo tasklist:

- `docs/mvp/demo_master_tasklist.md`

Current task pulse:

| Task | Status | Primary Persona Target |
| :--- | :--- | :--- |
| MTL-01 Persona fixture seed + deterministic intake payloads | Done | TU1/TU2/TU3/TU4 (full account hydration seeded to `ssai-f6191/career-concierge`) |
| MTL-02 Intent-based journey routing + unlock order | Done | TU1/TU2/TU3 |
| MTL-03 Chief of Staff interaction ledger | Done | TU1/TU2/TU3 |
| MTL-04 Episode personalization + modality routing | In Progress | TU1/TU3/TU4 (implementation shipped; persona QA pending) |
| MTL-05 CJS execution rail (upload/review/strategy) | Done | TU2 |
| MTL-06 Free-tier constrained surface + upgrade conversion CTA | In Progress | TU4 (implementation shipped; persona QA pending) |
| MTL-07 Mobile completion pass | In Progress | TU1/TU2/TU3/TU4 |
| MTL-08 Manual QA script + acceptance proof capture | In Progress | TU1/TU2/TU3/TU4 |
| MTL-09 Editorial grid brand OS + workflow label sync | In Progress | All personas + operator/admin |
| MTL-10 Client-facing cinematic Episodes player | Queued | All personas, especially TU1/TU3/TU4 + investor demo narrative |
| MTL-11 Content Director media orchestration + reusable library pipeline | In Progress | Episodes platform, operator/admin, future investor demos |
| MTL-12 Agentic staff operating model + orchestration control plane | Queued | All personas + operator/admin + roadmap coherence |

## Execution Ledger

| UTC Timestamp | Scope | Change | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 2026-03-05 04:59:53Z | E04/E05 docs+UX | Added roadmap module with node visualization. | Done | `components/RoadmapView.tsx`, `App.tsx`, `docs/progress-log.md` |
| 2026-03-05 05:00:00Z | Backlog governance | Added persistent backlog ledger + execution ledger process. | Done | `docs/backlog-ledger.md`, `docs/documentation-map.md`, `README.md` |
| 2026-03-05 10:45:00Z | E04/E05 UX reliability | Exposed roadmap to signed-in users and added epic/story validation grid; removed fragile frontend admin lockout behavior. | Done | `components/RoadmapView.tsx`, `App.tsx`, `docs/progress-log.md` |
| 2026-03-05 16:49:21Z | Demo readiness planning | Added test-user-based master tasklist and surfaced persona/task mapping in Roadmap module. | Done | `docs/mvp/demo_master_tasklist.md`, `components/RoadmapView.tsx`, `docs/progress-log.md` |
| 2026-03-05 19:15:47Z | MTL-01 persona fixtures | Added deterministic persona fixture source and seed utility (dry-run verified). | Done | `config/demo/persona-fixtures.json`, `api/scripts/seed_persona_fixtures.mjs`, `.context/persona-seed-report.dry-run.json` |
| 2026-03-05 19:28:05Z | MTL-01 hydration upgrade | Extended persona seeding to full account hydration (auth reconcile by email, artifacts, assets, interactions). Write run blocked by stale ADC (`invalid_rapt`). | Done | `api/scripts/seed_persona_fixtures.mjs`, `README.md`, `docs/operations-runbook.md` |
| 2026-03-05 22:00:00Z | E02/E06/MTL-06/MTL-08 | Shipped CJS execution rail APIs + UI, added Chief of Staff ledger + approval flow, applied free-tier gating and upgrade CTA, added persona demo validation checklist. | Done | `api/index.js`, `services/cjsApi.ts`, `components/CjsExecutionView.tsx`, `components/AssetsView.tsx`, `App.tsx`, `docs/mvp/demo_validation_checklist.md` |
| 2026-03-05 22:35:00Z | E02-S02/E02-S04/MTL-07 | Added explicit agent scope enforcement, shipped global admin approval queue, and tightened mobile layouts for Assets and CJS surfaces. | Done | `api/index.js`, `services/cjsApi.ts`, `components/AssetsView.tsx`, `components/CjsExecutionView.tsx`, `components/RoadmapView.tsx` |
| 2026-03-06 15:35:00Z | MTL-04/MTL-06/TU3 workflow sync | Added MyConcierge, made roadmap admin-only, routed episodes by persona context with narrated delivery support, tightened free-tier visibility to Intake/Episodes/Readiness, and aligned CJS/internal-promotion behavior with Lucidchart + test-user flows. | Done | `App.tsx`, `components/MyConciergeView.tsx`, `components/BingeFeedView.tsx`, `components/CjsExecutionView.tsx`, `components/IntakeFlow.tsx`, `services/bingeApi.ts`, `services/stubGenerator.ts`, `suite/modules.ts`, `types.ts`, `api/index.js` |
| 2026-03-06 16:20:33Z | E07/MTL-09 brand OS sync | Added shared brand config, admin Brand Studio with live preview, logo injection support, and Lucidchart-aligned workflow labels/overlay styling for the suite shell. | Done | `config/brandSystem.js`, `components/admin/BrandStudioSection.tsx`, `components/AdminConsole.tsx`, `services/adminApi.ts`, `App.tsx`, `api/index.js`, `docs/mvp/editorial-grid_brand-studio_spec.md` |
| 2026-03-06 17:09:49Z | E08/MTL-10 planning | Added the queued enhancement spec for a client-facing cinematic Episodes player and mapped the work into epic/story/task backlog entries. | Done | `docs/mvp/cinematic_episodes_player_spec.md`, `.context/product/career-concierge_user-stories.md`, `docs/mvp/demo_master_tasklist.md`, `docs/backlog-ledger.md` |
| 2026-03-06 17:09:49Z | E09/MTL-11 planning | Added the queued content-director/media-pipeline strategy covering library-first asset reuse, bespoke generation thresholds, and Cloud Run + Cloud Storage/Firestore architecture. | Done | `docs/mvp/microdrama_media-orchestration_spec.md`, `.context/product/career-concierge_user-stories.md`, `docs/mvp/demo_master_tasklist.md`, `docs/backlog-ledger.md`, `components/RoadmapView.tsx` |
| 2026-03-06 17:52:47Z | E09/MTL-11 epic refinement | Expanded the queued media-pipeline epic to require a dedicated Admin Console section for end-to-end monitoring, approvals, retries, library operations, and configuration. | Done | `docs/mvp/microdrama_media-orchestration_spec.md`, `.context/product/career-concierge_user-stories.md`, `docs/mvp/demo_master_tasklist.md`, `docs/backlog-ledger.md`, `components/RoadmapView.tsx` |
| 2026-03-06 18:34:00Z | E10/MTL-12 planning | Distilled the external agentic-architecture research into a current-stack-compatible staff operating model, published a canonical spec, and mapped it into backlog, roadmap, and OS docs. | Done | `docs/mvp/agentic_staff_operating_model_spec.md`, `docs/mvp/agentic_staffing_roadmap.md`, `.context/product/career-concierge_user-stories.md`, `docs/mvp/demo_master_tasklist.md`, `docs/backlog-ledger.md`, `components/RoadmapView.tsx`, `docs/progress-log.md`, `docs/career-concierge-os.md`, `docs/decision-log.md` |
| 2026-03-06 19:08:00Z | Stakeholder baseline audit | Compared the current roadmap/spec stack against Jim's extracted requirements and the Lucidchart journey, then published an operator-facing execution charter with confidence scoring, gap analysis, deployable staff recommendation, and a shared ledger protocol. | Done | `docs/mvp/agentic_execution_charter.md`, `docs/progress-log.md`, `docs/documentation-map.md` |
| 2026-03-06 19:42:00Z | Roadmap charter UI | Refactored the roadmap modal into compact plan/charter/validation views and added live confidence scores derived from epic/task status so operators can track the charter with less scroll. | Done | `components/RoadmapView.tsx`, `docs/career-concierge-os.md`, `docs/progress-log.md` |
| 2026-03-06 20:14:00Z | Admin access hardening | Added known-operator fallback admin emails in the API and replaced the silent hidden-admin state with a visible `Admin Locked` header state in the suite UI. | Done | `api/index.js`, `App.tsx`, `docs/career-concierge-os.md`, `docs/operations-runbook.md`, `docs/progress-log.md` |
| 2026-03-06 20:28:00Z | API origin routing fix | Added a shared frontend API-origin resolver so repo-connected UI deploys infer the sibling Cloud Run API by default instead of calling the hard-coded canonical API host. | Done | `services/apiOrigin.ts`, `services/adminApi.ts`, `services/cjsApi.ts`, `services/bingeApi.ts`, `services/liveApi.ts`, `services/suiteApi.ts`, `services/voiceApi.ts`, `docs/career-concierge-os.md`, `docs/operations-runbook.md`, `docs/progress-log.md` |
| 2026-03-06 21:40:00Z | E08/MTL-10 implementation | Shipped the client-facing cinematic Episodes player, split admin-only operator mode from the default client surface, and expanded persona validation with positive/negative demo cases. | Done | `App.tsx`, `components/BingeFeedView.tsx`, `docs/mvp/demo_validation_checklist.md`, `docs/mvp/demo_master_tasklist.md`, `docs/backlog-ledger.md`, `docs/progress-log.md` |

## Update Protocol

For every implementation pass:

1. Update story statuses in the backlog board if scope changed.
2. Append one new row to the execution ledger with UTC timestamp, changed scope, and evidence paths.
3. Update `docs/progress-log.md` summary to match the same state.

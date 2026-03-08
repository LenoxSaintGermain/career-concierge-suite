# Documentation Map

## Canonical Docs

- `README.md`: entrypoint and quick start
- `docs/career-concierge-fork.md`: executive brief for collaborators and operators
- `docs/career-concierge-os.md`: product and architecture overview
- `docs/operations-runbook.md`: deployment and operational procedures
- `docs/ssai-production-migration.md`: migration-specific history and cutover notes
- `docs/decision-log.md`: durable product and platform decisions
- `docs/progress-log.md`: implementation progress against MVP backlog
- `docs/backlog-ledger.md`: story-level backlog status and execution ledger
- `docs/mvp/demo_master_tasklist.md`: demo-readiness tasks mapped to test-user specs
- `docs/mvp/demo_validation_checklist.md`: persona-by-persona QA execution script
- `docs/mvp/editorial-grid_brand-studio_spec.md`: visual hierarchy, branding, and workflow-label sync rules
- `docs/mvp/cinematic_episodes_player_spec.md`: queued Episodes redesign for the final client-facing cinematic player
- `docs/mvp/microdrama_media-orchestration_spec.md`: queued reusable-vs-bespoke media strategy and pipeline architecture
- `docs/mvp/agentic_staff_operating_model_spec.md`: canonical staffing, orchestration, and admin control-plane rules for the agentic OS
- `docs/mvp/agentic_staffing_roadmap.md`: distilled implementation order for the staffing/orchestration model
- `docs/mvp/agentic_execution_charter.md`: operator-facing baseline audit, confidence score, gap analysis, and deployable staff guide
- `docs/mvp/confidence_closure_and_lucid_module_expansion_spec.md`: committed path to 90% confidence plus the new Lucid tile/module scope, AC, and tests
- `docs/mvp/google_workspace_operator_automation_spec.md`: deferred operator-side Gmail, Calendar, Docs, and Sheets automation via Google Workspace CLI
- `docs/mvp/voice_runtime_hardening_and_external_lanes_spec.md`: Gemini Live hardening decisions, Sesame gating, sample-persona password policy, and queued ElevenLabs/Manus lanes
- `docs/documentation-map.md`: update matrix for future work

## Update Matrix

### Update `README.md` when

- local setup changes
- new required env vars are introduced
- new top-level scripts are added
- deployment entrypoints change

### Update `docs/career-concierge-os.md` when

- module structure changes
- architecture changes
- product scope changes
- Signal Atlas relationship changes
- canonical environment changes

### Update `docs/career-concierge-fork.md` when

- the fork identity changes
- collaborators need a new handoff brief
- product positioning relative to Signal Atlas changes
- the production environment changes

### Update `docs/operations-runbook.md` when

- deploy commands change
- Cloud Run service names change
- auth migration procedure changes
- admin access model changes
- public access requirements change

### Update `docs/ssai-production-migration.md` when

- migration milestones are completed
- blockers are removed
- project IDs, Firebase app IDs, or service URLs change
- cutover status changes

### Update `docs/decision-log.md` when

- a product or platform decision becomes durable
- a migration choice is locked in
- architecture is intentionally kept or intentionally changed
- an operational fallback becomes the new standard path

### Update `docs/progress-log.md` when

- sprint or epic status changes
- roadmap module states are changed
- a backlog item moves from queued to active or shipped
- a demo-readiness blocker is opened or closed

### Update `docs/backlog-ledger.md` when

- any story status changes
- execution work is completed and needs an audit row
- demo-critical sequence state changes
- blockers are introduced or resolved

### Update `docs/mvp/demo_master_tasklist.md` when

- persona-based acceptance criteria change
- demo readiness task sequence changes
- roadmap-to-test-spec mapping changes
- in-app roadmap task cards are added, removed, or reordered

### Update `docs/mvp/demo_validation_checklist.md` when

- persona acceptance checks are added/removed
- module flow changes impact demo QA sequencing
- new backlog stories need explicit test steps

### Update `docs/mvp/editorial-grid_brand-studio_spec.md` when

- official naming or palette changes
- workflow labels or overlay language change
- Brand Studio controls change
- the suite shell starts consuming new brand-config fields

### Update `docs/mvp/cinematic_episodes_player_spec.md` when

- the Episodes redesign scope changes
- client vs operator mode boundaries change
- player layout or interaction model changes
- new design guardrails are added for future Episodes work

### Update `docs/mvp/microdrama_media-orchestration_spec.md` when

- media-planning trigger logic changes
- reusable-vs-bespoke thresholds change
- media storage architecture changes
- the content-director or media-pipeline agent responsibilities change

### Update `docs/mvp/agentic_staff_operating_model_spec.md` when

- the canonical staff roster changes
- orchestration triggers or handoff policy change
- admin staffing controls change
- a deferred runtime/channel decision becomes active scope

### Update `docs/mvp/agentic_staffing_roadmap.md` when

- staffing implementation order changes
- stack-boundary decisions change
- new staffing epics or master tasks are added

### Update `docs/mvp/agentic_execution_charter.md` when

- a stakeholder baseline audit changes
- confidence scoring changes materially
- recommended deployable staff count changes
- the operator ledger/notebook protocol changes

### Update `docs/mvp/confidence_closure_and_lucid_module_expansion_spec.md` when

- the path to 90% confidence changes
- Lucid tile/module scope changes
- new Lucid overlays add or remove client modules
- acceptance criteria for TV, Flash Cards, Events, Telescope, Team, or onboarding/booking change

### Update `docs/mvp/google_workspace_operator_automation_spec.md` when

- deferred Workspace automation moves into active scope
- Gmail/Calendar/Docs/Sheets use cases change materially
- dry-run or admin-governance rules for Workspace automation change

## Code-to-Docs Mapping

- `api/` -> `docs/career-concierge-os.md`, `docs/operations-runbook.md`
- `services/firebase.ts` -> `README.md`, `docs/career-concierge-os.md`, `docs/ssai-production-migration.md`
- major fork/repositioning changes -> `docs/career-concierge-fork.md`
- `components/AdminConsole.tsx` -> `docs/career-concierge-os.md`, `docs/operations-runbook.md`
- `components/admin/BrandStudioSection.tsx` -> `docs/career-concierge-os.md`, `docs/operations-runbook.md`, `docs/mvp/editorial-grid_brand-studio_spec.md`
- `components/BingeFeedView.tsx` -> `docs/mvp/cinematic_episodes_player_spec.md`, `docs/mvp/demo_master_tasklist.md`, `docs/progress-log.md`
- `components/RoadmapView.tsx` -> `docs/backlog-ledger.md`, `docs/mvp/demo_master_tasklist.md`, `docs/progress-log.md`
- confidence-closure and Lucid tile planning -> `docs/mvp/confidence_closure_and_lucid_module_expansion_spec.md`, `docs/backlog-ledger.md`, `docs/mvp/demo_master_tasklist.md`, `docs/progress-log.md`
- staff/orchestration product planning -> `docs/mvp/agentic_staff_operating_model_spec.md`, `docs/mvp/agentic_staffing_roadmap.md`, `docs/career-concierge-os.md`, `docs/decision-log.md`
- stakeholder baseline audit and operator guidance -> `docs/mvp/agentic_execution_charter.md`
- `components/GeminiLivePanel.tsx` -> `README.md`, `docs/career-concierge-os.md`
- `scripts/deploy_*` -> `README.md`, `docs/operations-runbook.md`, `docs/ssai-production-migration.md`
- `api/scripts/seed_persona_fixtures.mjs` -> `README.md`, `docs/operations-runbook.md`, `docs/progress-log.md`
- `config/demo/persona-fixtures.json` -> `docs/mvp/demo_master_tasklist.md`, `docs/progress-log.md`
- `services/cjsApi.ts` / `components/CjsExecutionView.tsx` -> `docs/career-concierge-os.md`, `docs/operations-runbook.md`, `docs/backlog-ledger.md`
- `components/AssetsView.tsx` -> `docs/career-concierge-os.md`, `docs/backlog-ledger.md`, `docs/progress-log.md`
- `firestore*.rules` / `firebase.json` -> `docs/operations-runbook.md`, `docs/ssai-production-migration.md`
- durable product/platform choices -> `docs/decision-log.md`
- backlog progress and roadmap node state -> `docs/progress-log.md`
- story board and execution history -> `docs/backlog-ledger.md`
- persona readiness mapping and demo task ordering -> `docs/mvp/demo_master_tasklist.md`

## Documentation Standard

Every meaningful infra, auth, deployment, or product-structure change should update at least one documentation file in the same change set.

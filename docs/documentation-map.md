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

## Code-to-Docs Mapping

- `api/` -> `docs/career-concierge-os.md`, `docs/operations-runbook.md`
- `services/firebase.ts` -> `README.md`, `docs/career-concierge-os.md`, `docs/ssai-production-migration.md`
- major fork/repositioning changes -> `docs/career-concierge-fork.md`
- `components/AdminConsole.tsx` -> `docs/career-concierge-os.md`, `docs/operations-runbook.md`
- `components/GeminiLivePanel.tsx` -> `README.md`, `docs/career-concierge-os.md`
- `scripts/deploy_*` -> `README.md`, `docs/operations-runbook.md`, `docs/ssai-production-migration.md`
- `firestore*.rules` / `firebase.json` -> `docs/operations-runbook.md`, `docs/ssai-production-migration.md`
- durable product/platform choices -> `docs/decision-log.md`
- backlog progress and roadmap node state -> `docs/progress-log.md`
- story board and execution history -> `docs/backlog-ledger.md`
- persona readiness mapping and demo task ordering -> `docs/mvp/demo_master_tasklist.md`

## Documentation Standard

Every meaningful infra, auth, deployment, or product-structure change should update at least one documentation file in the same change set.

# Backlog Ledger

This is the end-to-end backlog tracker and execution ledger for Career Concierge OS.
Source of truth backlog: `docs/mvp/Career_Concierge_V1_MVP_Spec_Complete.md`.

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
| E02-S01 Agent Role Definition | E02 | P0 | Queued | `agents` collection and typed agent docs not implemented yet. |
| E02-S02 Agent DNA Access | E02 | P0 | Queued | Chief of Staff read-path and explicit policy layer not implemented yet. |
| E02-S03 Agent Summary and Logging | E02 | P0 | Queued | Interaction logging flow (`clients/{id}/interactions`) not implemented yet. |
| E02-S04 Human-in-the-Loop Validation | E02 | P0 | Queued | Pending-approval queue and approve/reject flow not implemented yet. |
| E03-S01 Pilot Episode Generation | E03 | P0 | In Progress | Episode generation ships; full demo orchestration still being refined. |
| E03-S02 Episode Template Engine | E03 | P0 | In Progress | Structured prompt/schema exists; ongoing quality/polish work remains. |
| E03-S03 Model Cost Control | E03 | P0 | In Progress | Admin model routing exists; final cost guardrails still evolving. |
| E04-S01 Module Grid Dashboard | E04 | P1 | Done | Grid with lock/unlock flow is live. |
| E04-S02 Artifact Views | E04 | P1 | Done | Core artifact views are implemented. |
| E04-S03 Mobile-First Responsive Design | E04 | P1 | In Progress | Mobile works but refinement and QA passes remain. |
| E05-S01 Secure Admin Access | E05 | P1 | In Progress | Email allowlist and admin API gating active; claims strategy still open. |
| E05-S02 Prompt Management | E05 | P1 | Done | Prompt overlays editable from admin console. |
| E05-S03 Feature Flags | E05 | P1 | Done | Module toggles are active via public/admin config. |
| E06-S01 Resume Upload | E06 | P2 | Queued | Upload UI + storage path integration not implemented yet. |
| E06-S02 Resume Review Agent | E06 | P2 | Queued | Resume analysis artifact pipeline not implemented yet. |
| E06-S03 Search Strategy Generation | E06 | P2 | Queued | Search strategist artifact pipeline not implemented yet. |

## Demo-Critical Sequence

Investor-critical sequence:

1. Smart Start Intake submitted
2. Professional DNA persisted
3. Core artifacts generated (Brief, Plan, Profile, AI Profile, Gaps)
4. Binge episode generated
5. Chief of Staff summary logged

Current blocker in this sequence: Step 5 (`E02-S03`) is not implemented yet.

## Demo Master Tasklist Snapshot

Canonical demo tasklist:

- `docs/mvp/demo_master_tasklist.md`

Current task pulse:

| Task | Status | Primary Persona Target |
| :--- | :--- | :--- |
| MTL-01 Persona fixture seed + deterministic intake payloads | In Progress | TU1/TU2/TU3/TU4 (seed script + fixture model landed; prod write pass pending) |
| MTL-02 Intent-based journey routing + unlock order | In Progress | TU1/TU2/TU3 |
| MTL-03 Chief of Staff interaction ledger | Queued | TU1/TU2/TU3 |
| MTL-04 Episode personalization + modality routing | In Progress | TU1/TU3/TU4 |
| MTL-05 CJS execution rail (upload/review/strategy) | Queued | TU2 |
| MTL-06 Free-tier constrained surface + upgrade conversion CTA | Blocked | TU4 |
| MTL-07 Mobile completion pass | In Progress | TU1/TU2/TU3/TU4 |
| MTL-08 Manual QA script + acceptance proof capture | Queued | TU1/TU2/TU3/TU4 |

## Execution Ledger

| UTC Timestamp | Scope | Change | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 2026-03-05 04:59:53Z | E04/E05 docs+UX | Added roadmap module with node visualization. | Done | `components/RoadmapView.tsx`, `App.tsx`, `docs/progress-log.md` |
| 2026-03-05 05:00:00Z | Backlog governance | Added persistent backlog ledger + execution ledger process. | Done | `docs/backlog-ledger.md`, `docs/documentation-map.md`, `README.md` |
| 2026-03-05 10:45:00Z | E04/E05 UX reliability | Exposed roadmap to signed-in users and added epic/story validation grid; removed fragile frontend admin lockout behavior. | Done | `components/RoadmapView.tsx`, `App.tsx`, `docs/progress-log.md` |
| 2026-03-05 16:49:21Z | Demo readiness planning | Added test-user-based master tasklist and surfaced persona/task mapping in Roadmap module. | Done | `docs/mvp/demo_master_tasklist.md`, `components/RoadmapView.tsx`, `docs/progress-log.md` |
| 2026-03-05 19:15:47Z | MTL-01 persona fixtures | Added deterministic persona fixture source and seed utility (dry-run verified). | Done | `config/demo/persona-fixtures.json`, `api/scripts/seed_persona_fixtures.mjs`, `.context/persona-seed-report.dry-run.json` |

## Update Protocol

For every implementation pass:

1. Update story statuses in the backlog board if scope changed.
2. Append one new row to the execution ledger with UTC timestamp, changed scope, and evidence paths.
3. Update `docs/progress-log.md` summary to match the same state.

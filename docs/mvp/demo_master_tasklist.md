# Demo Master Tasklist (Roadmap + Test User Specs)

This is the canonical implementation tasklist for demo-readiness.
It merges:

- `docs/mvp/Career_Concierge_V1_MVP_Spec_Complete.md`
- `docs/mvp/test_user_specs.md`
- current in-app roadmap state (`components/RoadmapView.tsx`)

## Objective

Deliver end-to-end journeys for all four test users with evidence-backed acceptance checks in product.

## Persona Tracks

| Persona | Track ID | Intent | Current Delivery State | Critical Dependency |
| :--- | :--- | :--- | :--- | :--- |
| Donell Woodson | `TU1` | Stay sharp in current role | In Progress | Episode modality routing + profile precision |
| Garry Francois | `TU2` | Move into a specific next role | Queued | CJS execution rail (upload/review/strategy) |
| Taylor Fulton | `TU3` | Help design a direction | In Progress | MyConcierge direction-guidance flow |
| Derrick Gervin | `TU4` | Free foundational learning | Blocked | Free-tier module gating + upgrade CTA |

## Master Task Board

| Task | Status | Why It Exists | Linked Stories | Personas |
| :--- | :--- | :--- | :--- | :--- |
| `MTL-01` Persona fixture seed + deterministic intake payloads | In Progress | Stable E2E test users and repeatable demo data | `E01-S01`, `E01-S02` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-02` Intent-based journey routing in suite home + unlock order | In Progress | Match dashboard priority to user intent | `E04-S01`, `E05-S03` | `TU1`, `TU2`, `TU3` |
| `MTL-03` Chief of Staff interaction ledger | Queued | Persist summary + next actions for investor proof | `E02-S03` | `TU1`, `TU2`, `TU3` |
| `MTL-04` Episode personalization and modality routing | In Progress | Ensure first episode matches focus + learning modality | `E03-S01`, `E03-S02`, `E03-S03` | `TU1`, `TU3`, `TU4` |
| `MTL-05` CJS execution rail (upload, review, strategy) | Queued | Deliver promotion/job-search operating flow | `E06-S01`, `E06-S02`, `E06-S03` | `TU2` |
| `MTL-06` Free-tier constrained surface + upgrade conversion CTA | Blocked | Enforce free-tier limits and upgrade path | `E05-S03`, `E04-S01` | `TU4` |
| `MTL-07` Mobile completion pass for intake, episodes, roadmap | In Progress | Eliminate mobile rendering and interaction regressions | `E04-S03` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-08` Manual QA script and acceptance proof capture | Queued | Produce proof package for each persona demo run | `E02-S04`, `E04-S02` | `TU1`, `TU2`, `TU3`, `TU4` |

## Acceptance Mapping (Test Spec -> Backlog)

### TU1 Donell (Skill-Sharpener)

- `AC-1`: AI Profile accuracy -> `E04-S02`, `MTL-02`
- `AC-2`: Gap clarity for director transition -> `E04-S02`, `MTL-02`
- `AC-3`: First episode topic + auditory format -> `E03-S01`, `E03-S02`, `MTL-04`
- `AC-4`: Plan focuses internal actions -> `E01-S03`, `MTL-02`
- `AC-5`: CJS visible but inactive recommendations -> `E05-S03`, `MTL-02`

### TU2 Garry (Career Accelerator)

- `AC-1`: Brief states goal + ROI obstacle -> `E01-S03`, `MTL-02`
- `AC-2`: Plan includes KPI-focused 72-hour action -> `E01-S03`, `MTL-02`
- `AC-3`: CJS primary and resume reviewer actionable -> `E06-S02`, `MTL-05`
- `AC-4`: Search strategy focuses internal promotion path -> `E06-S03`, `MTL-05`
- `AC-5`: Assets stores 3+ resume versions -> `E06-S01`, `MTL-05`

### TU3 Taylor (Direction-Seeker)

- `AC-1`: Profile surfaces transferable strengths -> `E04-S02`, `MTL-02`
- `AC-2`: Gaps identify technical readiness deltas -> `E04-S02`, `MTL-02`
- `AC-3`: MyConcierge direction Q&A support -> `E02-S03`, `MTL-03`
- `AC-4`: Episodes begin with foundational workflow topics -> `E03-S01`, `MTL-04`
- `AC-5`: Plan emphasizes exploration and confidence actions -> `E01-S03`, `MTL-02`

### TU4 Derrick (Free Course User)

- `AC-1`: Short intake flow -> `E01-S01`, `MTL-06`
- `AC-2`: Limited artifacts only -> `E05-S03`, `MTL-06`
- `AC-3`: Preset intro playlist -> `E03-S01`, `MTL-04`, `MTL-06`
- `AC-4`: Upgrade CTA after completion -> `E05-S03`, `MTL-06`
- `AC-5`: MyConcierge and CJS hidden -> `E05-S03`, `MTL-06`

## Execution Order for Demo Readiness

1. Complete `MTL-01` fixtures to lock repeatable test runs.
2. Close `MTL-02` routing so each persona sees the correct primary journey.
3. Close `MTL-04` episode routing to match content and modality to persona.
4. Ship `MTL-05` for Garry's promotion/CJS path.
5. Ship `MTL-06` for Derrick's constrained free-tier experience.
6. Ship `MTL-03` and `MTL-08` for final investor-proof audit trail.
7. Re-run `MTL-07` mobile pass before production demo freeze.

## Current Implementation Notes

- `MTL-01`: fixture model is now checked in at `config/demo/persona-fixtures.json`.
- `MTL-01`: seed workflow is now available at `api/scripts/seed_persona_fixtures.mjs` (dry-run + optional Auth upsert).

## Definition of Done

A task is only `Done` when all of the following are true:

- UI behavior is visible in product and testable end-to-end.
- Story validation in `Roadmap` module is updated.
- `docs/backlog-ledger.md` and `docs/progress-log.md` are updated in the same pass.
- Evidence links or notes are logged for the pass.

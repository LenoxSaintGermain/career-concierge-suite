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
| Garry Francois | `TU2` | Move into a specific next role | In Progress | Validation/tuning pass on new CJS rail outputs |
| Taylor Fulton | `TU3` | Help design a direction | In Progress | Manual validation of shipped MyConcierge + exploration flow |
| Derrick Gervin | `TU4` | Free foundational learning | In Progress | Manual validation of starter playlist + upgrade conversion |

## Master Task Board

| Task | Status | Why It Exists | Linked Stories | Personas |
| :--- | :--- | :--- | :--- | :--- |
| `MTL-01` Persona fixture seed + deterministic intake payloads | Done | Stable E2E test users and repeatable demo data | `E01-S01`, `E01-S02` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-02` Intent-based journey routing in suite home + unlock order | Done | Match dashboard priority to user intent | `E04-S01`, `E05-S03` | `TU1`, `TU2`, `TU3` |
| `MTL-03` Chief of Staff interaction ledger | Done | Persist summary + next actions for investor proof | `E02-S03` | `TU1`, `TU2`, `TU3` |
| `MTL-04` Episode personalization and modality routing | In Progress | Episode topic routing and narrated delivery are shipped; persona validation still pending | `E03-S01`, `E03-S02`, `E03-S03` | `TU1`, `TU3`, `TU4` |
| `MTL-05` CJS execution rail (upload, review, strategy) | Done | Deliver promotion/job-search operating flow | `E06-S01`, `E06-S02`, `E06-S03` | `TU2` |
| `MTL-06` Free-tier constrained surface + upgrade conversion CTA | Done | Free-tier limits, playlist surface, upgrade CTA, and direct sample-persona access are now ready for manual operator testing | `E05-S03`, `E04-S01` | `TU4` |
| `MTL-07` Mobile completion pass for intake, episodes, roadmap | In Progress | Eliminate mobile rendering and interaction regressions | `E04-S03` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-08` Manual QA script and acceptance proof capture | Done | Persona validation now includes one-click launch, reset/reseed, shared demo credentials, and proof-capture controls | `E02-S04`, `E04-S02` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-09` Editorial grid brand OS + workflow label sync | Done | Official naming, palette, overlay treatment, and admin-tunable hierarchy are now shipped end to end | `E07-S01`, `E07-S02`, `E07-S03`, `E07-S04` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-10` Client-facing cinematic Episodes player | Done | Default Episodes is now a client-facing micro-drama player, with operator diagnostics preserved in a separate admin-only mode | `E08-S01`, `E08-S02`, `E08-S03`, `E08-S04`, `E08-S05` | `TU1`, `TU3`, `TU4` |
| `MTL-11` Content Director media orchestration + reusable library pipeline | Done | Phase A planning, taxonomy-guided tagging, resolver, persisted media jobs/manifests, worker-ready queue processing, and admin media ops are now live end to end | `E09-S01`, `E09-S02`, `E09-S03`, `E09-S04`, `E09-S05`, `E09-S06`, `E09-S07` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-12` Agentic staff operating model + orchestration control plane | Done | Staff registry, policy graph, orchestration runs, approval decisions, human follow-up routing, and telemetry are now live in the control plane | `E10-S01`, `E10-S02`, `E10-S03`, `E10-S04`, `E10-S05`, `E10-S06`, `E10-S07` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-13` Sample persona test harness + quick-switch ops | Done | Operators can now launch, reseed, and mark proof capture per seeded demo persona from the roadmap validation rail | `E11-S01`, `E11-S02`, `E11-S03` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-14` Lucid tile parity + expansion modules | Done | The added Lucid tiles now ship as real client-safe modules with entitlement rules, interaction logging, and acceptance coverage | `E12-S01`, `E12-S02`, `E12-S03`, `E12-S04`, `E12-S05`, `E12-S06` | `TU1`, `TU2`, `TU3`, `TU4` |
| `MTL-15` Public AI Concierge onboarding + booking ops | Done | Public Smart Start intake, structured slot capture, human handoff, and operator-visible concierge booking review are now live end to end | `E13-S01`, `E13-S02`, `E13-S03`, `E13-S04` | `TU1`, `TU2`, `TU3`, `TU4` |

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

### Brand + Operator Validation

- `AC-1`: Official suite naming appears in header and suite-home shell -> `E07-S01`, `MTL-09`
- `AC-2`: Logo config propagates without code deploy -> `E07-S03`, `MTL-09`
- `AC-3`: Grid labels and overlay labels match Lucid workflow language -> `E07-S04`, `MTL-09`
- `AC-4`: Admin preview reflects saved hierarchy changes -> `E07-S02`, `MTL-09`

### Episodes V2 Validation

- `AC-1`: Default Episodes hides BTS/operator language -> `E08-S01`, `MTL-10`
- `AC-2`: Episode flow reads as cold open -> beats -> challenge -> continuation -> `E08-S02`, `E08-S03`, `MTL-10`
- `AC-3`: Mobile portrait and desktop editorial layouts both feel immersive and uncluttered -> `E08-S04`, `MTL-10`
- `AC-4`: Episodes redesign remains compliant with Brand Studio system -> `E08-S05`, `MTL-09`, `MTL-10`

### Media Orchestration Validation

- `AC-1`: Learning-plan and episode-plan seed start after intake + first-order signal -> `E09-S01`, `MTL-11`
- `AC-2`: Generic media concepts are reused from the library instead of regenerated -> `E09-S02`, `E09-S03`, `MTL-11`
- `AC-3`: Bespoke media is reserved for client-specific narrative needs -> `E09-S03`, `MTL-11`
- `AC-4`: Binary assets land in Cloud Storage while metadata/state land in Firestore, and queued jobs can be processed through the admin pipeline control path -> `E09-S04`, `E09-S05`, `MTL-11`
- `AC-5`: Operator mode can inspect lineage while client mode sees only final output -> `E09-S06`, `MTL-11`
- `AC-6`: Admin can monitor, retry, approve, and configure the media pipeline end to end -> `E09-S07`, `MTL-11`

### Agentic Staff Validation

- `AC-1`: Canonical staff registry defines role, trigger, scope, IO, and approval policy -> `E10-S01`, `MTL-12`
- `AC-2`: Intent and tier change which downstream staff roles are invoked -> `E10-S02`, `MTL-12`
- `AC-3`: Firestore stores orchestration runs and evidence without requiring a new primary data stack -> `E10-S03`, `MTL-12`
- `AC-4`: Admin exposes one operating section for staff roster, policies, runs, approvals, and evaluation state -> `E10-S04`, `MTL-12`
- `AC-5`: Sensitive outbound or bespoke actions route into approval or linked human follow-up from the orchestration control plane -> `E10-S05`, `MTL-12`
- `AC-6`: The roadmap remains aligned to the current web OS stack and explicitly defers ClawWork/Supabase/messaging-channel requirements -> `E10-S06`, `MTL-12`
- `AC-7`: Staff outputs can carry evaluation/confidence signals for operator review -> `E10-S07`, `MTL-12`

### Persona Harness Validation

- `AC-1`: Operator can launch each seeded sample persona quickly from one operating surface -> `E11-S01`, `MTL-13`
- `AC-2`: Operator can reset and reseed a sample persona without touching unrelated data -> `E11-S02`, `MTL-13`
- `AC-3`: Validation surface links launch, reset, and proof-capture steps per persona -> `E11-S03`, `MTL-13`
- `AC-4`: All seeded sample personas share a default manual login password surfaced in admin -> `E15-S04`, `MTL-08`

### Voice Runtime Validation

- `AC-1`: Gemini Live is the default active voice lane and does not silently fall back to Sesame -> `E15-S01`, `E15-S03`
- `AC-2`: Admin exposes official Gemini voice-name options plus transcription, activity, and VAD controls -> `E15-S02`
- `AC-3`: Live token creation reflects transcription and activity-handling settings -> `E15-S01`, `E15-S02`
- `AC-4`: Sesame remains disabled by default until its dedicated service exists -> `E15-S03`
- `AC-5`: ElevenLabs and Manus appear only as planned lanes, not live providers -> `E15-S05`, `E15-S06`

### Lucid Module Expansion Validation

- `AC-1`: `SkillSync AI TV` opens a dedicated editorial video library with at least one personalized rail and correct free-tier gating -> `E12-S01`, `MTL-14`
- `AC-2`: `Flash Cards` creates or loads decks from current plan themes or recent episode history and persists review state -> `E12-S02`, `MTL-14`
- `AC-3`: `Events & Networking` surfaces relevant events plus bookmark or request-help actions without implying unsupported external RSVP state -> `E12-S03`, `MTL-14`
- `AC-4`: `Telescope` frames `now`, `near`, and `later` opportunity horizons and links back into Plan, Episodes, or CJS -> `E12-S04`, `MTL-14`
- `AC-5`: `SkillSync AI Team` explains support roles and premium handoff posture without exposing admin prompts, runs, or policies -> `E12-S05`, `MTL-14`
- `AC-6`: placeholder tiles are hidden, operator-only, or clearly marked upcoming so the grid numbering and trust stay intact -> `E12-S06`, `MTL-14`

### Public AI Concierge + Booking Validation

- `AC-1`: public AI Concierge entry captures identity basics, service intent, optional resume link, and hands off cleanly into the suite intake -> `E13-S01`, `MTL-15`
- `AC-2`: Smart Start scheduling supports structured date/time/timezone selection and persists booking state for operator review -> `E13-S02`, `MTL-15`
- `AC-3`: paid journeys make human-versus-AI concierge handoff semantics explicit -> `E13-S03`, `MTL-15`
- `AC-4`: admin can inspect booking status, intake progress, and concierge handoff state in one operating surface -> `E13-S04`, `MTL-15`

## Execution Order for Demo Readiness

1. Complete `MTL-01` fixtures to lock repeatable test runs.
2. Close `MTL-02` routing so each persona sees the correct primary journey.
3. Validate `MTL-04` episode routing against TU1, TU3, and TU4.
4. Validate shipped `MTL-05` on TU2 and tune output quality.
5. Validate `MTL-06` for Derrick's constrained free-tier experience.
6. Finish the remaining `MTL-07` mobile pass before production demo freeze.
7. Run the voice validation pass with Gemini Live enabled and Sesame off.
8. Capture final persona proof evidence using the admin harness.
9. Capture proof for shipped `MTL-10` across TU1, TU3, and TU4 so the final Episodes demo uses the client-facing cinematic player rather than the operator BTS surface.
10. Capture proof for shipped `MTL-11`, especially queued-job processing, retry, manifest review, and operator/client boundary checks.
11. Capture proof for shipped `MTL-12`, especially approval, human follow-up routing, and telemetry review in the control plane.
12. Implement `MTL-13` so persona rehearsal and investor-demo testing no longer depend on manual login, reset, and state-recovery steps.
13. Capture persona proof for shipped `MTL-15` so public Smart Start entry and booking review are demonstrated, not just implemented.
14. Capture persona proof for shipped `MTL-14` so each new Lucid tile is exercised during demo rehearsal rather than remaining unvalidated surface area.

## Current Implementation Notes

- `MTL-01`: fixture model is now checked in at `config/demo/persona-fixtures.json`.
- `MTL-01`: seed workflow is now available at `api/scripts/seed_persona_fixtures.mjs` (dry-run + optional Auth upsert + full account hydration).
- `MTL-03`: Chief of Staff interaction ledger shipped in `Assets` module with global admin approval queue.
- `MTL-05`: CJS rail now supports resume upload + resume review + search strategy generation.
- `MTL-09`: shared brand config, live preview, and suite-shell label overrides are now implemented in Admin + public config.
- `MTL-08`: the validation harness now includes a shared manual-login password for seeded personas in addition to one-click launch.
- `MTL-10`: shipped in product; remaining work is persona proof capture and any follow-up polish discovered during demo rehearsal.
- `MTL-11`: `E09-S01` through `E09-S07` are now shipped. Media-pack generation persists `media_jobs` and `media_manifests`, stores generated image binaries in Cloud Storage when available, keeps operator-only lineage in pipeline records, and exposes queue processing, retry, and review controls in admin.
- `MTL-12`: staffing/orchestration implementation is now shipped. Admin governance shows roster, policy, recent runs, confidence, policy flags, approval actions, and linked human follow-up routing from orchestration runs.
- `MTL-13`: roadmap validation now provides launch, reset/reseed, and proof-capture controls for seeded personas.
- `MTL-14`: now shipped in product as `SkillSync AI TV`, `Flash Cards`, `Events & Networking`, `Telescope`, and `SkillSync AI Team`, with placeholder governance handled by canonical tile ordering.
- `MTL-15`: public AI Concierge flow now captures structured date/time/timezone booking preferences and exposes them in admin for operator review.

## Definition of Done

A task is only `Done` when all of the following are true:

- UI behavior is visible in product and testable end-to-end.
- Story validation in `Roadmap` module is updated.
- `docs/backlog-ledger.md` and `docs/progress-log.md` are updated in the same pass.
- Evidence links or notes are logged for the pass.

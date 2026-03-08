# Agentic Execution Charter

## Status

Operator guide. This document is the final baseline audit and execution charter derived from:

- `docs/mvp/lucidchart_analysis.md`
- `docs/mvp/Jim's Notes - Key Requirements Extracted.md`
- current roadmap, backlog, and staffing specs under `docs/mvp/`

The confidence scores below are the March 6, 2026 audit snapshot.
The live roadmap module now recalculates confidence from current epic/task state, and the closure path to `90%+` now lives in `docs/mvp/confidence_closure_and_lucid_module_expansion_spec.md`.

## Executive Read

### Confidence Score

- `84/100` confidence that the roadmap/spec baseline now reflects Jim's intent and the Lucidchart flow at the documentation level
- `63/100` confidence that the live product already fulfills that same baseline end to end without further implementation

Why these are different:

- the roadmap/spec layer is now substantially aligned
- the live product still has queued work around the final Episodes experience, media operations, staffing control plane, and onboarding/admin polish

### Operator Conclusion

The OS is directionally correct and now well-governed on paper.
The remaining risk is not conceptual drift. It is execution completion in four places:

1. final client-facing Episodes UX
2. media pipeline and admin monitoring
3. explicit staffing/orchestration control plane
4. onboarding/admin workflows that still exist in Lucid/Jim inputs but are not fully represented in-product

## Baseline Audit

| Baseline Requirement | Source | Coverage State | Confidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Professional DNA is the source of truth in Firestore | Jim | Covered | High | Reflected across MVP docs and current architecture. |
| Agent-as-position with roles, guardrails, boundaries | Jim | Covered in spec, partial in product | Medium | Canonical staffing spec now exists; runtime/admin implementation remains queued. |
| Chief of Staff orchestrates vertical staff | Jim | Covered in spec, partial in product | Medium | Summary ledger exists; full handoff graph and run monitor are still queued. |
| Binge learning is DNA-linked micro-drama | Jim, Lucid | Covered in roadmap, partial in product | Medium | Topic routing exists; final cinematic player and operator/client split are still queued. |
| Silent V2 migration preserves deliverables while upgrading orchestration | Jim | Covered | Medium | Present in product strategy and staffing spec; not a discrete implementation track. |
| GCP + Firestore + Cloud Run + Cloud Storage remain the backbone | Jim | Covered | High | Explicitly locked in current specs and decision log. |
| Firestore-first memory with optional later vector layer | Jim | Covered | High | Explicitly adopted in staffing spec; vector layer intentionally deferred. |
| Admin dashboard shows job logs and ingestion health | Jim | Partial | Medium | Media/admin control plane is queued; system overview exists but not full end-to-end operations yet. |
| Paid/social landing -> AI Concierge voice-led intake posture | Lucid | Partial | Medium | Brand and workflow language are aligned, but the full public voice-led onboarding flow is not yet a dedicated implementation track. |
| Smart Start intake feels like a conversation, not a test | Lucid | Covered | High | Explicitly reflected in intake and copy direction. |
| Intent routing: current role / next role / not sure | Lucid | Covered | High | Shipped in journey routing and represented in roadmap/test-user mapping. |
| "Preparing your suite" progress state for core artifacts | Lucid | Covered | Medium | Present in flow direction and existing suite-generation behavior. |
| Brief and Plan as editorial outputs with 72-hour framing | Lucid | Covered | High | Already represented in current product and roadmap acceptance. |
| MyConcierge as a guidance surface, potentially human + AI | Lucid | Partial | Medium | MyConcierge exists; explicit human/AI toggle semantics are still light. |
| CJS as a parallel execution rail | Jim, Lucid | Covered | High | Implemented and mapped to persona flows. |
| Admin/concierge onboarding infrastructure including scheduling workflow | Jim, Lucid | Gap | Low | Calendar/date-time onboarding and concierge scheduling are not yet a first-class roadmap item. |
| Operator/human-in-the-loop validation | Jim | Covered in roadmap, partial in product | Medium | Approval queue exists; broader outbound and escalation coverage remains open. |

## Coverage Gap Analysis

### Green

- Professional DNA / Firestore grounding
- module-grid OS framing
- intent-aware routing
- Brief / Plan / core artifact structure
- CJS execution rail
- brand/language elevation into the editorial OS
- current-stack architectural discipline

### Yellow

- Chief of Staff is present, but not yet a fully observable orchestration system
- Episodes are functional, but not yet in their final user-facing cinematic form
- MyConcierge exists, but the human/AI operating contract remains underspecified
- Admin has strong config controls, but not yet the full staffing/media operations posture Jim implied
- evaluation/KPI concepts exist in principle, but not yet as a mature operator signal layer

### Red

- concierge scheduling / appointment workflow from Lucid + Jim is still not explicitly carried as product backlog scope
- public AI Concierge onboarding flow is still more implied than operationally specified

## Recommended Backlog Delta

If strict Jim/Lucid baseline fidelity is required, add these as explicit follow-up stories:

1. Public AI Concierge onboarding flow
   - voice-led or concierge-led pre-auth entry
   - tier selection, contact capture, optional resume, and handoff into intake
2. Concierge scheduling and intake booking
   - calendar slot selection
   - invite confirmation
   - operator visibility on upcoming intakes
3. MyConcierge human/AI operating mode
   - explicit escalation rule
   - visible handoff semantics
   - premium-tier human concierge attach point

These are the only meaningful baseline items I would call truly under-modeled right now.

## Recommended Agent Deployment Count

### Recommendation

Deploy `6` active AI roles now, with `2` deferred AI roles and `2` human roles.

This is the right number for the current backlog because it preserves clarity and governance. More than that will create prompt sprawl before the control plane is finished.

### Deploy Now

1. **Chief of Staff**
   - Mission: orchestrate the journey, summarize state, decide next best staff handoff
   - Scope: intake completion, artifact refresh, route selection, next-step logging

2. **Artifact Composer Pack**
   - Mission: produce Brief, Plan, Profile, AI Profile, Gaps, and Readiness
   - Scope: deterministic suite generation based on DNA and intent
   - Note: keep this as one governed pack, not six separate branded agents

3. **MyConcierge Guide**
   - Mission: provide ongoing guidance and Q&A grounded in the user's artifacts and intent
   - Scope: exploration, confidence-building, contextual interpretation, route advice

4. **Resume Reviewer**
   - Mission: optimize resume positioning without hallucinating facts
   - Scope: uploaded resume analysis and targeted rewrite guidance

5. **Search Strategist**
   - Mission: produce promotion/search plans aligned to intent
   - Scope: internal mobility, targeted company strategy, signal-building, outreach logic

6. **Episode Showrunner**
   - Mission: turn user context into learning episodes, narrative beats, and modality-aware structure
   - Scope: episode scripting and learning-sequence logic

### Defer Until `MTL-11` / `MTL-12`

7. **Content Director**
   - Activate when reusable-vs-bespoke media planning is being built for real

8. **Evaluator**
   - Activate once the admin control plane is ready to consume confidence and policy signals

### Keep As Human Roles

9. **Human Concierge Coach**
   - Mission: handle escalation, premium-touch support, and sensitive judgment calls

10. **Admin Operator**
   - Mission: monitor runs, approvals, config, and system health

## Mission and Scope Rules

### Rules Of Engagement

- only one orchestrator: Chief of Staff
- do not let specialist roles self-spawn new downstream tasks without writing the reason into the ledger
- agents should produce judgments and proposals, not mutate the world silently
- anything outbound, bespoke-sensitive, or reputationally risky must pause for approval
- free-tier journeys should not invoke bespoke media or premium staff behavior

## Shared Notebook Protocol

The agents should not keep each other in the loop through raw chat transcripts.
They should use a structured shared notebook in Firestore.

### Canonical Notebook Structure

- `system/agent-registry/{agentId}`
  - role contract, scope, prompt version, allowed actions, approval policy
- `system/orchestration-policies/default`
  - handoff rules by intent, tier, and trigger
- `clients/{uid}/orchestration_runs/{runId}`
  - one record per orchestration cycle
- `clients/{uid}/interactions/{interactionId}`
  - human-readable summaries, approvals, decisions, and concierge notes
- `clients/{uid}/learning_plans/{planId}`
  - learning arc state and recommended sequence
- `clients/{uid}/episode_plans/{planId}`
  - episode manifests and asset needs
- `clients/{uid}/assets/{assetId}`
  - resume versions, generated documents, approved deliverables

### Required `orchestration_runs` Fields

- `run_id`
- `client_uid`
- `trigger`
- `intent`
- `tier`
- `started_by_role`
- `status`
- `summary`
- `evidence_refs`
- `artifact_refs`
- `next_roles`
- `approval_state`
- `confidence`
- `created_at`
- `updated_at`

### Required Handoff Entry Fields

Each run should append handoff records with:

- `from_role`
- `to_role`
- `reason`
- `required_inputs`
- `produced_outputs`
- `confidence`
- `needs_approval`
- `timestamp`

### Human-Readable Rule

Every major orchestration run must also produce one plain-language note in `interactions` that answers:

- what we learned
- what happened next
- what still needs approval or human action

That is the human operator's notebook view.

## How The Roles Stay In Sync

1. Intake Concierge normalizes user signal.
2. Chief of Staff opens an orchestration run.
3. Specialist role reads the run, artifacts, and policies.
4. Specialist writes back outputs plus a handoff note.
5. Chief of Staff decides whether another specialist is needed or whether to stop.
6. If approval is needed, Admin Operator or Human Concierge Coach resolves it and writes the decision into the same run context.

No role should rely on hidden context only available in prompt history.

## Immediate Operator Guidance

### Treat As Complete Enough For Current Direction

- staffing philosophy
- current-stack architecture choice
- media-pipeline direction
- admin control-plane direction
- persona/tier routing

### Treat As Needing Action Before Calling The OS Fully Aligned

- finish `MTL-10`
- finish `MTL-11`
- finish `MTL-12`
- add explicit backlog coverage for onboarding/scheduling if Jim wants the Lucid onboarding flow carried into the shipped product, not just referenced historically

## Final Recommendation

Do not deploy a large swarm.
Deploy a small governed staff:

- 1 orchestrator
- 5 specialist AI roles
- 2 deferred roles
- 2 human operating roles

That is enough to make the OS feel like a real coordinated staff without collapsing into invisible complexity.

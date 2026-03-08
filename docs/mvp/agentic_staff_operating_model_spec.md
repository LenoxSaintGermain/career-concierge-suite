# Agentic Staff Operating Model Spec

## Status

Partially implemented. This is the canonical staffing and orchestration spec for Career Concierge OS. Registry expansion, policy graph, run records, and the first admin control-plane layer are now live; escalation depth and evaluator maturity remain open.

## Purpose

Recent research documents introduce strong ideas about department-style agents, channel abstraction, and operational accountability. They also assume infrastructure and product channels that do not match the live Career Concierge OS stack. This spec distills the useful concepts into a build path that fits the current product, codebase, and demo priorities.

## Current-Stack Decision

Career Concierge OS should stay on the current architecture for MVP and near-term development:

- Vite + React + TypeScript frontend
- Express API on Cloud Run
- Firebase Auth
- Firestore as the primary system database
- Cloud Storage for binary assets
- Gemini-family models for text, image, and video generation

Do not re-platform the MVP around:

- ClawWork or OpenClaw runtime assumptions
- Supabase + pgvector as the new primary store
- WhatsApp-native or Slack-native primary client journeys
- PWA install hard-gates as a launch requirement
- Magic-link-heavy navigation for the core client suite
- LiteLLM/OpenRouter as a mandatory orchestration dependency

These may become future expansion patterns. They should not define the current implementation roadmap.

## Critical Distillation From Research

### Adopt

- agent-as-position thinking with explicit role contracts
- one primary orchestrator with specialized downstream staff
- a department-style mental model for internal operating clarity
- strong operator visibility, approvals, and evidence logging
- library-first media reuse before bespoke generation

### Adapt

- the proposal's five departments should be mapped into Career Concierge OS language, not copied verbatim into user-facing branding
- channel abstraction should remain a design principle, not a mandatory multi-channel delivery build for MVP
- memory should remain Firestore-grounded first, with embeddings only if retrieval gaps become real
- ROI and evaluation should be captured as operational telemetry, not as a speculative "economic engine" before the core flows are stable

### Reject or Defer

- a ClawWork fork as the primary runtime foundation
- Supabase migration
- WhatsApp, Telegram, or Slack as first-class required delivery channels for the D2C product
- channel-first product branching before the web OS is complete
- introducing many loosely defined agents when a smaller, well-governed staff model will do

## Operating Principles

1. One orchestrator, not many competing orchestrators.
2. Not every artifact needs its own autonomous agent.
3. Separate judgment roles from execution services.
4. Prefer structured Firestore memory before unstructured RAG.
5. Keep the client surface calm; keep orchestration detail in operator/admin views.
6. Human approval is required for outbound communication, sensitive bespoke media, and any claim with reputational risk.

## Canonical Staff Model

### Staff Layers

- Client-facing intelligence: what the client feels as guidance
- Specialist generation staff: what produces artifacts, plans, and episode logic
- Media operations staff: what resolves reusable versus bespoke media
- Human/operator staff: what monitors, approves, and intervenes

### Canonical Roles

| Role | Type | Primary Responsibility | Trigger | Reads | Writes | Integrations | Human Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Chief of Staff | Agent | Own orchestration, summarize user state, choose next best staff handoff | Intake submit, artifact refresh, operator re-run | client DNA, artifacts, interactions, policies | orchestration summary, recommendations, interaction logs | Firestore, suite generator, admin queue | No, unless escalating |
| Intake Concierge | Agent mode of Chief of Staff | Run intake in concierge voice and normalize signal for downstream generation | Start Here flow | intake answers, tier, intent, modality | intake state, normalized orchestration snapshot | UI, Firestore | No |
| Artifact Composer Pack | Agent bundle / service layer | Generate Brief, Plan, Profile, AI Profile, Gaps, Readiness without creating unnecessary standalone staff UIs | Chief of Staff dispatch after intake | DNA, preferences, role context | artifacts | `/v1/suite/generate`, Firestore | No |
| MyConcierge Guide | Agent | Answer directional questions using existing artifacts and intent context | MyConcierge session, `not_sure` routing, follow-up guidance | DNA, artifacts, interactions | conversation responses, optional interaction notes | Firestore, MyConcierge UI | No |
| Resume Reviewer | Agent | Review resume and generate improvement guidance tied to target role | CJS resume review request | DNA, uploaded resume, target role | `resume_review` artifact, approval item if needed | Cloud Storage, Firestore, CJS API | Sometimes |
| Search Strategist | Agent | Create job-search or promotion strategy appropriate to intent | CJS strategy request | DNA, artifacts, intent, role target | `search_strategy` artifact, approval item if needed | Firestore, CJS API | Sometimes |
| Episode Showrunner | Agent | Turn user context into episode structures, beats, overlays, and learning arcs | episode request, learning-plan refresh | DNA, modality, learning plan, episode plan | episode manifest, script structure | `/v1/binge/episode`, Firestore | No |
| Content Director | Agent | Decide reusable versus bespoke media needs and create per-episode asset manifests | episode-plan seed, episode enrichment pass | learning plan, episode plan, brand rules, user context | asset manifest, generation requests | media library, admin config, Firestore | Sensitive bespoke only |
| Media Librarian | Agent / operator-assist role | Tag, rank, dedupe, and retire reusable media assets | new asset ingest, manual review, gap analysis | media metadata, taxonomy, usage history | media tags, publish state, lineage | Firestore, Cloud Storage, admin media console | Yes for publish changes when needed |
| Media Pipeline Worker | Service | Execute long-running image/video generation and retries | Content Director request | job config, asset brief, provider config | media jobs, storage objects, metadata | Gemini API, Cloud Storage, Firestore | No |
| Evaluator | Agent / service layer | Score quality, confidence, policy compliance, and evidence sufficiency for staff outputs | post-generation, operator review, QA runs | outputs, policies, interaction history | evaluation records, confidence flags | Firestore, admin console | No |
| Human Concierge Coach | Human | Intervene on high-touch client needs, escalations, and premium service moments | manual escalation, stalled journey, premium tier action | full client record, queue, artifacts | notes, approvals, next steps | Admin Console, Firestore | Yes |
| Admin Operator | Human | Configure staff, inspect queues, manage failures, and maintain system health | admin sessions, incidents, backlog validation | system config, queues, runtime state | config changes, approvals, retries | Admin Console, API, Firestore, Cloud Storage | Yes |

## Department Mapping From Research

The five-department framing is useful internally, but should map to the current product vocabulary:

| Research Department | Career Concierge OS Equivalent | Decision |
| :--- | :--- | :--- |
| STEWARD | Chief of Staff + Intake Concierge + MyConcierge | Adopt as internal mental model, not user-facing label |
| MENTOR | Episode Showrunner + learning guidance | Adopt |
| NAVIGATOR | Search Strategist + plan-routing logic | Adopt |
| AMPLIFIER | asset drafting / CJS deliverable support | Partial; keep inside Assets/CJS flows for now |
| ECHO | Evaluator + evidence logging layer | Adopt as internal evaluation role |

## Orchestration Graph

### Core Journey

1. Intake completes.
2. Intake Concierge normalizes signal into intent, tier, modality, pace, role context, and constraints.
3. Chief of Staff writes an orchestration snapshot and dispatches the Artifact Composer Pack.
4. Artifact Composer Pack generates Brief, Plan, Profile, AI Profile, Gaps, and Readiness as applicable to tier.
5. Chief of Staff logs a summary and chooses the next route:
   - `current_role`: Episodes, AI Profile, Gaps, internal-leverage plan
   - `target_role`: Brief, Plan, CJS, Assets
   - `not_sure`: Profile, Gaps, MyConcierge, exploratory plan
6. Episode Showrunner creates or refreshes episode structures when the route calls for learning content.
7. Content Director decides which episode assets come from the reusable library and which require bespoke generation.
8. Media Pipeline Worker generates only approved missing assets.
9. Evaluator scores output confidence and flags anything requiring operator review.
10. Admin Operator or Human Concierge Coach intervenes only when approvals, failures, or premium service moments require it.

### Tier Rules

- Paid tiers can invoke the full staff model.
- Free-tier users should not trigger bespoke media generation, CJS execution, or high-touch concierge operations.
- Free-tier episodes should use curated or reusable-library media only.

### Approval Rules

Require human approval for:

- outbound emails/messages/posts
- sensitive employer-specific or person-specific media
- claims that reference unverifiable accomplishments or employer internals
- publish-state changes for reusable media packs when governance requires it

## Data and Memory Model

### Keep Structured Memory First

Use Firestore as the primary memory system for MVP:

- `system/agent-registry`
- `system/orchestration-policies`
- `system/evaluation-policies`
- `system/media_library/*`
- `system/media_jobs/*`
- `clients/{uid}`
- `clients/{uid}/artifacts/*`
- `clients/{uid}/assets/*`
- `clients/{uid}/interactions/*`
- `clients/{uid}/learning_plans/*`
- `clients/{uid}/episode_plans/*`
- `clients/{uid}/orchestration_runs/*`

### Optional Later

- embeddings for semantic retrieval across artifacts and interactions
- external workflow engines for long-running cross-service orchestration
- multi-channel session abstractions for WhatsApp or Slack

These are not required to make the OS credible or operable right now.

## Service Boundaries

### Keep in Core API

- orchestration decisions
- staff policy enforcement
- suite artifact generation
- interaction logging
- admin config reads/writes
- approval queue actions

### Move to Dedicated Worker/Service

- long-running image and video generation
- media retries and derivative generation
- heavy asynchronous asset preparation

This aligns with the existing E09 media-pipeline direction and avoids turning the main API into a polling-heavy worker.

## Admin Console Requirements

The Admin Console should gain a dedicated agentic staff operating section with:

- staff registry overview
- role contracts and read/write scope visibility
- orchestration trigger policy editor
- run monitor for recent orchestration executions
- approval and escalation queue
- evaluation/confidence review surface
- media-pipeline operations
- provider/model configuration by role or function

This section is distinct from Brand Studio. Brand Studio governs expression. The staff operating section governs behavior.

## What Not To Build Yet

- a second orchestration stack parallel to the current Express API
- separate branded department UIs for each staff role
- full coach-business-in-a-box multi-channel product branches
- hard dependency on n8n before the internal orchestration graph is stable
- mandatory vector search before structured memory is exhausted

## Roadmap Mapping

- `E02`: core staff registry, role contracts, approvals, and orchestration governance
- `E05`: admin control plane for staff configuration and run monitoring
- `E09`: media-specific staff and services
- `E10`: canonical staff operating model, orchestration graph, and admin operating console
- `MTL-12`: implementation task for the staff operating model and control-plane work

## Acceptance Criteria

### AC-1 Canonical Staff Registry

- Every MVP staff role has a defined contract with trigger, reads, writes, approvals, and owning surface.
- Agents and services are distinguished explicitly.

### AC-2 Intent/Tier-Based Handoffs

- The orchestrator selects different downstream roles by intent and tier.
- Free-tier flows do not accidentally invoke paid-tier staff or bespoke media work.

### AC-3 Firestore-Grounded Memory

- The system can explain orchestration state using Firestore-backed run records and artifacts.
- Embeddings are not required for baseline orchestration quality.

### AC-4 Admin Operating Surface

- Admin can inspect staff roster, policies, orchestration runs, approvals, and media operations from a coherent control plane.

### AC-5 Human Escalation Discipline

- Sensitive outbound actions and bespoke media can be paused for approval.
- Premium human concierge intervention can be attached to stalled or high-touch journeys.

### AC-6 Current-Stack Alignment

- The implementation roadmap stays aligned to Firebase, Firestore, Cloud Run, Cloud Storage, and Gemini.
- Research concepts that require a re-platform are explicitly deferred.

## Test Cases

1. Inspect the staff registry and confirm each MVP role lists trigger, scope, inputs, outputs, and approval policy.
2. Run one user through each intent path and confirm the orchestrator selects the expected downstream staff roles.
3. Run a free-tier user and confirm no bespoke media or paid-tier execution staff are invoked.
4. Inspect Admin and confirm staff policies, approvals, orchestration runs, and media operations can all be monitored in one operating model.
5. Trigger an outbound or sensitive bespoke action and confirm it is routed into approval state.
6. Review the implementation plan and confirm it does not require Supabase, ClawWork, WhatsApp-native delivery, or PWA install gates to succeed.

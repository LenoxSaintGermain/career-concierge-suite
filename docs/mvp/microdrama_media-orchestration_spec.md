# Micro-Drama Media Orchestration Spec

## Status

Partially implemented. Phase A planning seeds, reusable-library resolution, persisted async media records, operator-only lineage, and admin media ops are now live. The major remaining gap is dedicated worker execution beyond the inline API path.

## Product Question

When do we know enough about the client to start learning-plan and episode-plan generation, and how do we avoid wasting tokens on repetitive media that should already exist in a reusable library?

## Core Decision

Use a library-first media strategy with a dedicated Content Director orchestration layer and a separate media-pipeline service.

Rules:

- plan after we have enough client signal
- retrieve from reusable library first
- generate bespoke media only when the episode truly depends on client-specific context
- store binaries in Cloud Storage, not Firestore
- store metadata, tags, lineage, and job state in Firestore

## When to Start Planning

### Minimum Signal Threshold

The system knows enough to start the first learning-plan and episode-plan pass after:

- intake is completed
- intent is known
- focus/pace preferences are known
- learning modality is known if available
- role and industry context are known

### Recommended Trigger Point

Trigger the first media-aware planning pass immediately after the suite artifact generation trigger completes or reaches a usable intermediate state.

Operationally:

1. Intake completes.
2. Core artifact generation begins.
3. As soon as the system has `intent`, `preferences`, intake answers, and at least the first usable `Brief` or `Profile` signal, the Content Director creates:
   - a learning-plan seed
   - an episode-plan seed
   - an asset brief for each planned episode

### Two-Phase Planning

Phase A: fast planning seed

- runs right after intake completion
- establishes episode themes, concept order, and likely reusable assets
- now implemented by the suite-generation trigger, which writes `learning_plans/content_director_phase_a`, `episode_plans/content_director_phase_a`, and `orchestration_runs/content_director_phase_a`

Phase B: enriched planning pass

- runs after Brief/Profile/AI Profile/Gaps are available
- sharpens which scenes need bespoke assets tied to user DNA, employer context, or target narrative

This avoids waiting too long while still improving specificity once richer artifacts exist.

## Agent Roles

### Content Director Agent

Owns:

- learning-plan generation
- episode-plan generation
- taxonomy and tagging standards
- reusable vs bespoke decisioning
- asset brief creation
- identifying library gaps before generation

Outputs:

- learning plan
- episode beat sheet
- media requirements manifest
- asset requests for the media pipeline

### Media Librarian / Catalog Agent

Owns:

- tagging
- deduplication
- asset versioning
- retrieval ranking
- aging/retirement of stale assets

### Media Pipeline Service

Owns:

- image/video generation execution
- async job state
- retries
- storage writes
- derivative generation
- metadata persistence

This should be a dedicated service boundary, even if it starts inside the current API repo.

### Media Pipeline Admin Surface

Owns:

- pipeline health and queue visibility
- job status and retry controls
- asset approval and publish state
- library management and tagging controls
- provider/model configuration
- cost and throughput monitoring
- failure-state inspection

This should land as a first-class section inside the Admin Console, not as ad hoc debug output.

## Reuse vs Bespoke Strategy

### Always Reusable

These should live in the global library and almost never be generated per user:

- globe or planet imagery
- abstract “LLM” or neural-network representations
- generic data-flow or infrastructure motifs
- command center screens
- office B-roll
- meeting-room tension shots
- keyboards, terminals, dashboards, abstract systems imagery
- generic challenge overlays and UI motifs

### Reusable Narrative Kits

These should be prebuilt as modular kits:

- cast archetypes
- character wardrobes
- office, boardroom, lab, and remote-work scene packs
- visual metaphors for trust, ambiguity, overload, escalation, synthesis
- reusable b-roll by concept
- portrait crops and 9:16 / 16:9 derivatives

### Bespoke On Demand

Generate only when the story depends on the client:

- location-specific establishing shots
- employer or industry-specific environment cues
- role-specific narrative stakes
- company-context scene dressing
- DNA-specific or gap-specific narrative moments
- employer/client-safe references that materially improve relevance

### Do Not Auto-Generate Without Approval

- real employer logos or trademarked marks
- identifiable likenesses meant to represent real people
- anything suggesting factual company internals unless sourced and approved

## Library Taxonomy

Every asset should carry structured tags.

Required tags:

- `concept`
- `scene_type`
- `environment`
- `character_archetype`
- `industry`
- `role_level`
- `intent`
- `focus`
- `pace`
- `modality`
- `tone`
- `aspect_ratio`
- `duration`
- `reusability_scope`
- `status`
- `source_model`
- `usage_rights`

Suggested `reusability_scope` values:

- `global`
- `industry_pack`
- `persona_pack`
- `client_specific`

## Orchestration Flow

1. Intake complete
- persist signal
- trigger suite artifacts

2. Content Director planning seed
- create learning-plan seed
- create episode-plan seed
- produce asset manifest

3. Asset Resolver
- search curated library by tags and story needs
- attach existing assets where confidence is high

4. Gap analysis
- identify which required assets are missing
- classify each gap as reusable-kit candidate or bespoke candidate

5. Media Pipeline execution
- generate missing assets through Gemini image/video models
- prefer reusable-kit generation when the asset will serve many episodes
- use bespoke generation only for client-specific scenes

6. Review + publish
- save metadata
- mark assets as ready for episode assembly
- optionally require operator approval for sensitive bespoke media

7. Episode assembly
- bind selected assets into the client-facing cinematic player
- retain provenance for operator mode

## Infrastructure Recommendation

### Service Shape

Create a dedicated media-pipeline surface, either:

- a separate Cloud Run service, or
- a clearly isolated worker surface inside the existing API deployment

Recommendation:

- keep orchestration in the core API
- run generation and storage work in a media-pipeline worker/service

Reason:

- media generation is async and heavier than normal request/response API work
- retries, polling, and storage writes should not block the main suite API surface

### Storage Model

Use:

- Cloud Storage for binary media
- Firestore for metadata, tags, manifests, and job state

Do not use Firestore as the primary binary store for image/video assets.

### Admin Requirements

The admin panel should expose an end-to-end media-pipeline section covering:

- queue depth
- active, completed, failed, and retryable jobs
- generation provider and model configuration
- storage targets and health
- library item status, tags, and publish state
- bespoke-generation approvals for sensitive assets
- usage/cost signals sufficient for operator decision-making

### Suggested Firestore Collections

- `system/media_library/{assetId}`
- `system/media_jobs/{jobId}`
- `system/media_collections/{collectionId}`
- `clients/{uid}/learning_plans/{planId}`
- `clients/{uid}/episode_plans/{planId}`
- `clients/{uid}/media_requests/{requestId}`

Each metadata document should reference:

- storage path
- derivative paths
- tags
- lineage
- originating episode plan
- source prompt template
- generation status

## Veo / Gemini Assumption

This plan assumes Gemini API media generation with Veo 3.1-style async operation patterns.

Architecture implication:

- expect long-running jobs
- expect polling or callback completion handling
- expect Cloud Storage-oriented media handling

## Acceptance Criteria

### AC-1 Planning Trigger
- The system can create a first-pass learning plan and episode plan once intake and first-order client signal exist.
- The system can enrich that plan once core artifacts are available.

### AC-2 Library-First Retrieval
- Generic concept media is retrieved from the reusable library instead of regenerated.
- The resolver can explain why an asset was reused vs generated.

### AC-3 Bespoke Generation Discipline
- Bespoke generation is reserved for client-specific narrative value.
- The pipeline does not spend tokens on globally reusable concepts that already exist in the library.

### AC-4 Service Boundary
- Media generation runs through a dedicated pipeline surface with async job handling.
- Binary media lands in Cloud Storage and metadata lands in Firestore.

### AC-5 Operator Visibility
- Operator mode can inspect lineage, tags, and generation state.
- Client mode only receives the final assembled episode assets.

### AC-6 Admin Monitoring + Configuration
- Admin includes a dedicated media-pipeline section.
- Operators can monitor queue health, inspect failures, retry jobs, and adjust pipeline configuration.
- The media-library and bespoke-approval workflow are visible from the same operating surface.

## Test Cases

1. Complete intake and confirm a learning-plan seed plus episode-plan seed are created.
   Positive: paid-tier intake that reaches `/v1/suite/generate` should create `learning_plans/content_director_phase_a`, `episode_plans/content_director_phase_a`, and `orchestration_runs/content_director_phase_a`.
   Negative: free-tier intake should not create those phase-A planning docs yet, because it does not generate the first-order artifact bundle.
2. Submit an episode plan that references generic concepts like `globe` or `LLM` and confirm existing library assets are reused.
3. Submit an episode plan with employer- or location-specific context and confirm the pipeline marks the request as bespoke.
4. Confirm generated binaries land in Cloud Storage and metadata/status records land in Firestore.
5. Confirm operator mode can inspect lineage while client mode only sees the finished episode media.
6. Confirm Admin exposes media-pipeline monitoring, retry controls, config fields, and library-management status in one section.
7. Negative: if Content Director seeding fails, suite artifact generation should still return artifacts and surface an orchestration error state instead of failing the full intake.

## Backlog Mapping

- `E09-S01`: Content Director planning trigger and episode-plan seed
- `E09-S02`: Media taxonomy, tagging, and reusable library
- `E09-S03`: Library-first asset resolver and gap analysis
- `E09-S04`: Cloud Run media-pipeline service with async job orchestration
- `E09-S05`: Firestore metadata + Cloud Storage binary persistence model
- `E09-S06`: Operator lineage view vs client-final output boundary
- `E09-S07`: Admin media-pipeline monitoring, configuration, and library operations

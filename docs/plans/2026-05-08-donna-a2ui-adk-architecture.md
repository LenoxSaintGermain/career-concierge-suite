# Donna A2UI / ADK Architecture

Date: 2026-05-08
Owner: Worker B
Status: implementation design

## Purpose

THI-145 should distinguish two layers that are currently blurred in the repo:

- Short-term spec compliance: keep Donna as the front-door app, render primary actions inline, and prevent primary Donna actions from navigating directly into suite modules.
- Next-gen architecture: make Donna Live the conversational layer, A2UI the visible action/render protocol, and ADK/server orchestration the durable execution layer for long-running tools, wiki/artifact updates, evaluation, and operator handoff.

## Primary Sources

- Gemini Live API overview: low-latency voice/vision, barge-in, tool use, transcriptions, stateful WSS, and ephemeral tokens. https://ai.google.dev/gemini-api/docs/live-api
- Gemini Live session management: connection/session limits, context compression, session resumption, GoAway handling, and `gemini-3.1-flash-live-preview` examples. https://ai.google.dev/gemini-api/docs/live-api/session-management
- ADK Gemini Live API Toolkit: ADK streaming adds Gemini Live voice/video capability to agents, includes WebSocket lifecycle management, tool calling, event handling, multi-agent workflows, and streaming tools. https://adk.dev/streaming/
- A2UI v0.8 stable specification: JSONL/SSE streamed UI protocol with `surfaceUpdate`, `dataModelUpdate`, `beginRendering`, `deleteSurface`, client `userAction`, catalogs, surfaces, and progressive rendering. https://a2ui.org/specification/v0.8-a2ui/
- A2UI overview: declarative UI across trust boundaries, no arbitrary code execution, approved component catalogs, progressive rendering. https://a2ui.org/

## Current Repo Baseline

Already present:

- Donna front-door shell exists in `components/DonnaShell.tsx` and `components/DonnaChatLane.tsx`.
- Local A2UI-like React materialization exists via `components/A2UICard.tsx`, `PackageSelectCards`, inline `IntakeFlow`, `dna_processing`, `dna_reveal`, `plan_active`, and `concierge_sync`.
- Primary Donna actions mostly use local `canvasState` instead of direct module navigation; `openModuleById` is reserved for secondary full-view actions in the brief/plan cards.
- Gemini Live token issuance exists at `POST /v1/live/token`, with ephemeral token constraints, current runtime voice config, wiki context, memory context, and live intake tool declarations.
- Wiki and memory substrates exist: `clients/{uid}.wiki`, `clients/{uid}.memory`, and `clients/{uid}/conversations/{sessionId}`.
- Staff registry, orchestration runs, interactions, approval queues, media jobs, and operator governance surfaces already exist in `api/index.js`, `AdminConsole`, and Firestore subcollections.

Current gaps:

- A2UI is implemented as React component convention, not as the A2UI protocol. There is no server-to-client JSONL/SSE stream, no `surfaceId`, no catalog negotiation, no `beginRendering`, no protocol-level `userAction`, and no client renderer registry.
- Donna text routing is mostly local heuristic matching in `DonnaChatLane`. Voice tool calls and typed UI events do not yet share one event envelope.
- Gemini Live can call intake tools, but the visible Donna canvas does not yet consume a server-authored render stream from those calls.
- Long-running work still fans out through Express route handlers and Firestore writes. It does not have a dedicated ADK runner boundary with resumable event streams, tool lifecycle state, cancellation, or replay.
- Wiki/artifact updates are persisted, but there is no canonical event contract that says which Donna utterance, A2UI action, tool run, evidence refs, evaluation result, and operator decision produced each update.
- Evaluation exists as scattered confidence, approval, and policy metadata. It is not yet a first-class per-run evaluation artifact with testable gates.
- Operator handoff exists through interactions/approval queues and MyConcierge, but handoff is not yet a protocol event with linked transcript, A2UI surface, tool run, artifact refs, policy reason, and SLA state.

## Architecture Boundary

Donna Live voice is the conversational layer.

- Owns live turn-taking, barge-in, VAD, transcripts, tone, and client-facing explanation.
- Reads compiled wiki and memory context.
- Emits conversational intents and tool requests, but should not directly mutate durable artifacts without a server-orchestration event.

A2UI is the visible action/render protocol.

- Owns what materializes in the Donna canvas.
- Short-term: local typed React cards satisfy Journey A/B behavior.
- Next-gen: server emits A2UI JSONL/SSE messages into named surfaces; the client maps approved catalog components to Career Concierge widgets.

ADK/server orchestration is the long-running execution layer.

- Owns durable tool execution, retries, cancellation, staged progress, artifact writes, wiki recompilation, evaluation, and operator handoff.
- Express can remain the API edge, but orchestration should be isolated behind a runner interface so the implementation can be ADK, Cloud Tasks, or another worker without changing Donna/A2UI contracts.

Firestore remains the system of record.

- Client context: `clients/{uid}`.
- Artifacts: `clients/{uid}/artifacts/{artifactType}`.
- Wiki/memory: `clients/{uid}.wiki`, `clients/{uid}.memory`, conversations subcollection.
- Runs: `clients/{uid}/orchestration_runs/{runId}`.
- Operator approvals/handoffs: `clients/{uid}/interactions/{interactionId}` plus linked run metadata.

## Short-Term Spec Compliance

The immediate A2UI milestone should not wait for a full protocol renderer.

Scope:

- Keep `A2UICard` as the local catalog primitive.
- Keep `canvasState` as the local surface controller for `landing`, `package_selection`, `intake_inline`, `dna_processing`, `dna_reveal`, `plan_active`, and `concierge_sync`.
- Continue routing primary Donna actions to canvas transitions, not module opens.
- Treat `Open full view ↗` as the only Donna-card path into suite modules.
- Mount Gemini Live inside `concierge_sync`, but record voice transcript and tool activity through the same memory/orchestration contracts used by text Donna.
- On intake completion, write artifacts and wiki as today, but emit a normalized `orchestration_run` summary for later replay/evaluation.

Short-term implementation rule:

```text
Donna utterance or chip -> local CanvasState transition -> local A2UICard render -> existing API route/tool -> Firestore write -> wiki/memory refresh
```

This is spec-compliant at the product-flow level, but not yet protocol-compliant with A2UI v0.8.

## Next-Gen Architecture

Target runtime:

```text
Donna Live/Text
  -> IntentEvent
  -> Orchestration API edge
  -> ADK/server runner
  -> ToolRunEvents + A2UI JSONL/SSE stream
  -> Donna canvas renderer
  -> Firestore artifacts/wiki/memory/runs
  -> Evaluation + operator handoff rail
```

Key services:

- `DonnaSessionGateway`: accepts text and voice turns, normalizes them to events, and forwards context to the runner.
- `A2UISurfaceGateway`: streams server-authored `surfaceUpdate`, `dataModelUpdate`, `beginRendering`, and `deleteSurface` messages to the Donna canvas.
- `OrchestrationRunner`: executes long-running tools, resumes runs, handles cancellation, writes status events, and emits A2UI progress updates.
- `ArtifactWriter`: writes artifacts with provenance and evidence refs.
- `WikiCompiler`: recompiles wiki after relevant artifact/intake/memory changes.
- `EvaluationRecorder`: writes per-run scores, policy flags, evidence coverage, hallucination-risk checks, and handoff recommendations.
- `OperatorHandoffRouter`: opens interaction records when confidence, approval policy, SLA, or client request requires human review.

ADK fit:

- Use ADK streaming for realtime agent runs that need Gemini Live behavior, automatic tool execution, event handling, and streaming tool outputs.
- Keep a repository-owned runner interface in front of ADK. ADK is a runtime implementation, not the product contract.
- Do not push all UI through ADK. ADK emits orchestration/tool events; A2UI remains the UI protocol.

## Target Event Contracts

### Conversation Event

```ts
type DonnaConversationEvent = {
  event_id: string;
  session_id: string;
  uid: string | null;
  surface: 'donna_shell' | 'smart_start' | 'concierge_sync';
  source: 'text' | 'gemini_live' | 'elevenlabs_ghost';
  role: 'user' | 'donna' | 'tool';
  body: string;
  transcript_ref?: string;
  timestamp: string;
};
```

### Intent Event

```ts
type DonnaIntentEvent = {
  event_id: string;
  session_id: string;
  uid: string | null;
  intent:
    | 'begin_smart_start'
    | 'select_package'
    | 'reveal_brief'
    | 'reveal_plan'
    | 'start_live_session'
    | 'update_wiki'
    | 'request_human_handoff';
  confidence: number;
  input_event_id: string;
  payload?: Record<string, unknown>;
};
```

### A2UI Server Event

Short-term events can be adapted to local React state. Next-gen events should align with A2UI v0.8 names.

```ts
type A2UIServerEvent =
  | { surfaceUpdate: { surfaceId: string; components: A2UIComponent[] } }
  | { dataModelUpdate: { surfaceId: string; contents: Record<string, unknown> } }
  | { beginRendering: { surfaceId: string; root: string; catalog?: string } }
  | { deleteSurface: { surfaceId: string } };
```

Required Donna surfaces:

- `donna.thread`
- `donna.primary_action`
- `donna.artifact_preview`
- `donna.live_session`
- `donna.operator_notice`

### A2UI Client Action

```ts
type A2UIClientAction = {
  surfaceId: string;
  actionId: string;
  componentId: string;
  session_id: string;
  uid: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
};
```

Examples:

- `package.select`
- `intake.field_update`
- `intake.complete`
- `artifact.open_full_view`
- `wiki.update_request`
- `handoff.request`

### Orchestration Run

```ts
type OrchestrationRunEvent = {
  run_id: string;
  uid: string;
  session_id: string;
  trigger_event_id: string;
  agent_role:
    | 'donna_concierge'
    | 'smart_start_intake'
    | 'artifact_composer_pack'
    | 'dna_research_analyst'
    | 'content_director'
    | 'operator_handoff_router';
  status: 'queued' | 'running' | 'waiting_for_user' | 'waiting_for_operator' | 'completed' | 'failed' | 'cancelled';
  progress?: { label: string; percent?: number };
  input_refs: string[];
  output_refs: string[];
  approval_state: 'not_required' | 'operator_review_available' | 'pending_approval' | 'approved' | 'rejected' | 'pending_human_followup';
  evaluation_ref?: string;
  error?: { code: string; message: string; retryable: boolean };
  timestamp: string;
};
```

### Artifact/Wiki Update

```ts
type KnowledgeUpdateEvent = {
  update_id: string;
  uid: string;
  run_id: string;
  kind: 'artifact_write' | 'wiki_compile' | 'memory_compile';
  target_ref: string;
  source_refs: string[];
  evidence_refs: string[];
  summary: string;
  timestamp: string;
};
```

### Evaluation

```ts
type RunEvaluation = {
  evaluation_id: string;
  run_id: string;
  uid: string;
  scores: {
    schema_valid: boolean;
    evidence_coverage: number;
    action_policy_pass: boolean;
    client_safety_pass: boolean;
    handoff_needed: boolean;
  };
  policy_flags: string[];
  evaluator: 'deterministic' | 'model' | 'operator';
  created_at: string;
};
```

### Operator Handoff

```ts
type OperatorHandoffEvent = {
  handoff_id: string;
  uid: string;
  run_id: string;
  session_id: string;
  reason:
    | 'client_requested_human'
    | 'approval_required'
    | 'low_confidence'
    | 'policy_flag'
    | 'tool_failure'
    | 'premium_lane';
  context_refs: string[];
  transcript_refs: string[];
  artifact_refs: string[];
  status: 'queued' | 'acknowledged' | 'scheduled' | 'resolved';
  sla?: string;
  created_at: string;
};
```

## Phased Implementation

### Phase 0: Contract Freeze

- Add shared TypeScript types for conversation, intent, A2UI action, orchestration, knowledge update, evaluation, and handoff events.
- Document local `A2UICard` as the temporary renderer catalog.
- Add schema validation for event payloads before Firestore writes.

Validation:

- Typecheck passes.
- Invalid event payloads are rejected by API tests.
- Existing Donna Journey A/B behavior is unchanged.

### Phase 1: Event Ledger

- Persist Donna text and Gemini Live transcript events into one session ledger.
- Link each `canvasState` transition to a `DonnaIntentEvent`.
- Write a lightweight `orchestration_runs` record for intake, brief reveal, plan reveal, wiki update, and live-session start.

Validation:

- A user can complete Journey A and every major transition has a session event, intent event, and run record.
- Returning-client wiki cards can be traced back to source artifacts/intake.

### Phase 2: Protocol Adapter

- Create a server endpoint that returns A2UI-like JSONL for package selection, intake progress, brief preview, plan preview, and handoff notices.
- Build a thin client adapter that maps protocol events to the existing React `A2UICard` catalog.
- Keep local `canvasState` as fallback while the protocol stream hardens.

Validation:

- Package selection and brief preview can render from server-authored JSONL.
- Client rejects unsupported component catalog items.
- `userAction` messages round-trip to the API and produce updated surface events.

### Phase 3: ADK Runner Boundary

- Introduce `OrchestrationRunner` with a stable interface: `startRun`, `appendInput`, `cancelRun`, `resumeRun`, and `streamEvents`.
- Implement the first runner for Smart Start artifact generation and wiki compilation.
- Use ADK streaming only behind this interface for runs that benefit from live multimodal/tool streaming.

Validation:

- Long-running artifact generation streams progress to Donna without blocking the UI.
- Refreshing the browser can resume visible run state from Firestore.
- Cancellation produces a durable cancelled run and a clear Donna/A2UI notice.

### Phase 4: Evaluation And Handoff

- Write `RunEvaluation` after every artifact/wiki/handoff run.
- Gate operator handoff on deterministic policy first, model evaluation second.
- Link Admin approvals and MyConcierge human follow-up requests to `OperatorHandoffEvent`.

Validation:

- Admin can open a handoff and see linked transcript, action, run, artifact refs, policy flags, and recommended resolution.
- Low-confidence or approval-required runs never silently mutate outbound/client-facing commitments.

### Phase 5: Full A2UI Renderer

- Replace local card-only convention with a protocol renderer for approved catalog components.
- Keep Career Concierge styling in the renderer, not in server output.
- Add snapshot tests for A2UI streams and rendered surfaces.

Validation:

- A2UI stream can render the same brief/plan preview on web and a future mobile/native client.
- Unsupported components fail closed with an operator-safe error surface.
- Progressive rendering avoids blank states during long runs.

## Validation Plan

Repo checks:

- `npm run build` or `npx tsc --noEmit` for frontend type safety.
- API unit tests around event schema validation and Firestore write adapters.
- Integration tests for `/v1/live/token`, memory routes, wiki routes, orchestration run writes, and approval/handoff routes.

Product checks:

- Journey A unauthenticated: arrival, package selection, inline intake, DNA processing, brief reveal, account handoff.
- Journey B authenticated uncalibrated: wiki fallback, Begin Smart Start inline, no primary module navigation.
- Journey B calibrated: wiki cards, brief/plan inline reveal, live session inline, full-view secondary only.
- Voice: Gemini Live can interrupt, transcribe, call intake tools, and preserve session context without losing the visible A2UI state.
- Long-running tools: visible progress, resumability, cancellation, retry, error surface, and run provenance.
- Knowledge: every artifact/wiki/memory update has source refs, run refs, and evaluation refs.
- Operator: approval queue and handoff queue show reason, transcript refs, artifact refs, policy flags, and next action.

Non-goals for the short-term compliance pass:

- Do not replace all React cards with a full A2UI renderer immediately.
- Do not make ADK the only orchestration runtime before the runner boundary exists.
- Do not let Live voice directly write artifacts or wiki without an orchestration event.
- Do not expose operator-only run/evaluation details inside client A2UI surfaces.

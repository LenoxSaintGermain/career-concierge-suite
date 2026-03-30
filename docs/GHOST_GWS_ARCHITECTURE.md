# Ghost Voice Agent + Google Workspace Integration

**System**: Career Concierge OS (Signal Atlas)
**Version**: 1.0
**Date**: 2026-03-29
**Authors**: L. Saint-Germain, Claude Opus 4.6
**Status**: Deployed (europe-west1)

---

## 1. Executive Summary

Career Concierge OS now ships with a voice-first AI agent ("Ghost") powered by ElevenLabs Conversational AI, backed by three server-side webhook tools and six client-side UI tools. The Ghost persona — **Donna, Chief of Staff** — provides real-time career intelligence via voice, with direct access to the candidate's Firestore artifacts and Google Drive documents.

Simultaneously, a Google Workspace integration publishes all 10 career artifact types as branded Google Docs, organized in a shared Drive folder structure, and synced automatically on every suite generation.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React 19)            │
│                                                          │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │ ElevenLabsConvai │    │  useGhostVoice Hook       │  │
│  │ Panel (React SDK)│◄──►│  - 15 client tool handlers│  │
│  │ signed session   │    │  - action log (max 20)    │  │
│  │ contextual state │    │  - intake-safe callbacks  │  │
│  │ uid + userId     │    │  - connection state       │  │
│  └────────┬─────────┘    └───────────────────────────┘  │
│           │ Client tools execute locally                  │
│           │ Server tools call webhook ──────┐            │
└───────────┼─────────────────────────────────┼────────────┘
            │                                  │
            ▼                                  ▼
┌───────────────────────────────────────────────────────────┐
│              ELEVENLABS CONVERSATIONAL AI                  │
│                                                           │
│  Agent: agent_4701kk7v4kk5fww8sccb53ggjw20               │
│  LLM: Gemini 2.5 Flash (or 3.1 Flash Live — backlog)     │
│  Voice: Donna persona — Chief of Staff                    │
│                                                           │
│  Client Tools (15):       Server/Webhook Tools (3):       │
│  ├─ navigate_module       ├─ fetch_briefing               │
│  ├─ close_module          ├─ fetch_artifact               │
│  ├─ toggle_admin          └─ fetch_drive_documents        │
│  ├─ dispatch_agent                                        │
│  ├─ update_stance         Webhook URL:                    │
│  ├─ address_gap           POST /v1/ghost/{briefing|       │
│  ├─ focus_intake_field            artifact|drive}         │
│  ├─ jump_intake_screen                                     │
│  ├─ set_intake_text_field   Auth: X-Ghost-Secret header   │
│  ├─ set_intake_choice_field UID: dynamic variable in body │
│  ├─ set_intake_multi_field                                │
│  ├─ set_intake_boolean_field                              │
│  ├─ clear_intake_field                                    │
│  ├─ set_intake_intent                                     │
│  ├─ set_support_preference                                │
│  └─ summarize_intake_state                                │
└───────────────────────────────────────────────────────────┘
            │
            │ Webhook calls (server tools)
            ▼
┌───────────────────────────────────────────────────────────┐
│              CLOUD RUN (europe-west1)                      │
│              Service: signal-atlas                         │
│              Image: node:22-slim + gws CLI                 │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ EXPRESS.JS API (api/index.js)                       │  │
│  │                                                     │  │
│  │ Ghost Endpoints:                                    │  │
│  │  POST /v1/ghost/briefing  → buildGhostBriefing()   │  │
│  │  POST /v1/ghost/artifact  → Firestore artifact read │  │
│  │  POST /v1/ghost/drive     → listFolderContents()   │  │
│  │  GET  /v1/ghost/tools     → tool definitions       │  │
│  │                                                     │  │
│  │ Suite Generation (3 paths):                         │  │
│  │  → syncArtifactsToGoogleDocs() on every generation  │  │
│  │                                                     │  │
│  │ Agent Registry:                                     │  │
│  │  document_publisher agent wired into orchestration  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ GWS MODULE (api/gws/)                               │  │
│  │                                                     │  │
│  │ gwsClient.js        CLI wrapper + ADC token cache   │  │
│  │ driveOrganizer.js   Folder structure + sharing      │  │
│  │ syncArtifacts.js    Artifact → Google Doc pipeline  │  │
│  │ templateEngine.js   Route to per-type templates     │  │
│  │ docRegistry.js      Firestore doc ID tracking       │  │
│  │ templates/          10 branded doc builders         │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
┌──────────────┐ ┌──────────┐ ┌─────────────────┐
│  FIRESTORE   │ │  DRIVE   │ │  GOOGLE DOCS    │
│              │ │          │ │                 │
│ career-      │ │ Career   │ │ 10 artifact     │
│ concierge db │ │ Concierge│ │ types as        │
│              │ │ /Clients │ │ branded docs    │
│ clients/     │ │ /Templates│ │                 │
│  {uid}/      │ │ /Internal│ │ Created/updated │
│   artifacts/ │ │          │ │ via batchUpdate │
│   doc_registry│ └──────────┘ └─────────────────┘
│   orchestration_runs/│
└──────────────┘
```

---

## 3. Environment Variables

All set on Cloud Run service `signal-atlas` in `europe-west1`:

| Variable | Value | Purpose |
|----------|-------|---------|
| `ELEVENLABS_AGENT_ID` | `agent_4701kk7v4kk5fww8sccb53ggjw20` | ElevenLabs agent identifier |
| `GHOST_WEBHOOK_SECRET` | `2524b397...` (SHA-256) | Authenticates webhook calls from ElevenLabs |
| `GWS_DOCS_ENABLED` | `true` | Feature flag — enables Google Docs sync |
| `GWS_DRIVE_ROOT_FOLDER_ID` | `1SRp5g4B5Kp-q_CK8Li8a-s4dRl_6_H9e` | Root "Career Concierge" folder |
| `GWS_CLIENTS_FOLDER_ID` | `1MHwzpyrEU4Ab5dTUM70INq-LmRDR28jV` | "Clients" subfolder for per-client docs |
| `GWS_BIN_PATH` | `/usr/local/bin/gws` | Path to gws CLI binary (set in Dockerfile) |
| `PORT` | `8080` | Cloud Run port (set in Dockerfile) |

---

## 4. Google Drive Folder Structure

```
Career Concierge/                    (1SRp5g4B5Kp-q_CK8Li8a-s4dRl_6_H9e)
├── Clients/                         (1MHwzpyrEU4Ab5dTUM70INq-LmRDR28jV)
│   └── {Display Name (email)}/      Auto-created by ensureClientFolder()
│       ├── The Brief                Google Doc
│       ├── Strategic Map            Google Doc
│       ├── Professional DNA         Google Doc
│       ├── AI Positioning           Google Doc
│       ├── Skill Gaps Analysis      Google Doc
│       ├── AI Readiness Report      Google Doc
│       ├── Job Search Execution     Google Doc
│       ├── 72-Hour Plan             Google Doc
│       ├── Resume Review            Google Doc
│       └── Search Strategy          Google Doc
├── Templates/                       (1SJn7saU75G8a2PmwWzBQye5HugJaGP8O)
│   └── (reserved for future use)
└── Internal/                        (1NI9vEfXzwkbS7O2xFMj56O3hwy872iCY)
    └── (reserved for admin-only docs)
```

---

## 5. Ghost Voice Agent

### 5.1 Persona

**Name**: Donna
**Role**: Chief of Staff, Career Concierge OS
**Character**: Intelligent, controlled, warm but restrained. Executive-grade clarity.

**Two registers:**
- **OPERATIONAL** — Sub-3-second confirmations: "Done.", "Dispatched.", "Opening your gaps."
- **ADVISORY** — Senior career strategist. References actual client data. Calm, confident, specific.

**Expressive delivery tags** (ElevenLabs v2 expressions):
`[sighs]`, `[excited]`, `[slow]`, `[whispers]`, `[laughs]`

### 5.2 Client Tools (15)

Executed locally in React via `useGhostVoice` and the ElevenLabs React SDK. No network call.

| Tool | Parameters | Action |
|------|-----------|--------|
| `navigate_module` | `target: string` | Opens suite module overlay |
| `close_module` | — | Dismisses current overlay |
| `toggle_admin` | — | Opens/closes admin console |
| `dispatch_agent` | `codename: string` | Sends specialist agent on mission |
| `update_stance` | `stance: 'delegator' \| 'copilot'` | Switches operating mode |
| `address_gap` | `gap_id: string` | Marks gap as addressed |
| `focus_intake_field` | `field_id: string` | Focuses a Smart Start field |
| `jump_intake_screen` | `screen_id: string` | Moves Smart Start between `screen_1` … `screen_4` |
| `set_intake_text_field` | `field_id: string, value: string` | Writes text into an intake field |
| `set_intake_choice_field` | `field_id: string, value: string` | Sets a single-choice intake field |
| `set_intake_multi_field` | `field_id: string, values: string[], mode?: string` | Replaces/adds/removes intake multi-select values |
| `set_intake_boolean_field` | `field_id: string, value: boolean` | Sets a boolean intake field |
| `clear_intake_field` | `field_id: string` | Clears an intake field |
| `set_intake_intent` | `intent: string` | Sets `current_role`, `target_role`, or `not_sure` |
| `set_support_preference` | `preference: 'pace' \| 'focus', value: string` | Sets Smart Start pace or focus |
| `summarize_intake_state` | — | Returns a concise intake status summary |

Valid `navigate_module` targets: `intake`, `brief`, `suite_distilled`, `plan`, `profile`, `ai_profile`, `gaps`, `readiness`, `my_concierge`, `cjs_execution`, `resume_review`

Valid `dispatch_agent` codenames: `signal_strategist`, `gap_closer`, `intel_analyst`, `comms_officer`, `readiness_coach`

### 5.3 Server Tools (3 Webhooks)

Called by ElevenLabs to the Cloud Run API. Authenticated via `X-Ghost-Secret` header. UID passed as dynamic variable in request body.

#### fetch_briefing
- **URL**: `POST /v1/ghost/briefing`
- **Body**: `{ uid: string }` (uid = dynamic variable)
- **Response**: `{ briefing: string, system_prompt: string }`
- **Data sources**: client doc, artifacts/gaps, artifacts/readiness, artifacts/ai_profile

#### fetch_artifact
- **URL**: `POST /v1/ghost/artifact`
- **Body**: `{ uid: string, type: string }` (type = LLM prompt)
- **Valid types**: `brief`, `profile`, `plan`, `gaps`, `readiness`, `ai_profile`, `suite_distilled`, `cjs_execution`, `resume_review`, `my_concierge`
- **Response**: `{ artifact: { type, content, updated_at } | null }`

#### fetch_drive_documents
- **URL**: `POST /v1/ghost/drive`
- **Body**: `{ uid: string, query?: string }` (query = LLM prompt)
- **Response**: `{ documents: [{ id, name, type, url, modified }] }`

### 5.4 Authentication Flow

```
ElevenLabs webhook call
       │
       ▼
requireGhostAuth middleware
       │
       ├─ Has X-Ghost-Secret header?
       │   └─ Yes → matches GHOST_WEBHOOK_SECRET?
       │       ├─ Yes → req.ghostUid = req.body.uid → next()
       │       └─ No → 401
       │
       └─ No → fall through to Firebase auth
           └─ req.ghostUid = req.user.uid → next()
```

### 5.5 Session + Dynamic Variables

The frontend now opens the Ghost lane through the ElevenLabs React SDK:

- first choice: signed-session route `POST /v1/voice/elevenlabs/session`
- fallback: public `agentId` session when signed session creation is unavailable
- runtime context:
  - `userId`
  - `dynamicVariables.uid`
  - contextual intake summary via `sendContextualUpdate(...)`

ElevenLabs injects `uid` into webhook request bodies when `uid` is configured as a Dynamic variable type for body parameters.

### 5.6 ElevenLabs Dashboard Configuration

**Agent ID**: `agent_4701kk7v4kk5fww8sccb53ggjw20`

**Webhook Tool Configuration** (3 tools):

Each webhook tool requires:
- **Method**: POST
- **URL**: `https://signal-atlas-480846059254.europe-west1.run.app/v1/ghost/{endpoint}`
- **Headers**: `X-Ghost-Secret: <GHOST_WEBHOOK_SECRET>`
- **Body parameters**: See per-tool table above
- **Value types**: `uid` = Dynamic variable, `type`/`query` = LLM Prompt

---

## 6. Google Workspace Integration

### 6.1 Sync Pipeline

```
Suite Generation (any of 3 code paths)
       │
       ▼
syncArtifactsToGoogleDocs(db, uid, artifacts)
       │
       ├─ GWS_DOCS_ENABLED !== 'true'? → return { status: 'disabled' }
       │
       ▼
For each artifact with a template:
       │
       ├─ Doc exists in registry? (clients/{uid}/doc_registry/{type})
       │   │
       │   ├─ YES: clearDocumentBody() → buildDocRequests() → batchUpdate()
       │   │       → upsertDocRegistryEntry() with new timestamp
       │   │
       │   └─ NO:  createDocument() → buildDocRequests() → batchUpdate()
       │           → ensureClientFolder() → moveToFolder()
       │           → shareWithUser() → upsertDocRegistryEntry()
       │
       ▼
Return { status: 'synced', synced: N, errors: N, details: {...} }
```

### 6.2 Auth Strategy (ADC — No Key File)

Cloud Run provides Application Default Credentials via the metadata server. `gwsClient.js` fetches access tokens automatically:

```javascript
const METADATA_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const getAccessToken = async () => {
  // Token cached with 60s buffer before expiry
  const res = await fetch(METADATA_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
  });
  const data = await res.json();
  return data.access_token;
};
```

The token is passed to the `gws` CLI via `GOOGLE_WORKSPACE_CLI_TOKEN` environment variable per subprocess call. No service account key file is needed.

**Cloud Run service account**: `480846059254-compute@developer.gserviceaccount.com` (default compute SA)

### 6.3 Template System

Each artifact type has a dedicated template in `api/gws/templates/`. Templates use the `DocBuilder` class from `_helpers.js` to construct Google Docs API `batchUpdate` request arrays.

**DocBuilder methods**: `heading()`, `paragraph()`, `bulletList()`, `checklist()`, `table()`, `divider()`, `brandHeader()`, `keyValue()`, `section()`, `build()`

| Template | Artifact Type | Key Sections |
|----------|--------------|--------------|
| `brief.js` | brief | Thesis, exec summary, signal strip, market signal, comp ladder, evidence, 72h actions |
| `suite_distilled.js` | suite_distilled | Strategy thesis, positioning matrix, AI playbooks, next 72h |
| `profile.js` | profile | Case summary, genome markers, behavioral propensities, environmental fit, evolution path |
| `ai_profile.js` | ai_profile | Positioning statement, how-to-use list, guardrails |
| `gaps.js` | gaps | Near-term, target role, constraints |
| `readiness.js` | readiness | Tier, executive overview, awareness-to-action, priorities |
| `cjs_execution.js` | cjs_execution | Intent summary, execution stages with status |
| `plan.js` | plan | 72h sprint checklist, 2-week roadmap, needs from client |
| `resume_review.js` | resume_review | Summary, role alignment score, strengths/gaps/focus |
| `search_strategy.js` | search_strategy | Search parameters and targeting |

### 6.4 Doc Registry (Firestore)

**Path**: `clients/{uid}/doc_registry/{artifact_type}`

```json
{
  "artifact_type": "profile",
  "google_doc_id": "1abc...",
  "google_doc_url": "https://docs.google.com/document/d/1abc...",
  "drive_folder_id": "1xyz...",
  "artifact_version": 3,
  "last_synced_at": "2026-03-29T10:30:00.000Z",
  "shared_with": ["candidate@email.com"],
  "status": "synced",
  "error_detail": "",
  "created_at": "2026-03-28T14:00:00.000Z",
  "updated_at": "2026-03-29T10:30:00.000Z"
}
```

### 6.5 Agent Registry Entry

```javascript
{
  role_id: 'document_publisher',
  title: 'Document Publisher',
  objective: 'Publish and sync Career Concierge artifacts to Google Docs.',
  reads: ['clients/{uid}/artifacts/*', 'clients/{uid}/doc_registry/*'],
  writes: ['clients/{uid}/doc_registry/*'],
  approval_required: false,
  access_model: 'read_write_scoped',
  policy_version: '2026-03-15.1',
}
```

---

## 7. Dockerfile

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
RUN npm install -g @googleworkspace/cli@0.11.1
COPY . .
ENV PORT=8080
ENV GWS_BIN_PATH=/usr/local/bin/gws
EXPOSE 8080
CMD ["npm", "start"]
```

---

## 8. File Inventory

| File | Purpose |
|------|---------|
| `api/config/ghostPrompt.js` | System prompt, client tools, server tools, briefing builder |
| `api/gws/gwsClient.js` | Google Workspace CLI wrapper with ADC auth |
| `api/gws/driveOrganizer.js` | Drive folder creation, sharing, doc title registry |
| `api/gws/syncArtifacts.js` | Artifact-to-Google-Doc sync pipeline |
| `api/gws/templateEngine.js` | Template router |
| `api/gws/docRegistry.js` | Firestore doc ID tracking |
| `api/gws/templates/_helpers.js` | DocBuilder class for Google Docs API |
| `api/gws/templates/{type}.js` | 10 per-artifact template builders |
| `components/ElevenLabsConvaiPanel.tsx` | Ghost voice lane (ElevenLabs React SDK) |
| `hooks/useGhostVoice.ts` | Client tool handlers + action log |
| `api/index.js` | Ghost endpoints, auth middleware, suite generation wiring |
| `api/Dockerfile` | Container image with gws CLI |

---

## 9. Backlog

| Item | Priority | Notes |
|------|----------|-------|
| Gemini 3.1 Flash Live evaluation | High | Available in ElevenLabs — lower latency potential |
| Admin visibility (Phase 4) | Medium | Show doc sync status in admin console |
| Template management via Templates/ folder | Low | Master templates for branding consistency |
| Internal reports via Internal/ folder | Low | Admin-only generated reports |
| OAuth client for local gws CLI auth | Low | Currently requires manual Drive folder creation |
| Domain-wide delegation for user Drive access | Low | Only needed if accessing candidate's personal Drive |

# Ghost Intelligence — Career Concierge Integration

**Status**: Production
**Version**: 3.0 (Career Concierge OS)
**Category**: Voice Agent + Document Intelligence
**Platform**: ElevenLabs Conversational AI + Google Workspace
**Skill Pack**: ghost-intelligence

---

## Overview

Ghost Intelligence V3 is a voice-first career AI agent deployed as the "Chief of Staff" of Career Concierge OS. It combines ElevenLabs Conversational AI for natural voice interaction with Google Workspace integration for document publishing — giving candidates a voice interface to their career intelligence and artifact library.

**The Problem**: Career intelligence platforms generate rich artifacts (professional DNA, gap analysis, readiness assessments) but candidates interact with them through static dashboards. The data sits unused between sessions.

**The Solution**: Ghost V3 (persona: "Donna") acts as Chief of Staff — a voice agent with real-time access to the candidate's artifacts, the ability to control the UI, dispatch specialist agents, and retrieve or generate Google Docs on demand.

---

## Architecture

### Voice Layer (ElevenLabs)

```
Candidate speaks
       │
       ▼
ElevenLabs Conversational AI
├── STT: Speech to text
├── LLM: Gemini 2.5 Flash (configurable)
├── TTS: Donna voice + expressive delivery
│
├── Client Tools (16) ─── execute in browser
│   ├── navigate_module(target)
│   ├── close_module()
│   ├── toggle_admin()
│   ├── dispatch_agent(codename)
│   ├── update_stance(stance)
│   ├── address_gap(gap_id)
│   ├── focus_intake_field(field_id)
│   ├── jump_intake_screen(screen_id)
│   ├── set_intake_text_field(field_id, value)
│   ├── set_intake_choice_field(field_id, value)
│   ├── set_intake_multi_field(field_id, values, mode)
│   ├── set_intake_boolean_field(field_id, value)
│   ├── clear_intake_field(field_id)
│   ├── set_intake_intent(intent)
│   ├── set_support_preference(preference, value)
│   └── summarize_intake_state()
│
└── Server Tools (3) ─── webhook to Cloud Run
    ├── fetch_briefing()     → lightweight context
    ├── fetch_artifact(type) → full artifact data
    └── fetch_drive_documents(query) → Drive search
```

### Document Layer (Google Workspace)

```
Suite Generation (backend)
       │
       ▼
syncArtifactsToGoogleDocs()
       │
       ├── For each of 10 artifact types:
       │   ├── Build branded Google Doc via template
       │   ├── Create/update in candidate's Drive folder
       │   ├── Share with candidate (writer access)
       │   └── Record in Firestore doc_registry
       │
       ▼
Candidate's Drive folder
├── The Brief
├── Strategic Map
├── Professional DNA
├── AI Positioning
├── Skill Gaps Analysis
├── AI Readiness Report
├── Job Search Execution
├── 72-Hour Plan
├── Resume Review
└── Search Strategy
```

---

## Replication Guide

### Prerequisites

- GCP project with Drive API + Docs API enabled
- ElevenLabs account with Conversational AI access
- Cloud Run service (Node.js 22)
- Firestore database

### Step 1: Ghost System Prompt

Create a system prompt file that defines your agent's persona, operational registers, and tool descriptions. Key design decisions:

**Two registers pattern:**
- OPERATIONAL: Sub-3-second tool confirmations ("Done.", "Dispatched.")
- ADVISORY: Deep career guidance with data citations

**Expressive delivery:** ElevenLabs supports expression tags:
- `[sighs]`, `[excited]`, `[slow]`, `[whispers]`, `[laughs]`
- Use sparingly for precise emotional moments

**Action-over-words rule:** Prefer executing a tool to explaining what you'll do.

### Step 2: Client Tools

Client tools run entirely in the browser. No network call. Define them as functions that return a short confirmation string.

```javascript
// useGhostVoice hook pattern
const clientTools = {
  navigate_module: ({ target }) => {
    onNavigateModule(target);
    return 'Routed.';
  },
  dispatch_agent: ({ codename }) => {
    onDispatchAgent(codename);
    return 'Dispatched.';
  },
};
```

**ElevenLabs dashboard config** for each client tool:
- Name: exact function name (e.g., `navigate_module`)
- Description: what it does
- Parameters: JSON schema with enum constraints where applicable

### Step 3: Server Tools (Webhooks)

Server tools are configured in ElevenLabs as "Webhook" type tools. Each makes a POST request to your backend.

**Authentication pattern:**
```
Header: X-Ghost-Secret: <shared-secret>
Body:   { uid: <dynamic-variable>, type/query: <llm-prompt> }
```

**Middleware:**
```javascript
const requireGhostAuth = async (req, res, next) => {
  const secret = req.headers['x-ghost-secret'];
  if (secret && secret === process.env.GHOST_WEBHOOK_SECRET) {
    req.ghostUid = req.body?.uid;
    if (!req.ghostUid) return res.status(400).json({ error: 'missing_uid' });
    return next();
  }
  return requireAuth(req, res, () => {
    req.ghostUid = req.user.uid;
    next();
  });
};
```

**Body parameter value types in ElevenLabs:**

| Parameter | Value Type | Notes |
|-----------|-----------|-------|
| `uid` | Dynamic variable | Passed from the React SDK session init |
| `type` | LLM Prompt | LLM decides which artifact to fetch based on conversation |
| `query` | LLM Prompt | LLM generates search query from conversation context |

### Step 4: Dynamic Variables

Pass user identity from your frontend when starting the ElevenLabs session:

```javascript
startSession({
  signedUrl,
  userId: userUid,
  dynamicVariables: { uid: userUid },
});
```

ElevenLabs injects this value into webhook request bodies wherever `uid` is configured as a Dynamic variable type. The frontend can also send evolving intake state through contextual updates during the conversation.

### Step 5: Google Workspace Integration

**Auth strategy — Domain-Wide Delegation (keyless):**

On Cloud Run, the compute service account uses the IAM Credentials API to sign a JWT with a `sub` claim (impersonating a Workspace user), then exchanges it for an access token. No key file needed.

**Prerequisites:**
1. Grant the compute SA `roles/iam.serviceAccountTokenCreator` on itself
2. Configure Domain-Wide Delegation in Google Admin for the compute SA's unique ID with `drive` + `documents` scopes

```javascript
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

const GWS_SUBJECT = process.env.GWS_IMPERSONATE_EMAIL || 'gws@example.com';
const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'];

const getDwdToken = async () => {
  const baseAuth = new GoogleAuth();
  const credentials = await baseAuth.getCredentials();
  const saEmail = credentials.client_email;
  const client = await baseAuth.getClient();
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: saEmail, sub: GWS_SUBJECT, scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };

  // Sign JWT via IAM Credentials API (no key file)
  const iamRes = await client.request({
    url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:signJwt`,
    method: 'POST', data: { payload: JSON.stringify(claims) },
  });

  // Exchange for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${iamRes.data.signedJwt}`,
  });
  const { access_token } = await tokenRes.json();
  return access_token; // cache with 60s buffer
};
```

**googleapis Node.js client** (replaces CLI wrapper):
```javascript
const getAuthClient = async () => {
  const token = await getDwdToken();
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: token });
  return oauth2;
};
const getDrive = async () => google.drive({ version: 'v3', auth: await getAuthClient() });
const getDocs = async () => google.docs({ version: 'v1', auth: await getAuthClient() });
```

### Step 6: Drive Folder Organization

Create a root folder and subfolders in Google Drive:

```
{App Name}/
├── Clients/       ← per-user folders auto-created here
├── Templates/     ← master templates (future)
└── Internal/      ← admin-only docs (future)
```

Set folder IDs as environment variables:
- `GWS_DRIVE_ROOT_FOLDER_ID` — root folder
- `GWS_CLIENTS_FOLDER_ID` — clients subfolder

**Per-client folder creation:**
1. Check Firestore for cached `drive_folder_id` on client doc
2. If missing: create folder, share with client email, cache ID
3. All artifact docs go inside this folder

### Step 7: Template System

Create a template per document type using Google Docs API `batchUpdate` requests.

**DocBuilder pattern** — accumulates insert requests in reading order, reverses for API:

```javascript
class DocBuilder {
  constructor() { this._idx = 1; this._requests = []; }

  heading(text, level = 1) {
    this._requests.push(
      { insertText: { location: { index: this._idx }, text: text + '\n' } },
      { updateParagraphStyle: {
          range: { startIndex: this._idx, endIndex: this._idx + text.length + 1 },
          paragraphStyle: { namedStyleType: `HEADING_${level}` },
          fields: 'namedStyleType'
      }}
    );
    this._idx += text.length + 1;
  }

  build() { return [...this._requests].reverse(); }
}
```

### Step 8: Artifact Sync Pipeline

Wire `syncArtifactsToGoogleDocs()` into every code path that generates artifacts:

```javascript
let documentPublisher = { status: 'skipped' };
try {
  documentPublisher = await syncArtifactsToGoogleDocs(db, uid, finalArtifacts);
} catch (err) {
  console.error('document_publisher_error', err);
}
```

**Feature flag:** Gate behind `GWS_DOCS_ENABLED=true` so the feature can be disabled without code changes.

**Doc registry** tracks Google Doc IDs in Firestore at `clients/{uid}/doc_registry/{type}`:
- Enables update-in-place (clear body + re-render) vs. create new
- Records sharing state, sync timestamps, error details

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_AGENT_ID` | Yes | ElevenLabs agent identifier |
| `GHOST_WEBHOOK_SECRET` | Yes | SHA-256 secret for webhook auth |
| `GWS_DOCS_ENABLED` | Yes | `true` to enable doc sync |
| `GWS_DRIVE_ROOT_FOLDER_ID` | Yes | Root Drive folder ID |
| `GWS_CLIENTS_FOLDER_ID` | No | Clients subfolder ID (falls back to root) |
| `GWS_IMPERSONATE_EMAIL` | No | Workspace user to impersonate via DWD (default: `gws@conciergecareerservices.com`) |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for signed sessions |

---

## Conversation Patterns

### Session Start
1. Widget loads with `uid` dynamic variable
2. Ghost calls `fetch_briefing()` to get candidate context
3. Opens with: "Good morning, {name}. I see your top gap is still {gap}. Want to talk about it?"

### Artifact Deep Dive
1. Candidate asks about their profile
2. Ghost calls `fetch_artifact(type: 'profile')`
3. References specific data: "Your positioning is strong on AI strategy, but stakeholder communication — that's the one holding back your readiness score."

### Document Access
1. Candidate asks for their documents
2. Ghost calls `fetch_drive_documents()`
3. Returns links: "I have your Strategic Map and 72-Hour Plan ready."

### Agent Dispatch
1. Ghost identifies a gap that needs specialist attention
2. Confirms: "I'll send the Gap Closer to work on stakeholder communication. Go ahead?"
3. Candidate confirms → `dispatch_agent('gap_closer')`
4. Ghost confirms: "Dispatched. Check back in 24 hours."

---

## Migration from Ghost V2

| Aspect | V2 (Ambient) | V3 (Career Concierge) |
|--------|-------------|----------------------|
| Input | Mouse position | Voice |
| LLM | Claude Sonnet | Gemini 2.5 Flash |
| Trigger | 350ms dwell | User speech |
| Output | Typewriter text | Voice + UI actions |
| Context | DOM elements | Firestore artifacts |
| Tools | None | 15 client + 3 server |
| Platform | Browser-only | ElevenLabs + Cloud Run |

---

## License

Specification: CC BY-SA 4.0

**Maintained by**: Third Signal
**Contact**: ghost@thirdsignal.ai

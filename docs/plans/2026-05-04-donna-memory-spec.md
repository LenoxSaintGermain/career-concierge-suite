# Donna Conversation Memory — Implementation Spec
**Date:** 2026-05-04
**Status:** Ready for implementation
**Depends on:** Donna-first pivot (DonnaShell, DonnaChatLane, WikiDrawer — already shipped)

> **For Claude Code agent:** Implement milestone by milestone in the order listed.
> Run `npx tsc --noEmit 2>&1 | grep -v node_modules` after each milestone before proceeding.
> Working directory: `/Users/lenoxparis/conductor/workspaces/Signal-Atlas/atlanta`

---

## Context

The wiki substrate (`clients/{uid}.wiki`) gives Donna compiled knowledge from intake and artifacts — structured facts. What it does not give her is conversational history: what the user has said, committed to, worried about, or decided across sessions. Without that, Donna knows your dossier but not your arc. This spec adds the conversational memory layer on top of the wiki.

**Two substrates, both feed Donna's system instruction:**
- `wiki` — compiled from intake answers + artifacts (already built)
- `memory` — compiled from conversation sessions (this spec)

---

## Data Model

### Firestore structure (additive — no existing collections modified)

```
clients/{uid}/
  wiki              ← existing
  memory            ← new: ClientMemory object
  conversations/    ← new subcollection
    {sessionId}/
      session_id    string
      surface       'shell' | 'intake'
      started_at    Timestamp
      ended_at      Timestamp | null
      messages      MessageRecord[]
      summary       SessionSummary | null   (written after session ends)
```

### TypeScript types — add to `types.ts`

```typescript
export interface MessageRecord {
  id: string;
  role: 'donna' | 'user';
  body: string;
  timestamp: number; // Date.now()
  kind?: 'text' | 'chip_action' | 'a2ui_trigger'; // default 'text'
}

export interface SessionSummary {
  session_id: string;
  commitments: string[];   // "Will audit three workflows this week"
  concerns: string[];      // "Anxious about VP conversation"
  decisions: string[];     // "Staying in current role for 6 months"
  preferences: string[];   // "Prefers concise responses"
  milestones: string[];    // "Completed intake", "Reviewed brief first time"
  tone_note: string;       // "High energy, time-pressured"
  extracted_at: string;    // ISO timestamp
}

export interface ClientMemoryEntry {
  id: string;
  kind: 'commitment' | 'concern' | 'milestone' | 'preference' | 'context';
  body: string;
  session_id: string;
  created_at: string;
  weight: 'high' | 'medium' | 'low';
}

export interface ClientMemory {
  uid: string;
  compiled_at: string;
  arc_summary: string;       // 2-3 sentence narrative of journey so far
  entries: ClientMemoryEntry[];
  last_session_at: string;
  session_count: number;
}
```

---

## Milestone 1 — Session Transcript Capture

**Files:** `components/DonnaChatLane.tsx`, `services/memoryService.ts` (new)

### Step 1: Add `memoryService.ts`

Create `services/memoryService.ts`:

```typescript
import { auth } from './firebase';
import { ClientMemory, MessageRecord } from '../types';
import { resolveApiOrigin } from './apiOrigin';

export const writeSessionMessage = async (
  sessionId: string,
  message: MessageRecord
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(`${resolveApiOrigin()}/v1/memory/session/${sessionId}/message`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(message),
  }).catch(() => {}); // non-blocking, never throws
};

export const endSession = async (sessionId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(`${resolveApiOrigin()}/v1/memory/session/${sessionId}/end`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => {});
};

export const fetchClientMemory = async (): Promise<ClientMemory | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const resp = await fetch(`${resolveApiOrigin()}/v1/memory/context`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as ClientMemory;
};
```

### Step 2: Wire into `DonnaChatLane.tsx`

- Generate `sessionId = crypto.randomUUID()` on component mount (`useRef` — stable across renders)
- After every message added to local state (both sent and received), call `writeSessionMessage(sessionId, message)` — fire and forget, never await
- On unmount, call `endSession(sessionId)` — triggers summary extraction
- If `user === null`, skip all memory writes silently

### Step 3: Add API routes to `api/index.js`

After the existing wiki routes, add:

```javascript
// Write a single message to a session transcript
app.post('/v1/memory/session/:sessionId/message', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  const message = req.body;
  if (!message?.id || !message?.role || !message?.body) {
    return res.status(400).json({ error: 'invalid_message' });
  }
  try {
    const sessionRef = db.collection('clients').doc(req.user.uid)
      .collection('conversations').doc(sessionId);
    await sessionRef.set({
      session_id: sessionId,
      surface: message.surface || 'shell',
      started_at: (await sessionRef.get()).exists
        ? undefined
        : new Date(),
    }, { merge: true });
    await sessionRef.update({
      messages: admin.firestore.FieldValue.arrayUnion({
        ...message,
        timestamp: message.timestamp || Date.now(),
      }),
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// End a session — triggers summary extraction (fire and forget)
app.post('/v1/memory/session/:sessionId/end', requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const sessionRef = db.collection('clients').doc(req.user.uid)
      .collection('conversations').doc(sessionId);
    await sessionRef.update({ ended_at: new Date() });
    // Fire-and-forget: extract summary then recompile memory
    extractSessionSummary(req.user.uid, sessionId, db)
      .then(() => compileClientMemory(req.user.uid, db))
      .catch(err => console.warn('[memory] post-session pipeline failed:', err));
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
```

**Success signal:** After a chat session, `clients/{uid}/conversations/{sessionId}` exists in Firestore with a `messages` array.

---

## Milestone 2 — Session Summary Extraction

**Files:** `api/index.js`

Add `extractSessionSummary(uid, sessionId, db)` helper — mirrors the pattern of `compileClientWiki`:

```javascript
async function extractSessionSummary(uid, sessionId, db) {
  const sessionRef = db.collection('clients').doc(uid)
    .collection('conversations').doc(sessionId);
  const snap = await sessionRef.get();
  if (!snap.exists) return null;
  const session = snap.data();
  const messages = session.messages || [];
  if (messages.length < 2) return null; // too short to summarize

  const transcript = messages
    .map(m => `${m.role === 'donna' ? 'DONNA' : 'USER'}: ${m.body}`)
    .join('\n');

  if (!ai) return null; // skip if no Gemini key

  const runtimeConfig = await loadAppConfig();
  const model = nonEmpty(runtimeConfig?.generation?.suite_model) || utilityTextModel;

  const response = await ai.models.generateContent({
    model,
    contents: `Extract structured memory from this career concierge conversation.\n\nTRANSCRIPT:\n${transcript}`,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: `You extract structured memory entries from a career coaching conversation.
Return a JSON object with these arrays (each item is a plain prose string, max 120 chars):
- commitments: things the user said they will do
- concerns: worries, anxieties, or blockers the user expressed
- decisions: choices made during the conversation
- preferences: communication or working style signals
- milestones: meaningful moments (first session, completed module, etc.)
- tone_note: one sentence describing the user's emotional state/energy

Rules:
- Only extract what was explicitly stated. Never infer or fabricate.
- If a category has nothing, return an empty array.
- tone_note is always exactly one sentence.`,
      temperature: 0.1,
    },
  });

  const parsed = safeParseJson(response.text?.trim());
  if (!parsed) return null;

  const summary = {
    session_id: sessionId,
    ...parsed,
    extracted_at: new Date().toISOString(),
  };

  await sessionRef.update({ summary });
  return summary;
}
```

**Success signal:** `conversations/{sessionId}.summary` populated within 30 seconds of `endSession()` call.

---

## Milestone 3 — Memory Substrate Compilation

**Files:** `api/index.js`, `api/index.js` (two new routes)

Add `compileClientMemory(uid, db)` helper:

```javascript
async function compileClientMemory(uid, db) {
  const clientRef = db.collection('clients').doc(uid);
  const conversationsSnap = await db.collection('clients').doc(uid)
    .collection('conversations')
    .where('ended_at', '!=', null)
    .orderBy('ended_at', 'desc')
    .limit(20)
    .get();

  const entries = [];
  let lastSessionAt = null;
  let sessionCount = 0;

  conversationsSnap.forEach(doc => {
    const session = doc.data();
    if (!session.summary) return;
    sessionCount++;
    if (!lastSessionAt) lastSessionAt = session.ended_at?.toDate?.()?.toISOString();

    const kindMap = {
      commitments: 'commitment',
      concerns: 'concern',
      decisions: 'context',
      preferences: 'preference',
      milestones: 'milestone',
    };

    Object.entries(kindMap).forEach(([field, kind]) => {
      (session.summary[field] || []).forEach(body => {
        entries.push({
          id: `${doc.id}-${kind}-${entries.length}`,
          kind,
          body,
          session_id: doc.id,
          created_at: session.ended_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          weight: kind === 'commitment' || kind === 'concern' ? 'high' : 'medium',
        });
      });
    });
  });

  // Compile arc summary from entries if we have enough signal
  let arc_summary = '';
  if (entries.length >= 3 && ai) {
    const entryText = entries.map(e => `[${e.kind}] ${e.body}`).join('\n');
    const runtimeConfig = await loadAppConfig();
    const model = nonEmpty(runtimeConfig?.generation?.suite_model) || utilityTextModel;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Write a 2-sentence career arc summary from these memory entries:\n${entryText}`,
        config: {
          systemInstruction: 'Write exactly 2 sentences. Present tense. No adjectives. Just the facts of where they are and what they are working on.',
          temperature: 0.2,
        },
      });
      arc_summary = response.text?.trim() || '';
    } catch { /* non-blocking */ }
  }

  const memory = {
    uid,
    compiled_at: new Date().toISOString(),
    arc_summary,
    entries,
    last_session_at: lastSessionAt || new Date().toISOString(),
    session_count: sessionCount,
  };

  await clientRef.update({ memory });
  return memory;
}
```

Add routes:

```javascript
app.post('/v1/memory/compile', requireAuth, async (req, res) => {
  try {
    const memory = await compileClientMemory(req.user.uid, db);
    return res.json({ ok: true, memory });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/v1/memory/context', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('clients').doc(req.user.uid).get();
    if (!snap.exists) return res.status(404).json({ error: 'client_not_found' });
    const memory = snap.data().memory || null;
    return res.json(memory);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
```

**Success signal:** After 2+ sessions, `clients/{uid}.memory` exists with entries and `arc_summary`.

---

## Milestone 4 — Memory Injection into Donna's Context

**Files:** `services/liveApi.ts`, `components/GeminiLivePanel.tsx`, `api/index.js`

### `services/liveApi.ts`
Update signature:
```typescript
export const createGeminiLiveToken = async (
  context?: string,
  wikiContext?: string,
  memoryContext?: string
): Promise<GeminiLiveTokenResponse>
```
Add `memory_context: memoryContext` to the POST body.

### `api/index.js` `/v1/live/token`
Read `memory_context` and append after wiki block:
```javascript
const memoryContext = nonEmpty(req.body?.memory_context);
let systemInstruction = wikiContext
  ? `## Client Knowledge\n${wikiContext}\n\n---\n\n${baseInstruction}`
  : baseInstruction;
if (memoryContext) {
  systemInstruction = `${systemInstruction}\n\n## Conversation Memory\n${memoryContext}`;
}
```

**Token budget rule:** wiki + memory combined must not exceed 8,000 characters. In `GeminiLivePanel.startSession()`:
```typescript
const wiki = await fetchClientWiki().catch(() => null);
const memory = await fetchClientMemory().catch(() => null);

const wikiText = wiki
  ? wiki.sections.map(s => `### ${s.heading}\n${s.body}`).join('\n\n')
  : undefined;

const memoryText = memory
  ? buildMemoryContext(memory) // helper below
  : undefined;

// helper — prioritizes high-weight entries, respects budget
function buildMemoryContext(memory: ClientMemory): string {
  const budget = 8000 - (wikiText?.length ?? 0);
  if (budget < 200) return ''; // wiki filled the budget
  const lines: string[] = [];
  if (memory.arc_summary) lines.push(`Arc: ${memory.arc_summary}`);
  const high = memory.entries.filter(e => e.weight === 'high');
  const med = memory.entries.filter(e => e.weight === 'medium');
  [...high, ...med].forEach(e => {
    const line = `[${e.kind}] ${e.body}`;
    if (lines.join('\n').length + line.length < budget) lines.push(line);
  });
  return lines.join('\n');
}
```

Import `fetchClientMemory` from `services/memoryService`.

**Success signal:** After 2 sessions, start a live session and Donna references something from a prior conversation without being prompted.

---

## Milestone 5 — Memory-Aware Opening Message

**Files:** `components/DonnaChatLane.tsx`

Replace the static opening message logic with a memory-aware version. Add `memory: ClientMemory | null` to `DonnaChatLaneProps`.

```typescript
function buildOpeningMessage(
  user: User | null,
  client: ClientDoc | null,
  wiki: ClientWiki | null,
  memory: ClientMemory | null
): string {
  const firstName = wiki?.first_name || null;
  const targetRole = wiki?.target_role || null;
  const timeOfDay = getTimeOfDay(); // existing helper

  // No auth
  if (!user) {
    return `Good ${timeOfDay}. I'm Donna — your career concierge.\nTell me where you are right now, and I'll take it from there.`;
  }

  // Returning user with memory
  if (memory && memory.session_count >= 2 && memory.arc_summary) {
    const lastHigh = memory.entries.find(e => e.weight === 'high');
    const name = firstName ? `, ${firstName}` : '';
    return `Good ${timeOfDay}${name}. ${memory.arc_summary}\n${lastHigh ? `Last time: ${lastHigh.body}.` : ''}\nWhat's the priority today?`;
  }

  // Post-auth, no intake
  if (!wiki?.intake_complete) {
    return `Good ${timeOfDay}${firstName ? `, ${firstName}` : ''}. Your suite is staged.\nOne conversation calibrates everything.\nReady when you are.`;
  }

  // Post-auth, intake complete
  const role = targetRole ? ` Optimizing for ${targetRole}.` : '';
  return `Good ${timeOfDay}${firstName ? `, ${firstName}` : ''}. Your brief is current.${role}\nWhat do you want to work on today?`;
}
```

**Success signal:** User returning after 2+ sessions sees a message that references their arc without them prompting it.

---

## Milestone 6 — Memory Admin Panel

**Files:** `components/WikiAdminPanel.tsx` (extend) or new `components/MemoryAdminPanel.tsx`

Follow the exact same pattern as `WikiAdminPanel`. Show:
- `arc_summary` at top
- `session_count` and `last_session_at` as meta labels
- `entries` grouped by `kind`, showing `body` and `created_at`
- `weight` badge on each entry
- "Recompile →" button → `POST /v1/memory/compile`

Wire into `AdminConsole.tsx` alongside the existing wiki panel in the client profile section.

---

## Edge Cases to Handle

| Scenario | Handling |
|---|---|
| Session ends with 0 messages | Skip summary extraction, don't write empty summary |
| Gemini API unavailable for extraction | Log warning, leave `summary: null`, memory compiles without that session |
| `conversations` subcollection grows large | The compile query uses `.limit(20)` — only recent 20 sessions matter |
| Memory entry count grows unbounded | `compileClientMemory` reads from summaries, not raw entries — entries per session stay bounded by the extraction schema |
| User has no prior sessions | `memory` is null, Donna falls back to wiki-only opening |
| Token budget exceeded | `buildMemoryContext` respects 8000-char combined cap, drops low-weight entries first |

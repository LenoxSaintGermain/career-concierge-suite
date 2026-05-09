# Agent Handoff: A2UI Front Door Implementation

## Your Mission

Implement the "Agent is the App" front door for Career Concierge. Donna (the AI concierge) is the primary surface for the entire user lifecycle. Users never navigate away from the ambient canvas to take a primary action. The module grid is a background filing system, not a destination.

**Working directory:** `/Users/lenoxparis/conductor/workspaces/Signal-Atlas/atlanta`

**Spec:** Read `docs/content-spec.md` in full before writing a single line of code. It is the authoritative contract. Every content decision, every state transition, every copy line is defined there.

**POC reference:** `/Users/lenoxparis/Library/Mobile Documents/com~apple~CloudDocs/SkillSync Ai — Design System/skill-synch-ai - reference code/` — use `components/AgentAppUI.tsx`, `agentic_front_door.html`, `DESIGN_BRIEF.md`, and `Career Concierge — Implementation Spec.txt` for motion patterns, CSS tokens, and animation references ONLY. Do not copy product identity, component structure, or Firebase config from the POC.

---

## What Already Exists — Do Not Touch or Rewrite

These are working and must be preserved exactly:

- `components/DonnaShell.tsx` — outer ambient shell, layered background, 4-layer field
- `components/DonnaChatLane.tsx` — message thread, sentence stagger, orb, waveform, interaction bloom, DonnaState machine, quick-action chips
- `components/GeminiLivePanel.tsx` — Gemini Live voice client, tool calling, StrictMode fix
- `components/ElevenLabsConvaiPanel.tsx` — ElevenLabs Ghost SDK voice panel
- `components/ConciergeSurface.tsx` — greeting strip, status line, primary CTA, voice activation
- `components/IntakeFlow.tsx` — Smart Start intake form (4 sections, voice lanes, artifact processing)
- `api/index.js` — ALL existing routes. Add new routes; never modify existing ones
- `services/liveApi.ts`, `services/wikiService.ts`, `services/memoryService.ts` — existing service clients
- `api/liveIntakeTools.js` — live tool grammar. Extend only, never fork or rename tools
- `types.ts` — existing types. Add new ones; never change existing shapes
- `App.tsx` — prologue overlay, module grid, journey routing. Modify surgically — do not rewrite

The following are the ONLY files you may create from scratch:
- `components/A2UICard.tsx`
- `components/PackageSelectCards.tsx`
- `components/SceneRail.tsx`
- Any new service file in `services/`

---

## Implementation Order — Work in This Sequence

### Phase 1: Foundation (build first — everything else depends on this)

**Task 1.1 — Create `components/A2UICard.tsx`**

The core materialization component. All cards rendered in the Donna canvas use this.

Props interface:
```tsx
interface A2UICardProps {
  children: React.ReactNode;
  delay?: number;          // stagger delay in ms, default 0
  onExit?: () => void;     // called when card dissolves
  className?: string;
}
```

Animation spec (Framer Motion):
```tsx
const SPRING = { type: 'spring', stiffness: 260, damping: 24, mass: 0.9 };
const variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { ...SPRING, delay: delay / 1000 } },
  exit:    { opacity: 0, scale: 0.97, y: 0,  transition: { duration: 0.3, ease: 'easeOut' } },
};
```

Visual tokens (use CSS variables from `index.html`):
```css
border-left: 2px solid var(--color-accent, #8DD9BF);
border: 1px solid #22424A;
background: rgba(13, 35, 41, 0.8);
backdrop-filter: blur(8px);
border-radius: 0;          /* hard rule — never round */
padding: 24px;
```

Wrap in `<motion.div>` with `AnimatePresence`. Card must dissolve cleanly when unmounted.

---

**Task 1.2 — Add canvas state machine to `DonnaChatLane.tsx`**

Add a `canvasState` type and state:
```tsx
type CanvasState =
  | 'landing'
  | 'package_selection'
  | 'intake_inline'
  | 'dna_processing'
  | 'dna_reveal'
  | 'plan_active'
  | 'concierge_sync';

const [canvasState, setCanvasState] = useState<CanvasState>('landing');
```

Add a transition handler that fades current canvas content out (300ms), then sets the new state:
```tsx
const handleCanvasTransition = (next: CanvasState) => {
  // fade out current slot content
  setTimeout(() => setCanvasState(next), 300);
};
```

Add an A2UI slot in the JSX — a dedicated div that renders the active canvas state content. This slot sits between the Donna message thread and the input bar:
```tsx
{/* A2UI Slot — renders inline cards, intake, artifacts */}
<div className="a2ui-slot">
  <AnimatePresence mode="wait">
    {canvasState === 'package_selection' && <PackageSelectCards ... />}
    {canvasState === 'intake_inline' && <InlineIntakeSlot ... />}
    {canvasState === 'dna_processing' && <DNAProcessingCard ... />}
    {canvasState === 'dna_reveal' && <DNARevealCard ... />}
  </AnimatePresence>
</div>
```

**Important:** The existing quick-action chips must wire to `handleCanvasTransition`, not to `onOpenModule`. Specifically:
- The "Begin Smart Start" chip → `handleCanvasTransition('intake_inline')` (NOT `onOpenModule('intake')`)
- The "Open Your Brief" chip → `handleCanvasTransition('dna_reveal')` (NOT `onOpenModule('brief')`)
- The "Open Your Plan" chip → `handleCanvasTransition('plan_active')` (NOT `onOpenModule('plan')`)

`onOpenModule` is only called from the "Open full view ↗" secondary inside inline artifact cards.

---

### Phase 2: Journey A — New User Flow

**Task 2.1 — Create `components/PackageSelectCards.tsx`**

Three `A2UICard` instances with 80ms stagger. Props:
```tsx
interface PackageSelectCardsProps {
  onSelect: (packageId: 'smart_start' | 'premier' | 'cjs') => void;
}
```

Cards (in order):
1. Eyebrow: `SMART START` · Title: "Smart Start" · Body: "The calibration session. A 10-minute guided conversation that maps your professional DNA and stages your entire suite." · CTA: "Begin Smart Start →" · delay: 0ms
2. Eyebrow: `SKILLSYNC AI PREMIER` · Title: "SkillSync Ai Premier" · Body: "End-to-end career infrastructure. Brief, plan, DNA dossier, live concierge, and ongoing strategic alignment." · CTA: "Explore Premier →" · delay: 80ms
3. Eyebrow: `CONCIERGE JOB SEARCH` · Title: "Concierge Job Search" · Body: "Dedicated placement strategy with search execution, artifact optimization, and weekly concierge coordination." · CTA: "Explore CJS →" · delay: 160ms

Below all cards, quiet secondary text: `Not sure which fits? Ask me.` — clicking this sends the message "Help me choose" to Donna's message thread.

No prices anywhere on these cards.

---

**Task 2.2 — Wire Journey A chip → package selection**

In `DonnaChatLane.tsx`, when the user sends "I'm ready to begin" (chip or text), after Donna responds ("Good. Let me show you what's available."):
1. Call `handleCanvasTransition('package_selection')`
2. Scene Rail advances to Scene 03

Donna's responses for the other chips ("I'm exploring", "Tell me what this is") are defined in `docs/content-spec.md` — use the exact copy. These responses go through the normal Donna message thread (not a canvas state change).

---

**Task 2.3 — Inline intake slot**

When `canvasState === 'intake_inline'`, render IntakeFlow sections as A2UI cards within the slot. Use `A2UICard` as the wrapper for each IntakeFlow section.

IntakeFlow already exists at `components/IntakeFlow.tsx`. For the inline pattern:
- Pass a prop `renderMode: 'inline'` to IntakeFlow
- In inline mode, IntakeFlow renders without its outer chrome (no module header, no modal wrapper) — just the section content
- Each section renders as an `A2UICard`
- IntakeFlow completion callback: `onComplete={() => handleCanvasTransition('dna_processing')}`

If IntakeFlow needs significant surgery to support this, create a thin `InlineIntakeSlot` wrapper that mounts the current IntakeFlow inside an `A2UICard` with `overflow: hidden`. This is acceptable as a Phase 2 approximation.

---

**Task 2.4 — DNA processing and reveal states**

`dna_processing` state: Render a single `A2UICard` containing:
- `ACT: MAPPING PROFESSIONAL DNA` label (mono 9px, accent)
- "Analyzing target: [targetRole]" subtext
- Animated scan-line progress bar (not a spinner — see POC `SceneArrival.tsx` for pattern)
- Auto-advance to `dna_reveal` after 3 seconds

`dna_reveal` state: Render a single `A2UICard` containing:
- Donna line: "Here's what I have on you."
- Condensed brief (positioning statement + 2 key strengths from `client.intake.answers` or wiki)
- Primary CTA: "Continue to your suite →"
- Secondary chip: "Tell me more about this"
- If `user === null`: inline account creation fields appear below CTA (email + password, "Create my suite →")

---

### Phase 3: Journey B — Returning User

**Task 3.1 — Wiki cards on ConciergeSurface**

In `ConciergeSurface.tsx`, after the greeting strip, render wiki cards using `A2UICard`:
- Fetch wiki from `client.wiki` (already loaded in App.tsx state)
- Map `wiki.sections` to cards: render `positioning`, `evidence`, `artifacts` sections as A2UICards
- Max 3 cards. Use 80ms stagger.
- Each card has a quiet secondary action: `Donna, update this` — sends that text to DonnaChatLane message thread

---

**Task 3.2 — Secondary chips on ConciergeSurface**

Below the primary CTA, add up to 2 contextual secondary chips. Logic:
- No intake: no secondary chips
- Intake complete, no prior sessions: chips → "Start a live session" + "What's in my brief"
- Intake complete, sessions exist: chips → "Continue where we left off" + "Start a live session"

Chips are visually quiet: 30% opacity, no border fill, letter-spacing mono.

---

**Task 3.3 — Inline artifact reveals**

When the primary CTA or a chip triggers an artifact view ("Open Your Brief", "View your plan"):
1. `handleCanvasTransition('dna_reveal')` or `'plan_active'`
2. Render condensed artifact as `A2UICard` in the slot
3. Donna says the appropriate intro line (see spec section III)
4. "Open full view ↗" secondary inside the card calls `onOpenModule('brief')` — this is the only sanctioned `openModuleById` call from the Donna surface

---

### Phase 4: Scene Rail

**Task 4.1 — Create `components/SceneRail.tsx`**

Props:
```tsx
interface SceneRailProps {
  scene: 'arrival' | 'calibration' | 'co_design';
}
```

Visual: fixed right edge, vertically centered, rotated 90deg text.
- Scene ID: `SCENE 01` / `SCENE 02` / `SCENE 03` — mono 8px, 25% opacity
- Label: `ARRIVAL` / `CALIBRATION` / `CO·DESIGN` — mono 9px, 40% opacity
- Copy: see spec section "Scene Rail" for exact copy per scene
- Transition: opacity fade 800ms between scenes. No slide.

Scene advancement wiring:
- Mount (Journey A) → `arrival`
- First message sent (Journey A) OR mount (Journey B) → `calibration`
- `package_selection` or `intake_inline` canvas state → `co_design`

Mount `SceneRail` inside `DonnaShell.tsx` as an absolute-positioned overlay.

---

### Phase 5: Auth Entry Point

**Task 5.1 — Peripheral returning client entry**

In `DonnaChatLane.tsx` (Journey A only — `user === null`):
- Render a small peripheral label: `RETURNING CLIENT ↗`
- Style: mono 9px, 30% opacity, positioned top-right or bottom-right of canvas
- On click: reveal the auth column (can use existing `LoginView` auth column, or render inline email/password fields as an `A2UICard`)
- This is a wayfinding marker, not a button. It should not compete with Donna's chips.

---

## CSS Tokens to Use

These already exist in `index.html` or should be verified:

```css
--color-donna-bg:      #07161A;
--color-donna-surface: #0D2329;
--color-donna-border:  #22424A;
--color-donna-text:    #DCE7E8;
--color-donna-muted:   #8EA3A7;
--color-accent:        #8DD9BF;
--color-donna-glow:    rgba(45, 197, 194, 0.12);
```

No rounded corners anywhere. `border-radius: 0` is a hard rule for the entire Donna surface.

---

## Verification Before You Call Anything Done

Run through the full Demo Acceptance Checklist in `docs/content-spec.md` section VII. Every checkbox must pass before reporting completion. Pay special attention to:

1. **The inline test:** Clicking "Begin Smart Start" from the Donna canvas must NOT open a modal over the grid. The intake must render in the canvas slot.
2. **The `openModuleById` audit:** Search the codebase for every call to `openModuleById` or `onOpenModule` that originates from a Donna surface component. Every one except "Open full view ↗" is a violation.
3. **The anti-pattern audit:** No prices, no "Sign In" buttons, no rounded corners, no portrait of Donna, no more than 3 chips simultaneously.
4. **TypeScript:** `npm run build` must complete without errors before reporting done.

---

## What You Must Not Do

- Do not rewrite `DonnaShell.tsx`, `GeminiLivePanel.tsx`, `ElevenLabsConvaiPanel.tsx`, or `IntakeFlow.tsx` from scratch
- Do not change any existing API route in `api/index.js`
- Do not rename or change the schema of any existing tool in `liveIntakeTools.js`
- Do not change `GeminiLiveTokenResponse` or `ElevenLabsSessionResponse` shapes in `types.ts`
- Do not import visual design (colors, fonts, component names) from the POC reference code
- Do not add a sidebar, dashboard nav, or profile chrome
- Do not add prices to package selection cards
- Do not use `openModuleById` as a primary action from the Donna surface

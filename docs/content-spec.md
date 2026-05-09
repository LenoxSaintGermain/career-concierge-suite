# Content & Flow Specification
> **Purpose:** Authoritative reference for all UI rendering, content, and agent behavior across the full user lifecycle. Covers pre-purchase (Journey A) and post-purchase (Journey B) flows end-to-end.
>
> **Reference sources:**
> - POC app + design documents: `SkillSync Ai — Design System/skill-synch-ai - reference code/`
> - Key files: `DESIGN_BRIEF.md`, `Career Concierge — Implementation Spec.txt`, `Acceptance Criteria.txt`, `agentic_front_door.html`, `components/AgentAppUI.tsx`
> - Production codebase: `/Users/lenoxparis/conductor/workspaces/Signal-Atlas/atlanta`

---

## THE GOVERNING PRINCIPLE

> **The Agent is the App.**

The user resides in an environment. They do not navigate a product. Every architectural and content decision is evaluated against this principle first.

**What this means concretely:**
- The Donna ambient canvas (`DonnaShell` + `DonnaChatLane`) is the primary surface for the entire user lifecycle
- The module grid (`SuiteModules`) is a background filing system — accessible but never the primary destination
- **No action on the Donna surface navigates the user away from the Donna surface.** Intake, brief reveal, plan reveal, concierge sync — all happen inline within the canvas as A2UI-rendered artifacts
- Donna calls UI state transitions via tool calls — the agent drives the interface, not the user

---

## Design Principles (from DESIGN_BRIEF.md)

| Principle | Rule |
|---|---|
| **No sidebars** | No home/settings/profile nav. Immersion breaks immediately. |
| **No chatbot clones** | Donna is an environment, not a box you type into. |
| **Interaction First, UI Second** | Interface is a byproduct of the conversation. |
| **One Best Next Step** | One primary path. Max 3 chips or 1 CTA visible simultaneously. Never equal-weight menus. |
| **The Sutherland Rule** | Donna reframes problems. She is an advisor, not a servant. She does not pitch — she reframes. |
| **The Boutique Principle** | In a luxury boutique, the product never chases the customer. The experience earns the transaction. Price appears last — after value is felt, not before. Donna demonstrates capability before revealing cost. The interaction IS the proof of concept. |
| **Earn the Price** | Pricing is visible in the pre-sale flow but always arrives after: (1) Donna names the user's situation back to them, (2) the gap between now and target is made concrete. Price is the answer to "what does closing this gap cost?" — not a product label. |
| **Editorial Authority** | Typography: editorial serif for copy, mono for system data. No rounded corners on any interactive element. |
| **Ephemerality** | Information appears when needed and dissolves when the moment passes. Cards clear when a choice is made. |

---

## Journey Routing

Authentication state at mount is the sole routing signal. No manual navigation.

| Auth State | Intake State | Journey | Entry |
|---|---|---|---|
| `user === null` | — | **A — New User** | Donna greeting + 3 action chips |
| `user !== null` | incomplete | **B — Uncalibrated** | Name greeting + wiki cards + "Begin Smart Start" CTA |
| `user !== null` | complete | **B — Calibrated** | Arc summary + wiki cards + one primary CTA + 2 secondary chips |

**Agent note:** Do not render a "Sign In" button. Returning users who land unauthenticated are served Journey A. The auth trigger is a quiet peripheral element (see `post_auth_login`), not a primary CTA.

---

## A2UI Canvas State Machine

The Donna canvas operates as a state machine. **Donna's tool calls drive state transitions** — not user navigation. This is the "agent is the app" mechanism.

| Canvas State | What Renders in the A2UI Slot | Triggered By |
|---|---|---|
| `landing` | Donna greeting + chips (Journey A) or wiki cards (Journey B) | Mount |
| `donna_reads_you` | Single A2UICard: Donna's one calibration question + inline text input | Any landing chip/message response in Journey A |
| `gap_reveal` | Two-column "from here to here" card — NOW vs. TARGET — with price teaser | After user answers Donna's calibration question |
| `package_selection` | 3 A2UI package cards with earned pricing (price last, after value copy) | From `gap_reveal` CTA or "I'm ready to begin" fast-path |
| `intake_inline` | Smart Start intake form fields, rendered inline as A2UI cards | Donna calls `onJumpIntakeScreen` or user confirms "Begin Smart Start" |
| `dna_processing` | Processing signifier — "Mapping Professional DNA..." with animated progress | Donna signals analysis complete |
| `dna_reveal` | Brief artifact rendered as A2UI card within canvas | Donna presents brief inline |
| `plan_active` | Plan artifact rendered as A2UI card | Donna opens plan inline |
| `concierge_sync` | Voice panel inline, below greeting strip | User clicks "Start a Live Session" |

**Agent note:** `openModuleById()` exists in the codebase and currently navigates to module modals. For the "agent is the app" architecture, primary actions must NOT call `openModuleById`. They must set the canvas state. `openModuleById` is only for the suite filing cabinet (grid), which is accessible via "Open Suite ↗" in the header.

---

## A2UI Card Component Contract

All materialized content in the canvas uses this pattern. Create as `components/A2UICard.tsx`.

**Animation:** `scale 0.96 → 1`, `opacity 0 → 1`, `y 12 → 0`
**Spring:** `{ type: 'spring', stiffness: 260, damping: 24, mass: 0.9 }`
**Stagger:** 80ms between cards. Max 3 visible simultaneously.
**Visual:** `border-left: 2px solid var(--color-accent)` · `border: 1px solid #22424A` · `background: rgba(13,35,41,0.8)` · `backdrop-filter: blur(8px)` · `border-radius: 0`

**Card exits:** When a choice is made, existing cards dissolve (`opacity → 0`, `scale → 0.97`, 300ms). New content materializes after cards clear.

---

## Scene Rail

Right-edge ambient narrative. Three scenes advance linearly. Non-interactive — ambient context only.

| Scene | ID | Label | Copy | Active When |
|---|---|---|---|---|
| 01 | `arrival` | ARRIVAL | "The first conversation is not the beginning. It is the entrance." | New user on mount |
| 02 | `calibration` | CALIBRATION | "Signal is clarified, not captured. We listen for what you already know." | After new user's first input, OR returning user on mount |
| 03 | `co_design` | CO·DESIGN | "What appears is a response to what you brought. Nothing is pre-built." | When A2UI cards render; when intake is active |

**Visual:** Monospaced 9px text, 40% opacity, right edge, rotated 90°. Scene ID rendered above copy. Scene transitions: opacity fade 800ms.

---

## I. PRE-PURCHASE FLOW — Journey A (New / Unauthenticated)

**Goal:** Dark ambient landing → Donna interaction → package selection → inline Smart Start intake → account creation handoff.

---

### STEP: `landing` — Journey A Entry
**TRIGGER:** Mount with `user === null`
**SURFACE:** Full Donna ambient canvas. No header nav. No chrome. Scene Rail: Scene 01 active.

| Field | Content |
|---|---|
| DONNA OPENING | "Good [time of day]. I'm Donna — your career concierge. Tell me where you are right now, and I'll take it from there." |
| ACTION CHIPS | "I'm exploring" · "I'm ready to begin" · "Tell me what this is" |
| QUIET AUTH ENTRY | Small peripheral label bottom-right or top-right: `RETURNING CLIENT ↗` — monospaced 9px, 30% opacity. On click: reveals the auth column (see `post_auth_login`). This is NOT a button. It is a wayfinding marker. |

**Chip resolution — "I'm exploring":**

| Field | Content |
|---|---|
| USER MESSAGE RENDERED | "I'm exploring." |
| DONNA RESPONSE (Sutherland posture — reframe, not pitch) | "Most people who say they're exploring already know what needs to change. They're just looking for a frame where that's not a gamble. That's what the suite is for." [pause] "What's the thing that's not moving the way it should?" |
| SCENE ADVANCE | → Scene 02: Calibration |
| CHIPS AFTER | Chips remain. "I'm ready to begin" becomes visually primary (slightly brighter). |

**Chip resolution — "Tell me what this is":**

| Field | Content |
|---|---|
| USER MESSAGE RENDERED | "Tell me what this is." |
| DONNA RESPONSE | "Career Concierge is a private intelligence layer for your career. Not a job board. Not a coaching platform. A concierge — which means we do the thinking, the structuring, and the sequencing so you can focus on the execution." [pause] "Smart Start is a 10-minute session that calibrates the system to you. Everything else unlocks from there." |
| SCENE ADVANCE | → Scene 02: Calibration |
| CHIPS AFTER | Chips remain. "I'm ready to begin" becomes primary. |

**Chip resolution — "I'm ready to begin":**

| Field | Content |
|---|---|
| USER MESSAGE RENDERED | "I'm ready to begin." |
| DONNA RESPONSE | "Good. Tell me one thing first — what's the gap you're trying to close? The title, the comp, or the narrative?" |
| TRANSITION | Chips fade out (200ms). Canvas state → `donna_reads_you` |
| SCENE ADVANCE | → Scene 02: Calibration |
| → NEXT STEP | `donna_reads_you` |

**Agent note:** Even for "I'm ready to begin" users, Donna asks one calibration question before showing packages. This is not friction — it is the boutique ritual that makes the price land correctly. The question takes 10 seconds. The gap_reveal that follows makes the price obvious.

---

### STEP: `donna_reads_you`
**TRIGGER:** Any initial Journey A chip or message — after Donna's first response
**SURFACE:** Chips have dissolved. One A2UICard materializes in the canvas slot — Donna's calibration question with inline answer input.

| Field | Content |
|---|---|
| CARD EYEBROW | `SC. 01 · CALIBRATION` — monospaced 10px, ghost opacity |
| CARD HEADLINE | "What's the gap you're trying to close?" |
| CARD SUBTEXT | "The title. The comp. The narrative. Pick one — or name it your way." |
| INLINE INPUT | Single text input within the card, placeholder: `Type your answer...` |
| INPUT CTA | `CONTINUE →` — sends answer, triggers `gap_reveal` |
| DONNA BEHAVIOR | After user submits: Donna plays the answer back with a reframe in 1–2 sentences. Then: "Here's where that puts you." → `gap_reveal` |

**Donna playback patterns by theme (derive from user's text — these are examples):**
- If comp/salary → "You're not underselling your skills. You're underselling your positioning. Those are different problems — and only one of them is fixable with a better resume."
- If title/level → "The title question is almost always a narrative question. You don't need a new job title. You need the frame that makes the next title inevitable."
- If direction/uncertainty → "That's the right problem to have. It means you've outgrown your current frame — not that you don't know what you want."

**Agent note:** Donna's playback is generated from her LLM response, not hardcoded. These are posture examples for system instruction and demo scaffolding. The Sutherland move: Donna names what's underneath the surface concern.

---

### STEP: `gap_reveal`
**TRIGGER:** Donna's playback of calibration answer completes
**SURFACE:** Processing dissolve (200ms). One full-width A2UICard materializes — the "from here to here" card.

| Field | Content |
|---|---|
| CARD EYEBROW | `POSITIONING DELTA` — monospaced 10px, ghost opacity |
| CARD TOP | Two-column layout — left: `WHERE YOU ARE` · right: `WHERE THIS GETS YOU` |
| LEFT COLUMN (ghost) | Populated from Donna's read of their calibration answer. If insufficient: use generic: "Invisible positioning · Unquantified value · No strategic narrative" |
| RIGHT COLUMN (accent) | "Named, sourced, deployed positioning · Comp-leveled professional brief · Live concierge access · Ongoing strategic alignment" |
| DONNA LINE (below columns) | "The gap between these two things has a number. It's smaller than you think." |
| PRICE TEASER | Below Donna line, ghost mono 10px: `ONE SESSION FROM $2.4K · FULL SUITE FROM $6K` |
| PRIMARY CTA | `SHOW ME HOW →` — transitions to `package_selection` |
| SECONDARY CTA | `NOT YET` — ghost, low-contrast. Sends "Tell me more about what's involved" to Donna message thread |
| SCENE ADVANCE | → Scene 03: Co-Design |

**Agent note:** The price teaser is intentional — pricing appears HERE, not on the package cards. By the time the user sees `$2.4K` on a package card, they have already seen it framed as "the cost of closing this gap." The package card price is the confirmation, not the reveal.

---

### STEP: `package_selection`
**TRIGGER:** User clicks `SHOW ME HOW →` from `gap_reveal`
**SURFACE:** Gap card dissolves. 3 A2UI cards materialize with 80ms stagger. Chips have cleared.

| Card | Eyebrow | Title | Body | Price Framing | CTA |
|---|---|---|---|---|---|
| 1 | SMART START | Smart Start | The calibration session. One structured conversation that maps your professional DNA and stages your entire suite. Most clients close their first gap within two weeks of completing it. | `ONE SESSION · $2.4K` — mono 10px, ghost opacity, below body | Begin Smart Start → |
| 2 | SKILLSYNC AI PREMIER | SkillSync Ai Premier | End-to-end career infrastructure. Brief, plan, DNA dossier, live concierge, and ongoing strategic alignment. The complete operating layer. | `90 DAYS · FROM $6K` | Explore Premier → |
| 3 | CONCIERGE JOB SEARCH | Concierge Job Search | Dedicated placement strategy with search execution, artifact optimization, and weekly concierge coordination. | `PLACEMENT STRATEGY · CUSTOM` | Explore CJS → |

**Price rendering rules:**
- Price appears as the LAST element in the card — after the headline and body copy
- Font: monospaced 10px, ghost opacity (not accent, not primary)
- Format: `[DESCRIPTOR] · [PRICE]` — the descriptor comes before the number
- No currency symbols in large type. No `$2,400`. Format is `$2.4K` or `FROM $6K`
- Price is ambient information, not the focal point

**Other rules:**
- Max 3 cards visible simultaneously
- Any card CTA → `intake_inline` state
- Quiet secondary below cards: `Not sure which fits? Ask me.` — clicking sends "Help me choose" to Donna thread; Donna asks one qualifying question and recommends a path
- Do not add a fourth card. Do not link to an external page.

---

### STEP: `intake_inline`
**TRIGGER:** User clicks any Package Selection Card CTA
**SURFACE:** Cards dissolve. Donna confirms. Smart Start intake mounts *within the Donna canvas* as A2UI-rendered fields. The ambient field persists. The user does not navigate away.

| Field | Content |
|---|---|
| DONNA CONFIRMATION | "Good choice. Let's get you calibrated." |
| INLINE INTAKE MOUNT | IntakeFlow sections render as A2UI cards within the canvas. Each section materializes as Donna advances through it. |
| SECTION LABEL PATTERN | `ACT 01: THE BASELINE` · `ACT 02: YOUR TARGET` · `ACT 03: YOUR EVIDENCE` · `ACT 04: YOUR PREFERENCES` — monospaced 10px, accent color |
| VOICE OPTION | "Want to do this by voice instead?" chip appears — clicking mounts GeminiLivePanel inline |
| SCENE | Scene 03: Co-Design — remains active throughout intake |

**Agent note:** `IntakeFlow.tsx` exists and handles the form logic. For the inline pattern, intake field sections must render within the DonnaChatLane A2UI slot — not as a modal over the grid. The intake completion callback fires `handleStateChange('dna_processing')`.

---

### STEP: `dna_processing`
**TRIGGER:** Intake form completion
**SURFACE:** Intake fields dissolve. Processing signifier materializes.

| Field | Content |
|---|---|
| DONNA LINE | "Give me a moment." |
| PROCESSING LABEL | `MAPPING PROFESSIONAL DNA` — monospaced 9px, accent |
| SUBTEXT | `Analyzing target: [Target Job Title]` |
| PROGRESS SIGNIFIER | Animated scan-line + percentage counter (not a spinner). Reads as system processing, not loading. |
| DURATION | 3 seconds minimum. Fires artifact generation in background. |
| AUTO-ADVANCE | → `dna_reveal` on completion |

---

### STEP: `dna_reveal`
**TRIGGER:** DNA processing complete
**SURFACE:** Processing signifier dissolves. Brief artifact materializes as A2UI card inline.

| Field | Content |
|---|---|
| DONNA LINE | "Here's what I have on you." |
| ARTIFACT CARD | Renders a condensed Brief (positioning statement, 2–3 key strengths, target role summary) as a `donna-card` within the canvas. Not the full BriefView module — a curated excerpt. |
| PRIMARY CTA | "Continue to your suite →" |
| SECONDARY | "Tell me more about this" chip — Donna elaborates on the brief inline |
| ACCOUNT CREATION PROMPT | If user is not yet authenticated: "To save this and unlock your full suite, create your account." → Quiet inline email + password fields materialize below the CTA (A2UI pattern). No navigation. |

**Agent note:** Account creation happens *here*, within the canvas, after the user has seen value. Not before. This is intentional — the brief is the value demonstration that earns the registration ask.

---

### STEP: `pre_purchase_account_creation`
**TRIGGER:** User clicks "Continue to your suite →" (unauthenticated)
**SURFACE:** Inline auth fields materialize below the brief card.

| Field | Content |
|---|---|
| DONNA LINE | "One step. Then your suite is ready." |
| FIELD LABELS | **Email Address** · **Password** (create) |
| PRIMARY CTA | Create my suite → |
| HELPER TEXT | "Already have a suite?" — clicking reveals sign-in fields inline |
| POST-CREATE | On success: pre-purchase intake data seeds Firestore (`clients/{uid}`, `intake`, `wiki`). User transitions directly to Journey B calibrated state. The canvas does not reload — it transitions. |
| ERROR STATE | "That email is already registered." → fields swap to sign-in mode |

**Agent note:** This is E16-S02 (Pre→Post-purchase session handoff). The pre-purchase intake payload (name, path, target role, resume URL, selected components) must be persisted to the new user's Firestore record on account creation. This ensures Journey B never re-asks for data already captured here.

---

## II. POST-PURCHASE / AUTHENTICATED FLOW — Journey B

**Goal:** Authenticated canvas → Donna context awareness → inline artifact access → live concierge sync.

---

### STEP: `post_auth_login`
**TRIGGER:** User arrives unauthenticated and clicks `RETURNING CLIENT ↗` wayfinding marker
**SURFACE:** The Donna ambient canvas persists. The auth surface appears as an overlay or right-column reveal — it does not replace the canvas.

| Field | Content |
|---|---|
| LEFT: DONNA CANVAS | Remains visible, dimmed slightly. Donna goes quiet (idle state). |
| RIGHT: AUTH COLUMN EYEBROW | Client Access |
| RIGHT: HEADLINE (login) | Return to your suite. |
| RIGHT: HEADLINE (register) | Create your account. |
| RIGHT: BODY (login) | Your suite is waiting. Everything from your last session is still here. |
| RIGHT: BODY (register) | Your suite will be ready the moment you confirm your email. |
| FIELD LABELS | **Email Address** · **Password** |
| PRIMARY CTA (login) | Sign In |
| PRIMARY CTA (register) | Create Account |
| MODE TOGGLE | "New client? Create an account." · "Already have a suite? Sign in." |
| VALIDATION | Email + Password required. |
| ERRORS | Wrong credentials: "That email and password didn't match. Try again or reset your password." · Unverified: "Check your inbox — a confirmation link is waiting." |
| ON SUCCESS | Auth overlay dismisses. Canvas transitions to Journey B. Donna greets by name. |

---

### STEP: `post_auth_onboarding`
**TRIGGER:** First authenticated session — `intro_seen_at === null`
**SURFACE:** Full-canvas dark overlay, centered. Renders once per user lifetime.

| Field | Content |
|---|---|
| EYEBROW | Career Concierge |
| HEADLINE | Welcome, [First Name]. Your suite is staged. One session calibrates everything. |
| HEADLINE (no name) | Your suite is staged. One session calibrates everything. |
| BODY | Smart Start is a short guided intake that tells the suite who you are, what you're optimizing for, and how to stage the right artifacts. It takes about ten minutes and unlocks the entire system. |
| PRIMARY CTA | Begin Your Smart Start → |
| SECONDARY CTA | Skip to suite (low-contrast, muted) |
| CONDITIONAL | If pre-purchase intake data already exists (E16-S02): skip this screen entirely. User goes directly to `post_auth_dashboard`. |
| DONNA OPENING | "Good [time of day], [First Name]. Your suite is staged. Tell me where you are right now, and I'll take it from there." |

---

### STEP: `post_auth_dashboard` — Journey B Landing
**TRIGGER:** Authenticated, `intro_seen_at` set (any return session)
**SURFACE:** Donna ambient canvas. Two zones: Donna surface (top/primary) + module grid (below/filing cabinet).

#### Donna Surface — Greeting Strip

| Condition | Greeting | Status Line | Primary CTA | Secondary Chips |
|---|---|---|---|---|
| No intake | "Good [time], [First Name]." | "Your suite is ready for calibration." | Begin Smart Start → | none |
| Intake complete, no memory | "Good [time], [First Name]." | "Your brief is current." | Open Your Brief → | "Start a live session" · "View your plan" |
| Intake complete, memory exists | "Good [time], [First Name]." | `[arc_summary]` | [highest-weight next step] → | Up to 2 contextual chips |

**Secondary chip copy pool (select by context, max 2):**
- "Continue where we left off"
- "What's changed since last time"
- "Start a live session"
- "View your plan"
- "Check your gaps"
- "Open the war room"

#### Donna Surface — Wiki Cards (Journey B, A2UI pattern)

After the greeting strip, 1–3 wiki cards materialize from `clients/{uid}/wiki`. Max 3 visible.

| Card Key | Heading | Body Source | Renders When |
|---|---|---|---|
| `positioning` | Career Positioning | `wiki.sections.find(s => s.key === 'positioning').body` | Always (if intake complete) |
| `evidence` | Proof & Evidence | `wiki.sections.find(s => s.key === 'evidence').body` | Always (if resume or outcomes present) |
| `artifacts` | Suite Artifacts | `wiki.sections.find(s => s.key === 'artifacts').body` | When ≥1 artifact generated |

**Agent note:** Wiki cards are read-only display. They use the `A2UICard` component. Each card has a quiet secondary action: `Donna, update this` — which triggers a conversational update flow inline. Do not link the card to a module view.

#### Module Grid (Filing Cabinet)

Visible below the Donna surface. Demoted visually.

| Field | Content |
|---|---|
| SECTION LABEL | Your Suite Modules |
| COUNT LABEL | [N] modules |
| ACCESS | Available but not the primary destination. "Open Suite ↗" in the header provides direct grid access. |

**The 18 module tiles** use `DEFAULT_BRAND_MODULES` copy from `api/config/brandSystem.js`. Do not paraphrase.

---

### STEP: `inline_artifact_reveal` — Brief / Plan / DNA Dossier
**TRIGGER:** User clicks "Open Your Brief →", "View your plan", or Donna presents an artifact
**SURFACE:** Donna canvas. The artifact renders as an A2UI card within the canvas slot. The grid is still accessible below but dims.

| Field | Content |
|---|---|
| DONNA INTRO | "Here's where you stand." (for brief) · "Here's the sequence." (for plan) · "Here's the read on your market." (for dossier) |
| ARTIFACT CARD | Condensed artifact excerpt rendered as `donna-card` inline. Not the full module view. |
| FULL VIEW ACCESS | Quiet secondary: `Open full view ↗` — this calls `openModuleById()` and opens the module in the grid overlay. This is the ONLY acceptable use of `openModuleById` from the Donna surface. |
| DONNA FOLLOW-UP | After artifact renders: "What do you want to dig into?" |
| CHIPS | Contextual to artifact: e.g. for brief → "Adjust my positioning" · "What's my biggest gap" |

**Agent note:** `openModuleById()` is reserved for "Open full view ↗" only. All primary artifact interactions happen inline. Do not call `openModuleById` from primary CTAs, chip clicks, or Donna-driven transitions.

---

### STEP: `concierge_sync` — Inline Voice Session
**TRIGGER:** User clicks "Start a Live Session" or Donna suggests it
**SURFACE:** Voice panel mounts inline below the greeting strip. Canvas persists above.

| Field | Content |
|---|---|
| SESSION START CTA | Start Voice Session |
| RECONNECT CTA | Reconnect Mic |
| CLOSE CTA | Close Session |
| LIVE INDICATOR | `LIVE · [elapsed]` — monospaced, accent color, with pulse dot |
| SHELL CONTEXT (Donna's opening) | "Good [time], [First Name]. I have your brief. What's the move?" |
| INTAKE CONTEXT (Donna's opening) | "Let's get your suite calibrated. I'll ask a few questions and fill everything in as we go." |
| SESSION END MESSAGE | "Good session. I'll update your brief with what we covered." |
| MIC PERMISSION ERROR | "Microphone access is required for live sessions. Check your browser permissions and try again." |
| CONNECTION ERROR | "The live connection dropped. Your progress is saved — reconnect when you're ready." |

**DonnaState during voice:**
- On connect: `listening`
- While agent speaks: `speaking`
- While processing: `thinking`
- On close: `idle`

---

## III. DONNA'S VOICE — Copy Rules

These rules govern every line Donna speaks or renders. Non-negotiable.

1. **Present tense.** Always. "Your brief is current." Not "Your brief has been generated."
2. **No filler phrases.** No "Great!", "Absolutely!", "Of course!", "Sure thing!" — ever.
3. **No corporate warmth.** No "I'm here to help you on your journey." Donna is an advisor, not a support agent.
4. **Direct address.** By name when known. No generic "there" or "friend."
5. **Reframe, don't report.** Donna does not narrate what she's doing. She says what it means.
6. **Sutherland posture.** When a user is uncertain, Donna names the real dynamic underneath. She does not validate the surface concern — she reframes it.
7. **Short.** Donna's messages are 1–3 sentences unless presenting an artifact. She does not over-explain.
8. **No portrait. No avatar.** Donna has no face. She is a presence, not a persona.

---

## IV. ARCHITECTURAL RULES FOR THE IMPLEMENTING AGENT

These are hard constraints. Violating them breaks the "agent is the app" promise.

### NEVER do:
- Call `openModuleById()` from a primary Donna surface CTA, chip, or Donna-driven state transition
- Open IntakeFlow as a modal from a Donna surface action
- Render a "Sign In" or "Get Started" button as primary chrome
- Add `border-radius` to any card, button, or input
- Lead with price — price must always be preceded by gap_reveal. The sequence is: calibration → gap → price → choice. Never: price → choice.
- Show price in large type, accent color, or as a card headline
- Show more than 3 chips or 1 primary CTA at once
- Navigate away from the canvas in response to a Donna interaction
- Skip `donna_reads_you` and `gap_reveal` and jump directly to `package_selection` from a chip click

### ALWAYS do:
- Keep the ambient canvas (`DonnaShell` / `DonnaChatLane`) as the outermost persistent layer
- Render intake, brief, plan, and DNA artifacts as A2UI cards within the canvas slot
- Use `handleStateChange(newState)` or equivalent canvas state to drive transitions
- Let Donna's tool calls (`liveIntakeTools.js`) drive canvas state — not user navigation
- Clear cards before materializing new ones (dissolve → materialize)
- Use the `A2UICard` component for all materialized content

### Module grid access:
The module grid is accessible via "Open Suite ↗" in the header. It is also accessible via "Open full view ↗" secondary action on inline artifacts. These are the only two sanctioned entry points to `openModuleById()` from the Donna surface.

---

## V. COMPONENTS TO BUILD

| Component | File | Priority | Purpose |
|---|---|---|---|
| A2UI Card | `components/A2UICard.tsx` | P0 | Core materialization pattern — all cards use this |
| Donna Reads You Card | `components/DonnaChatLane.tsx` (extend) | P0 | Journey A sizzle: calibration question card with inline input |
| Gap Reveal Card | `components/GapRevealCard.tsx` | P0 | Two-column NOW vs TARGET + price teaser + CTA |
| Package Selection Cards | `components/PackageSelectCards.tsx` | P0 | Journey A → 3 cards with earned pricing |
| Canvas State Machine | `components/DonnaChatLane.tsx` (extend) | P0 | `canvasState` type + transition handler + slot renderer |
| Inline Intake | `components/DonnaChatLane.tsx` (extend) | P0 | Render IntakeFlow sections as A2UI within canvas slot |
| Wiki Card Renderer | `components/DonnaChatLane.tsx` or `WikiCards.tsx` | P1 | Journey B wiki cards via A2UICard |
| Scene Rail | `components/SceneRail.tsx` | P1 | Right-edge ambient narrative, 3 scenes |
| DNA Processing State | `components/DonnaChatLane.tsx` (extend) | P1 | Processing signifier + auto-advance |
| Inline Brief Excerpt | `components/DonnaChatLane.tsx` (extend) | P1 | Condensed artifact card in canvas slot |
| Inline Account Creation | `components/DonnaChatLane.tsx` (extend) | P1 | Post-intake auth fields in canvas |
| Secondary Chips | `components/ConciergeSurface.tsx` (extend) | P2 | Max 2 contextual chips below primary CTA |
| Returning Client Entry | `components/DonnaChatLane.tsx` (extend) | P2 | Peripheral `RETURNING CLIENT ↗` wayfinding |

---

## VI. BACKLOG REFERENCES

Stories that must be implemented before end-to-end flow is complete:

| Story | Description |
|---|---|
| E16-S01 | Agent receives `user_name` + `target_job` as structured context at step_4/step_5 |
| E16-S02 | Pre-purchase intake payload persists to Firestore on account creation |
| E16-S03 | Bespoke offerings list resolved from backend per selected path |
| E16-S04 | Pricing accumulator operator-configurable |
| E16-S05 | DNA state replay on first post-auth load |

---

## VII. DEMO ACCEPTANCE CHECKLIST (Jim Review Gate)

### Journey A — New User (Pre-Sale Sizzle Arc)
- [ ] Mount unauthenticated → Donna greeting renders on dark ambient canvas; 3 chips visible; no nav chrome
- [ ] "I'm exploring" → User message renders; Donna responds with Sutherland reframe; transitions to `donna_reads_you`
- [ ] "Tell me what this is" → Donna explains in 2–3 sentences; transitions to `donna_reads_you`
- [ ] "I'm ready to begin" → Donna asks calibration question; transitions to `donna_reads_you`
- [ ] `donna_reads_you` → Single card with question + inline text input visible in slot
- [ ] User submits calibration answer → Donna plays back with reframe; transitions to `gap_reveal`
- [ ] `gap_reveal` → Two-column NOW vs TARGET card materializes; price teaser visible at ghost opacity below copy; `SHOW ME HOW →` CTA
- [ ] `SHOW ME HOW →` → Gap card dissolves; 3 package cards materialize with 80ms stagger
- [ ] Package cards render with price as LAST element — monospaced ghost, NOT headline or accent
- [ ] Package card CTA → Cards dissolve; Donna confirms; intake fields materialize inline (NOT a modal)
- [ ] Intake completion → Processing signifier; then brief excerpt renders as A2UI card
- [ ] Account creation inline → No navigation; canvas persists; user transitions to Journey B

### Pre-Sale Sizzle Audit
- [ ] Price never appears before `gap_reveal` — not in chips, not in Donna's message thread, not in landing
- [ ] Price on package cards is monospaced 10px ghost — NOT large type, NOT accent color
- [ ] No chip or CTA can jump directly to `package_selection` — `donna_reads_you` and `gap_reveal` are not skippable
- [ ] Donna's calibration question cannot be a form — it is one question in an A2UICard with a text input
- [ ] Gap reveal left column pulls from Donna's read of user's calibration answer — not hardcoded

### Journey B — Returning User
- [ ] Mount authenticated → Donna greeting by name with arc summary or appropriate status line
- [ ] 1–3 wiki cards materialize in canvas slot (A2UICard pattern)
- [ ] One primary CTA visible; max 2 secondary chips
- [ ] "Open Your Brief" → Brief excerpt renders as A2UI card inline (does NOT open module modal)
- [ ] "Open full view ↗" on inline artifact → Opens module modal (the ONLY `openModuleById` call from canvas)
- [ ] "Start a Live Session" → Voice panel mounts inline; canvas persists above

### DonnaState Machine
- [ ] Tab/click into input → Status stays `idle` (typing never triggers `listening`)
- [ ] Mic click → Status `listening`; waveform replaces orb dot
- [ ] Mic click again → Status `idle`
- [ ] Send message → Status `thinking`; three-dot indicator above input
- [ ] Donna responds → Status `speaking`; sentences stagger; self-resolves to `idle`
- [ ] Click during `thinking` or `speaking` → State NOT interrupted

### Scene Rail
- [ ] New user mount → Scene 01 (Arrival) text visible on right edge
- [ ] New user first message → Scene 02 (Calibration) fades in
- [ ] Cards render → Scene 03 (Co-Design) fades in
- [ ] Returning user mount → Scene 02 by default

### Visual Fidelity
- [ ] `border-radius: 0` on ALL cards, inputs, buttons
- [ ] Donna messages render directly on dark field — no bubble background
- [ ] Ambient bottom-center glow breathes on 4s cycle
- [ ] Donna responses appear sentence-by-sentence with 120ms stagger
- [ ] Send fires teal bloom (80ms in, 600ms fade)
- [ ] `RETURNING CLIENT ↗` marker at 30% opacity — not a button

### Anti-Pattern Audit
- [ ] No prices on package cards
- [ ] No "Get Started", "Sign In", or "Log In" buttons visible as primary chrome
- [ ] Never > 3 chips or > 1 primary CTA simultaneously
- [ ] No avatar or portrait of Donna
- [ ] No sidebar, no settings nav, no profile chrome
- [ ] No modal opens from a Donna surface primary action (except "Open full view ↗")

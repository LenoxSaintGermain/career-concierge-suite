# Donna — Cinematic UI & Personification Spec
**Date:** 2026-05-04
**Status:** Ready for implementation
**Depends on:** DonnaShell, DonnaChatLane (already shipped)

> **For Claude Code agent:** This spec fully replaces the current plain-chat DonnaChatLane aesthetic.
> The goal is a cinematic, ambient, living UI — not a chatbot window.
> Reference the Signal Card agentic UI pattern for tone. Reference `GeminiLivePanel.jsx`
> in `/Volumes/Mini_2T/lenoxparis data/Dev/ui_kits/concierge_surface/GeminiLivePanel.jsx`
> for the dark surface aesthetic already established.
> Working directory: `/Users/lenoxparis/conductor/workspaces/Signal-Atlas/atlanta`

---

## The Vision

When a user is looking at Donna, they should feel like they stepped into a high-budget production environment — not opened a support chat. The aesthetic reference: a cinematic command center that's quietly alive. Not busy. Not animated for animation's sake. Alive in the way an expensive room is alive — ambient light, subtle motion, a sense that something is always gently in motion even when nothing is being said.

Donna is not a chatbot. She is a presence. The UI should reflect that.

**Three states, three moods:**
- **Idle** — Donna is present, waiting. The environment breathes.
- **Listening** — Donna is receiving. The environment focuses.
- **Speaking/thinking** — Donna is active. The environment responds.

---

## Design Tokens (from `colors_and_type.css` — already canonical)

```
bg:           #07161A  — deep teal-black, the room
surface:      #0D2329  — slightly lighter, card surfaces
border:       #22424A  — muted teal border
border-mid:   #314F56  — brighter for active states
text:         #DCE7E8  — cool off-white
text-muted:   #8EA3A7
teal:         #8DD9BF  — the signal color
glow:         rgba(45,197,194,0.12)  — Donna's aura
```

**Motion tokens (Framer Motion):**
```typescript
const SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 };
const EASE_EXIT = [0.22, 1, 0.36, 1]; // cubic-bezier
const DUR_MD = 0.26;
const DUR_LG = 0.42;
const DUR_CINEMATIC = 1.1;
```

---

## Donna's Visual Identity — Personification Without an Avatar

Donna is not a face. She is a field of light and signal. Her presence is expressed through three visual elements:

### 1. The Signal Orb
A soft radial glow centered in the Donna surface. Not a circle outline — a diffused light bloom.

```tsx
// Idle state — slow breathe, 4s cycle
<div
  className="absolute inset-0 pointer-events-none"
  style={{
    background: 'radial-gradient(ellipse 60% 40% at 50% 85%, rgba(45,197,194,0.07) 0%, transparent 70%)',
    animation: 'donnaBreathe 4s ease-in-out infinite',
  }}
/>

// Listening — tighter, brighter, faster
// Speaking/thinking — pulses with Donna's rhythm

@keyframes donnaBreathe {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.06); }
}

@keyframes donnaListen {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.12); }
  animation-duration: 1.8s;
}

@keyframes donnaThink {
  0%   { opacity: 0.4; }
  50%  { opacity: 1;   }
  100% { opacity: 0.4; }
  animation-duration: 0.9s;
}
```

### 2. The Callsign Header
`DONNA` in `font-data` `text-[10px] uppercase tracking-[0.32em]` — teal, always present in top-left of her surface. Followed by a status dot that changes with her state:

```tsx
type DonnaState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATUS_DOT_STYLES: Record<DonnaState, string> = {
  idle:      'bg-[#8DD9BF]/30',                          // dim
  listening: 'bg-[#8DD9BF] animate-[pulse_1.8s_ease-in-out_infinite]',  // active
  thinking:  'bg-[#8DD9BF]/60 animate-[pulse_0.9s_ease-in-out_infinite]', // fast
  speaking:  'bg-[#8DD9BF] animate-[pulse_1.2s_ease-in-out_infinite]',  // steady
};

const STATUS_LABELS: Record<DonnaState, string> = {
  idle:      'Standby',
  listening: 'Listening',
  thinking:  'Composing',
  speaking:  'Speaking',
};
```

Status label renders as `text-[10px] font-data uppercase tracking-[0.18em] text-[#8EA3A7]` — next to the dot.

### 3. The Waveform (voice only)
When voice is active, replace the status dot with a 5-bar waveform. Bars animate independently with slight phase offsets. Teal fill. Height 8px each, width 2px, gap 2px. This is Donna's "voice" made visual.

```tsx
function DonnaWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-[10px]">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="w-[2px] bg-[#8DD9BF] rounded-sm"
          animate={active
            ? { height: ['3px', '10px', '3px'], transition: { duration: 0.6, delay: i * 0.1, repeat: Infinity, ease: 'easeInOut' } }
            : { height: '3px' }
          }
        />
      ))}
    </div>
  );
}
```

---

## Layout — The Cinematic Shell

Replace the current flat `DonnaChatLane` layout with:

```
┌─────────────────────────────────────────────────────┐
│  HEADER BAR  (52px, border-bottom #22424A)          │
│  • DONNA [status dot] [status label]    [header CTAs]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  AMBIENT FIELD  (flex-1, overflow hidden)           │
│  • Signal orb glow (bottom-center, diffused)        │
│  • Message thread (scrollable, no-scrollbar)        │
│  │  Donna messages — fade up, no bubble             │
│  │  User messages — ghost card, right-aligned       │
│  │  A2UI cards — materialize from center            │
│  │                                                  │
│  • Quick action chips (first message only)          │
│                                                     │
├─────────────────────────────────────────────────────┤
│  INPUT STAGE  (border-top #22424A, bg #0D2329)      │
│  • Text input + Send                                │
│  • Donna thinking indicator (3-dot, appears above)  │
└─────────────────────────────────────────────────────┘
```

---

## Message Rendering — Not Bubbles, Set Pieces

### Donna messages

No background. No border. No bubble. Text appears directly on the dark field, as if projected.

```tsx
<motion.div
  className="max-w-[640px] py-3"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...SPRING }}
>
  <div className="text-[10px] font-data uppercase tracking-[0.28em] text-[#5FAF95] mb-2">
    Donna
  </div>
  <div className="text-[15px] leading-[1.75] text-[#DCE7E8] font-body">
    {message.body}
  </div>
</motion.div>
```

For multi-sentence Donna messages, each sentence should fade up with a 120ms stagger — parse on `. ` boundary, render as separate `motion.span` elements with stagger delay. This is the cinematic subtitle effect.

### User messages

Ghost card — minimal, right-aligned. Feels like a cue card, not a chat bubble.

```tsx
<motion.div
  className="self-end max-w-[480px]"
  initial={{ opacity: 0, x: 12 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ ...SPRING }}
>
  <div
    className="px-4 py-3 text-sm leading-6 text-[#DCE7E8]/80 font-body"
    style={{
      border: '1px solid rgba(49,79,86,0.6)',
      background: 'rgba(13,35,41,0.8)',
    }}
  >
    {message.body}
  </div>
</motion.div>
```

### Donna's thinking indicator

Three dots, staggered pulse. Appears above the input bar when Donna is composing.

```tsx
<AnimatePresence>
  {donnaThinking && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-[5px] px-4 py-2"
    >
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-[#8DD9BF]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <span className="text-[10px] font-data uppercase tracking-[0.2em] text-[#8EA3A7] ml-2">
        Donna is composing
      </span>
    </motion.div>
  )}
</AnimatePresence>
```

---

## A2UI Card Materialization

When Donna injects a card (wiki section, artifact preview, auth card) it should not slide in from a side. It should **materialize** — appear to coalesce from the ambient field.

```tsx
// A2UI card entry animation
const A2UI_ENTER = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.98, y: -8 },
  transition: { type: 'spring', stiffness: 240, damping: 24, mass: 0.9 },
};
```

A2UI cards render in a dedicated slot between the message thread and the input bar — not inline in the message stream. They float above the input stage, max 2 visible at once.

**WikiSectionCard dark variant** in this slot: same `border-left: 2px solid #8DD9BF` signature. Add a subtle `box-shadow: 0 0 24px rgba(45,197,194,0.06)` — Donna's glow on her compiled cards.

---

## Quick Action Chips — Cinematic Variant

Not plain bordered boxes. Chips that feel like command selections.

```tsx
<motion.button
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ ...SPRING, delay: index * 0.08 }}
  className="px-4 py-2.5 text-[10px] font-data uppercase tracking-[0.22em] transition-all duration-200"
  style={{
    border: '1px solid rgba(49,79,86,0.7)',
    background: 'transparent',
    color: '#8EA3A7',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.borderColor = '#8DD9BF';
    e.currentTarget.style.color = '#DCE7E8';
    e.currentTarget.style.background = 'rgba(45,197,194,0.05)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.borderColor = 'rgba(49,79,86,0.7)';
    e.currentTarget.style.color = '#8EA3A7';
    e.currentTarget.style.background = 'transparent';
  }}
>
  {label}
</motion.button>
```

Chips appear as a `flex-wrap gap-2.5` row, staggered 80ms per chip. They disappear (`AnimatePresence exit`) once the user has sent their first message.

---

## Ambient Background — The Living Field

The background is not flat `#07161A`. It's a living environment.

### Layer 1: Base
```css
background: #07161A;
```

### Layer 2: Radial glow (CSS, not canvas)
```css
/* Donna's ambient presence — bottom center */
background: radial-gradient(
  ellipse 70% 50% at 50% 100%,
  rgba(45,197,194,0.05) 0%,
  transparent 70%
);
animation: donnaBreathe 4s ease-in-out infinite;
```

### Layer 3: Grain texture (CSS noise overlay)
```css
/* Subtle film grain — premium tactile feel */
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
mix-blend-mode: overlay;
pointer-events: none;
```

### Layer 4: Interaction bloom (on user message send)
```tsx
// Momentary teal bloom on send — fades in 80ms, out in 600ms
const [blooming, setBlooming] = useState(false);
const handleSend = () => {
  setBlooming(true);
  setTimeout(() => setBlooming(false), 680);
  // ... send logic
};

<AnimatePresence>
  {blooming && (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08 }}
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 90%, rgba(45,197,194,0.08), transparent)',
      }}
    />
  )}
</AnimatePresence>
```

---

## DonnaState Management

Track Donna's current state in `DonnaChatLane`:

```typescript
type DonnaState = 'idle' | 'listening' | 'thinking' | 'speaking';
const [donnaState, setDonnaState] = useState<DonnaState>('idle');
```

State transitions:
- Mount → `'idle'`
- User focuses input → `'listening'`
- User sends message → `'thinking'` (until Donna's response appears)
- Donna's message appears → `'speaking'` for 1.5s, then → `'idle'`
- Voice session active → controlled by `onStateChange` from voice panel

Pass `donnaState` to:
- The ambient glow animation selector
- The signal orb animation selector
- The header status dot/label
- The waveform component (voice only)

---

## Voice Panel Integration

When voice is active (`voiceOpen = true`), the message thread contracts and the voice panel expands within the same dark surface. No page navigation. No environment swap. Donna's ambient field persists.

The `GeminiLivePanel` and `ElevenLabsConvaiPanel` render inside a `motion.div`:

```tsx
<AnimatePresence>
  {voiceOpen && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING}
      className="border-t border-[#22424A] overflow-hidden"
    >
      {/* voice panel — compact layout, same dark surface */}
    </motion.div>
  )}
</AnimatePresence>
```

The chat input bar is hidden while voice is active. Donna's waveform replaces the status dot.

---

## The `"Open Suite"` Escape Hatch — Cinematic Treatment

The escape hatch should feel like a command, not a nav link.

```tsx
<button
  className="text-[10px] font-data uppercase tracking-[0.2em] transition-all duration-200"
  style={{ color: 'rgba(142,163,167,0.35)' }}
  onMouseEnter={e => {
    e.currentTarget.style.color = 'rgba(141,217,191,0.7)';
    e.currentTarget.style.letterSpacing = '0.26em'; // subtle expand on hover
  }}
  onMouseLeave={e => {
    e.currentTarget.style.color = 'rgba(142,163,167,0.35)';
    e.currentTarget.style.letterSpacing = '0.2em';
  }}
>
  Open Suite ↗
</button>
```

---

## Implementation Checklist

- [ ] Replace flat `#07161A` bg in `DonnaChatLane` with layered ambient field (base + radial glow + grain)
- [ ] Add `donnaBreathe` / `donnaListen` / `donnaThink` CSS keyframes to `index.css` or inline
- [ ] Add `DonnaState` type and state to `DonnaChatLane`
- [ ] Implement signal orb as absolute-positioned ambient layer
- [ ] Update header: callsign + status dot driven by `DonnaState`
- [ ] Implement `DonnaWaveform` component
- [ ] Replace bubble message rendering with cinematic set-piece style
- [ ] Add per-sentence stagger to Donna messages
- [ ] Implement thinking indicator (3-dot above input)
- [ ] Update quick-action chips to cinematic variant with hover bloom
- [ ] Add interaction bloom on message send
- [ ] Update A2UI card slot with materialization animation
- [ ] Wire `DonnaState` transitions to message lifecycle
- [ ] Voice panel renders inside ambient field without environment swap
- [ ] Update `"Open Suite"` escape hatch with tracking-expand hover effect
- [ ] TypeScript check: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -E "DonnaChatLane|DonnaShell"`

---

## What Not To Do

- No avatar, portrait, or humanoid illustration for Donna — she is light and signal, not a face
- No slide-in animations from screen edges for message cards — they materialize (scale + fade)
- No border-radius anywhere — the system uses sharp corners throughout
- No heavy drop shadows on message cards — use ambient glow (`box-shadow: 0 0 24px rgba(45,197,194,0.06)`) for elevation
- No busy particle systems or canvas animations — the grain and radial glow are sufficient ambient life
- Do not animate the background continuously at high frame rates — the `donnaBreathe` keyframe is 4 seconds, that's the right pace

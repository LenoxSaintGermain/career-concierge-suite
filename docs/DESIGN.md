---
version: 1.1
name: Career Concierge — Donna Surface
description: "A near-black intelligence-layer surface built around a teal-accented dark canvas (#07161A). The system reads as 'system, not app' — sharp corners everywhere, a 4-step surface ladder for depth without shadows, Cormorant Garamond italic at 300–400 weight for Donna's editorial voice, IBM Plex Mono for all data/eyebrow/CTA labels, and Inter for card body copy. A single teal accent (#8DD9BF) appears in exactly three contexts: the 2px left border rule on cards, active state indicator dots, and accent eyebrow text. The ambient breathing field is atmospheric teal at ≤3% opacity — never used as a card surface. Backdrop-filter blur on cards requires ≥96% background opacity to prevent teal bleed. All corner radii are 0. Price never leads."

colors:
  # Canvas & Surface Ladder
  canvas:           "#07161A"
  surface-1:        "#0A1E24"
  surface-2:        "#0D2329"
  surface-3:        "#112B32"
  surface-4:        "#163238"
  # Hairlines
  hairline:         "#1A3640"
  hairline-mid:     "#22424A"
  hairline-strong:  "#2D5360"
  # Accent (3 contexts only)
  accent:           "#8DD9BF"
  accent-pulse:     "rgba(45, 197, 194, 0.03)"
  # Text
  text-primary:     "rgba(220, 231, 232, 0.92)"
  text-secondary:   "rgba(142, 163, 167, 0.72)"
  text-ghost:       "rgba(142, 163, 167, 0.32)"
  text-placeholder: "rgba(142, 163, 167, 0.28)"
  # Light mode (LoginView / public surfaces)
  canvas-light:     "#f4f1eb"
  surface-light:    "#fbf8f2"
  hairline-light:   "#d8d0c3"
  ink-light:        "#28211e"
  ink-light-muted:  "#6b6358"
  ink-light-ghost:  "#a09890"

typography:
  # Donna voice — editorial serif (Cormorant Garamond italic)
  donna-primary:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: 28px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.35
    letterSpacing: -0.3px
  donna-secondary:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: 22px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.4
    letterSpacing: -0.2px
  # Card content — editorial serif (non-italic titles)
  card-headline:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: 20px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.3
    letterSpacing: -0.3px
  # Body copy — Inter
  card-body:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: -0.1px
  card-body-sm:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: -0.05px
  # Data/eyebrow/CTA — IBM Plex Mono
  eyebrow:
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace"
    fontSize: 9px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.22em
    textTransform: uppercase
  eyebrow-mid:
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.24em
    textTransform: uppercase
  cta:
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.22em
    textTransform: uppercase
  price:
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace"
    fontSize: 9px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.22em
    textTransform: uppercase
    fontFeature: tnum
  data-label:
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace"
    fontSize: 9px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0
    fontFeature: tnum

rounded:
  none: 0px
  # All card and UI surfaces use rounded.none — 0px is theological on the Donna surface.
  # Only the light-mode module grid uses standard radii:
  card-light: 8px
  module-light: 12px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 48px
  # Card internals
  card-inner: 20px
  card-gap: 16px
  eyebrow-gap: 8px

motion:
  spring-materialize:
    type: spring
    stiffness: 260
    damping: 24
    mass: 0.9
  dissolve:
    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
    duration: 300ms
  scan-line:
    easing: linear
    duration: 1200ms
  stagger-chip: 80ms
  stagger-message: 120ms
  stagger-card: 80ms
  canvas-dissolve: 300ms
  donna-breathe: "4s ease-in-out infinite"
  donna-listen: "1.8s ease-in-out infinite"
  donna-think: "0.9s ease-in-out infinite"

components:
  a2ui-card:
    backgroundColor: "rgba(10, 30, 36, 0.96)"
    backdropFilter: "blur(8px)"
    borderRadius: 0
    border: "1px solid {colors.hairline-mid}"
    borderLeft: "2px solid {colors.accent}"
    padding: "{spacing.card-inner}"
    textColor: "{colors.text-primary}"
  a2ui-card-elevated:
    backgroundColor: "{colors.surface-2}"
    backdropFilter: none
    borderRadius: 0
    border: "1px solid {colors.hairline-mid}"
    borderLeft: "2px solid {colors.accent}"
    padding: "{spacing.card-inner}"
  a2ui-card-ghost:
    backgroundColor: "rgba(10, 30, 36, 0.40)"
    backdropFilter: "blur(4px)"
    borderRadius: 0
    border: "1px solid {colors.hairline}"
    padding: "{spacing.card-inner}"
  cta-primary:
    backgroundColor: transparent
    textColor: "{colors.text-primary}"
    border: "1px solid rgba(141, 217, 191, 0.70)"
    borderRadius: 0
    padding: "8px 16px"
    typography: "{typography.cta}"
    hoverBackground: "rgba(141, 217, 191, 0.08)"
  cta-ghost:
    backgroundColor: transparent
    textColor: "{colors.text-secondary}"
    border: "1px solid {colors.hairline-mid}"
    borderRadius: 0
    padding: "8px 16px"
    typography: "{typography.cta}"
    hoverBackground: "rgba(220, 231, 232, 0.05)"
  calibration-input:
    backgroundColor: "rgba(7, 22, 26, 0.60)"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.hairline-mid}"
    borderRadius: 0
    padding: "12px 14px"
    typography: "{typography.card-body}"
    focusBorder: "{colors.hairline-strong}"
  gap-table:
    gridTemplateColumns: "1fr 24px 1fr"
    borderTop: "1px solid {colors.hairline}"
    borderBottom: "1px solid {colors.hairline}"
    padding: "16px 0"
  gap-col-now-item:
    fontFamily: "{typography.card-headline.fontFamily}"
    fontStyle: italic
    fontSize: 15px
    color: "{colors.text-secondary}"
    opacity: 0.6
  gap-col-target-item:
    fontFamily: "{typography.card-headline.fontFamily}"
    fontStyle: italic
    fontSize: 15px
    color: "{colors.text-primary}"
    opacity: 1.0
  gap-price-teaser:
    typography: "{typography.price}"
    color: "{colors.text-ghost}"
    opacity: 0.55
  package-card:
    backgroundColor: "{colors.surface-1}"
    borderRadius: 0
    border: "1px solid {colors.hairline-mid}"
    padding: "{spacing.card-inner}"
  package-card-featured:
    backgroundColor: "{colors.surface-2}"
    borderRadius: 0
    border: "1px solid {colors.hairline-mid}"
    borderLeft: "2px solid {colors.accent}"
    padding: "{spacing.card-inner}"
  package-price-earned:
    typography: "{typography.price}"
    color: "{colors.text-ghost}"
    opacity: 0.45
    marginTop: 8px
    paddingTop: 12px
    borderTop: "1px solid {colors.hairline}"
  voice-panel:
    backgroundColor: "{colors.surface-2}"
    borderRadius: 0
    border: "1px solid {colors.hairline-mid}"
  donna-field:
    backgroundColor: "{colors.canvas}"
    ambientPulse: "{colors.accent-pulse}"
    breathPeak: 0.14

---

## Overview

Career Concierge renders on two surfaces: a dark intelligence layer (the Donna/canvas surface) and a warm light mode (the authenticated module grid). This document covers both, but the Donna surface is the primary design expression.

**The theological rule:** `border-radius: 0` everywhere on the Donna surface. Sharp corners say "system." Rounded corners say "product." The entire credibility of the A2UI experience depends on this distinction. No exceptions.

**The teal rule:** `#8DD9BF` appears in exactly three contexts:
1. 2px left border rule on `a2ui-card`
2. Active state indicator dot (listening state, live chip)
3. Accent eyebrow text only where signaling a system state

Everywhere else on the dark surface: `{colors.text-secondary}` or `{colors.text-ghost}`. Never use teal for hover backgrounds, CTA text, or card backgrounds.

**The blur rule:** Any card using `backdrop-filter: blur()` must have background-color opacity ≥ 0.96. Anything below 0.96 picks up the ambient teal breathing field through the card surface, causing teal bleed.

---

## Colors

### Canvas & Surface Ladder

The surface ladder carries hierarchy without shadows — lifted by one step, not by elevation.

| Token | Value | Use |
|---|---|---|
| `{colors.canvas}` | `#07161A` | Base field — Donna ambient background |
| `{colors.surface-1}` | `#0A1E24` | Default card background (when not using backdrop-filter) |
| `{colors.surface-2}` | `#0D2329` | Elevated cards, featured package |
| `{colors.surface-3}` | `#112B32` | Active inputs, hover states |
| `{colors.surface-4}` | `#163238` | Selected states, inline auth fields |

**Card background rule:** Use `rgba(10, 30, 36, 0.96)` for backdrop-blur cards (≥96% of surface-1). Use `{colors.surface-1}` for non-blur cards.

### Hairlines

Three tiers, no shadows. Hierarchy is carried by hairline weight.

| Token | Value | Use |
|---|---|---|
| `{colors.hairline}` | `#1A3640` | Subtle dividers, gap table rules |
| `{colors.hairline-mid}` | `#22424A` | Default card borders, input borders |
| `{colors.hairline-strong}` | `#2D5360` | Focus rings, active indicators |

### Accent

`{colors.accent}` (#8DD9BF) is a scarce signal. Three uses maximum per viewport.

`{colors.accent-pulse}` is the ambient breathing field intensity ceiling — never increase this value. The breathing animation peak must not exceed opacity 0.14.

### Text

| Token | Value | Use |
|---|---|---|
| `{colors.text-primary}` | `rgba(220, 231, 232, 0.92)` | All primary text — headlines, Donna messages |
| `{colors.text-secondary}` | `rgba(142, 163, 167, 0.72)` | Card body, supporting copy |
| `{colors.text-ghost}` | `rgba(142, 163, 167, 0.32)` | Eyebrow labels, price earned, deselected |
| `{colors.text-placeholder}` | `rgba(142, 163, 167, 0.28)` | Input placeholder text |

### Light Mode (LoginView & Module Grid)

| Token | Value | Use |
|---|---|---|
| `{colors.canvas-light}` | `#f4f1eb` | Warm off-white page canvas |
| `{colors.surface-light}` | `#fbf8f2` | Card / module surface |
| `{colors.hairline-light}` | `#d8d0c3` | Card borders on light |
| `{colors.ink-light}` | `#28211e` | Primary text on light |
| `{colors.ink-light-muted}` | `#6b6358` | Secondary text on light |
| `{colors.ink-light-ghost}` | `#a09890` | Ghost/disabled text on light |

---

## Typography

### Font Family

Three families. Each has a distinct role. No mixing within a context.

- **Cormorant Garamond** — Donna's editorial serif. Always italic on the dark surface. Always at weight 300–400. This is the intelligence layer voice — restrained, extreme contrast, luxury editorial. Fallback: `Georgia, serif`.
  - *Load:* `'Cormorant Garamond'` via Google Fonts at weights 300, 400 (italic variant required).
  
- **Inter** — Card body and all running copy. Weight 400 body, weight 500 for emphasis. Use with `font-feature-settings: "cv05", "cv11", "dlig"` for the character variants that distinguish it from default Inter. Fallback: `system-ui, -apple-system, sans-serif`.

- **IBM Plex Mono** — All data labels, eyebrows, CTAs, price lines. Weight 400–500. Always uppercase with 0.22em+ letter-spacing. Use `font-feature-settings: "tnum"` on any cell rendering a number or price. Fallback: `'SF Mono', monospace`.

### Hierarchy

| Token | Size | Weight | Style | Tracking | Use |
|---|---|---|---|---|---|
| `donna-primary` | 28px | 400 | italic serif | -0.3px | Donna's main message delivery |
| `donna-secondary` | 22px | 400 | italic serif | -0.2px | Donna secondary messages, reframes |
| `card-headline` | 20px | 400 | italic serif | -0.3px | A2UI card titles |
| `card-body` | 15px | 400 | normal Inter | -0.1px | Card body, descriptions |
| `card-body-sm` | 13px | 400 | normal Inter | -0.05px | Dense card content |
| `eyebrow` | 9px | 500 | mono uppercase | 0.22em | Section eyebrows, canvas state labels |
| `eyebrow-mid` | 10px | 500 | mono uppercase | 0.24em | Primary eyebrows, chip labels |
| `cta` | 10px | 500 | mono uppercase | 0.22em | CTA button text |
| `price` | 9px | 400 | mono uppercase | 0.22em | Price earned labels (use `tnum`) |
| `data-label` | 9px | 400 | mono | 0 | Data fields, timestamps (use `tnum`) |

### Principles

- **Cormorant italic is Donna's voice.** Never use it roman. The italic is the register.
- **Display size is 28px maximum.** If a sentence needs 30px+ to feel important, the sentence is the problem.
- **Eyebrows never go above 10px.** If it looks like a price tag, it's too large.
- **Negative tracking on serif.** Cormorant at -0.2px to -0.3px depending on size.
- **Positive tracking on mono.** Eyebrows at +0.22em to +0.24em — contrast against the serif marks them as system taxonomy.
- **`tnum` on every price and number.** Silence from the type; credibility from the columns.

### Font Loading (index.html)

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

Remove `Playfair Display` and `EB Garamond` from the loading stack. Cormorant Garamond replaces both.

---

## Layout & Spacing

### Spacing System

Base unit: 4px.

| Token | Value | Use |
|---|---|---|
| `spacing.xxs` | 4px | Micro gaps, icon padding |
| `spacing.xs` | 8px | Eyebrow-to-headline gap |
| `spacing.sm` | 12px | Input field padding |
| `spacing.md` | 16px | Card gap, grid gap |
| `spacing.lg` | 20px | Card inner padding |
| `spacing.xl` | 24px | Section padding top |
| `spacing.xxl` | 32px | Large card padding |
| `spacing.section` | 48px | Between canvas states |
| `spacing.card-inner` | 20px | Default A2UICard padding |
| `spacing.eyebrow-gap` | 8px | Distance from eyebrow to headline |

### Canvas Layout

The canvas is a single-column surface. The A2UI slot lives below the message thread. Both fill the same column.

- Message thread: scrollable, max-height `52vh`
- A2UI slot: fixed below thread, full width, `AnimatePresence` for transitions
- Donna field (ambient breathing background): full viewport, z-index behind everything

---

## Motion

### Timing Contract

| Token | Value | Use |
|---|---|---|
| `spring-materialize` | `stiffness: 260, damping: 24, mass: 0.9` | A2UICard entrance, chip appearance |
| `dissolve` | `ease-out 300ms` | A2UICard exit |
| `scan-line` | `linear 1200ms` | DNAProcessingCard progress |
| `stagger-chip` | `80ms` | Stagger between landing chips |
| `stagger-message` | `120ms` | Stagger between Donna message sentences |
| `stagger-card` | `80ms` | Stagger between package cards |
| `donna-breathe` | `4s ease-in-out infinite` | Idle ambient field pulse |
| `donna-listen` | `1.8s ease-in-out infinite` | Active listening pulse |
| `donna-think` | `0.9s ease-in-out infinite` | Processing pulse |

### Canvas Transition Sequence

1. `opacity: 0, scale: 0.97` over `dissolve` duration (300ms)
2. `canvasState` updates after 300ms delay
3. New component materializes via `spring-materialize`

### Anti-Regression: DonnaState ↔ CanvasState Independence

DonnaState (`idle | listening | thinking | speaking`) is self-resolving — never externally forced. CanvasState transitions fire on user action or Donna's tool calls — never on DonnaState changes.

---

## Components

### A2UICard (Primary)

The universal canvas card. Used for every A2UI component render.

```
background: rgba(10, 30, 36, 0.96)    ← ≥96% opacity to prevent teal bleed
backdrop-filter: blur(8px)
border: 1px solid #22424A              ← hairline-mid
border-left: 2px solid #8DD9BF        ← accent (one of three allowed uses)
border-radius: 0                       ← theological
padding: 20px
```

Entrance: `spring-materialize` (scale 0.96 → 1, opacity 0 → 1, y 12 → 0).
Exit: `ease-out 300ms` (opacity 1 → 0, scale 1 → 0.97).

**A2UICard Elevated** — use when canvas state is `surface-2` level (featured, revealed):
```
background: #0D2329                   ← surface-2 (no blur)
border-left: 2px solid #8DD9BF
```

**A2UICard Ghost** — use for deferred/secondary cards:
```
background: rgba(10, 30, 36, 0.40)
backdrop-filter: blur(4px)
border: 1px solid #1A3640             ← hairline (subtle)
```

### CTA Buttons

Zero radius. Monospaced. Arrow carries the energy.

**Primary CTA:**
```
border: 1px solid rgba(141, 217, 191, 0.70)
background: transparent
color: text-primary
padding: 8px 16px
font: eyebrow-mid (10px mono uppercase 0.22em)
hover: background rgba(141, 217, 191, 0.08)
```

**Ghost CTA:**
```
border: 1px solid hairline-mid
background: transparent
color: text-secondary
padding: 8px 16px
font: eyebrow-mid
hover: background rgba(220, 231, 232, 0.05)
```

### Calibration Input

```
background: rgba(7, 22, 26, 0.60)
border: 1px solid hairline-mid
border-radius: 0
padding: 12px 14px
font: card-body (15px Inter)
color: text-primary
placeholder-color: text-placeholder
focus-border: hairline-strong
```

### Gap Table

```
display: grid
grid-template-columns: 1fr 24px 1fr
border-top: 1px solid hairline
border-bottom: 1px solid hairline
padding: 16px 0
gap: 0
```

Gap items (NOW column): Cormorant italic 15px, `text-secondary` opacity 0.6
Gap items (TARGET column): Cormorant italic 15px, `text-primary`
Arrow column: `text-accent` 14px, opacity 0.5, center-aligned, padding-top 28px

### Package Cards

```
background: surface-1
border: 1px solid hairline-mid
border-radius: 0
padding: card-inner (20px)
```

Featured card:
```
background: surface-2
border-left: 2px solid accent   ← accent (third allowed use, alongside left-rule and active dot)
```

Price earned (last element, always):
```
font: price (9px mono tnum uppercase 0.22em)
color: text-ghost
opacity: 0.45
margin-top: 8px
padding-top: 12px
border-top: 1px solid hairline
```

### Eyebrow Pattern

```
font: eyebrow (9px mono uppercase 0.22em)
color: text-secondary OR text-ghost
```

Use `text-ghost` (not accent) for most eyebrows. Reserve accent-colored eyebrows for active system states only (e.g., "SC. 01 · CALIBRATION" when that is the active state).

---

## Do's and Don'ts

### Do

- Maintain `border-radius: 0` on every surface touched by the Donna canvas.
- Keep card background opacity ≥ 0.96 on any card using `backdrop-filter: blur()`.
- Restrict teal (`#8DD9BF`) to exactly: left card border, active state dot, one accent eyebrow per active state.
- Use Cormorant Garamond italic for all Donna messages and card headlines.
- Use IBM Plex Mono for all eyebrows, CTAs, and price labels.
- Apply `font-feature-settings: "tnum"` on every element containing a price or number.
- Keep the ambient pulse at `rgba(45, 197, 194, 0.03)` and breath peak at ≤ 0.14 opacity.
- Define canvas transitions by calling `handleCanvasTransition(state)` — never by directly setting `canvasState`.
- Use the 4-step surface ladder for depth before reaching for shadows.

### Don't

- Don't use teal as a hover background or button text outside the three allowed contexts.
- Don't use `rgba(13, 35, 41, 0.8)` or any card opacity below 0.96 — it causes teal bleed.
- Don't lead with price. `package_selection` must always follow `gap_reveal`.
- Don't open intake, briefs, or plans as modals — always `renderMode: 'inline'` or wrapped in `A2UICard`.
- Don't couple canvas transitions to DonnaState changes.
- Don't use `openModuleById()` as a primary CTA action from the Donna surface.
- Don't use Playfair Display or EB Garamond — Cormorant Garamond replaces both on the Donna surface.
- Don't round any corner on the dark surface, for any reason.
- Don't increase `--donna-accent-pulse` above `rgba(45, 197, 194, 0.03)`.
- Don't put a price anywhere before `gap_reveal` state.

---

## Canvas States & Component Map

| Canvas State | Component | Notes |
|---|---|---|
| `landing` | Chips / WikiCard | Journey A: 3 chips. Journey B: wiki section cards |
| `donna_reads_you` | DonnaReadsYouCard | Calibration question + inline text input |
| `gap_reveal` | GapRevealCard | Two-column gap + price teaser + CTAs |
| `package_selection` | PackageSelectCards | 3 cards, earned pricing last |
| `intake_inline` | InlineIntakeSection | IntakeFlow rendered inline, never modal |
| `dna_processing` | DNAProcessingCard | Scan-line progress, `linear` timing |
| `dna_reveal` | DNARevealCard | Brief excerpt + optional account creation |
| `plan_active` | ArtifactExcerptCard | Plan artifact condensed |
| `concierge_sync` | VoicePanel | GeminiLivePanel or ElevenLabsConvaiPanel inline |

---

## Light Mode (LoginView & Module Grid)

The light surface uses a warm parchment palette — not white, not cream. `#f4f1eb` is the page canvas.

Key divergences from dark surface:
- `border-radius: 8px` on module cards (sharp edges read wrong on light)
- Teal accent held at same values — `#8DD9BF` and `#5faf95` (dark teal)
- Body font: Inter (same as dark)
- Editorial font: Cormorant Garamond (same, but roman — not italic — for headlines on light)
- Module cards: `{colors.surface-light}` background with `{colors.hairline-light}` borders

---

## Anti-Regression Checklist

Before shipping any canvas change, verify:

- [ ] `border-radius: 0` on all dark surface components
- [ ] Card background opacity ≥ 0.96 on any blur card
- [ ] Teal accent appears in ≤ 3 places visible at once
- [ ] Ambient pulse value at `rgba(45, 197, 194, 0.03)` or lower
- [ ] No modal opens from a Donna canvas CTA
- [ ] Price not visible before `gap_reveal` state
- [ ] Canvas transitions go through `handleCanvasTransition()`, never direct state sets
- [ ] DonnaState and CanvasState are not coupled
- [ ] All price labels use `font-feature-settings: "tnum"`
- [ ] Donna messages in Cormorant Garamond italic, not Playfair or EB Garamond

---

## Implementation Reference

- Component: `components/A2UICard.tsx`
- Component: `components/DonnaChatLane.tsx`
- Types: `types.ts` — `CanvasState`, `A2UIComponentType`
- Protocol: `docs/a2ui-protocol.md`
- Presale arc: `docs/agent-handoff-presale-arc.md`
- Voice rubric: `api/prompts/conciergeRom.js` — `DONNA_VOICE_RUBRIC`
- Agent playbook: `~/.antigravity/agent-playbooks/third-signal/A2UI_CANVAS_ENGINE.md`

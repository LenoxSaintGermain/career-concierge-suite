# Agent Handoff: Pre-Sale Sizzle Arc

> **Scope:** This document covers ONLY the pre-sale sizzle sequence additions to Journey A. It is a supplement to `docs/agent-handoff-a2ui.md` — read that document first. Do not re-implement anything already defined there. Do not touch Journey B.
>
> **Working directory:** `/Users/lenoxparis/conductor/workspaces/Signal-Atlas/atlanta`
>
> **Design reference HTML:** `16-donna-surface.html` — use for visual token reference ONLY. CSS tokens, animation patterns, card architecture. Do not copy the specific content or component names from that file.
>
> **Spec authority:** `docs/content-spec.md` sections I (Journey A). This file translates those spec entries into implementation instructions.

---

## What This Adds

Three new canvas states that sit between `landing` and the existing `package_selection`:

```
landing → donna_reads_you → gap_reveal → package_selection (updated)
```

The existing `package_selection` step is also updated — package cards now render with earned pricing (price appears last, at ghost opacity, after value copy).

---

## The Principle — Do Not Lose This

The user lands from an ad or marketing channel. They do not know the price yet. They should not know the price until Donna has:

1. Named their situation back to them (the calibration question)
2. Made the gap between now and target concrete (the gap card)
3. Framed price as "the cost of closing this gap" (the price teaser on the gap card)

By the time they see `$2.4K` on a package card, they have already agreed that the gap is real. The price is the answer to a question they already accepted. This is the Sutherland posture applied to conversion.

---

## Canvas State Additions

Add these to the `CanvasState` type in `DonnaChatLane.tsx`:

```tsx
type CanvasState =
  | 'landing'
  | 'donna_reads_you'   // ADD: calibration question card
  | 'gap_reveal'        // ADD: from here to here card
  | 'package_selection'
  | 'intake_inline'
  | 'dna_processing'
  | 'dna_reveal'
  | 'plan_active'
  | 'concierge_sync';
```

---

## Task 1 — `donna_reads_you` State in `DonnaChatLane.tsx`

### When it triggers

Every Journey A landing chip resolves to `donna_reads_you`. The existing chip responses in the spec remain (Donna responds inline in the message thread), but after the response:

```tsx
// After Donna's message animates in (use a short delay — ~1400ms after last sentence):
handleCanvasTransition('donna_reads_you');
```

All three chips trigger this transition. The message thread continues to show the exchange. `donna_reads_you` renders in the A2UI slot below — it does not replace the message thread.

### What renders in the A2UI slot

One `A2UICard` containing:

```tsx
// DonnaReadsYouCard — render inline in the A2UI slot

<A2UICard delay={0}>
  <div className="card-eyebrow">SC. 01 · CALIBRATION</div>
  <div className="card-headline">
    What's the gap you're trying to close?
  </div>
  <div className="card-body">
    The title. The comp. The narrative. Name it your way.
  </div>

  {/* Inline text input — NOT a separate component */}
  <div className="calibration-input-wrap">
    <input
      type="text"
      className="calibration-input"
      placeholder="Type your answer..."
      value={calibrationAnswer}
      onChange={e => setCalibrationAnswer(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleCalibrationSubmit()}
      autoFocus
    />
    <button
      className="card-cta card-cta--primary"
      onClick={handleCalibrationSubmit}
      disabled={!calibrationAnswer.trim()}
    >
      CONTINUE <span className="card-cta-arrow">→</span>
    </button>
  </div>
</A2UICard>
```

State needed:
```tsx
const [calibrationAnswer, setCalibrationAnswer] = useState('');
```

### `handleCalibrationSubmit`

```tsx
const handleCalibrationSubmit = () => {
  if (!calibrationAnswer.trim()) return;

  // 1. Send calibration answer to Donna message thread
  //    (same path as a regular user message — adds to messages array)
  sendUserMessage(calibrationAnswer);

  // 2. Donna responds with a reframe (LLM call — see system instruction note below)
  //    After Donna's response animates: transition to gap_reveal
  //    Use the same pattern as chip responses — wait for Donna message to complete
  handleCanvasTransition('gap_reveal');
};
```

**System instruction note for Donna's calibration response:** Donna's LLM call should receive the user's calibration answer and return a 1–2 sentence reframe following the posture patterns in `docs/content-spec.md` section I. The reframe ends with: "Here's where that puts you." This is the bridge to `gap_reveal`.

---

## Task 2 — Create `components/GapRevealCard.tsx`

New file. Props:

```tsx
interface GapRevealCardProps {
  userSituation: string;       // Derived from calibration answer (or fallback)
  onProceed: () => void;       // → package_selection
  onNotYet: () => void;        // Sends "Tell me more" to Donna thread
}
```

### Deriving `userSituation`

Pass the `calibrationAnswer` string from DonnaChatLane state. In the card, parse it into a brief label (first 60 chars + "...") or use as-is if short. If empty or too vague, fall back to the generic left column.

### Layout

Full-width `A2UICard`. Inner layout:

```tsx
<A2UICard delay={0} className="gap-reveal-card">
  {/* Eyebrow */}
  <div className="card-eyebrow">POSITIONING DELTA</div>

  {/* Two-column gap table */}
  <div className="gap-table">
    <div className="gap-col gap-col--now">
      <div className="gap-col-label">WHERE YOU ARE</div>
      <div className="gap-col-items">
        {/* Populated from calibrationAnswer read, or fallback: */}
        <span>Invisible positioning</span>
        <span>Unquantified value</span>
        <span>No strategic narrative</span>
      </div>
    </div>

    <div className="gap-arrow">→</div>

    <div className="gap-col gap-col--target">
      <div className="gap-col-label">WHERE THIS GETS YOU</div>
      <div className="gap-col-items">
        <span>Named, sourced, deployed positioning</span>
        <span>Comp-leveled professional brief</span>
        <span>Live concierge access</span>
        <span>Ongoing strategic alignment</span>
      </div>
    </div>
  </div>

  {/* Donna's framing line */}
  <div className="gap-donna-line">
    The gap between these two things has a number.
    It's smaller than you think.
  </div>

  {/* Price teaser — ghost, not headline */}
  <div className="gap-price-teaser">
    ONE SESSION FROM $2.4K · FULL SUITE FROM $6K
  </div>

  {/* Actions */}
  <div className="card-actions">
    <button className="card-cta card-cta--primary" onClick={onProceed}>
      SHOW ME HOW <span className="card-cta-arrow">→</span>
    </button>
    <button className="card-cta card-cta--ghost" onClick={onNotYet}>
      NOT YET
    </button>
  </div>
</A2UICard>
```

### CSS for gap card elements

Add to your stylesheet (follows existing token system):

```css
.gap-reveal-card .a2ui-card-inner { gap: 20px; }

.gap-table {
  display: grid;
  grid-template-columns: 1fr 24px 1fr;
  align-items: start;
  gap: 0;
  padding: 16px 0;
  border-top: 1px solid var(--donna-border-subtle);
  border-bottom: 1px solid var(--donna-border-subtle);
}

.gap-col { display: flex; flex-direction: column; gap: 10px; }

.gap-col-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--donna-text-ghost);
  margin-bottom: 4px;
}

.gap-col--now .gap-col-items span {
  font-family: var(--font-editorial);
  font-style: italic;
  font-size: 15px;
  color: var(--donna-text-secondary);
  opacity: 0.6;
  display: block;
  line-height: 1.5;
}

.gap-col--target .gap-col-items span {
  font-family: var(--font-editorial);
  font-style: italic;
  font-size: 15px;
  color: var(--donna-text-primary);
  display: block;
  line-height: 1.5;
}

.gap-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--donna-accent);
  font-size: 14px;
  opacity: 0.5;
  padding-top: 28px;
}

.gap-donna-line {
  font-family: var(--font-editorial);
  font-style: italic;
  font-size: 17px;
  color: var(--donna-text-primary);
  line-height: 1.4;
}

.gap-price-teaser {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--donna-text-ghost);
  opacity: 0.55;
}
```

---

## Task 3 — Wire `gap_reveal` State into DonnaChatLane A2UI Slot

In the existing A2UI slot JSX (from `agent-handoff-a2ui.md` Task 1.2):

```tsx
{/* A2UI Slot */}
<div className="a2ui-slot">
  <AnimatePresence mode="wait">
    {canvasState === 'donna_reads_you' && (
      <DonnaReadsYouCard
        key="donna-reads-you"
        calibrationAnswer={calibrationAnswer}
        setCalibrationAnswer={setCalibrationAnswer}
        onSubmit={handleCalibrationSubmit}
      />
    )}
    {canvasState === 'gap_reveal' && (
      <GapRevealCard
        key="gap-reveal"
        userSituation={calibrationAnswer}
        onProceed={() => handleCanvasTransition('package_selection')}
        onNotYet={() => {
          sendUserMessage('Tell me more about what\'s involved');
          // Canvas stays at gap_reveal — Donna responds in thread
        }}
      />
    )}
    {canvasState === 'package_selection' && (
      <PackageSelectCards
        key="package-select"
        onSelect={(packageId) => handleCanvasTransition('intake_inline')}
      />
    )}
    {/* ... existing intake_inline, dna_processing, dna_reveal ... */}
  </AnimatePresence>
</div>
```

---

## Task 4 — Update `PackageSelectCards.tsx` — Earned Pricing

Update the existing `PackageSelectCards` component (per `agent-handoff-a2ui.md` Task 2.1) to include price as the last element on each card:

```tsx
// Card structure — add price as final element in A2UICard inner content:

// After the CTA button, add:
<div className="pkg-price-earned">
  {card.priceLabel}  {/* e.g. "ONE SESSION · $2.4K" */}
</div>
```

CSS:
```css
.pkg-price-earned {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--donna-text-ghost);
  opacity: 0.45;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--donna-border-faint);
}
```

Price labels per card:
- Smart Start: `ONE SESSION · $2.4K`
- Premier: `90 DAYS · FROM $6K`
- CJS: `PLACEMENT STRATEGY · CUSTOM`

**The price is ambient information — it should be readable but not prominent. If a user has to squint slightly to see it, that is correct.**

---

## Task 5 — Scene Rail Advance Update

Add Scene 02 advance on `donna_reads_you` entry (Scene 02 was previously triggered on first message send — this is the same intent):

```tsx
// In handleCanvasTransition or wherever scene is managed:
if (next === 'donna_reads_you') setScene('calibration');
if (next === 'gap_reveal' || next === 'package_selection') setScene('co_design');
```

---

## Verification — Pre-Sale Arc

Before calling this done, verify the full sizzle sequence manually:

1. **Load unauthenticated** → 3 chips visible, no price anywhere on screen
2. **Click "I'm ready to begin"** → Donna message response renders; after ~1400ms: `donna_reads_you` card appears in slot with question + input
3. **Type an answer, press Enter** → Answer renders as user message in thread; Donna responds with reframe in thread; `gap_reveal` card materializes in slot
4. **Gap reveal card** → Two columns visible; price teaser at bottom (`ONE SESSION FROM $2.4K`) is ghost/small — NOT large or accented; `SHOW ME HOW →` CTA present
5. **Click SHOW ME HOW →** → Gap card dissolves; 3 package cards materialize with 80ms stagger
6. **Package cards** → Price is the LAST thing on the card, monospaced small ghost text; NOT a headline; NOT accent color
7. **Click any package CTA** → Intake mounts inline (per existing `agent-handoff-a2ui.md` spec)

### Anti-pattern checks specific to this arc:
- [ ] Price never visible before `gap_reveal` state
- [ ] `donna_reads_you` never skipped — even "I'm ready to begin" goes through it
- [ ] Calibration card input is NOT a form — it is one question
- [ ] Gap reveal left column is dynamic (from calibration answer) not hardcoded
- [ ] Price on package cards is ghost opacity — if it looks like a price tag, it is too prominent

---

## What You Must Not Touch

Everything listed in `agent-handoff-a2ui.md` under "What Already Exists — Do Not Touch or Rewrite" applies here too. Additionally:

- Do not change the existing chip response copy (the Donna message thread responses for "I'm exploring", "Tell me what this is" remain as defined in `content-spec.md`)
- Do not change the `intake_inline`, `dna_processing`, or `dna_reveal` states — this arc only touches what comes before them
- Do not modify Journey B (authenticated flow) — this arc is Journey A only

---

## Files Modified / Created

| Action | File | Notes |
|---|---|---|
| Extend | `components/DonnaChatLane.tsx` | Add `donna_reads_you`, `gap_reveal` to `CanvasState` type; add `calibrationAnswer` state; add `handleCalibrationSubmit`; wire slot renders |
| Create | `components/GapRevealCard.tsx` | New file — two-column gap card with price teaser |
| Extend | `components/PackageSelectCards.tsx` | Add `pkg-price-earned` element to each card |
| CSS only | Wherever your styles live | Gap table layout classes (listed above) |

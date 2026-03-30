# Intake Voice-First Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 4-screen paginated intake flow with a single-viewport, voice-first experience that pre-populates from Firestore data and requires zero scrolling.

**Architecture:** One full-height flex column: top half is voice CTA + Donna panel, bottom half is a compact inline form with all fields visible. ElevenLabs is the only voice lane (remove Gemini Live toggle). Remove admin speed-run section. Auto-populate from `client.intake.answers` and `client.demo_profile` on mount. Ghost tools continue to work — they just target a flat field layout instead of paginated screens.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, @elevenlabs/react SDK, existing `useGhostVoice` hook

---

## Constraints

- **Zero scroll on desktop.** The entire intake fits in `100dvh` minus the modal header (~48px).
- **No admin-only UI.** Remove `renderOperatorSpeedRun`, the voice lane picker, and the `isAdminUser` branching.
- **ElevenLabs only.** Remove `GeminiLivePanel` import and all `voiceLaneChoice` / `gemini_live` logic. The Gemini path is backlogged.
- **Pre-populate on mount.** If `client.intake.answers` or `client.demo_profile` exists, seed all fields immediately.
- **Preserve all Ghost tool callbacks.** The 16 client tools must continue to work — they write into the same `answers` state.
- **Preserve submission logic.** `submitWithPayload()`, `normalizeAnswersForSubmission()`, artifact generation, and `onComplete` callback stay as-is.
- **Keep `intakeTheme` CSS vars.** Reuse existing palette — no new colors.

## Field Layout

All 18 SMART_START_FIELDS + intent + pace + focus rendered in a single compact form. Group into 3 visual columns on desktop:

| Column 1: Direction | Column 2: Context | Column 3: Calibration |
|---------------------|--------------------|-----------------------|
| Intent (3 radio pills) | Current title | AI usage frequency |
| Target job title | Industry | Enterprise AI context |
| Target salary | Job description (2-line textarea) | Foundational interests |
| Comp level (select) | Resume source | Advanced interests |
| Outcome goals (chips) | Bio alignment (toggle) | Learning modalities |
| Benefits timing | Target direction | Pressure breaks |
| Suite feel (chips) | Constraints | Work style |
| | | Pace + Focus (chips) |

Fields use compact height: `py-1.5` inputs, `text-xs` labels, `gap-2` spacing.

---

### Task 1: Strip IntakeFlow to Shell

**Files:**
- Modify: `components/IntakeFlow.tsx`

**Step 1: Remove dead imports and state**

Remove these imports:
- `GeminiLivePanel`
- `HeroVideoSection`
- `DNAProgressIndicator`, `DnaProgressStage`

Remove these state variables:
- `step` (no more pagination — hardcode to a single render)
- `voiceLaneChoice` (ElevenLabs only)
- `progressStages` (plating animation moves to a simple spinner)
- `voicePanelOpen` (voice is always visible)

Remove these render sections:
- `renderOperatorSpeedRun`
- `renderScreenOne()`, `renderScreenTwo()`, `renderScreenThree()`, `renderScreenFour()`
- `renderNavigation()`
- `renderVoiceRail` (replaced by inline voice zone)
- `HeroVideoSection` block
- The dark header bar (`Professional DNA · Module 01/18`)
- The headline section (`A concierge conversation, tailored to you.`)

Keep:
- All state: `intent`, `answers`, `pace`, `focus`, `busy`, `error`, `voiceSessionState`, `voiceError`, `voiceAutofillBusy`
- All Ghost callback logic (`ghostCallbacks` useMemo)
- `ghostSessionContext` useMemo (simplify: remove screen-based field filtering since there's only one screen now)
- `submitWithPayload()`, `submit()`, `speedRunProfileSubmit()`
- `buildProfileAutofillState()`, `applyProfileAutofill()`, `mergeVoiceExtractedFields()`
- `handleVoiceSessionComplete()`
- All field helper functions: `readText`, `readList`, `readBool`, `setText`, `setList`, `toggleList`, `isValueFilled`
- `FieldShell` and `ChipGroup` sub-components (but compact them — see Task 3)

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds (may have unused variable warnings — that's fine)

**Step 3: Commit**

```bash
git add components/IntakeFlow.tsx
git commit -m "intake: strip to shell — remove pagination, admin UI, Gemini lane"
```

---

### Task 2: Auto-Populate on Mount

**Files:**
- Modify: `components/IntakeFlow.tsx`

**Step 1: Add useEffect to seed answers from client data**

At the top of the component body (after state declarations), add:

```tsx
// Auto-populate from Firestore on mount
useEffect(() => {
  if (!hasAutofillSource) return;
  applyProfileAutofill(undefined, true);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

This calls `applyProfileAutofill` with `onlyEmpty = true` so it fills only blank fields, preserving any user edits.

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add components/IntakeFlow.tsx
git commit -m "intake: auto-populate fields from Firestore on mount"
```

---

### Task 3: Compact FieldShell and ChipGroup

**Files:**
- Modify: `components/IntakeFlow.tsx`

**Step 1: Shrink FieldShell spacing**

Change `FieldShell` inner div `gap-3` → `gap-1`. Change label font size from `text-[9px]` to `text-[8px]`. Remove `helper` prop rendering (not used in compact layout).

**Step 2: Shrink ChipGroup**

Change chip padding from `px-3 py-2` to `px-2 py-1`. Change text from `text-xs` to `text-[10px]`.

**Step 3: Shrink inputBaseClass**

Change `px-4 py-3` → `px-2.5 py-1.5`. Change `text-sm` → `text-xs`.

**Step 4: Run build**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add components/IntakeFlow.tsx
git commit -m "intake: compact field shells and inputs for single-viewport layout"
```

---

### Task 4: Build Voice-First Layout

**Files:**
- Modify: `components/IntakeFlow.tsx`

**Step 1: Replace the return statement with the new layout**

The new layout is a single flex column filling the viewport:

```tsx
return (
  <div
    className="flex h-[calc(100dvh-48px)] flex-col bg-[var(--intake-bg)]"
    style={intakeTheme}
  >
    {/* ── Top: Voice Zone ── */}
    <div className="flex flex-shrink-0 flex-col items-center justify-center border-b border-[var(--intake-border)] bg-[var(--intake-dark)] px-4 py-4 text-center"
         style={{ minHeight: voiceSessionState === 'connected' ? '45%' : '140px' }}>
      {voiceSessionState === 'idle' ? (
        <>
          <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal)]">
            Smart Start
          </div>
          <div className="mt-2 font-intake-body text-xl font-medium text-[#F5F2EA]">
            {clientGreeting}
          </div>
          <div className="mt-1 font-intake-body text-sm text-[var(--intake-muted-light)]">
            Talk to Donna to fill this out — or type below.
          </div>
        </>
      ) : null}

      <div className={voiceSessionState === 'idle' ? 'mt-3 w-full max-w-md' : 'w-full max-w-2xl'}>
        <ElevenLabsConvaiPanel
          agentId={props.voiceConfig.elevenlabs_agent_id}
          userUid={props.uid}
          sessionContext={ghostSessionContext}
          ghostCallbacks={ghostCallbacks}
          onStateChange={(state) =>
            setVoiceSessionState(
              state === 'connected' ? 'connected'
                : state === 'connecting' ? 'connecting'
                : state === 'error' ? 'error'
                : 'idle'
            )
          }
        />
      </div>

      {voiceError ? (
        <div className="mt-2 text-xs text-[#F5D7C1]">{voiceError}</div>
      ) : null}
    </div>

    {/* ── Bottom: Compact Form ── */}
    <div className="flex-1 overflow-y-auto px-4 py-3 md:overflow-hidden">
      {error ? (
        <div className="mb-2 border border-[var(--intake-amber)] bg-[#F4E8DA] px-3 py-2 text-xs text-[#6E4318]">
          {error}
        </div>
      ) : null}

      {renderCompactForm()}

      <div className="mt-3 flex items-center justify-end gap-3">
        <button type="button" onClick={submit} disabled={busy || voiceAutofillBusy} className={primaryButtonClass}>
          {busy ? 'Preparing...' : 'Generate My Suite'}
        </button>
      </div>
    </div>

    {/* ── Plating overlay ── */}
    {step === 'plating' ? (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--intake-dark)]">
        <div className="font-intake-mono text-[9px] uppercase tracking-[0.18em] text-[var(--intake-teal)]">
          Preparing your suite
        </div>
        <div className="mt-3 h-1 w-48 overflow-hidden rounded bg-[var(--intake-border-dark)]">
          <div className="h-full animate-pulse rounded bg-[var(--intake-teal)]" style={{ width: '60%' }} />
        </div>
      </div>
    ) : null}
  </div>
);
```

Where `clientGreeting` is a derived value:

```tsx
const clientDisplayName = props.client?.display_name
  || props.client?.demo_profile?.name
  || '';
const clientGreeting = clientDisplayName
  ? `Welcome back, ${clientDisplayName}.`
  : 'Let\u2019s get started.';
```

**Step 2: Build `renderCompactForm()`**

A 3-column grid with all fields inline. This replaces the 4 render functions:

```tsx
const renderCompactForm = () => (
  <div className="grid gap-x-4 gap-y-2 md:grid-cols-3">
    {/* Column 1: Direction */}
    <div className="flex flex-col gap-2">
      <div className={fieldLabelClass}>Direction</div>
      <div className="flex gap-1.5">
        {CLIENT_INTENTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setIntent(option)}
            className={`flex-1 border px-1.5 py-1 text-center font-intake-mono text-[8px] uppercase tracking-[0.1em] transition-colors ${
              option === intent
                ? 'border-[var(--intake-teal)] bg-[var(--intake-teal-bg)] text-[var(--intake-teal-dim)]'
                : 'border-[var(--intake-border)] text-[var(--intake-muted)] hover:border-[var(--intake-teal)]'
            }`}
          >
            {INTENT_COPY[option].label.split(' ').slice(0, 3).join(' ')}
          </button>
        ))}
      </div>

      {/* remaining Column 1 fields using compact FieldShells */}
    </div>

    {/* Column 2: Context */}
    <div className="flex flex-col gap-2">
      {/* Column 2 fields */}
    </div>

    {/* Column 3: Calibration */}
    <div className="flex flex-col gap-2">
      {/* Column 3 fields */}
    </div>
  </div>
);
```

Each field uses the compact `FieldShell` from Task 3. Text inputs use single-line `py-1.5 text-xs`. Multi-selects use compact chips. `job_description` textarea uses `rows={2}` with overflow.

**Step 3: Simplify `ghostSessionContext`**

Remove screen-based field filtering. The context now sends all fields since there's only one view:

```tsx
const ghostSessionContext = useMemo(() => {
  const allFieldLabels = SMART_START_FIELDS.slice(0, 8)
    .map((f) => `${f.id}: ${f.label}`)
    .join(' | ');
  return [
    'Smart Start Intake context is active.',
    summarizeGhostIntakeState(),
    `Visible fields: ${allFieldLabels}.`,
    `Use intake tools to set values and summarize state. Never invent values; prefer asking one clarifying question.`,
  ].join(' ');
}, [summarizeGhostIntakeState]);
```

**Step 4: Simplify `summarizeGhostIntakeState`**

Remove step label logic (no more steps):

```tsx
const summarizeGhostIntakeState = () => {
  const filledFields = Object.entries(answers)
    .filter(([key, value]) => key !== 'voice_extracted_fields' && isValueFilled(value))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .slice(0, 12);
  return [
    `Intent: ${intent}. Pace: ${pace}. Focus: ${focus}.`,
    filledFields.length ? `Captured: ${filledFields.join(' | ')}.` : 'No fields captured yet.',
  ].join(' ');
};
```

**Step 5: Keep `step` state but only for `plating` and `done`**

Change type to: `type Step = 'active' | 'plating' | 'done';`
Default to `'active'`. The form is visible when `step === 'active'`.

**Step 6: Remove `jump_intake_screen` from Ghost callbacks**

Since there are no screens to jump between, `onJumpIntakeScreen` should return a no-op message:

```tsx
onJumpIntakeScreen: () => 'Intake is a single view. All fields are visible.',
```

**Step 7: Run build**

Run: `npm run build`
Expected: PASS

**Step 8: Commit**

```bash
git add components/IntakeFlow.tsx
git commit -m "intake: voice-first single-viewport layout with compact 3-column form"
```

---

### Task 5: Remove Dead Code

**Files:**
- Modify: `components/IntakeFlow.tsx`
- Modify: `components/ElevenLabsConvaiPanel.tsx` (if needed)
- Delete: `components/GeminiLivePanel.tsx` (if it exists and is only used here)
- Delete: `components/HeroVideoSection.tsx` (if only used here)
- Delete: `components/DNAProgressIndicator.tsx` (if only used here)

**Step 1: Check if removed components are used elsewhere**

Run: `grep -r "GeminiLivePanel\|HeroVideoSection\|DNAProgressIndicator" --include="*.tsx" --include="*.ts" -l`

Only delete files that are exclusively imported by IntakeFlow.

**Step 2: Remove `voicePanelOpen` toggle logic from ElevenLabsConvaiPanel**

The panel is now always visible — no need for open/close toggling. If `ElevenLabsConvaiPanel` has internal show/hide logic driven by a prop, simplify.

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "intake: remove dead Gemini, Hero, and DNAProgress components"
```

---

### Task 6: Responsive Mobile Fallback

**Files:**
- Modify: `components/IntakeFlow.tsx`

**Step 1: Add mobile breakpoint handling**

On mobile (`md:` breakpoint), the 3-column grid collapses to 1 column with overflow-y-auto on the form section:

```tsx
<div className="flex-1 overflow-y-auto px-4 py-3 md:overflow-hidden">
```

This means mobile users CAN scroll (unavoidable with 18 fields on a phone), but desktop users see everything in one viewport.

**Step 2: Voice zone collapses on mobile**

On mobile, the voice zone should be a fixed-height bar with just the "Talk to Donna" button, not the full panel. When connected, it expands.

```tsx
<div className="flex flex-shrink-0 ... py-4 md:py-6"
     style={{ minHeight: voiceSessionState === 'connected' ? '45%' : '100px' }}>
```

**Step 3: Run build and verify**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add components/IntakeFlow.tsx
git commit -m "intake: responsive mobile fallback with scrollable form"
```

---

### Task 7: Deploy and Verify

**Files:** None (deployment only)

**Step 1: Build**

Run: `npm run build`
Expected: PASS, no errors

**Step 2: Deploy UI**

```bash
gcloud run deploy career-concierge-suite \
  --region=europe-west1 \
  --source=/Users/lenoxparis/conductor/workspaces/Signal-Atlas/atlanta \
  --project=ssai-f6191 --quiet
```

**Step 3: Hard-refresh and verify**

1. Open prod URL
2. Navigate to Intake
3. Confirm: single viewport, no scroll on desktop
4. Confirm: voice CTA is prominent, starts ElevenLabs session
5. Confirm: fields pre-populated from Firestore
6. Confirm: Ghost tools still work (set_intake_text_field, etc.)
7. Confirm: "Generate My Suite" button submits correctly

**Step 4: Final commit with deploy tag**

```bash
git add -A
git commit -m "intake: voice-first redesign deployed and verified"
```

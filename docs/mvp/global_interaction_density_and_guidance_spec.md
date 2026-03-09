# Global Interaction Density and Guidance Spec

## Intent

The OS should behave like a cinematic editorial screen, not a document. If key context is more than one viewport away, the shell is failing. The interface must bring the right information forward, reduce wasted pixels, and reveal guidance only when the user pauses long enough to need it.

## Operating Rules

### 1. Viewport-first density

- Default assumption: the first useful action and the first proof of state must land inside the first viewport on laptop screens.
- Modal shell chrome must stay below `20%` of viewport height on desktop and below `16%` once the user begins scrolling.
- Mobile and tablet must prioritize content over shell language; decorative framing retreats first.
- Repeated explanatory copy is never persistent if it pushes the active task below the fold.

### 2. Dynamic modal port

- The modal is a content stage, not a stacked dashboard.
- Use a compact editorial header with inline context chips rather than large stacked panels.
- Secondary metadata should collapse into:
  - floating controls
  - ambient guide triggers
  - inline status chips
- Content regions should prefer:
  - `1` column on mobile
  - `2` balanced columns on tablet when content benefits from pairing
  - `2-3` adaptive columns on desktop for square or near-square cards
- Long horizontal strips should be converted into compact cards when they force extra scrolling without increasing comprehension.

### 3. Information hierarchy

- The current task, current state, and next action must be visible before supporting context.
- Related modules, provenance, account details, and explanatory framing are supporting context. They should be compact, hover-revealed, or scroll-dismissed.
- Only one dominant narrative block is allowed per surface.
- Metrics should be short, numeric, and scannable. Large prose blocks belong in the guide layer, not the permanent shell.

## Ambient Guide Layer

### Behavior

- Ambient guidance appears when the user pauses on a control or context chip for `650-800ms`.
- The guide fades up from the background with a slight vertical drift and blur-clear transition.
- It should feel conversational, precise, and quiet, not like help-center UI.
- Only one guide should be visible at a time.
- Guides dismiss immediately on pointer leave, blur, scroll, or direct action.

### Copy rules

- One short label.
- One concise sentence.
- Explain what is happening or why the control matters.
- Never repeat the visible label verbatim unless needed for clarity.

### Visual rules

- Warm paper or smoked-glass panel.
- Thin hairline border.
- Soft shadow, not popover chrome.
- No arrows or cartoon callouts.
- No persistent onboarding coach marks unless explicitly triggered.

## Motion Rules

- Entrance fade: `180-260ms`
- Guidance drift: `6-10px`
- Modal header collapse: `320-520ms`
- No bounce, elastic easing, or playful overshoot
- Motion should suggest weight and restraint

## Surface Priorities

### Suite modal shell

- Editorial header stays compact by default.
- Context chips replace large framing blocks.
- Floating close control survives header collapse.
- Content grid gets the viewport first.

### Roadmap

- Prefer compact phase cards over full-width strips.
- Surface only:
  - phase
  - status
  - coverage count
  - top stories
  - short next-state note
- Deeper validation belongs in the validation panel, not the overview header.

### Admin Console

- Control tower summary is a quick read, not a report.
- Advanced pipeline or orchestration failures must degrade gracefully.
- Missing optional API lanes should show operator-safe status copy, not raw HTML or stack-like error text.

## Implementation Targets

- `App.tsx`
  - modal shell density and collapse behavior
- `components/RoadmapView.tsx`
  - compact phase cards and reduced header overhead
- `components/AdminConsole.tsx`
  - overview density and graceful optional-lane fallback
- `components/AmbientGuide.tsx`
  - shared paused-hover guidance primitive

## Acceptance Criteria

- A user opening a module sees the title, action context, and primary content without needing to scroll on a typical laptop viewport.
- Supporting context is available within one hover or one small scroll, not permanently occupying the top of the modal.
- Guidance appears quietly and contextually, then disappears without demanding dismissal.
- Mobile and tablet remove nonessential chrome before shrinking the active content.

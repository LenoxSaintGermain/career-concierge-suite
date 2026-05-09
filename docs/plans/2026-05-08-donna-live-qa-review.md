# Donna Live QA Review

Date: 2026-05-08

## Scope

This review covers the Donna live-session UAT issue where voice took too long to be heard, the session appeared to loop, the live surface drifted into green-on-green visual treatment, and recent Donna behavior changes were not yet clearly governed from Admin.

## Findings

### P0: Gemini Live runtime was mounted in a volatile A2UI slot

Evidence:

- `components/DonnaChatLane.tsx` rendered `liveSessionContent` inside the `concierge_sync` A2UI card.
- Donna canvas transitions hide the animated slot before replacing the card.
- Gemini cleanup calls `closeSession()`, which closes the socket with `expected=true`.
- UAT console showed the matching loop: WebSocket open, `setupComplete`, opening turn, then `onclose code=1000 expected=true`.

Fix applied:

- `components/DonnaChatLane.tsx` now keeps `liveSessionContent` in a stable runtime dock outside the animated A2UI slot.
- `concierge_sync` is now a status/control card only.

### P1: Donna visual treatment drifted away from the Career Concierge OS layer

Evidence:

- The live panel stacked teal borders, teal labels, teal backgrounds, and teal status states.
- The OS layer uses warmer paper/ink/editorial contrast from `brand.colors`.

Partial fix applied:

- `components/GeminiLivePanel.tsx` compact mode now uses a warmer charcoal/paper-accent treatment for the live dock instead of nested green panels.

Follow-up story:

- `THI-148` tracks the full visual QA pass and admin-tunable theme intensity.

### P1: Donna behavior is not fully Admin-configurable yet

Already configurable in Admin:

- `voice.enabled`
- `voice.provider`
- `voice.public_panel_provider`
- `voice.gemini_live_model`
- `voice.gemini_voice_name`
- `voice.max_audio_length_ms`
- `voice.temperature`
- `voice.narration_style`
- Gemini input/output transcription flags
- Gemini affective/proactive toggles where model-supported
- Gemini activity handling
- Gemini thinking mode and budget
- Live VAD silence, prefix padding, start sensitivity, and end sensitivity
- Brand palette and broad OS visual identity

Not yet properly configurable:

- Donna voice-first default
- Donna mic auto-start behavior
- Donna opening-turn copy
- Donna composer collapsed/expanded mode
- Live dock detail level
- Whether suite escape is visible by default
- Donna workflow-routing posture
- Donna canvas tool-action policy
- Donna visual intensity and accent density
- Operator diagnostics visibility

Follow-up story:

- `THI-147` tracks a dedicated Donna/front-door Admin config section.

## Role Boundary Recommendation

Client users:

- Manage personal preferences only: voice/caption visibility, typed vs spoken preference, and notification/contact preferences.

Operators:

- Manage workflow posture, tool-action policy, diagnostics, and session review.

Product owners:

- Manage default Donna behavior, visual intensity, copy presets, routing posture, and rollout flags.

Admins:

- Manage provider secrets, model routing, service health, IAM-sensitive controls, and emergency disable toggles.

## QA Stories

- `THI-146`: P0 fix Donna live runtime remount loop.
- `THI-147`: P1 admin-configurable Donna runtime, workflow, and visual controls.
- `THI-148`: P1 Donna visual QA pass to align with Career Concierge OS theme.
- `THI-149`: P1 Donna live QA harness and operator diagnostics.

## Validation Checklist

After deploy:

1. Sign in with a real Concierge test user.
2. Click Donna composer mic once.
3. Confirm browser mic permission appears on the first click.
4. Confirm console shows one WebSocket open and one `setupComplete`.
5. Confirm no repeated `onclose code=1000 expected=true` loop while Donna cards/tool actions update.
6. Confirm first spoken output is audible within an acceptable window.
7. Confirm the live dock remains pinned while Donna changes the canvas.
8. Confirm the surface does not visually read as green-on-green-on-green.

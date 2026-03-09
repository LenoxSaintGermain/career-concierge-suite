# Micro-Interaction + Cinematography Spec

## Intent

Preserve a calm editorial OS feel while modules become more cinematic, interactive, and media-heavy.

The interaction goal is not "more animation." The goal is controlled motion, graceful retreat, and confident pacing.

## Core Rules

1. Motion should explain hierarchy, not decorate it.
2. Mobile and tablet should hide secondary chrome before they compress primary content.
3. Video and story surfaces should feel staged, not embedded as generic app widgets.
4. Persistent UI should retreat when it competes with narrative focus.

## Modal Behavior

### Desktop

- Keep the dark editorial shell visible.
- Preserve a strong sense of frame, posture, and module identity.
- Allow content to scroll independently inside the presentation canvas.

### Tablet

- Reduce supporting metadata density.
- Collapse related-module and session-summary blocks before shrinking the media stage.
- Maintain title, close action, and one concise framing line above content.

### Mobile

- Let the module header scroll away with the content instead of staying permanently fixed.
- Hide secondary framing blocks, related-module chips, and non-essential session metadata by default.
- Prioritize title, one-line explanation, close action, and the primary content stage.

## Media Stage Rules

- Video should load into a dominant stage first.
- If no final video exists, show an intentional placeholder stage, never an empty card list.
- Metadata, tags, and secondary actions should sit below or beside the stage, never above it on mobile.
- Operator or pipeline details must never leak into client-facing playback surfaces.

## Scroll + Transition Language

- Use soft fade-ins and opacity glides for module shell arrival.
- Use slow transform distances; avoid springy or playful bounce.
- Prefer subtle parallax or sectional drift only when it helps stage hierarchy.
- On mobile, the top shell should fade or scroll away rather than remain pinned.

## Cinematography Direction

- Camera language should feel composed, premium, and intentional.
- Favor restrained push-ins, lateral glides, and controlled reveal timing.
- Avoid frantic cuts, novelty motion, or hyper-SaaS kinetic patterns.
- Use moments of stillness to create weight before challenge or reveal beats.

## Art Direction Constraints

- Warm paper, stone, and smoked dark surfaces should remain the base.
- Accent color should be sparse and signal-bearing.
- Hairlines, shadows, and contrast shifts should feel tactile rather than glossy.
- Typography should remain editorial and high-trust even when motion is introduced.

## Validation Checks

1. On mobile, open a media-heavy module and confirm the header retreats instead of permanently consuming viewport height.
2. Confirm the primary media stage remains visible before secondary metadata.
3. Confirm tablet layouts keep the stage readable without three-column compression.
4. Confirm motion feels quiet and weighted, not playful or dashboard-like.

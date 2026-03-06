# Cinematic Episodes Player Spec

## Status

Planned enhancement. This spec defines the next user-facing Episodes experience.
It does not describe the current shipped surface.

## Problem

The current Episodes flow still exposes too much of the behind-the-scenes operating layer:

- art-director language
- model-routing language
- generation-status framing
- investor/demo-oriented BTS controls

That is useful for admin, operator, and investor demos.
It is not the final client-facing output.

## Product Goal

Deliver a polished user-facing Episodes experience centered on a cinematic vertical micro-drama player that teaches complex subjects through short dramatic scenes, narrative beats, elegant prompts, and restrained contextual overlays.

The client should feel like they are inside a premium editorial streaming ritual, not inside a prompt console or a generation workbench.

## Governing Design Rule

Use the brand system in `docs/mvp/editorial-grid_brand-studio_spec.md` as the governing shell language.
These visual references are directional for composition, mood, and player structure, not literal comps to reproduce one-to-one.

## Experience Principles

1. Output, not machinery
- Client surfaces should show the finished episode experience.
- Generation lineage, model routing, media packs, and art-director operations must stay out of the default client view.

2. Cinematic ritual over lesson dashboard
- The user should enter an episode, move through scenes, reflect, and advance.
- The experience should feel authored and paced, not assembled from widgets.

3. Editorial structure over clutter
- The layout should remain highly gridded, calm, and architectural.
- Every panel must justify its presence.

4. Tactile restraint
- Backgrounds should feel like warm paper, smoked glass, deep ink, and anodized surfaces.
- Accent color should be sparse and semantic.

5. Mobile-first immersion
- Mobile is not a reduced desktop dashboard.
- Mobile should feel like a premium portrait viewing ritual with stacked, substantial modules.

## Modes

### Client Mode

This is the default user-facing surface.

Allowed:

- episode hero media
- scene progression rail
- beat title and narrative copy
- elegant glossary or context cards
- reflection prompt / challenge card
- next episode / continue action
- optional narration controls

Hidden:

- prompt appendices
- model names
- text/image/video routing
- media-generation queue
- art-director terminology
- admin diagnostics

### Operator Mode

This remains available only for admin/operator/investor use.

Allowed:

- generation routing
- art-director notes
- media-pack status
- fallback states
- workflow instrumentation

Rule:

- Client mode and operator mode must be visibly distinct surfaces, not one view with confusing extra blocks.

## Layout Model

### Desktop

Use a three-part editorial frame:

1. Left identity rail
- episode label
- module title
- one-line thesis or episode quote
- optional account / session metadata

2. Central cinematic stage
- vertical or portrait-forward hero media
- subtitle / dialogue overlay
- progress rail for scene beats
- primary challenge / continue controls

3. Right context column
- short glossary or concept note
- what this scene teaches
- next beat preview
- optional lightweight companion notes

### Mobile

Use a stacked ritual:

1. identity header
2. hero media
3. scene tabs or beat rail
4. narrative note
5. prompt / challenge card
6. next action

Rules:

- preserve the portrait-forward cinematic stage
- avoid multi-column compression
- keep the beat rail readable with horizontal overflow if needed

## Content Architecture

Each episode should be structured as:

1. Cold open
- immediate dramatic setup
- one strong line of dialogue or tension

2. Scene beats
- 3 to 5 short beats
- each beat teaches one concept through action or consequence

3. Context overlay
- concise glossary or definition
- no wall-of-text instruction blocks

4. Challenge
- the user acts, chooses, or writes
- the action should test understanding through judgment, not trivia

5. Resolution / cliffhanger
- summarize the learned pattern
- point to the next episode or next module

## Visual Direction

### Materials

- pale stone or warm paper canvases
- deep ink-black or blue-green panels
- thin hairline dividers
- smoked-glass or dark translucent note panes
- embossed-card or heavyweight-paper feeling on cards

### Typography

- editorial serif for major titles and dramatic narrative moments
- quiet sans serif for labels, metadata, and operational UI
- generous line height
- no loud display gimmicks

### Color Behavior

- warm light surfaces for the shell
- dark cinematic stage for the player
- restrained mint accent for state, focus, and progression
- avoid high-saturation consumer-tech gradients

## Motion

Allowed:

- soft fade-in on stage load
- slow highlight glide on active beat
- delicate parallax or depth shift
- quiet progress transitions
- weighty hover and focus response

Avoid:

- bouncy motion
- flashy scale pops
- playful SaaS micro-animations
- excessive kinetic chrome

## Accessibility and Usability

- subtitles or dialogue text must remain readable against media
- keyboard navigation must cover beat progression and player controls
- motion must respect reduced-motion preferences
- narration controls must remain optional and explicit
- challenge cards must be usable without drag or gesture-only mechanics

## Planned Separation of Concerns

### Client Episodes Surface

Owns:

- final rendered episode player
- story progression
- user prompts and next actions
- visual immersion

### Admin / Investor Episodes Surface

Owns:

- content-generation proof
- media routing
- art-director workflow
- diagnostics and fallback visibility

Implementation expectation:

- do not keep piling BTS cards into `BingeFeedView` for the user-facing mode
- create a clean split in information architecture, component structure, or mode routing

## Acceptance Criteria

### AC-1 Final Client View Removes BTS Language
- The default Episodes surface contains no model-routing, art-director, or generation-queue language.
- The client sees the episode itself, not the production apparatus.

### AC-2 Cinematic Micro-Drama Structure
- Each episode presents a dramatic cold open, sequenced beats, contextual teaching, and a challenge/resolution moment.
- The player supports narrative progression rather than slide-style lesson blocks.

### AC-3 Editorial Player Layout
- Desktop uses a structured editorial composition with identity, stage, and context zones.
- Mobile uses an immersive stacked portrait-first composition.

### AC-4 Brand-System Compliance
- The Episodes enhancement follows the shared editorial grid brand rules.
- Typography, accents, spacing, and overlays remain aligned with the Brand Studio system.

### AC-5 Mode Separation
- Admin/investor BTS tooling remains available, but not in the default client-facing Episodes experience.
- Operator surfaces are clearly labeled and gated.

## Test Cases

1. Open Episodes as a standard client and confirm no BTS/operator language appears.
2. Progress through one full episode and confirm the sequence reads as cold open -> beats -> challenge -> continuation.
3. Validate mobile portrait behavior for hero media, beat rail, and prompt card.
4. Validate desktop composition for identity rail, stage, and context column.
5. Open the operator/admin version and confirm generation-routing and art-direction blocks still exist there, not in the client view.
6. Change brand tokens in Brand Studio and confirm the client-facing Episodes player still respects the shared visual system.

## Backlog Mapping

- `E08-S01`: Client-facing Episodes shell separated from BTS/operator mode
- `E08-S02`: Cinematic vertical micro-drama player
- `E08-S03`: Narrative beat rail, contextual overlays, and challenge cards
- `E08-S04`: Mobile/desktop editorial adaptation
- `E08-S05`: Brand-system compliance and design QA guardrails

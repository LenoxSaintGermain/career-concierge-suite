# SkillSync Brand-Integrated OS Mapping

## 1) Semantic Color System

### Environment (Slate / Gray)
- `--ss-slate-980` `#070d14`: app shell and cinematic overlays.
- `--ss-slate-950` `#0f1824`: primary structural surfaces.
- `--ss-slate-900` `#182432`: module containers.
- `--ss-slate-700` `#42576d`: secondary labels and context metadata.

### Action + Completion (Teal)
- `--ss-teal-500` `#26c8bc`: primary action state, active status, completion signals.
- `--ss-teal-600` `#0e9f96`: command accents and section labels.
- `--ss-teal-400` `#5ce3d7`: hover/focus amplification and glow edge.

### Critical Information (Paper / White)
- `--ss-paper` `#f3f6f9`: reading and decision surfaces.
- `--ss-white` `#fcfeff`: nested cards for key payloads.

## 2) Content-to-Component Mapping

### Legacy: Smart Start Intake
- **Old pattern:** long-form orientation and onboarding copy.
- **New OS component:** `Boot Sequence` panel at top of dashboard.
- **Behavior:** 3-step progression cards with semantic states (Active/Queued/Complete).

### Legacy: Professional DNA + Assessment Positioning
- **Old pattern:** static narrative explanation.
- **New OS component:** `Professional DNA` utility widget + `Your Profile` module.
- **Behavior:** tap-to-open quick command from home dashboard.

### Legacy: Insight + Gap Reports
- **Old pattern:** long report pages.
- **New OS component:** `Gap + Insight Report` utility widget + `Your Gaps` module.
- **Behavior:** direct module command (`$ open gaps`) and concise card summaries.

### Legacy: Intro/Course + Resource Guide
- **Old pattern:** page blocks and evergreen text sections.
- **New OS component:** `Episodes` module + `Art Director Queue` block.
- **Behavior:** scenario feed + model routing metadata for image/video/audio generation.

## 3) Intelligent Interaction Pattern

### Teal state semantics
- Teal glow (`ring-os-active`) means: focus target, active operation, or completed state.
- Slate-only means: environment/background context.
- White surfaces mean: high-confidence payload the user should read/act on.

### Live AI feedback cues
- `teal-dot` + `ai-thinking` pulse in:
  - Prologue boot sequence
  - Home command header
  - Intake plating stage
  - Episodes generation state
- Purpose: indicate compute/agent activity without adding noisy loading spinners.

## 4) Current Implementation Scope

Implemented in this pass:
- Global SkillSync semantic tokens + utility classes (`index.html`).
- OS-style dashboard with Smart Start boot sequence (`App.tsx`).
- Legacy content widgets converted to utility commands (`App.tsx`).
- Intake and Episodes interaction states converted to semantic teal behavior.
- Episodes now renders multimedia model routing and prompt payloads for art direction.
- Login + Admin surfaces aligned to brand token system.

## 5) Next Expansion (Phase 2)

- Add configurable brand/content blocks in Admin Console for non-dev edits.
- Add completion tracking per module artifact for richer boot progress states.
- Add per-role dashboard presets (job search, skills, leadership focus).
- Add motion tokens for mobile haptic-like response on unlock events.

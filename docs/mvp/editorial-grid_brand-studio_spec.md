# Editorial Grid Brand Studio Spec

## Purpose

This spec adapts the original POC language into the current SkillSync Ai / Career Concierge brand system and aligns the live suite shell with the Lucidchart journey overlays Jim added.

It defines:

- the official palette and naming defaults
- the visual hierarchy from shell-level identity down to module detail copy
- the admin configuration model for changing those rules
- the workflow-label mapping used in the suite home and module overlays
- the acceptance and test conditions for end-to-end validation

## Official Brand Defaults

### Identity

- Company: `Concierge Career Services`
- Suite: `SkillSync Ai Premier`
- Product mark: `SkillSync Ai`
- Header context: `Career Concierge OS`
- Logo: optional URL-driven asset configured in Admin until the official logo file exists

### Palette

- Accent mint: `#8DD9BF`
- Accent dark mint: `#5FAF95`
- Ink / charcoal: `#28211E`
- Page background: `#F4F1EB`
- Surface background: `#FBF8F2`
- Grid line: `#D8D0C3`
- Overlay background: `#28211E`
- Overlay text: `#F7F1E8`

## Visual Hierarchy Rules

The hierarchy is intentionally top-down. Operators should tune it in this order:

1. Identity
- company name
- suite name
- product name
- header context
- logo URL and alt text

2. Color system
- accent and accent-dark
- ink and backgrounds
- grid line
- overlay background and overlay text

3. Typographic hierarchy
- header scale: `compact`, `standard`, `hero`
- subheader scale: `tight`, `standard`, `airy`
- body density: `tight`, `standard`, `relaxed`
- tile emphasis: `index`, `balanced`, `title`
- overlay style: `editorial`, `minimal`, `cinematic`

4. Shell copy
- prologue quote and description
- suite-home kicker, title, description
- callout label/value
- free-tier notice
- module meta/account labels

5. Module copy
- eyebrow
- tile title
- tile description
- overlay title
- overlay quote

6. Display toggles
- show logo
- show suite kicker
- show module indices
- show module status
- show tile descriptions
- show detail quotes
- show grid glow
- show home callout

## Workflow Synchronization Rules

The suite home now carries both the official workflow label and the user-facing module title.

| Module ID | Official Workflow Label | Client-Facing Title |
| :--- | :--- | :--- |
| `intake` | Smart Start Intake | Start Here |
| `episodes` | SkillSync Ai TV | Episodes |
| `brief` | Professional DNA | The Brief |
| `suite_distilled` | Suite Distilled | Distilled |
| `profile` | Assessment | Your Profile |
| `ai_profile` | AI Assessment | Your AI Profile |
| `gaps` | AI Gap Analysis | Your Gaps |
| `readiness` | AI Insight Report | AI Readiness |
| `my_concierge` | MyConcierge | Your Partner |
| `cjs_execution` | ConciergeJobSearch | ConciergeJobSearch |
| `plan` | AI Training Plan | Your Plan |
| `assets` | Bespoke AI Course | Your Assets |
| `roadmap` | Operator Roadmap | Roadmap |

Rules:

- The suite-home grid uses the official workflow label as the eyebrow and the client-facing title as the primary title.
- The module overlay rail uses the configured overlay title and overlay quote.
- The public shell must use the saved brand config from `/v1/public/config`, not local hard-coded labels.
- Accent-driven components continue to inherit the active palette through shared CSS variables.

## Admin Brand Studio

The Admin Console now includes a `Brand Studio` section with a live preview.

It supports:

- editing identity, color, hierarchy, shell copy, and module copy
- changing toggle behavior without code edits
- previewing the suite header, overlay rail, and editorial grid card hierarchy before saving
- adding a future official logo URL and having it populate into the live app header/prologue

Persistence rules:

- admin reads and writes use the existing `system/career-concierge-config` document
- public consumers receive the non-sensitive `brand` payload from `GET /v1/public/config`
- invalid colors or enum values fall back to the default brand system

## Lucidchart Overlay Sync

The implementation now explicitly reflects the overlay pattern visible in the Lucidchart and screenshot references:

- dark left rail / editorial overlay treatment
- mint-highlighted module eyebrow
- large editorial title
- supporting quote block
- light editorial grid with subtle borders and modular card rhythm

The live app now syncs these rules in:

- the suite header
- the prologue
- the suite-home editorial grid
- the module overlay rail
- admin preview

## Acceptance Criteria

### AC-1 Brand Config Persistence
- Admin can edit brand values and save them.
- Reloading the Admin Console returns the saved values.
- Public config consumers receive the same saved brand values.

### AC-2 Official Branding Propagation
- Suite header uses configured suite/product naming.
- If a logo URL is present and logo display is enabled, the logo appears in the header and prologue.
- Accent palette changes visibly propagate to buttons, borders, and accent text.

### AC-3 Editorial Hierarchy Controls
- Changing header/subheader/body hierarchy values changes the preview immediately.
- The live shell reflects those hierarchy settings after save and refresh.
- Toggle changes hide or show indices, status chips, quotes, descriptions, and callouts without breaking layout.

### AC-4 Workflow Label Sync
- Each module tile shows the official workflow label as eyebrow copy.
- Each module tile shows the client-facing title as the primary title.
- The module overlay rail uses the module-specific overlay title and quote.

### AC-5 Lucidchart Parity
- The suite-home shell matches the light editorial grid treatment.
- The modal overlay matches the dark rail treatment.
- Mint and charcoal are the primary semantic anchors unless deliberately reconfigured in Admin.

## Test Cases

1. Open Admin -> Brand Studio -> change `Suite Name`, save, refresh app, confirm header text updates.
2. Add a temporary logo URL, save, refresh app, confirm logo appears in header and prologue.
3. Change accent mint to a different hex, save, refresh app, confirm buttons and accent labels change.
4. Toggle off `show_module_indices` and `show_tile_descriptions`, save, confirm suite-home cards simplify without layout breakage.
5. Edit `intake` eyebrow/title/quote, save, open suite home and intake modal, confirm both views reflect the new values.
6. Switch overlay style between `editorial`, `minimal`, and `cinematic`, save, confirm overlay rail changes.
7. Confirm `GET /v1/public/config` returns a `brand` object with the edited values.

## Remaining Deliberate Limits

- This pass synchronizes the suite shell and overlays, not every artifact body view.
- Meta tags and default palette are updated, but SEO/social cards are still static rather than admin-driven.
- A production logo asset manager does not exist yet; the current model uses URL-based injection.

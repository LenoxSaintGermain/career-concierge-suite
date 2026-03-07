# Demo Validation Checklist (Persona E2E)

Use this checklist for in-product validation before production demos. Each persona now includes positive-path proof plus negative guards so the demo operator can confirm both the intended journey and the important things the product must not do.

## TU1 Donell Woodson

### Positive Path

1. Login with `demo.tu1.donell@thirdsignal.ai`.
2. Open `Episodes` and confirm the default surface is the cinematic client player, not an operator dashboard.
3. Verify Episode 1 is routed to `AI Strategy & Leadership`.
4. Confirm the episode reads as `cold open -> beats -> challenge -> resolution`.
5. Use `Play narration` and confirm audio playback is available or the UI reports a graceful narration error.
6. Open `Your AI Profile` and verify regular-usage narrative + template-driven guidance.
7. Open `Your Gaps` and confirm the role gap is framed as a jump from senior program management to AI-transformation leadership.
8. Open `Your Plan` and confirm actions are internal execution focused, including a pilot-oriented recommendation such as Copilot-assisted status reporting.
9. Open `ConciergeJobSearch` and verify the module is accessible but framed around promotion/internal execution rather than an external-search sprint.
10. In `Assets`, log one Chief of Staff summary and verify the ledger entry appears.

### Negative Guards

1. Confirm the default Episodes surface does not show `Art Director Queue`, model names, prompt fields, or generation-status language.
2. Confirm `ConciergeJobSearch` does not suggest spray-and-pray outbound applications.
3. Confirm Donell is not shown a free-tier upgrade CTA inside the primary paid flow.

## TU2 Garry Francois

### Positive Path

1. Login with `demo.tu2.garry@thirdsignal.ai`.
2. Open `The Brief` and verify it summarizes Garry's promotion goal and the obstacle of proving ROI.
3. Open `Your Plan` and verify the 72-hour sprint includes identifying 3 marketing KPIs influenced by AI-driven segmentation.
4. Open `Episodes` and confirm the player remains client-facing while the learning arc supports marketing/promotion framing.
5. Open `ConciergeJobSearch` and upload a resume file.
6. Confirm the resume asset appears in the versions list and that the workspace can hold at least three resume variants.
7. Click `Run Resume Review` and verify the output includes Director-of-Marketing-tailored suggestions, a score, and rewrite focus.
8. Click `Generate Search Strategy` and verify the strategy centers on internal networking and project proposals rather than external spray-and-pray applications.
9. Open `Assets` and confirm pending approval entries were created for generated outward-facing deliverables.

### Negative Guards

1. Confirm Episodes does not expose operator/BTS media-routing language for Garry in the normal client view.
2. Confirm the search strategy does not default to generic national job-board volume tactics.
3. Confirm outward-facing assets remain reviewable in the approval rail rather than auto-shipping.

## TU3 Taylor Fulton

### Positive Path

1. Login with `demo.tu3.taylor@thirdsignal.ai`.
2. Open `Episodes` and confirm the first recommended topic is `Process Automation / Workflow Optimization`.
3. Confirm the episode stage is portrait-forward and immersive on mobile-width or narrow viewport presentation.
4. Progress through the full episode and complete the challenge before continuing.
5. Open `Your Profile` and confirm project-management strengths are framed as transferable to tech roles.
6. Open `Your Gaps` and confirm technical-development needs include software-delivery or SDLC fluency.
7. Open `MyConcierge` and ask, `What tech roles are a good fit for my skills?`; verify the response is conversational, relevant, and confidence-building.
8. Open `Your Plan` and confirm the actions emphasize exploration, including an Agile course and informational interviews.
9. Open `Assets`; log one Chief of Staff summary and verify next actions remain exploration-oriented.

### Negative Guards

1. Confirm Taylor is not forced into promotion-language or internal-sponsor recommendations.
2. Confirm `MyConcierge` does not answer with a cold tool list or a generic AI explainer.
3. Confirm the episode challenge reads as judgment/reflection, not a trivia quiz.

## TU4 Derrick Gervin (Free Tier)

### Positive Path

1. Login with `demo.tu4.derrick@thirdsignal.ai`.
2. Confirm the dashboard hides paid-only artifacts and modules, including `The Brief`, `Your Plan`, `Your Profile`, `Your AI Profile`, `Your Gaps`, `MyConcierge`, and `ConciergeJobSearch`.
3. Complete intake and verify the simplified field set only collects free-tier essentials.
4. Open `Episodes` and verify the client player still feels polished, but the feed is the fixed 3-episode starter playlist.
5. Progress through all three starter episodes and confirm the experience remains coherent without paid-only personalization language.
6. Open `AI Readiness` and confirm Derrick only receives readiness guidance plus a generic resource-guide experience.
7. Complete the free content path and verify a prominent upgrade CTA is displayed with paid-tier benefits.

### Negative Guards

1. Confirm Derrick never sees paid-only modules unlocked by mistake.
2. Confirm the free-tier Episodes view does not promise personalized sequencing or concierge-only features.
3. Confirm the default episode view does not expose BTS/operator controls.

## Admin Approval Pass

### Positive Path

1. Login as admin user.
2. Open `Assets`.
3. Find `pending_approval` entries in the global approval queue.
4. Approve one and reject one.
5. Confirm status transitions to `approved` / `rejected`.

### Negative Guards

1. Confirm non-admin users cannot access the admin approval surface.
2. Confirm rejected items do not silently appear as approved or shipped.

## Admin Brand Studio Pass

### Positive Path

1. Login as admin user and open `Admin`.
2. Open `Brand Studio`.
3. Change `Suite Name` or `Home Kicker` and confirm the preview updates immediately.
4. Add a temporary `Logo URL`, save config, refresh the app, and confirm the logo appears in the header and prologue.
5. Change one accent color, save config, and confirm the suite shell and accent-driven UI tokens update.
6. Toggle off module indices or tile descriptions, save config, and confirm the suite-home grid reflects the new hierarchy.
7. Edit `Smart Start Intake` eyebrow/title/overlay quote and confirm suite-home + intake overlay copy stay synchronized.

### Negative Guards

1. Confirm Brand Studio changes do not surface raw config JSON to normal users.
2. Confirm Episodes still inherit brand colors/hierarchy after a save.
3. Confirm operator-only Episodes controls remain gated to admins even after a full refresh.

## Admin Media Library Pass

### Positive Path

1. Login as admin user and open `Admin`.
2. Open the `Media` section.
3. Click `Load starter pack`.
4. Confirm four reusable entries are added to the curated library without duplicating on a second click.
5. Save config, refresh, and confirm `Episodes` operator mode can route at least one starter-pack asset.

### Negative Guards

1. Confirm starter-pack seeding does not overwrite manually created library items.
2. Confirm repeated starter-pack loads do not create duplicate ids.
3. Confirm library items without a matching rule/tag still stay out of the routed result set.

## Episodes Operator Pass

### Positive Path

1. Login as admin user and open `Episodes`.
2. Confirm the default mode is still `Client View`.
3. Switch to `Operator Mode`.
4. Verify routed media, library refresh, prompt fields, and generated scene-pack controls appear only in operator mode.

### Negative Guards

1. Log in as a non-admin paid user and confirm the operator-mode toggle is not visible.
2. Confirm the client mode does not leak `recommended_models`, prompt appendices, or art-director framing.

## Media Resolver Pass

### Positive Path

1. Login as a paid persona who has completed intake and generated suite artifacts.
2. Open `Episodes`, switch to `Operator Mode`, and click `Refresh Library`.
3. Confirm the operator rail shows a `Library-first resolver` summary with reused asset count plus kit/bespoke gap counts.
4. Confirm `Episode asset resolution` cards appear and list reused asset titles when matching tags exist.
5. Verify Firestore contains `clients/{uid}/orchestration_runs/content_director_phase_a.media_resolution`.

### Negative Guards

1. Login as Derrick free tier and confirm the media resolver does not claim a Phase A plan exists.
2. Temporarily remove matching tags from a curated item and confirm the resolver reports `kit gaps` instead of pretending the episode is fully covered.
3. Confirm bespoke narrative needs are labeled as bespoke gaps, not silently collapsed into generic library matches.

## Media Pipeline Persistence Pass

### Positive Path

1. Login as a paid persona and open `Episodes` -> `Operator Mode`.
2. Generate a scene pack.
3. Confirm the operator rail shows `Pipeline`, `Job`, and `Manifest` identifiers.
4. Verify Firestore contains `clients/{uid}/media_jobs/{jobId}` and `clients/{uid}/media_manifests/{manifestId}`.
5. If a storage bucket is configured, confirm the generated image asset records a `storage_path`.
6. If the video is queued, refresh status and confirm the persisted job/manifest update when the clip becomes available.

### Negative Guards

1. Confirm generating a scene pack without Gemini configured still creates a degraded job/manifest record instead of failing silently.
2. Confirm repeated video-status refreshes update the same job rather than spawning duplicate job docs.
3. Confirm persisted metadata does not require the client UI to retain the raw in-memory response in order to understand job state.

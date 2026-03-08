# Career Concierge: Repurpose Signal Atlas UX (User Stories)

## Product Intent (From Transcript)
- Reuse Signal Atlas as the "suite" UI for Career Concierge (currently a Teams chat channel) with a premium, high-touch, "concierge" feel.
- Make it feel like "digital weight": purposeful intro, pacing, anticipation (Netflix-style credits), not disposable mobile UI.
- Deliver personalized artifacts (Professional DNA, AI Assessment, Gap Analysis, Insight Report, Resource Guide, Training Plan, etc.) as elegant, mobile-friendly, document-like views.
- Add orchestration: implicit/explicit behavior tracking to tailor what’s shown next, how it’s shown (density, pacing), and which narrative/learning path to recommend.
- Support 3 entry intents: current role, target role, or "not sure" (skill recipe builder + recommended roles).
- Make job search a strategy (signals, positioning, targeted company approach), not just ATS resume optimization.

## Personas
- **Client (Job Seeker)**: buys concierge service; wants clarity, direction, confidence, outcomes.
- **Concierge Coach (Human)**: supports client, reviews outputs, intervenes when automation stalls.
- **Ops/Admin**: manages onboarding, data integrity, service tiers, billing, compliance.
- **Growth/Marketing**: needs conversion funnel + social/content workflows.

---

## Epic A: Suite Home + Premium “Weight” Experience

1. **Purposeful intro / ceremony**
- As a client, I want an intentional intro animation/sequence when I enter the suite so the experience feels premium and story-driven.
- Acceptance:
  - First load shows a short branded intro (skippable after first view).
  - Subsequent visits can show a shorter "stinger" or be disabled in settings.
  - Works on mobile without jank.

2. **Suite home as tiles (learning/job search modules)**
- As a client, I want to see my concierge journey as a set of tiles so I can understand what exists and what’s next at a glance.
- Acceptance:
  - Tiles show title, short purpose, status (Not started/In progress/Ready/Updated).
  - Tiles group into sections (e.g., "Your Profile", "Job Search", "Skills", "Resources").
  - Responsive: desktop grid; mobile stacked cards.

3. **Document-like module view**
- As a client, I want each tile to open into a clean, document-like view so it feels substantial (not a chat transcript).
- Acceptance:
  - Module opens with consistent layout (header, section nav, content).
  - Print/share-friendly export option exists (PDF or link).

---

## Epic B: Intake That Feels Like a Concierge Conversation (Not a Test)

4. **Intake framed as conversation**
- As a client, I want intake to feel like a guided conversation so I’m not intimidated by "assessment" language.
- Acceptance:
  - Copy avoids "test" framing; uses "conversation" / "intake".
  - Includes scenario-based prompts (concierge-style) rather than only form fields.

5. **3-path start: current role / target role / not sure**
- As a client, I want to choose whether I’m optimizing my current role, targeting a next role, or exploring skills so the system meets me where I am.
- Acceptance:
  - Start screen provides 3 choices.
  - "Not sure" triggers skill/interest elicitation and generates recommended roles.

6. **Skill recipe builder (future-proof roles)**
- As a client, I want to define a “recipe of skills” instead of a single job title so I’m not boxed into outdated titles.
- Acceptance:
  - User can pick/weight skills and constraints.
  - Output includes a role-language suggestion set (multiple plausible titles) and a skills gap summary.

7. **Editable profile over time**
- As a client, I want to update my profile and goals over time so the concierge plan stays accurate.
- Acceptance:
  - Profile has an "Update" flow.
  - Updates trigger regeneration of dependent artifacts with visible "last updated" timestamps.

---

## Epic C: Personalization + Orchestration (Implicit + Explicit)

8. **Implicit behavior tracking to tailor UX**
- As a client, I want the experience to adapt based on what I click and read so it fits my preferences without extra effort.
- Acceptance:
  - System captures module engagement (opens, dwell, scroll depth) and uses it to adjust recommendations.
  - Provides a simple "why am I seeing this" explanation.
  - Privacy controls: opt-out, delete history.

9. **Explicit preferences (Pinterest-style quick picks)**
- As a client, I want to set preferences quickly (style, pace, topics) so recommendations get better fast.
- Acceptance:
  - Lightweight preference picker exists.
  - Preferences influence narrative style, module ordering, and density.

10. **Adaptive pacing (“weight” over speed)**
- As a client, I want the UI to build anticipation (when appropriate) so waiting feels premium, not slow.
- Acceptance:
  - Loading states are branded and intentional.
  - System can precompute certain outputs to reduce unnecessary waits.

---

## Epic D: Relationship-Aware Navigation (Concept Map)

11. **Hover/tap to reveal relationships between modules**
- As a client, I want related tiles/modules to highlight together so I understand what compounds what.
- Acceptance:
  - Hover (desktop) or tap-and-hold (mobile) highlights related tiles.
  - Relationship label displayed ("part of", "compounds", "prerequisite").

12. **Relationship panel inside modules**
- As a client, I want to see “what this connects to” so I can follow the best next step.
- Acceptance:
  - Each module shows related modules and recommended next action.

---

## Epic E: Concierge Job Search Suite (Strategy, Not Just Resume)

13. **Job search sprint plan (3-company focus)**
- As a client, I want a curated job search strategy (few targeted plays) so I’m not spraying 700 applications.
- Acceptance:
  - System proposes target companies/roles and rationale.
  - Plan includes weekly actions (signals, networking, content, outreach).

14. **Signal-building checklist (presence, content, network)**
- As a client, I want a checklist of signal-building actions so I know how to look credible beyond my resume.
- Acceptance:
  - Checklist ties each action to an outcome ("increases recruiter touchpoints").
  - Includes LinkedIn, portfolio, optional short-form video.

15. **ATS-safe resume optimization (no hallucinations)**
- As a client, I want my resume optimized without fabricated claims so I can trust it.
- Acceptance:
  - System preserves factual claims; flags ambiguous items for confirmation.
  - Output includes a diff view (before/after) and a "fact check" checklist.

16. **Recruiter sphere strategy (“get into their feed”)**
- As a client, I want a playbook to get into the right recruiter/hiring manager’s awareness so I can bypass cold ATS filters.
- Acceptance:
  - Plan includes target people, their channels, and suggested engagement/content.
  - Tracks outreach attempts and next steps.

17. **Tiered delivery: DIY vs Done-For-You**
- As a client, I want to choose between guidance templates and a fully managed “mini agency” so price matches effort.
- Acceptance:
  - Tier selection clearly shows deliverables, timeline (e.g., 3-month sprint), and responsibilities.
  - Higher tiers unlock automation/agent execution features.

---

## Epic F: Dynamic Workspace Panel (Generated Assets)

18. **Right-side workspace for generated outputs**
- As a client, I want generated assets to appear in a workspace panel so I can act without context switching.
- Acceptance:
  - Workspace shows latest generated doc, scripts, outreach drafts, etc.
  - Items are versioned and attributable (what changed, when).

19. **“Golden plate” delivery summary**
- As a client, I want a daily/weekly brief summarizing what’s been done for me so it feels concierge-led.
- Acceptance:
  - Brief includes completed actions, pending approvals, next steps.
  - Supports notifications (email/SMS/Teams optional).

---

## Epic G: Onboarding + Lifecycle Automation (With Human Escalation)

20. **Onboarding nudges when client stalls**
- As a client, I want helpful nudges if I haven’t completed intake so I don’t get stuck.
- Acceptance:
  - After configurable time, system sends a reminder.
  - After repeated inactivity, it escalates to a human concierge.

21. **Client folder / artifact timeline**
- As ops/admin, I want every generated artifact tied to a client ID with a timeline so we can support and audit.
- Acceptance:
  - Client timeline shows artifacts, prompts/inputs, versions, and approvals.

---

## Epic H: Brand, Visual System, and Mobile Excellence

22. **Brand theming (chocolate + teal accents)**
- As a business owner, I want the suite to reflect brand colors and polish so it’s differentiated.
- Acceptance:
  - Theme tokens exist and apply across modules.
  - Accessible contrast passes.

23. **Mobile-first interactions**
- As a client, I want the full experience to work beautifully on mobile so I can use it anywhere.
- Acceptance:
  - Tap-and-hold replaces hover behaviors.
  - Key flows are usable one-handed.

---

## Epic I: Trust, Privacy, and Controls

24. **Explain personalization + control it**
- As a client, I want to understand and control personalization so I trust the system.
- Acceptance:
  - Settings: personalization on/off, data export/delete.
  - Clear copy describing what is tracked.

25. **Role-based access**
- As ops/admin, I want role-based access to client data so only authorized staff see sensitive content.
- Acceptance:
  - Client vs Concierge vs Admin permissions enforced.

---

## Coverage Audit Against `docs/mvp/test_user_specs.md` (March 6, 2026)

- **Donell Woodson / Skill-Sharpener**: Partial coverage. Intake, artifacts, plan, and episodes are represented, but the story set does not yet require auditory episode delivery, internal-only plan/CJS behavior, or AI-transformation-specific gap framing.
- **Garry Francois / Career Accelerator**: Partial coverage. Resume optimization and search strategy exist, but the story set does not yet require promotion-focused dashboard prioritization, ROI-centered briefing, internal-networking strategy, or minimum resume-version support in Assets.
- **Taylor Fulton / Direction-Seeker**: Partial coverage. The 3-path start and skill recipe builder help, but there is no explicit MyConcierge story, no requirement for transferable-skills framing in artifacts, and no exploration-first plan story.
- **Derrick Gervin / Free Tier**: Missing meaningful coverage. Tiering is mentioned generically, but the story set does not define simplified intake, free-tier entitlements, curated non-personalized episodes, locked paid artifacts, or the upgrade CTA flow.

### Coverage Gaps That Block End-to-End Persona Validation

- Tier-aware onboarding and module visibility are not defined tightly enough to validate paid vs free experiences.
- Episode generation is not tied to persona interests or learning modalities, so Donell's narrated leadership episode and Derrick's pre-set playlist are not covered.
- ConciergeJobSearch behavior is not intent-aware, which leaves Donell's "accessible but inactive" case and Garry's internal-promotion strategy underspecified.
- MyConcierge is absent from the story set even though Taylor's primary journey depends on it.
- Assets requirements do not specify version depth or approval-linked deliverables for Garry's CJS flow.
- Artifact content requirements are too generic to validate persona-specific outputs for Brief, Profile, Gaps, and Plan.

---

## Epic J: Persona and Tier Coverage for Demo-Ready E2E Journeys

26. **Tier-aware onboarding and suite entitlements**
- As a client, I want the suite to reflect my purchased tier so I only see the modules and artifacts that belong to my path.
- Acceptance:
  - Premier and paid tiers unlock the full post-intake suite.
  - Free-foundation users only see the allowed onboarding, learning, readiness, and upgrade surfaces.
  - Paid-only modules and artifacts are hidden or explicitly locked for free users.
  - Entitlements are derived from the account tier and are enforced consistently on dashboard load and module open.

27. **Simplified free-tier intake and upgrade path**
- As a free-tier user, I want a shorter intake and a clear upgrade path so I can get value quickly without being dropped into the full concierge flow.
- Acceptance:
  - Free-tier intake captures only the minimum fields needed for readiness and starter content.
  - Free-tier users receive AI Readiness plus a generic resource-guide experience instead of the full personalized artifact suite.
  - Completing the free learning path shows a prominent upgrade CTA with the benefits of the paid tiers.
  - MyConcierge and ConciergeJobSearch are not visible in the free-tier experience.

28. **Intent-aware orchestration for current role, target role, and not-sure journeys**
- As a client, I want the suite to change its recommendations based on my intent so the experience matches whether I am staying sharp, pushing for a promotion, or exploring direction.
- Acceptance:
  - `current_role` journeys prioritize AI Profile, Gaps, Episodes, and internal execution plans.
  - `target_role` journeys prioritize Brief, Plan, ConciergeJobSearch, and Assets.
  - `not_sure` journeys prioritize Profile, Gaps, MyConcierge, and exploration-oriented plans.
  - Current-role users do not receive active external job-search recommendations by default.
  - Target-role users receive promotion-oriented strategy centered on internal networking, project proposals, and proof of ROI.

29. **MyConcierge guidance for direction-seekers**
- As a direction-seeker, I want a conversational guidance surface so I can ask what roles fit my background and get grounded recommendations.
- Acceptance:
  - MyConcierge supports open-ended role-fit questions using the user's Professional DNA and generated artifacts as context.
  - Responses identify transferable strengths, likely next roles, and one concrete next action.
  - The module is visible and recommended for `not_sure` journeys after intake.

30. **Persona-aware episode generation and delivery format**
- As a client, I want the first episode and delivery format to reflect my goals and learning style so the binge-learning feed feels intentionally personalized.
- Acceptance:
  - Episode 1 topic is selected from the user's primary interests and target context.
  - Auditory learning preferences can trigger narrated delivery for the first episode.
  - Skill-sharpener users can receive leadership- and internal-innovation-oriented episodes.
  - Direction-seeker users can receive foundational exploratory episodes.
  - Free-tier users receive a curated 3-5 item starter playlist instead of personalized episodes.

31. **Assets versioning and approval-linked CJS deliverables**
- As a career-accelerator client, I want multiple asset versions and approval-aware deliverables so I can iterate on promotion materials safely.
- Acceptance:
  - Assets can store at least three resume versions for the same user.
  - Resume review output and search strategy output are saved as traceable artifacts tied back to the triggering inputs.
  - Outbound drafts created from CJS work appear with approval status before execution.
  - Assets surfaces show version history, timestamps, and current status.

32. **Persona-specific artifact assertions for Brief, Profile, Gaps, and Plan**
- As a product owner, I want artifact generation requirements to be explicit by persona so the demo users can be validated against concrete expectations.
- Acceptance:
  - Brief summarizes the user's goal, primary obstacle, and first 72-hour actions.
  - Profile highlights transferable strengths when the user is exploring a transition.
  - Gaps differentiates between role-readiness gaps, technical-skills gaps, and AI-leadership gaps based on the user's target.
  - Plan outputs reflect the user's intent: internal pilots for skill-sharpeners, promotion sprints for accelerators, and exploration steps for direction-seekers.

---

## Epic K: Editorial Grid Brand OS + Workflow Label Synchronization

33. **Shared brand token system for the suite shell**
- As an operator, I want the suite shell to be driven by a formal brand token system so the experience can move from POC styling to official product branding without scattered code edits.
- Acceptance:
  - The suite stores brand identity, palette, hierarchy, toggles, and module copy in admin config.
  - Public config exposes the non-sensitive brand payload for the client shell.
  - Invalid brand values fall back to safe defaults instead of breaking the suite.
- Tests:
  - Save brand colors and verify the suite shell rehydrates with the new palette after reload.
  - Confirm `/v1/public/config` includes the brand payload.

34. **Admin Brand Studio with live preview**
- As an admin operator, I want to adjust the editorial hierarchy from top-level identity down to module copy so I can tune the visual system in a controlled order.
- Acceptance:
  - Admin exposes sections for identity, color system, visual hierarchy, shell copy, display toggles, and module copy.
  - A small preview updates immediately as values change.
  - Saving the config updates the live shell after refresh.
- Tests:
  - Change suite name, header scale, and intake module copy in preview; save and verify the same changes in the live app.
  - Toggle indices and tile descriptions off and confirm the preview and shell both simplify correctly.

35. **Logo configuration and propagation**
- As an operator, I want a configurable logo field so Jim can add the official mark once it exists and have it populate through the app without a code deployment.
- Acceptance:
  - Admin supports editable logo URL and alt text.
  - Header and prologue render the logo when a valid URL is present and the logo toggle is enabled.
  - If the logo is absent, the suite falls back to text-only branding without layout breakage.
- Tests:
  - Save a temporary logo URL and confirm it appears in header and prologue.
  - Clear the URL and confirm the suite returns to text-only branding.

36. **Lucidchart overlay and workflow-label synchronization**
- As a product owner, I want the live suite to mirror the Lucidchart editorial overlays and official workflow labels so the investor-facing journey and the product shell tell the same story.
- Acceptance:
  - Suite-home cards use official workflow labels as eyebrows and client-facing titles as the main title.
  - Module overlays use a dark editorial left rail with configurable title and quote treatment.
  - The mint/charcoal editorial system is the default live visual language.
  - The workflow-label mapping is documented in the MVP spec.
- Tests:
  - Validate the home grid and module overlay against the screenshot references and `docs/mvp/lucidchart_analysis.md`.
  - Confirm Intake, MyConcierge, Plan, and Assets all show synchronized eyebrow/title/overlay copy.

---

## Epic L: Client-Facing Cinematic Episodes Player

37. **Separate the client Episodes player from operator BTS**
- As a client, I want Episodes to show the finished learning experience rather than the production apparatus so the module feels premium and trustworthy.
- Acceptance:
  - The default Episodes surface removes art-director, model-routing, and generation-queue language.
  - Admin/operator-only tooling remains available in a clearly gated operator mode.
  - Client mode and operator mode are visually and structurally distinct.
- Tests:
  - Log in as a standard client and confirm no BTS/operator language appears in Episodes.
  - Log in as admin and confirm operator diagnostics remain available outside the client-facing player.

38. **Cinematic vertical micro-drama player**
- As a client, I want to learn through short dramatic scenes so complex AI concepts feel vivid and memorable instead of instructional and flat.
- Acceptance:
  - Episodes open with a cold open and progress through short narrative beats.
  - The main stage is portrait-forward and cinematic on both mobile and desktop.
  - The player supports subtitle/dialogue overlays, narration controls when applicable, and a clean progression model.
- Tests:
  - Complete one episode and confirm it reads as cold open -> scene beats -> challenge -> continuation.
  - Validate portrait-forward behavior on mobile and a larger stage composition on desktop.

39. **Editorial context overlays and challenge cards**
- As a client, I want elegant definitions, notes, and prompts around the story so I can understand the lesson without breaking immersion.
- Acceptance:
  - Context overlays are concise, editorial, and optional rather than verbose instruction blocks.
  - The challenge card asks for judgment, reflection, or action instead of quiz-style trivia.
  - The next-beat or next-episode transition remains visible without cluttering the stage.
- Tests:
  - Confirm each episode contains a compact concept note or glossary card.
  - Confirm challenge states can be completed without exposing backend-generation language.

40. **Brand-system-compliant Episodes experience**
- As a design owner, I want the new Episodes player to obey the shared editorial grid rules so future agents do not drift into generic streaming or SaaS styling.
- Acceptance:
  - The Episodes enhancement explicitly references the Brand Studio spec as the governing style system.
  - Typography, spacing rhythm, accent behavior, and motion stay aligned with the broader OS shell.
  - The reference images are treated as directional composition input, not exact comps to copy.
- Tests:
  - Review the delivered player against `docs/mvp/editorial-grid_brand-studio_spec.md` and `docs/mvp/cinematic_episodes_player_spec.md`.
  - Confirm the player still inherits palette and hierarchy changes made in Brand Studio.

---

## Epic M: Micro-Drama Content Director + Media Pipeline

41. **Content Director planning trigger**
- As a system operator, I want a Content Director agent to start learning-plan and episode-plan creation at the first moment we know enough about the client so media planning is timely without being generic.
- Acceptance:
  - A first planning pass starts once intake is complete and the system knows intent, preferences, and role context.
  - A second enrichment pass can refine plans once Brief/Profile/Gaps are available.
  - The plan outputs a reusable-vs-bespoke asset manifest for each episode.
- Tests:
  - Complete intake and confirm a learning-plan seed and episode-plan seed are created.
  - Confirm the enriched pass updates the plan after core artifacts finish.

42. **Reusable content library and taxonomy**
- As a content director, I want a tagged media library of reusable visuals so we stop spending tokens on generic concepts that recur across many users.
- Acceptance:
  - Generic concepts such as globe imagery, abstract LLM metaphors, office B-roll, and reusable cast kits are stored as reusable assets.
  - Assets are tagged by concept, environment, character archetype, modality, tone, aspect ratio, and reusability scope.
  - The system can rank and retrieve assets by story need rather than by file name alone.
- Tests:
  - Query the library for a generic concept and confirm an existing tagged asset is returned.
  - Confirm reusable assets can serve multiple episode plans without regeneration.

43. **Library-first asset resolver and gap analysis**
- As a system operator, I want the episode planner to resolve existing assets first and only request generation for missing story beats so media spend stays disciplined.
- Acceptance:
  - The resolver searches the library before generation.
  - Missing assets are classified as reusable-kit candidates or bespoke client-specific candidates.
  - The system records why an asset was reused versus newly generated.
- Tests:
  - Submit an episode plan with generic concepts and confirm reuse.
  - Submit a plan with client-specific context and confirm it is marked as bespoke.

44. **Cloud Run media-pipeline service**
- As an operator, I want a dedicated media pipeline so long-running image/video generation does not overload the core suite API surface.
- Acceptance:
  - Media generation runs through a dedicated async pipeline boundary.
  - The pipeline handles job state, retries, and status polling.
  - The core API remains responsible for orchestration, not heavy media execution loops.
- Tests:
  - Start a media job and confirm job state is persisted and can be polled.
  - Confirm failed jobs can retry without breaking the client-facing suite flow.

45. **Cloud Storage binaries + Firestore metadata model**
- As an operator, I want media binaries stored in the right place and searchable metadata stored separately so the system remains scalable and queryable.
- Acceptance:
  - Binary media is stored in Cloud Storage.
  - Firestore stores metadata, tags, lineage, manifests, and job status.
  - Firestore is not used as the primary binary store for generated image/video assets.
- Tests:
  - Generate or ingest one media asset and confirm the binary lands in storage while metadata lands in Firestore.
  - Confirm asset metadata includes lineage, tags, and storage references.

46. **Operator lineage view vs client final output**
- As a product owner, I want the operator/admin surface to inspect prompts, lineage, and generation state while the client sees only the final assembled episode media.
- Acceptance:
  - Operator mode exposes lineage and generation state.
  - Client mode consumes the finished asset set only.
  - Sensitive bespoke generation can be gated for approval when needed.
- Tests:
  - Verify operator mode shows provenance and client mode does not.
  - Verify approval can be required for bespoke employer- or client-specific assets.

47. **Admin media-pipeline monitoring and configuration surface**
- As an operator, I want the Admin Console to expose the media pipeline end to end so I can monitor jobs, manage the library, tune configuration, and recover failures without leaving the product.
- Acceptance:
  - Admin includes a dedicated media-pipeline section.
  - Operators can inspect queue depth, active/completed/failed jobs, and retryable failures.
  - Operators can manage library item status, tags, publish state, and bespoke-approval decisions.
  - Operators can configure provider/model settings and inspect storage-target health from the same surface.
- Tests:
  - Confirm Admin shows media job states and supports retry for failed jobs.
  - Confirm Admin exposes config controls plus library-management and approval status in one operating section.

---

## Epic N: Agentic Staff Operating Model + Orchestration Control Plane

48. **Canonical staff registry and role contracts**
- As a product owner, I want every MVP staff role defined with triggers, scopes, inputs, outputs, and approval rules so the agentic OS is governable rather than implied.
- Acceptance:
  - The system distinguishes agents, services, and human operators explicitly.
  - Each role lists its read/write scope and owning surface.
  - The role model reuses the existing registry/governance pattern instead of introducing a second registry.
- Tests:
  - Review the staff registry and confirm each role has trigger, scope, inputs, outputs, and approval policy.
  - Confirm the model includes Chief of Staff, MyConcierge, CJS staff, Episodes staff, and media staff.

49. **Intent- and tier-aware orchestration graph**
- As a system operator, I want a canonical handoff graph so each user journey triggers the right staff roles without hidden logic drift.
- Acceptance:
  - `current_role`, `target_role`, and `not_sure` flows each dispatch different downstream roles.
  - Free-tier flows avoid invoking paid-tier execution staff and bespoke media generation.
  - The orchestrator persists a run snapshot that explains why each handoff occurred.
- Tests:
  - Run one user through each intent path and confirm the selected downstream roles differ appropriately.
  - Confirm free-tier flows stay on reusable/library content and do not trigger CJS or bespoke media work.

50. **Firestore-grounded memory and evidence model**
- As a platform owner, I want orchestration state, evidence, and run history stored in our existing data model so we do not introduce speculative infrastructure before it is justified.
- Acceptance:
  - Firestore stores orchestration runs, learning plans, episode plans, interactions, approvals, and evaluation notes.
  - Structured Firestore memory is the default retrieval layer for MVP orchestration.
  - Embeddings and external workflow memory remain optional later enhancements, not launch dependencies.
- Tests:
  - Inspect a sample orchestration run and confirm it references the underlying DNA, artifacts, interactions, and outputs.
  - Confirm the implementation plan does not require Supabase or pgvector to ship the MVP staff model.

51. **Admin orchestration operating console**
- As an admin operator, I want one control-plane section for staff configuration and monitoring so I can inspect role contracts, runs, approvals, and failures without jumping across disconnected tools.
- Acceptance:
  - Admin exposes staff registry visibility, orchestration-run monitoring, trigger-policy configuration, and evaluation/confidence signals.
  - The orchestration operating section is distinct from Brand Studio and the media-only controls.
  - Operators can inspect staff behavior without exposing that machinery in the client-facing suite.
- Tests:
  - Confirm Admin shows the staff roster, run history, policy fields, and evaluation state in one operating section.
  - Confirm the client suite does not surface these internal controls.

52. **Human concierge escalation and approval discipline**
- As an operator, I want sensitive staff actions to pause for human review so the OS stays high-trust while still feeling agentic.
- Acceptance:
  - Outbound communications and sensitive bespoke media can enter approval state.
  - Premium human concierge escalation can be attached to stalled or high-touch journeys.
  - Approval state is visible in the admin operating console and linked to the originating role.
- Tests:
  - Trigger an outbound or bespoke-sensitive action and confirm it is routed into approval state.
  - Confirm an operator can see which role produced the action and why approval is required.

53. **Current-stack channel and runtime policy**
- As a technical owner, I want the staff roadmap aligned to the current web OS and GCP/Firebase stack so we do not destabilize the product by importing a second architecture.
- Acceptance:
  - The roadmap remains anchored to React, Express on Cloud Run, Firebase Auth, Firestore, Cloud Storage, and Gemini.
  - Multi-channel delivery concepts such as WhatsApp, Slack, or PWA hard-gates are explicitly deferred.
  - n8n/external workflow engines remain optional until the internal orchestration model proves insufficient.
- Tests:
  - Review the staffing roadmap and confirm no story requires ClawWork, Supabase, or channel-native messaging to ship.
  - Confirm deferred items are documented rather than implied.

54. **Staff effectiveness and evaluation telemetry**
- As a system owner, I want evaluation signals attached to staff outputs so we can measure confidence, operator trust, and where the orchestration chain is weak.
- Acceptance:
  - Staff outputs can carry evaluation notes, confidence signals, and policy flags.
  - Operators can inspect these signals while reviewing runs and approvals.
  - Evaluation remains operational telemetry, not a user-facing gimmick.
- Tests:
  - Inspect a sample run and confirm outputs include evaluation metadata when relevant.
  - Confirm evaluation signals are visible in admin but not exposed in the client-facing OS.

## Epic O: Persona Test Harness + Demo Operator Shortcuts

55. **One-click sample persona launch**
- As a human operator, I want to launch the suite as any seeded sample persona without manual credential wrangling so demo rehearsal and QA are fast.
- Acceptance:
  - Admin exposes a persona list based on the seeded fixtures.
  - Operator can launch or assume a selected persona in one short flow.
  - The harness clearly labels which environment and persona are active.
- Tests:
  - Launch TU1, TU2, TU3, and TU4 from the harness and confirm the suite opens with the expected identity and tier.
  - Confirm the operator can return to the native admin account without clearing local state by hand.

56. **Persona reset, reseed, and state refresh controls**
- As an operator, I want to reset or reseed a sample persona so I can rerun the same journey repeatedly without stale data blocking QA.
- Acceptance:
  - Admin or a companion ops utility can reset seeded persona state and rerun deterministic fixture hydration.
  - Operators can refresh artifacts, interactions, and orchestration memory separately or together.
  - The tool warns before destructive reset actions.
- Tests:
  - Reset TU2, reseed it, and confirm artifacts plus orchestration state return to the deterministic baseline.
  - Confirm selective reset does not destroy unrelated user data.

57. **Persona-aware validation shortcuts**
- As an operator, I want direct links from the roadmap/validation surface into persona-specific checks so demo proof capture is fast and repeatable.
- Acceptance:
  - Each sample persona has a quick-launch path, expected journey notes, and pass/fail checkpoints in one place.
  - Validation surfaces link directly to the sample user spec and current fixture definition.
  - The roadmap can distinguish "feature shipped" from "persona demo proof captured."
- Tests:
  - Open a persona validation card and confirm it includes launch, reset/reseed, and expected acceptance checks.
  - Confirm the validation view reflects whether proof was captured for each sample persona.

---

## Epic P: Google Workspace Operator Automation (Deferred, Post-Core)

58. **Smart Start follow-up drafting via Gmail + Calendar**
- As an operator, I want concierge requests to produce draftable Gmail follow-up and Calendar scheduling payloads so I can move from intake request to confirmed Smart Start faster.
- Acceptance:
  - Workspace automation is strictly operator-side and optional.
  - The system can prepare a follow-up email draft and a scheduling payload from persisted concierge request data.
  - Google Workspace CLI is treated as an adapter, not the system of record.
- Tests:
  - Review one concierge request and confirm the operator can generate a follow-up draft payload without changing the core client record.
  - Confirm booking state still persists in Firestore even if Workspace automation is disabled.

59. **Operator briefing pack export to Google Docs**
- As an operator, I want to turn a client request, DNA summary, and next-step plan into a Google Doc draft so handoff packets are fast to create and easy to edit.
- Acceptance:
  - Docs export uses existing Firestore records as source material.
  - Export remains an operator action, not an automatic user-facing side effect.
  - The generated doc clearly distinguishes AI-generated draft sections from operator edits.
- Tests:
  - Export one briefing pack and confirm the generated draft references the correct client, request, and artifact context.
  - Confirm disabling the Workspace adapter does not block core suite generation.

60. **Sheets-based operator pipeline tracking**
- As an operator, I want concierge requests and follow-up states mirrored into a Google Sheet so manual sales/ops tracking does not require duplicate entry.
- Acceptance:
  - Sheet sync is scoped to operator tracking only.
  - Sync fields are explicit: request status, preferred timing, owner, last touch, and next step.
  - Firestore remains canonical if the Sheet is stale or unavailable.
- Tests:
  - Update a concierge request and confirm the mirrored operator payload contains the expected fields.
  - Confirm core admin review still works when the Workspace adapter is offline.

61. **Workspace adapter governance and dry-run mode**
- As a technical owner, I want Google Workspace automation isolated behind a dry-run-capable adapter so we can evaluate it without binding core orchestration to an unstable dependency.
- Acceptance:
  - Adapter config can be disabled globally.
  - Dry-run mode shows the Gmail/Calendar/Docs/Sheets payloads before any external side effect.
  - The roadmap explicitly treats the Workspace adapter as post-core operator automation.
- Tests:
  - Trigger a dry-run and confirm no external write occurs while the payload remains inspectable.
  - Confirm the admin surface makes the adapter state visible.

62. **Admin Workspace automation console**
- As an operator, I want one admin section for Workspace automation settings and recent operator actions so I can inspect connectivity, dry-run state, and recent exported artifacts.
- Acceptance:
  - Admin exposes adapter status, enabled products, dry-run mode, and recent automation actions.
  - The surface is distinct from core orchestration and media controls.
  - Failures are logged as operator-visible events, not silent background errors.
- Tests:
  - Confirm Admin shows adapter configuration and recent action history.
  - Disable the adapter and confirm all core OS behavior still works normally.

---

## Prioritization Suggestion (MVP)
- **P0**: 2, 3, 4, 5, 7, 13, 15, 19, 21, 23, 25
- **P1**: 1, 6, 8, 9, 11, 12, 14, 16, 18, 20, 22, 24
- **P2**: 10, 17

## Coverage Closure Priority
- **P0 for persona-demo coverage**: 26, 27, 28, 29, 30, 31, 32

## Epic Q: Voice Runtime Hardening + External Voice Lanes

63. **Gemini Live runtime hardening**
- As a client, I want the default live voice concierge to respond reliably in real time so the OS can interview and coach me without feeling brittle.
- Acceptance:
  - Gemini Live is the default active voice lane.
  - Voice config supports transcription, interruption policy, and VAD tuning.
  - The runtime does not silently fall back to Sesame when Sesame is disabled.
- Tests:
  - Enable Gemini Live and confirm token/session config reflects the saved admin settings.
  - Disable Sesame and confirm live voice still resolves to Gemini Live rather than the legacy lane.

64. **Admin voice operating studio**
- As an operator, I want robust voice controls in admin so I can tune model, voice, transcriptions, and turn-taking without editing env vars.
- Acceptance:
  - Admin exposes official Gemini voice-name options, model selection, and activity/transcription controls.
  - Voice settings are ordered from runtime selection to identity to advanced tuning.
  - Admin clearly distinguishes active, disabled, and planned voice lanes.
- Tests:
  - Open Admin and confirm Gemini, Sesame, ElevenLabs, and Manus appear with the correct state labels.
  - Save a Gemini voice config change and confirm it persists into the next token/session request.

65. **Sesame feature-flagged off until dedicated service exists**
- As a technical owner, I want Sesame explicitly gated off so the demo does not rely on an undeployed or ambiguous runtime path.
- Acceptance:
  - Sesame is disabled by default.
  - Sesame cannot be selected as the live provider unless the flag is explicitly enabled.
  - Admin copy explains that Sesame remains blocked pending the dedicated Cloud Run service.
- Tests:
  - Load the admin config fresh and confirm Sesame defaults to off.
  - Attempt to set provider to Sesame while the flag is off and confirm runtime normalization routes back to Gemini Live.

66. **ElevenLabs secondary voice lane (queued)**
- As an operator, I want ElevenLabs planned as the second production-ready voice lane so we can add a premium alternative once credentials are supplied.
- Acceptance:
  - Backlog defines the adapter, secret storage, voice catalog, fallback policy, and admin controls needed for ElevenLabs.
  - The current product does not misrepresent ElevenLabs as already live.
- Tests:
  - Review the backlog/spec and confirm ElevenLabs scope is implementation-ready but still queued.
  - Confirm the admin surface labels ElevenLabs as planned, not active.

67. **Manus AI operator lane (queued)**
- As a system owner, I want Manus AI scoped as an operator-side integration so it can assist with research and workflow execution without becoming the system of record.
- Acceptance:
  - Manus is framed as an operator lane, not the canonical client memory or routing system.
  - Backlog defines adapter boundaries, approval discipline, and ledger write-back requirements.
- Tests:
  - Review the backlog/spec and confirm Manus scope is bounded to operator-side use cases.
  - Confirm the current client-facing OS does not expose a fake-live Manus lane.

68. **Shared sample-persona login password**
- As an operator, I want all seeded sample personas to share one known demo password so manual persona testing is fast when one-click launch is not the preferred path.
- Acceptance:
  - Sample persona auth creation and reseed flows set a default shared password.
  - Admin validation surfaces that password for operator use.
  - The seed script uses the same password by default unless overridden.
- Tests:
  - Reseed a persona and confirm manual email/password login succeeds with the shared password.
  - Run the seed script with `--auth` and confirm it no longer requires an explicit password argument.

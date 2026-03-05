# Career Concierge OS: V1 MVP Specification & Development Roadmap

**Version:** 1.0 **Date:** March 4, 2026 **Author:**   Third Signal Lab  **Repo:** `LenoxSaintGermain/career-concierge-suite` **Live POC:** `https://career-concierge-suite-480846059254.europe-west1.run.app/`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)  
2. [Source Intelligence](#2-source-intelligence)  
3. [Product Vision & Core Concepts](#3-product-vision--core-concepts)  
4. [User Personas](#4-user-personas)  
5. [End-to-End User Journey Map](#5-end-to-end-user-journey-map)  
6. [Current POC Architecture & Codebase Audit](#6-current-poc-architecture--codebase-audit)  
7. [V1 Feature Inventory](#7-v1-feature-inventory)  
8. [Epics, User Stories, Acceptance Criteria & Test Cases](#8-epics-user-stories-acceptance-criteria--test-cases)  
9. [Testing Strategy](#9-testing-strategy)  
10. [V1 Development Roadmap](#10-v1-development-roadmap)  
11. [Appendix A: Lucidchart Journey Map Extraction](#appendix-a-lucidchart-journey-map-extraction)  
12. [Appendix B: SkillSync Course Content Extraction](#appendix-b-skillsync-course-content-extraction)

---

## 1\. Executive Summary

This document is a comprehensive, agent-ready specification for evolving the Career Concierge Suite from its current proof-of-concept state into a V1 MVP suitable for an end-to-end investor demo. It was produced by synthesizing intelligence from five primary sources: the Lucidchart journey map (analyzed via video), the live GitHub codebase, four SkillSync course pages, the live GCP-hosted POC, and Jim's strategic meeting notes.

The V1 MVP is organized into **6 epics** containing **18 user stories**, each with detailed acceptance criteria and test cases. The development roadmap proposes a **4-sprint (8-week)** plan that prioritizes the core demo loop: **Intake to Professional DNA to Binge Episode to Agent Summary**. This spec is designed to be directly consumable by coding agents (Codex, Cursor, Manus, etc.) to execute against.

**The core demo loop that must work end-to-end for investors:**

Smart Start Intake (submitted) → Professional DNA (stored in Firestore) → Suite Artifacts Generated (Brief, Plan, Profile, AI Profile, Gaps) → Binge Episode Generated (personalized micro-drama) → Chief of Staff Agent Summary (logged recommendations)

---

## 2\. Source Intelligence

The following sources were analyzed to produce this specification. Each source contributed a distinct layer of intelligence.

| Source | What It Provided | Key Artifacts Extracted |
| :---- | :---- | :---- |
| **Lucidchart Video** (40MB, analyzed via Gemini 2.5 Flash) | The complete journey map, all UI screens, user flows, tile definitions, data flows, and system annotations. | 11 journey stages, 11+ UI screens, 6 user flows, 15 dashboard tiles, 7 AI agent components, 10+ annotations. |
| **GitHub Repo** (`career-concierge-suite`) | The current production codebase, including frontend components, backend API, type definitions, module configuration, and prompt library. | 11 suite modules, 11 API endpoints, Firestore schema, admin config defaults, concierge ROM prompt, voice routing. |
| **SkillSync Course Pages** (4 pages) | The existing course structure, module content, and curriculum tiers (Foundation, Select, Premier). | 7-module curriculum structure (Assessment, Gap Analysis, Insights, Resource Guide, Training Plan, Bespoke Course), video lesson format. |
| **Jim's Notes** (33 pages) | Strategic context, product concepts, architectural decisions, and the existing epic/story backlog from team meetings. | 5 core concepts (DNA, Agent-as-Position, Binge Learning, Chief of Staff, Silent Migration), 7 epics, 4-week sprint plan, Firestore schema, GCP playbook. |
| **Live POC** (GCP Cloud Run) | The current deployed state of the application, confirming login flow and authentication requirements. | Firebase Auth login screen, private client access model. |

---

## 3\. Product Vision & Core Concepts

Career Concierge OS is an editorial, cinematic, OS-like workspace for concierge-led career acceleration. It is the production fork of Signal Atlas, carrying forward the editorial grid, module pattern, and agentic UX direction into a dedicated product. The design target is explicitly **Apple UX meets Salesforce capability depth**: clean, narrative-driven, and smooth on the surface, with robust, configurable, and deeply functional systems underneath.

The V1 MVP is built on five foundational concepts:

**Professional DNA.** The user's intake data is the single source of truth. It is a living, queryable dataset stored in Firestore, not a static PDF. Every downstream agent, artifact, and recommendation is grounded in this canonical data. The intake is the "blood sample" from which the entire system operates.

**Agent-as-Position.** AI agents are not prompts; they are positions. Each agent has a defined role, a system prompt (its "CV"), explicit parameters, and guardrails. This reframing enables predictable outputs, auditable behavior, and easier upgrades. It transforms prompt engineering from scripting into hiring.

**Binge Learning.** Training content is not delivered as boring courses. It is delivered as engaging, Netflix-style micro-dramas personalized to the user's DNA. Each episode is a "hook card, lesson swipes, challenge terminal, reward asset, cliffhanger" sequence designed to create dopamine-driven habit formation and retention.

**Chief of Staff Orchestration.** A primary "Chief of Staff" agent orchestrates a team of specialized vertical agents (intake, resume review, marketing, etc.). This architecture maps directly to subscription tiers (single-agent vs. staff subscription) and provides a clear model for scaling capabilities.

**Silent V2 Migration.** The user should never feel a disruptive migration. The core deliverables (DNA, Gap Analysis, Report) remain the same while the underlying experience and orchestration silently improve. This principle guides the transition from the current POC to the agentic V2.

---

## 4\. User Personas

| Persona | Description | Primary Intent | Key Modules |
| :---- | :---- | :---- | :---- |
| **The Career Accelerator** | Mid-to-senior professional actively seeking advancement or transition. | "Move into a specific next role." | Intake, Brief, Plan, CJS Execution, Assets |
| **The Skill-Sharpener** | Professional who wants to stay current with AI and industry trends without active job searching. | "Stay sharp in my current role." | Intake, AI Profile, Gaps, Readiness, Episodes |
| **The Direction-Seeker** | Professional feeling stalled or uncertain, looking for structured guidance. | "I'm not sure yet, help me design a direction." | Intake, Brief, Profile, MyConcierge, Plan |
| **The Concierge/Admin** | Internal operator managing clients, agents, and system configuration. | Ensure high-quality user experience and operational health. | Admin Console, Client Management |

---

## 5\. End-to-End User Journey Map

The user journey is a multi-stage process designed as a continuous loop of assessment, planning, and execution. The following map is derived from the Lucidchart analysis and validated against the codebase.

### Stage 1: Awareness & Entry

The user discovers the service through paid ads, social media, or direct navigation and lands on the SkillSync AI landing page. The page presents the tagline: *"Most careers don't collapse. They quietly stall."* The user clicks "CAREER CONCIERGE SUITE" to begin.

### Stage 2: Account Creation & Tier Selection

The user interacts with the AI Concierge (Voice Module), which introduces the service and collects basic information. The user selects their tier (Premier, Pro, Startup, Enterprise) and provides their name, email, current/prospective title, industry, and optionally uploads a resume.

### Stage 3: Smart Start Intake (Conversational Flow)

This is the core data-gathering phase, implemented in `IntakeFlow.tsx`. The flow has three sub-stages:

1. **Career Aspirations** ("Start Here"): The user answers questions about their current role, target industry, career direction, pressures, work style, and constraints. These map directly to the `INTAKE_QUESTIONS` in `constants.ts`.  
2. **Preferences** ("How should this feel?"): The user selects their preferred engagement style from options like STRAIGHT, FORWARD, STORY, JOB SEARCH, SKILLS, LEADERSHIP.  
3. **Suite Preparation** ("Preparing your suite..."): The system processes the intake data and generates the user's initial artifacts. Progress indicators show the status for "Your Profile," "Your AI Profile," and "Your Gaps."

### Stage 4: The Brief & The Plan

Upon completion of the intake, the user is presented with **The Brief** (`BriefView.tsx`), which contains:

- **What I Learned**: A summary of the user's current state, objectives, and primary resistance.  
- **What Matters Most (Values)**: The user's core professional values, distilled.  
- **Next Steps to Eliminate Chaos**: Immediate, high-leverage actions.

From The Brief, the user navigates to **Your Plan** (`PlanView.tsx`), which contains:

- **Next 72 Hours**: Concrete objectives and actions (e.g., "Update LinkedIn profile").  
- **2-Week Sprint**: Daily and weekly actions for sustained momentum.  
- **What I Need From You**: Inputs required from the user (resume, project list, target companies).

### Stage 5: Module Engagement (The Grid)

The user now has access to the full suite of modules, presented as a grid of tiles on the dashboard. The modules, as defined in `suite/modules.ts`, are:

| Index | Module | Kind | Description |
| :---- | :---- | :---- | :---- |
| 01 | Start Here (Intake) | Flow | A short concierge conversation to calibrate your suite. |
| 02 | Episodes | Feed | A bingeable feed of micro-dramas that upgrades your instincts. |
| 03 | The Brief | Artifact | What I learned, what matters most, and your next 72 hours. |
| 04 | Your Suite, Distilled | Artifact | Two-column strategic map: what I learned and what needs to happen. |
| 05 | Your Profile | Artifact | Professional DNA: strengths, patterns, and leverage points. |
| 06 | Your AI Profile | Artifact | How you should use AI, based on how you work and decide. |
| 07 | Your Gaps | Artifact | What's missing, what's noisy, and what to tighten first. |
| 08 | AI Readiness | Artifact | Executive readiness report and curriculum tier routing. |
| 09 | ConciergeJobSearch | Artifact | Execution rail: resume, strategy, apply, interview, negotiation. |
| 10 | Your Plan | Artifact | 72 hours of momentum, then a 2-week sprint. |
| 11 | Your Assets | Collection | Resume versions, outreach drafts, scripts, and links. |

Additional tiles identified in the Lucidchart map but not yet in the codebase include: **SkillSync AI TV**, **Flash Cards**, **Events & Networking**, and **Telescope**.

### Stage 6: Binge Learning & Ongoing Engagement

The user consumes personalized "Episodes" generated by the `POST /v1/binge/episode` endpoint. Each episode follows a strict structure: hook card, lesson swipes, challenge terminal, reward asset, and cliffhanger. The user can also interact with their MyConcierge for ongoing guidance.

---

## 6\. Current POC Architecture & Codebase Audit

### 6.1 Technology Stack

| Layer | Technology | Notes |
| :---- | :---- | :---- |
| **Frontend** | Vite \+ React \+ TypeScript | Single-page application with Firebase client SDK. |
| **Backend API** | Express.js (Node.js) on Cloud Run | 11 endpoints. Handles auth, generation, voice, and admin. |
| **Database** | Firestore (Native mode) | Database ID: `career-concierge`. Collections: `clients`, `system`. |
| **Auth** | Firebase Authentication | Email/password login. Admin roles via custom claims. |
| **AI Models** | Google Gemini (via `@google/genai`) | `gemini-3-flash-preview` for text, `gemini-2.5-flash-image-preview` for images, `veo-3.1-generate-preview` for video. |
| **Voice** | Sesame / Gemini Live | Configurable via admin console. |
| **Hosting** | Google Cloud Run | Region: `europe-west1`. Project: `ssai-f6191`. |

### 6.2 API Endpoints

| Method | Path | Auth | Purpose |
| :---- | :---- | :---- | :---- |
| `GET` | `/health` | None | Health check. |
| `GET` | `/v1/public/config` | None | Fetch public configuration. |
| `GET` | `/v1/admin/config` | Admin | Fetch full admin configuration. |
| `PUT` | `/v1/admin/config` | Admin | Update admin configuration. |
| `POST` | `/v1/live/token` | User | Generate a Gemini Live token. |
| `POST` | `/v1/voice/synthesize` | User | Synthesize concierge voice narration. |
| `POST` | `/v1/suite/generate` | User | Generate all core suite artifacts from intake. |
| `GET` | `/v1/media/library` | User | Fetch the curated media library. |
| `POST` | `/v1/binge/episode` | User | Generate a single binge-learning episode. |
| `POST` | `/v1/binge/media-pack` | User | Generate media assets for an episode. |
| `POST` | `/v1/binge/media-pack/video-status` | User | Check video generation status. |

### 6.3 Firestore Data Model

The primary data model is organized around `clients` and `system` collections.

system/

  career-concierge-config    \# Global app configuration (models, prompts, flags)

clients/

  {clientId}/

    \# Client profile data (name, email, intake answers, etc.)

    artifacts/

      brief                  \# The Brief artifact content

      plan                   \# Your Plan artifact content

      profile                \# Professional DNA profile

      ai\_profile             \# AI usage guidance

      gaps                   \# Gap analysis

      suite\_distilled        \# Two-column strategic map

      readiness              \# AI Readiness report

      cjs\_execution          \# ConciergeJobSearch execution data

      episodes               \# Generated binge-learning episodes

### 6.4 Key Code Files

| File | Purpose |
| :---- | :---- |
| `App.tsx` | Main application component. Handles routing, module grid, and artifact display. |
| `constants.ts` | Defines `INTAKE_QUESTIONS` — the canonical list of intake fields. |
| `types.ts` | TypeScript type definitions for all data structures. |
| `suite/modules.ts` | Defines the `SUITE_MODULES` array — the canonical list of modules. |
| `api/index.js` | The backend API. All 11 endpoints, admin config, and generation logic. |
| `api/prompts/conciergeRom.js` | The Concierge ROM (Read-Only Memory) — the core system prompt and tone guard. |
| `services/suiteApi.ts` | Frontend service for calling the suite generation API. |
| `services/bingeApi.ts` | Frontend service for calling the binge episode API. |
| `services/firebase.ts` | Firebase client initialization. |
| `components/IntakeFlow.tsx` | The Smart Start Intake conversational UI. |
| `components/BingeFeedView.tsx` | The binge-learning episode feed UI. |
| `components/AdminConsole.tsx` | The admin configuration console. |

---

## 7\. V1 Feature Inventory

This inventory catalogs all features identified across all sources, categorized by their current implementation status.

| Feature | Source | Status | Priority |
| :---- | :---- | :---- | :---- |
| Smart Start Intake (Conversational UI) | Lucidchart, Codebase, Notes | **Implemented** | P0 |
| Suite Artifact Generation (Brief, Plan, Profile, AI Profile, Gaps) | Codebase, Notes | **Implemented** | P0 |
| Binge Learning Episode Generation | Codebase, Notes | **Implemented** | P0 |
| Module Grid Dashboard | Lucidchart, Codebase | **Implemented** | P0 |
| Firebase Auth (Login/Logout) | Codebase | **Implemented** | P0 |
| Admin Console (Config, Prompts, Flags) | Codebase | **Implemented** | P1 |
| Voice Synthesis (Sesame/Gemini Live) | Codebase | **Implemented** | P1 |
| Media Pack Generation (Image/Video) | Codebase | **Implemented** | P1 |
| Suite Distilled View | Codebase | **Implemented** | P1 |
| AI Readiness Report | Codebase, Lucidchart | **Implemented** | P1 |
| ConciergeJobSearch Execution Rail | Lucidchart, Codebase, Notes | **Partial** (view exists, no agent logic) | P2 |
| Your Assets Workspace | Codebase | **Placeholder** | P2 |
| Agent-as-Position Framework | Notes | **Not Started** | P0 |
| Chief of Staff Agent | Notes | **Not Started** | P0 |
| Memory/RAG System | Notes | **Not Started** | P1 |
| MyConcierge (Human/AI toggle) | Lucidchart | **Not Started** | P2 |
| SkillSync AI TV | Lucidchart | **Not Started** | P3 |
| Flash Cards | Lucidchart | **Not Started** | P3 |
| Events & Networking | Lucidchart | **Not Started** | P3 |
| Telescope | Lucidchart | **Not Started** | P3 |

---

## 8\. Epics, User Stories, Acceptance Criteria & Test Cases

### Epic E01: Smart Start Intake & Professional DNA (P0)

**Goal:** Capture a user's canonical "Professional DNA" through a conversational intake process and store it as the single source of truth in Firestore.

**E01-S01: New User Intake**

As a **new user**, I want to complete a conversational "Smart Start" intake so that the system can create my initial Professional DNA.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The intake flow is presented as a conversational UI, matching the design in `IntakeFlow.tsx`. |
| AC-2 | The flow captures all fields defined in `constants.ts` under `INTAKE_QUESTIONS`, including `current_title`, `industry`, `target`, `pressure_breaks`, `work_style`, `constraints`, `ai_experience`, `core_interests`, `advanced_interests`, and `learning_modalities`. |
| AC-3 | The user selects an intent (Stay sharp, Move to next role, Design direction) and preferences (pace, focus). |
| AC-4 | Upon submission, a new document is created in the `clients/{clientId}` collection in Firestore containing all intake answers. |
| AC-5 | The system displays a "Preparing your suite..." screen with progress indicators for Profile, AI Profile, and Gaps. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-01 | Complete the intake flow with all fields filled. | User document created in Firestore with all fields populated. |
| T-02 | Submit intake with only required fields (leave optional fields blank). | User document created; optional fields are empty strings or null. |
| T-03 | Attempt to proceed past a required field without filling it. | UI displays validation error; user cannot proceed. |
| T-04 | Verify Firestore document structure matches `IntakeAnswers` type. | All keys in the Firestore document match the TypeScript type definition. |

---

**E01-S02: Returning User Intake**

As a **returning user**, I want the system to recognize me and allow me to continue or restart the intake process.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | If a user is already logged in and has completed the intake, the system shows their dashboard with all modules. |
| AC-2 | If a user is logged in and has NOT completed the intake, the system directs them to the intake flow. |
| AC-3 | A "Regenerate via Intake" button is available on any module that has a missing artifact, allowing the user to re-run the intake. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-05 | Log in as a user who has completed intake. | Dashboard with module grid is displayed. |
| T-06 | Log in as a user who has NOT completed intake. | Intake flow is displayed. |
| T-07 | Click "Regenerate via Intake" on a module with a missing artifact. | Intake flow opens. |

---

**E01-S03: Suite Artifact Generation Trigger**

As a **developer**, I want the intake submission to trigger the generation of all core suite artifacts via the backend API.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | Upon successful intake submission, the frontend calls `POST /v1/suite/generate`. |
| AC-2 | The payload includes the user's `intent`, `preferences`, and the full `answers` object. |
| AC-3 | The API generates and saves `brief`, `plan`, `profile`, `ai_profile`, and `gaps` artifacts to `clients/{clientId}/artifacts`. |
| AC-4 | The `composeSuitePrompt` function in `conciergeRom.js` is used to construct the generation prompt. |
| AC-5 | The generated content adheres to the tone guard rules (no hype, no startup slang, no excess punctuation). |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-08 | Submit a valid intake and check Firestore for all 5 artifact documents. | All 5 artifacts exist with non-empty content. |
| T-09 | Inspect the generated content for tone guard violations. | No violations detected by the `findToneViolations` function. |
| T-10 | Submit intake with minimal data and verify artifacts are still generated. | Artifacts are generated with reasonable defaults for missing data. |

---

### Epic E02: Agentic Framework & Orchestration (P0)

**Goal:** Establish the core agent-as-position framework, enabling a Chief of Staff agent to manage and orchestrate specialized vertical agents.

**E02-S01: Agent Role Definition**

As an **agent developer**, I want to define agent roles with specific system prompts, parameters, and guardrails in Firestore so that their behavior is predictable and controllable.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | A new Firestore collection named `agents` is created. |
| AC-2 | Each document in the `agents` collection conforms to the schema: `{ role: string, systemPrompt: string, maxTokens: number, allowedActions: string[], owner: string, parameters: object }`. |
| AC-3 | The `conciergeRom.js` prompt library is used as the basis for the `systemPrompt` content for the initial agents. |
| AC-4 | At minimum, the following agents are defined: `chief_of_staff`, `resume_reviewer`, `episode_showrunner`. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-11 | Query the `agents` collection and verify that all required agents exist. | Documents for `chief_of_staff`, `resume_reviewer`, and `episode_showrunner` are present. |
| T-12 | Validate the schema of each agent document against the defined type. | All documents conform to the schema. |

---

**E02-S02: Agent DNA Access**

As the **Chief of Staff agent**, I want to be able to read a user's Professional DNA from Firestore to inform my actions and recommendations.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The agent has read-only access to the `clients/{clientId}` collection. |
| AC-2 | The agent's core logic can fetch and parse the DNA document for a given user. |
| AC-3 | The agent can also read the user's existing artifacts (brief, plan, etc.) for context. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-13 | Simulate the agent fetching a sample DNA document. | The agent successfully retrieves and parses the document. |
| T-14 | Attempt to have the agent write to the `clients` collection. | The operation fails due to Firestore security rules. |

---

**E02-S03: Agent Summary & Logging**

As the **Chief of Staff agent**, I want to produce a human-readable summary of a user's DNA and log my recommended next steps.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | When triggered, the agent generates a concise summary of the user's DNA. |
| AC-2 | The agent generates a list of 3-5 recommended next actions for the user. |
| AC-3 | Both the summary and recommendations are stored in a new document in `clients/{clientId}/interactions`. |
| AC-4 | The interaction log includes `timestamp`, `agentId`, `summary`, and `recommendations` fields. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-15 | Trigger the Chief of Staff agent for a sample user. | A new interaction log document is created. |
| T-16 | Validate the content of the interaction log. | The summary is coherent, and the recommendations are actionable and relevant to the user's DNA. |

---

**E02-S04: Human-in-the-Loop Validation**

As an **operator**, I want human-in-the-loop validation for any agent action that issues outbound communications (emails, LinkedIn posts).

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | Any agent action that produces outbound content (email, message, post) must be flagged with a `pending_approval` status. |
| AC-2 | The admin console must display a queue of pending agent actions. |
| AC-3 | An admin can approve or reject each pending action. |
| AC-4 | Only approved actions are executed. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-17 | Trigger an agent action that would produce an outbound email. | The action is flagged as `pending_approval` and appears in the admin queue. |
| T-18 | Approve a pending action in the admin console. | The action is executed (or marked as executed for MVP). |
| T-19 | Reject a pending action. | The action is discarded and removed from the queue. |

---

### Epic E03: Binge Learning Episode Generation (P0 demo)

**Goal:** Implement the pipeline for generating personalized, engaging "Binge Learning" episodes based on a user's DNA and a target skill.

**E03-S01: Pilot Episode Generation**

As a **user**, I want the system to generate a pilot episode based on my DNA so I can experience binge-learning.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | A trigger (button or automatic) is available in the UI to initiate episode generation. |
| AC-2 | The `POST /v1/binge/episode` endpoint is called with the user's DNA and a target skill. |
| AC-3 | The generated episode is saved to the `clients/{clientId}/artifacts/episodes` collection. |
| AC-4 | The episode content is displayed in the `BingeFeedView.tsx` component. |
| AC-5 | The episode follows the required structure: `episode_id`, `title`, `hook_card`, `lesson_swipes` (3), `challenge_terminal`, `reward_asset`, `cliffhanger`. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-20 | Trigger episode generation for a sample user. | Episode artifact is created in Firestore with all required fields. |
| T-21 | Verify the episode is displayed in the UI. | The `BingeFeedView` renders the episode with hook, swipes, challenge, and cliffhanger. |
| T-22 | Generate episodes with different target skills. | Each episode's content is relevant to the specified target skill. |

---

**E03-S02: Episode Template Engine**

As an **engineer**, I want a recipe/template engine for episodes so they follow a consistent structure.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The `composeBingePrompt` function in `conciergeRom.js` is used to structure the prompt. |
| AC-2 | The prompt enforces the consistent episode structure via a JSON schema (`BINGE_EPISODE_SCHEMA`). |
| AC-3 | The `composeBingeSystemInstruction` function is used to set the system instruction, including the B.I.N.G.E\_LEARNING\_PROTOCOL rules. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-23 | Generate 5 episodes and compare their structures. | All 5 episodes have the same set of top-level keys and follow the same structural pattern. |
| T-24 | Verify that the B.I.N.G.E rules are followed (no academic language, hyper-personalized, starts with urgency). | Generated content does not contain words like "module," "syllabus," "test," or "quiz." |

---

**E03-S03: Model Cost Control**

As a **cost controller**, I want to be able to configure different AI models for draft and final generation to manage costs.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The admin console provides an option to select the `binge_model` from a list of available models. |
| AC-2 | The `POST /v1/binge/episode` endpoint uses the model specified in the admin configuration. |
| AC-3 | The admin console also provides a `binge_temperature` slider. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-25 | Change the `binge_model` in the admin console and generate an episode. | The API logs confirm the new model was used. |
| T-26 | Set the `binge_temperature` to 0.1 and then to 0.9 and compare outputs. | Lower temperature produces more predictable output; higher temperature produces more creative output. |

---

### Epic E04: Core Suite Artifacts & UI (P1)

**Goal:** Develop the user-facing UI for the core suite of artifacts, presented in a modular grid.

**E04-S01: Module Grid Dashboard**

As a **logged-in user**, I want to see a home screen with a grid of tiles representing my available suite modules so I can easily navigate the application.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The main application view displays a grid of modules as defined in `suite/modules.ts`. |
| AC-2 | Each tile displays the module's index, title, subtitle, and kind. |
| AC-3 | Clicking on a tile opens the corresponding module view in a side panel or full-screen view. |
| AC-4 | Modules that require intake completion are visually locked until the intake is done. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-27 | Log in and verify the module grid displays all 11 modules. | All modules from `SUITE_MODULES` are visible. |
| T-28 | Click on each tile and verify navigation to the correct view. | Each tile opens its corresponding component. |
| T-29 | Log in as a user who has NOT completed intake. | Modules other than "Start Here" are visually locked. |

---

**E04-S02: Artifact Views**

As a **user**, I want to be able to view all my generated artifacts in a consistent and readable format.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | Each artifact view (`BriefView`, `PlanView`, `ProfileView`, `AIProfileView`, `GapsView`, `ReadinessView`, `SuiteDistilledView`, `CjsExecutionView`) correctly renders its content from Firestore. |
| AC-2 | The styling is consistent with the editorial, cinematic design language. |
| AC-3 | If an artifact has not been generated, the UI displays a "Missing" message with a "Regenerate via Intake" button. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-30 | Generate a full set of artifacts and verify each view renders correctly. | All views display content without errors. |
| T-31 | Delete an artifact from Firestore and reload the page. | The "Missing" message is displayed with the regeneration button. |

---

**E04-S03: Mobile-First Responsive Design**

As a **user**, I want the application to be fully responsive and usable on mobile devices.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | All UI components are fully responsive and adapt to screen widths from 320px to 1920px. |
| AC-2 | The module grid collapses to a single column on mobile. |
| AC-3 | The intake flow is fully usable on a mobile device. |
| AC-4 | Artifact views are readable on mobile without horizontal scrolling. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-32 | Test the application at 375px width (iPhone SE). | Layout is clean, no horizontal overflow, all text is readable. |
| T-33 | Complete the full intake flow on a simulated mobile device. | All steps are completable without layout issues. |
| T-34 | View each artifact on a simulated mobile device. | Content is readable and properly formatted. |

---

### Epic E05: Admin Console & System Ops (P1)

**Goal:** Build the first-class admin console for managing system configuration, including model routing, prompts, and feature flags.

**E05-S01: Secure Admin Access**

As an **admin**, I want to access a secure admin console to manage the application's configuration.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | Access to the admin console is restricted to users whose email is in the `ADMIN_EMAILS` environment variable. |
| AC-2 | The admin console provides controls for all configuration options in `DEFAULT_APP_CONFIG`. |
| AC-3 | Changes are saved via `PUT /v1/admin/config` and persisted to `system/career-concierge-config`. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-35 | Attempt to access admin console as a non-admin user. | Access is denied. |
| T-36 | Log in as an admin and change a configuration value. | Value is saved to Firestore and reflected on next page load. |

---

**E05-S02: Prompt Management**

As an **admin**, I want to update the system prompts used for generation without redeploying.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The admin console provides text areas for `suite_appendix`, `binge_appendix`, `rom_appendix`, `live_appendix`, and `art_director_appendix`. |
| AC-2 | The backend API reads the latest prompt appendices from Firestore config before each generation call. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-37 | Add a unique keyword to `suite_appendix` and trigger suite generation. | The generated output includes the keyword. |

---

**E05-S03: Feature Flags**

As an **admin**, I want to enable or disable features using feature flags.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The admin console provides toggles for `show_prologue`, `episodes_enabled`, `cjs_enabled`, and `media.enabled`. |
| AC-2 | The frontend reads the public config and hides/shows features accordingly. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-38 | Disable `episodes_enabled` and verify the Episodes module is hidden. | The Episodes tile is not visible on the dashboard. |
| T-39 | Disable `cjs_enabled` and verify the CJS module is hidden. | The ConciergeJobSearch tile is not visible. |

---

### Epic E06: ConciergeJobSearch (CJS) Execution Rail (P2)

**Goal:** Implement the foundational features of the CJS execution rail.

**E06-S01: Resume Upload**

As a **user**, I want to upload my resume for analysis and optimization.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The CJS execution view provides a file upload component for resumes (PDF, DOCX). |
| AC-2 | The uploaded resume is stored in a Cloud Storage bucket. |
| AC-3 | The path to the stored resume is saved in the user's client document in Firestore. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-40 | Upload a PDF resume and verify storage. | File exists in Cloud Storage; path is in Firestore. |
| T-41 | Upload a DOCX resume and verify storage. | File exists in Cloud Storage; path is in Firestore. |
| T-42 | Attempt to upload an unsupported file type. | Upload is rejected with an error message. |

---

**E06-S02: Resume Review Agent**

As a **Resume Reviewer agent**, I want to access a user's resume and provide optimization suggestions.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | The Resume Reviewer agent reads the resume from Cloud Storage. |
| AC-2 | The agent analyzes the resume against the user's target role (from DNA). |
| AC-3 | The agent produces specific, actionable suggestions stored as a `resume_review` artifact. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-43 | Trigger the Resume Reviewer for a user with an uploaded resume. | A `resume_review` artifact is created with actionable suggestions. |
| T-44 | Trigger the agent for a user without a resume. | The agent returns a message indicating no resume is available. |

---

**E06-S03: Search Strategy Generation**

As a **user**, I want to receive a multi-channel job search strategy based on my profile and target role.

| AC \# | Acceptance Criteria |
| :---- | :---- |
| AC-1 | A "Search Strategist" agent analyzes the user's DNA and target role. |
| AC-2 | The agent generates a strategy including online platforms, recruiter platforms, and direct company applications. |
| AC-3 | The strategy is stored as a `search_strategy` artifact. |

| Test ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| T-45 | Trigger the Search Strategist for a sample user. | A `search_strategy` artifact is created with personalized channel recommendations. |

---

## 9\. Testing Strategy

Quality assurance will follow a multi-layered approach, prioritizing the end-to-end user journey and the application's flow.

| Layer | Scope | Tools | Responsibility |
| :---- | :---- | :---- | :---- |
| **Unit** | Individual functions, utilities, prompt composition, tone guard. | Jest, Vitest | Developer |
| **Integration** | API endpoints, Firestore read/write, Firebase Auth flows. | Supertest, Firebase Emulators | Developer |
| **E2E** | Full user journeys: Intake to Artifact to Episode to Agent Summary. | Playwright | QA / Developer |
| **Manual QA** | Visual polish, mobile responsiveness, UX flow, edge cases. | Browser DevTools, real devices | QA |
| **Tone Guard** | Automated check on all generated content for brand compliance. | `findToneViolations()` function | Automated (CI) |

---

## 10\. V1 Development Roadmap

### Sprint 1 (Weeks 1-2): Foundation & Intake

| Story | Description | Estimate |
| :---- | :---- | :---- |
| E01-S01 | New User Intake | M |
| E01-S02 | Returning User Intake | S |
| E02-S01 | Agent Role Definition | S |
| E05-S01 | Secure Admin Access | M |

**Sprint Goal:** A new user can sign up, complete the intake, and have their Professional DNA stored in Firestore. Agent definitions exist. Admin console is functional.

### Sprint 2 (Weeks 3-4): Core Artifacts & Agent Logic

| Story | Description | Estimate |
| :---- | :---- | :---- |
| E01-S03 | Suite Artifact Generation Trigger | M |
| E02-S02 | Agent DNA Access | M |
| E02-S03 | Agent Summary & Logging | M |
| E04-S01 | Module Grid Dashboard | M |
| E04-S02 | Artifact Views | L |

**Sprint Goal:** A user can see their generated Brief and Plan. The Chief of Staff agent can read DNA and log a summary. The module grid is functional.

### Sprint 3 (Weeks 5-6): Binge Learning & UI Polish

| Story | Description | Estimate |
| :---- | :---- | :---- |
| E03-S01 | Pilot Episode Generation | L |
| E03-S02 | Episode Template Engine | M |
| E04-S03 | Mobile-First Responsive Design | M |
| E05-S02 | Prompt Management | S |

**Sprint Goal:** A user can generate and view a personalized Binge Learning episode. The UI is mobile-responsive and polished. Prompts are manageable via admin.

### Sprint 4 (Weeks 7-8): CJS Rail, Flags & Demo Polish

| Story | Description | Estimate |
| :---- | :---- | :---- |
| E02-S04 | Human-in-the-Loop Validation | M |
| E03-S03 | Model Cost Control | S |
| E05-S03 | Feature Flags | S |
| E06-S01 | Resume Upload | M |
| E06-S02 | Resume Review Agent | M |
| E06-S03 | Search Strategy Generation | M |

**Sprint Goal:** The CJS execution rail has basic functionality. Feature flags work. Human-in-the-loop is in place. The V1 MVP is feature-complete for the investor demo.

### Demo Readiness Checklist

The investor demo must show the following end-to-end flow:

- [ ] Smart Start Intake submitted successfully  
- [ ] Firestore shows user document and DNA  
- [ ] All 5 core artifacts generated (Brief, Plan, Profile, AI Profile, Gaps)  
- [ ] Module grid displays all modules with correct lock/unlock states  
- [ ] Each artifact view renders correctly  
- [ ] Binge episode generated and displayed in feed  
- [ ] Chief of Staff agent produces a summary and logs recommendations  
- [ ] Admin console is functional with model routing and prompt management  
- [ ] Mobile-responsive design confirmed  
- [ ] Tone guard passes on all generated content

---

## Appendix A: Lucidchart Journey Map Extraction

The full extraction from the Lucidchart video analysis is available in the companion file: `lucidchart_analysis.md`. Key highlights include:

**Dashboard Tiles (15 total):** 01 Smart Start Intake (Flow), 02 Profile/Episodes (Feed), 03 Professional DNA/The Brief (Artifact), 04 AI Assessment/Your Profile (Artifact), 05 AI Gap Analysis/Your AI Profile (Artifact), 06 AI Insight Report/Your Gaps (Artifact), 07 AI Training Plan/Your Plan (Artifact), 08 Bespoke AI Course/Your Assets (Collection), 09 MyConcierge/Your Partner (Add), SkillSync AI TV (Add), Flash Cards (TBD), Events & Networking (Add), Telescope (Add), TBD, TBD.

**SSAI Process Steps (7):**

1. Smart Start Intake, 2\. AI Assessment, 3\. AI Gap Analysis, 4\. AI Insights Report, 5\. AI Resource Guide, 6\. AI Training Plan, 7\. Bespoke AI Course.

**CJS Process Steps (7):**

1. Smart Start Intake, 2\. Resume Optimization, 3\. Search Strategy, 4\. Search & Apply, 5\. Employer Insight Reports, 6\. Interview Preparation, 7\. Salary Negotiation.

---

## Appendix B: SkillSync Course Content Extraction

The SkillSync course pages (specifically the Donell Woodson page, which was the most accessible) reveal the existing curriculum structure that the V1 MVP must support:

**Curriculum Tiers:**

| Tier | Modules | Content |
| :---- | :---- | :---- |
| **SkillSync AI Foundation** | Module 1: AI Readiness Assessment, Module 2: AI Gap Analysis | Video walkthroughs of personalized assessments. PDF/Audio download of reports. |
| **SkillSync AI Select** | Module 3: Strategic AI Insights Report, Module 4: Integrated AI Resource Guide | Interpretation of assessment results. Curated learning resources. |
| **SkillSync AI Premier** | Module 5: Holistic AI Training Plan, Module 6: Bespoke AI Course, Congratulations | Customized roadmap. Hands-on, immersive learning journey. |

**Key Observations:** The existing course content is video-based, with each module being a narrated walkthrough of a personalized report or plan. The V1 MVP should aim to replace these static video walkthroughs with dynamic, interactive artifact views powered by the agentic generation pipeline.

---

*End of Specification*  

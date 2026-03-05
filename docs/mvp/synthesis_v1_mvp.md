# V1 MVP Synthesis: Journey Map & Feature Inventory

## 1\. Introduction

This document synthesizes all available intelligence—from the Lucidchart journey map, the existing POC codebase, live web properties, and strategic notes—to create a unified view of the Career Concierge V1 MVP. It defines the core product vision, user personas, end-to-end user journey, and a comprehensive feature inventory. This synthesis will serve as the foundational blueprint for developing the detailed V2 specification.

## 2\. Core Product Vision & Concepts

The V1 MVP is centered on a core loop: capturing a user's professional essence, analyzing it to find gaps and opportunities, and delivering personalized, engaging content and a clear action plan. The guiding principles are:

| Concept | Description |
| :---- | :---- |
| **Professional DNA** | The user's intake data is the single source of truth, a living, queryable dataset stored in Firestore, not a static PDF. |
| **Agent-as-Position** | AI agents are treated as employees with defined roles, responsibilities, and guardrails, ensuring predictable and safe operation. |
| **Binge Learning** | Training content is delivered as engaging, Netflix-style micro-dramas personalized to the user's DNA to drive habit formation. |
| **Chief of Staff Agent** | A primary agent orchestrates a team of specialized vertical agents (e.g., intake, resume, marketing) to manage the user's journey. |
| **Silent V2 Migration** | The underlying agentic architecture can be upgraded without disrupting the user's experience or core deliverables. |

## 3\. User Personas

Based on the available materials, we can identify the following key user personas:

| Persona | Description | Key Goals |
| :---- | :---- | :---- |
| **The Career Accelerator** | A mid-to-senior level professional actively seeking to advance their career, either by moving up in their current role or transitioning to a new one. | Gain a competitive edge, identify and close skill gaps, receive a clear, actionable plan for advancement. |
| **The Skill-Sharpener** | A professional who is not actively job searching but wants to stay current with industry trends and AI capabilities to remain relevant and effective. | Understand emerging AI trends, identify areas for upskilling, receive personalized learning content. |
| **The Direction-Seeker** | A professional who feels stalled or uncertain about their next career move and is looking for guidance and a structured path forward. | Gain clarity on career direction, identify strengths and weaknesses, receive a personalized roadmap. |
| **The Concierge/Admin** | An internal operator responsible for managing clients, overseeing agent actions, and ensuring a high-quality user experience. | Onboard new clients, monitor user progress, manage agent configurations, intervene when necessary. |

## 4\. End-to-End User Journey Map

The user journey is a multi-stage process that takes a user from initial awareness to deep engagement with the Career Concierge suite. The flow is designed to be a continuous loop of assessment, planning, and execution, guided by both AI and human concierge touchpoints.

**Stage 1: Awareness & Initial Intake**

1. **Entry Point**: The user discovers the service through paid ads, social media, or direct navigation and lands on a SkillSync AI page.  
2. **Account Creation & Scheduling**: The user signs up, provides basic information (name, email, title, industry), and schedules their 30-minute "Smart Start Intake" session with a concierge.  
3. **Smart Start Intake (Conversational UI)**: This is the core data-gathering phase. The user interacts with a conversational agent to define:  
   * **Career Aspirations**: Current role, target role, industry, pressures, and constraints.  
   * **Feel & Preferences**: The desired tone and focus of the engagement (e.g., Straight, Story, Job Search).  
   * **Intent**: The primary goal (e.g., Stay sharp, Move to next role, Design direction).

**Stage 2: Profile Calibration & The Brief**

1. **Suite Preparation**: The system processes the intake data to generate the user's initial set of artifacts: "Your Profile," "Your AI Profile," and "Your Gaps."  
2. **The Brief**: The user is presented with a distilled summary of their intake. This critical artifact includes:  
   * **What I Learned**: A summary of the user's current state, objectives, and primary resistance points.  
   * **What Matters Most**: A list of the user's core professional values.  
   * **Next 72 Hours**: Immediate, high-leverage actions for the user to take.  
3. **View Your Plan**: From "The Brief," the user navigates to their personalized plan.

**Stage 3: The Plan & Execution**

1. **Your Plan**: This screen outlines a tactical roadmap, including:  
   * **Next 72 Hours**: Concrete objectives and actions.  
   * **2-Week Sprint**: A longer-term plan with daily and weekly actions.  
   * **What I Need From You**: A list of inputs required from the user (e.g., resume, project list).  
2. **Module Engagement**: The user begins to engage with the various modules in their suite, such as "Episodes" for binge learning or "Your Assets" for reviewing generated documents.  
3. **ConciergeJobSearch (CJS) Execution**: For users on the appropriate tier, the system and human concierge initiate the execution rail, which includes resume optimization, search strategy, and interview preparation.

**Stage 4: Ongoing Engagement & Iteration**

1. **Binge Learning**: The user consumes personalized "Episodes"—micro-dramas designed to upgrade their professional instincts.  
2. **MyConcierge**: The user interacts with their human or AI concierge for ongoing guidance and support.  
3. **Profile Updates**: The user's "Professional DNA" is a living artifact, continuously updated based on their progress, feedback, and new goals.

## 5\. V1 Feature Inventory

This inventory catalogs all features identified in the V1 POC, categorized by the primary modules in the `suite/modules.ts` configuration.

| Module (ID) | Feature | Purpose | Data Source(s) | Implementation Notes |
| :---- | :---- | :---- | :---- | :---- |
| **Intake (`intake`)** | Smart Start Conversational Flow | Calibrate the user's suite by gathering career aspirations, preferences, and intent. | User Input | Implemented in `IntakeFlow.tsx`. The central data gathering mechanism. |
| **Episodes (`episodes`)** | Bingeable Feed | Display a feed of personalized micro-dramas (episodes) to upgrade user instincts. | `clients/{clientId}/artifacts/episodes` | Implemented in `BingeFeedView.tsx`. Core of the "Binge Learning" concept. |
| **The Brief (`brief`)** | Distilled Summary | Present the user with a summary of what was learned, what matters most, and their next 72-hour plan. | `clients/{clientId}/artifacts/brief` | Implemented in `BriefView.tsx`. The primary output of the intake process. |
| **Suite Distilled (`suite_distilled`)** | Two-Column Strategic Map | Provide a strategic overview of the user's situation and the required actions. | `clients/{clientId}/artifacts/suite_distilled` | Implemented in `SuiteDistilledView.tsx`. A higher-level strategic view. |
| **Profile (`profile`)** | Professional DNA View | Display the user's core strengths, patterns, and leverage points. | `clients/{clientId}/artifacts/profile` | Implemented in `ProfileView.tsx`. The canonical representation of the user. |
| **AI Profile (`ai_profile`)** | AI Usage Guidance | Show the user how they should use AI based on their work style and decision-making patterns. | `clients/{clientId}/artifacts/ai_profile` | Implemented in `AIProfileView.tsx`. |
| **Gaps (`gaps`)** | Gap Analysis View | Highlight what’s missing, what’s noisy, and what to tighten first in the user's skillset. | `clients/{clientId}/artifacts/gaps` | Implemented in `GapsView.tsx`. |
| **AI Readiness (`readiness`)** | Executive Readiness Report | Provide a formal report on the user's AI readiness and route them to the appropriate curriculum tier. | `clients/{clientId}/artifacts/readiness` | Implemented in `ReadinessView.tsx`. |
| **CJS Execution (`cjs_execution`)** | ConciergeJobSearch Rail | The execution layer for resume optimization, search strategy, application, interviews, and negotiation. | `clients/{clientId}/artifacts/cjs_execution` | Implemented in `CjsExecutionView.tsx`. |
| **Your Plan (`plan`)** | Action Plan View | Display the 72-hour momentum plan and the subsequent 2-week sprint. | `clients/{clientId}/artifacts/plan` | Implemented in `PlanView.tsx`. |
| **Your Assets (`assets`)** | Asset Collection | A workspace for resume versions, outreach drafts, scripts, and other generated documents. | `clients/{clientId}/artifacts/assets` | Placeholder view in `App.tsx`. Marked for future implementation. |
| **Authentication** | Login/Logout | Securely manage user sessions. | Firebase Auth | Implemented in `LoginView.tsx` and `authService.ts`. |
| **Admin Console** | System Configuration | Allow admins to control model routing, prompts, feature flags, and media. | `system/career-concierge-config` | Implemented in `AdminConsole.tsx`. A first-class product surface. |
| **API: Suite Generation** | `POST /v1/suite/generate` | Generate all core suite artifacts (brief, plan, profile, etc.) based on intake. | Intake Payload | Core endpoint in `api/index.js`. |
| **API: Binge Episode** | `POST /v1/binge/episode` | Generate a single binge-learning episode based on user DNA and a target skill. | User DNA, Target Skill | Endpoint in `api/index.js`. |
| **API: Voice Synthesis** | `POST /v1/voice/synthesize` | Generate voice narration for concierge playback. | Text Input | Endpoint in `api/index.js` with routing to `sesame` or `gemini_live`. |


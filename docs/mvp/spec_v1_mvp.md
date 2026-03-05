# Career Concierge V1 MVP: Specification & Roadmap

## 1\. Introduction

This document provides a detailed specification for the Career Concierge V1 MVP. It is intended to be used by development agents to implement the required features. The specification is based on a comprehensive analysis of the existing POC, strategic notes, and journey maps. The goal is to evolve the current implementation into a robust, agentic "Grid OS" for career acceleration.

This document is structured into:

* **Product Epics**: High-level feature areas that deliver significant value.  
* **User Stories**: Detailed requirements from the perspective of a specific user persona.  
* **Acceptance Criteria (AC)**: Conditions that must be met for a story to be considered complete.  
* **Testing Strategy**: A high-level approach to ensure quality and reliability.  
* **V1 Roadmap**: A suggested sprint plan to guide development.

## 2\. V1 Product Epics

The V1 MVP is organized into the following core epics. These epics are derived from the key modules and user flows identified during the synthesis phase and are aligned with the strategic direction outlined in the project documentation.

| Epic ID | Epic Name | Goal | Priority |
| :---- | :---- | :---- | :---- |
| **E01** | **Smart Start Intake & DNA** | Capture a user's canonical "Professional DNA" through a conversational intake process and store it as the single source of truth in Firestore. | P0 |
| **E02** | **Agentic Framework & Orchestration** | Establish the core agent-as-position framework, enabling a Chief of Staff agent to manage and orchestrate specialized vertical agents. | P0 |
| **E03** | **Binge Learning Episode Generation** | Implement the pipeline for generating personalized, engaging "Binge Learning" episodes based on a user's DNA and a target skill. | P0 (for demo) |
| **E04** | **Core Suite Artifacts & UI** | Develop the user-facing UI for the core suite of artifacts, including The Brief, The Plan, and the Professional DNA profile, presented in a modular grid. | P1 |
| **E05** | **Admin Console & System Ops** | Build the first-class admin console for managing system configuration, including model routing, prompts, and feature flags. | P1 |
| **E06** | **ConciergeJobSearch (CJS) Execution Rail** | Implement the foundational features of the CJS execution rail, focusing on resume optimization and search strategy as initial capabilities. | P2 |

## 3\. User Stories & Acceptance Criteria

### Epic E01: Smart Start Intake & DNA (P0)

**Goal:** Capture a user's canonical "Professional DNA" through a conversational intake process and store it as the single source of truth in Firestore.

| Story ID | User Story | Acceptance Criteria (AC) | Test Cases |
| :---- | :---- | :---- | :---- |
| **E01-S01** | As a **new user**, I want to complete a conversational "Smart Start" intake so that the system can create my initial Professional DNA. | 1\. The intake flow must be presented as a conversational UI, matching the design in `IntakeFlow.tsx`. 2\. The flow must capture all fields defined in \`constants.ts\` under \`INTAKE\_QUESTIONS\`. 3\. Upon submission, a new user account must be created in Firebase Auth. 4\. A new document must be created in the \`clients/{clientId}\` collection in Firestore. 5\. The complete set of intake answers must be stored in a \`dna\` sub-collection document for that client. | 1\. Complete the intake flow with valid data and verify user creation in Firebase Auth and data persistence in Firestore. 2\. Attempt to submit the intake with missing required fields and verify that appropriate error messages are displayed. 3\. Verify that the structure of the saved Firestore document matches the \`IntakeAnswers\` type definition. |
| **E01-S02** | As a **returning user**, I want the system to recognize me and allow me to continue or restart the intake process. | 1\. If a user is already logged in, the system should greet them and offer the choice to either continue their previous session or start a new one. 2\. If continuing, the intake form should be pre-populated with their previously saved answers. | 1\. Log in as an existing user who has partially completed the intake, and verify that the form is pre-populated. 2\. Log in as an existing user and choose to restart the intake, verifying that the form is cleared. |
| **E01-S03** | As a **developer**, I want the intake submission to trigger the generation of all core suite artifacts via the backend API. | 1\. Upon successful intake submission, the frontend must call the `POST /v1/suite/generate` endpoint. 2\. The payload must include the user's \`intent\`, \`preferences\`, and the full \`answers\` object. 3\. The API must successfully generate and save all core artifacts (\`brief\`, \`plan\`, \`profile\`, \`ai\_profile\`, \`gaps\`) to the \`clients/{clientId}/artifacts\` collection. | 1\. Mock the API call from the frontend and verify that the correct payload is sent. 2\. E2E Test: Submit an intake and verify that all expected artifact documents are created in Firestore with non-empty content. |

### Epic E02: Agentic Framework & Orchestration (P0)

**Goal:** Establish the core agent-as-position framework, enabling a Chief of Staff agent to manage and orchestrate specialized vertical agents.

| Story ID | User Story | Acceptance Criteria (AC) | Test Cases |
| :---- | :---- | :---- | :---- |
| **E02-S01** | As an **agent developer**, I want to define agent roles with specific system prompts, parameters, and guardrails in Firestore so that their behavior is predictable and controllable. | 1\. Create a new Firestore collection named `agents`. 2\. Each document in the \`agents\` collection must represent an agent and conform to the schema defined in Jim's notes (role, systemPrompt, parameters, owner). 3\. The \`conciergeRom.js\` prompt library should be used as the basis for the \`systemPrompt\` content. | 1\. Manually create a new agent document in Firestore for a "Chief of Staff" agent and verify its structure. 2\. Create a document for a "Resume Reviewer" agent and validate its parameters. |
| **E02-S02** | As the **Chief of Staff agent**, I want to be able to read a user's Professional DNA from Firestore to inform my actions and recommendations. | 1\. The agent must have read-only access to the `clients/{clientId}/dna` collection. 2\. The agent's core logic must be able to fetch and parse the DNA document for a given user. | 1\. Write a test script that simulates the agent fetching a sample DNA document and successfully parsing its contents. 2\. Attempt to have the agent write to the DNA collection and verify that the operation fails due to permissions. |
| **E02-S03** | As the **Chief of Staff agent**, I want to produce a human-readable summary of a user's DNA and log my recommended next steps. | 1\. The agent, when triggered, will generate a concise summary of the user's DNA. 2\. The agent will also generate a list of recommended next actions for the user. 3\. Both the summary and the recommendations must be stored in a new \`logs/{userId}/interactions\` document. | 1\. Trigger the Chief of Staff agent for a sample user and verify that a new interaction log is created. 2\. Validate that the content of the log contains a coherent summary and a list of actionable recommendations. |

### Epic E03: Binge Learning Episode Generation (P0 demo)

**Goal:** Implement the pipeline for generating personalized, engaging "Binge Learning" episodes based on a user's DNA and a target skill.

| Story ID | User Story | Acceptance Criteria (AC) | Test Cases |
| :---- | :---- | :---- | :---- |
| **E03-S01** | As a **user**, I want the system to generate a pilot episode based on my DNA so I can experience binge-learning. | 1\. A button or trigger must be available in the UI to initiate episode generation. 2\. The \`POST /v1/binge/episode\` endpoint must be called with the user's DNA and a target skill. 3\. The generated episode (script, thumbnail, etc.) must be saved to the \`clients/{clientId}/artifacts/episodes\` collection. 4\. The UI must be ableto display the generated episode content in the \`BingeFeedView.tsx\` component. | 1\. Trigger episode generation for a sample user and verify the creation of the episode artifact in Firestore. 2\. Verify that the generated episode content is displayed correctly in the UI. 3\. Test with different target skills to ensure the generated content is relevant. |
| **E03-S02** | As an **engineer**, I want a recipe/template engine for episodes so they follow a consistent structure. | 1\. The `composeBingePrompt` function in `conciergeRom.js` must be used to structure the prompt for the generation model. 2\. The prompt must enforce a consistent structure for all episodes (hook, lesson swipes, challenge, reward, cliffhanger). | 1\. Review the `composeBingePrompt` function to ensure it includes all required structural elements. 2\. Generate multiple episodes and verify that they all follow the same high-level structure. |
| **E03-S03** | As a **cost controller**, I want to be able to configure different AI models for draft and final generation to manage costs. | 1\. The admin console must provide an option to select the `binge_model` from a list of available models. 2\. The \`POST /v1/binge/episode\` endpoint must use the model specified in the admin configuration. | 1\. Change the `binge_model` in the admin console and verify that the next generated episode uses the new model. 2\. Test with a lower-cost model and a higher-cost model to compare the quality and cost of generation. |

### Epic E04: Core Suite Artifacts & UI (P1)

**Goal:** Develop the user-facing UI for the core suite of artifacts, including The Brief, The Plan, and the Professional DNA profile, presented in a modular grid.

| Story ID | User Story | Acceptance Criteria (AC) | Test Cases |
| :---- | :---- | :---- | :---- |
| **E04-S01** | As a **logged-in user**, I want to see a home screen with a grid of tiles representing my available suite modules so I can easily navigate the application. | 1\. The main application view (`App.tsx`) must display a grid of modules as defined in `suite/modules.ts`. 2\. Each tile in the grid must display the module's index, title, and subtitle. 3\. Clicking on a tile must open the corresponding module view. | 1\. Log in and verify that the module grid is displayed correctly. 2\. Click on each tile and verify that it navigates to the correct module view. |
| **E04-S02** | As a **user**, I want to be able to view all my generated artifacts (The Brief, The Plan, Profile, etc.) in a consistent and readable format. | 1\. Each artifact view (`BriefView.tsx`, `PlanView.tsx`, etc.) must correctly render the content of the corresponding artifact from Firestore. 2\. The styling of the artifact views must be consistent and professional, following the project's design language. 3\. If an artifact has not yet been generated, the UI should display a clear message indicating that and provide a way to generate it (e.g., by completing the intake). | 1\. Generate a full set of artifacts for a sample user and verify that each one is displayed correctly in its respective view. 2\. Delete an artifact from Firestore and verify that the UI displays the "missing artifact" message. 3\. From the "missing artifact" message, trigger the intake flow and verify that the artifact is generated and displayed. |
| **E04-S03** | As a **user**, I want the application to be responsive and usable on mobile devices. | 1\. All UI components, including the module grid and artifact views, must be fully responsive and adapt to different screen sizes. 2\. The mobile layout must be clean, readable, and easy to navigate. | 1\. Test the application on various mobile screen sizes (e.g., using browser developer tools) and verify that the layout is not broken. 2\. Perform key user flows (e.g., completing intake, viewing artifacts) on a simulated mobile device to ensure a good user experience. |

### Epic E05: Admin Console & System Ops (P1)

**Goal:** Build the first-class admin console for managing system configuration, including model routing, prompts, and feature flags.

| Story ID | User Story | Acceptance Criteria (AC) | Test Cases |
| :---- | :---- | :---- | :---- |
| **E05-S01** | As an **admin**, I want to access a secure admin console to manage the application's configuration. | 1\. Access to the admin console must be restricted to users with the `admin` custom claim in Firebase Auth. 2\. The admin console UI (\`AdminConsole.tsx\`) must provide controls for all configuration options defined in the \`DEFAULT\_APP\_CONFIG\` in \`api/index.js\`. 3\. Changes made in the admin console must be saved to the \`system/career-concierge-config\` document in Firestore by calling the \`PUT /v1/admin/config\` endpoint. | 1\. Attempt to access the admin console as a non-admin user and verify that access is denied. 2\. Log in as an admin user and verify that the admin console is accessible. 3\. Change a configuration value (e.g., the \`suite\_model\`) and verify that the change is correctly saved in Firestore. |
| **E05-S02** | As an **admin**, I want to be able to update the system prompts used for generation without needing to redeploy the application. | 1\. The admin console must provide text areas for editing the `suite_appendix`, `binge_appendix`, and `rom_appendix` prompts. 2\. The backend API must use the latest versions of these prompts from the Firestore config document for all generation tasks. | 1\. Modify the `suite_appendix` in the admin console to include a specific keyword. 2\. Trigger a suite generation and verify that the generated output includes the new keyword, confirming that the updated prompt was used. |
| **E05-S03** | As an **admin**, I want to be able to enable or disable features using feature flags. | 1\. The admin console must provide toggles for all boolean feature flags (e.g., `episodes_enabled`, `cjs_enabled`). 2\. The frontend UI and backend API must respect these feature flags, enabling or disabling the corresponding functionality as appropriate. | 1\. Disable the `episodes_enabled` feature flag in the admin console. 2\. Reload the application as a regular user and verify that the "Episodes" module is no longer visible or accessible. |

### Epic E06: ConciergeJobSearch (CJS) Execution Rail (P2)

**Goal:** Implement the foundational features of the CJS execution rail, focusing on resume optimization and search strategy as initial capabilities.

| Story ID | User Story | Acceptance Criteria (AC) | Test Cases |
| :---- | :---- | :---- | :---- |
| **E06-S01** | As a **user**, I want to be able to upload my resume for analysis and optimization. | 1\. The CJS execution view (`CjsExecutionView.tsx`) must provide a file upload component for resumes. 2\. The uploaded resume must be stored in a secure Cloud Storage bucket. 3\. The path to the stored resume must be saved in the user's \`dna\` document in Firestore. | 1\. Upload a sample resume and verify that it is successfully stored in Cloud Storage. 2\. Check the user's DNA document in Firestore and verify that it contains the correct path to the uploaded resume. |
| **E06-S02** | As a **Resume Reviewer agent**, I want to be able to access a user's resume and provide optimization suggestions. | 1\. The Resume Reviewer agent must have permission to read resumes from the Cloud Storage bucket. 2\. The agent will analyze the resume against the user's target role and provide specific, actionable suggestions for improvement. 3\. The suggestions must be stored as a new artifact in the \`clients/{clientId}/artifacts\` collection. | 1\. Trigger the Resume Reviewer agent for a user with an uploaded resume. 2\. Verify that a new "resume\_review" artifact is created in Firestore. 3\. Review the content of the artifact to ensure the suggestions are relevant and actionable. |
| **E06-S03** | As a **user**, I want to receive a multi-channel job search strategy based on my profile and target role. | 1\. A "Search Strategist" agent will analyze the user's DNA and target role. 2\. The agent will generate a search strategy that includes recommendations for online job platforms, recruiter platforms, and direct company applications. 3\. The strategy will be stored as a new artifact and be viewable in the CJS execution view. | 1\. Trigger the Search Strategist agent for a sample user. 2\. Verify the creation of a "search\_strategy" artifact. 3\. Review the strategy to ensure it is personalized and includes a variety of relevant channels. |

## 4\. Testing Strategy

A multi-layered testing strategy will be employed to ensure the quality and reliability of the V1 MVP.

| Test Type | Description | Tools & Approach |
| :---- | :---- | :---- |
| **Unit Tests** | Individual functions and components will be tested in isolation to ensure they behave as expected. | \- **Jest & React Testing Library** for frontend components. \- \*\*Mocha & Chai\*\* for backend API unit tests. |
| **Integration Tests** | Test the interactions between different parts of the system, such as the frontend calling the backend API, or an agent interacting with Firestore. | \- **Supertest** for API endpoint integration tests. \- \*\*Firebase Emulators\*\* to test interactions with Firestore and Auth in a local environment. |
| **End-to-End (E2E) Tests** | Simulate full user journeys through the application to ensure the entire system works together as expected. | \- **Playwright or Cypress** to automate browser interactions and test key user flows like the Smart Start Intake and artifact viewing. |
| **Manual QA** | A human tester will manually go through the application to catch issues that automated tests might miss, with a focus on user experience and visual polish. | \- A detailed QA checklist will be created based on the user stories and acceptance criteria. |

## 5\. V1 Development Roadmap

This roadmap outlines a suggested 4-sprint plan for developing the V1 MVP. Each sprint is two weeks long.

### Sprint 1: Foundation & Intake

* **Focus**: Set up the core infrastructure and implement the Smart Start Intake flow.  
* **Stories**: E01-S01, E01-S02, E02-S01, E05-S01  
* **Goal**: By the end of the sprint, a new user can sign up, complete the intake, and have their Professional DNA stored in Firestore. The admin console is functional for basic configuration.

### Sprint 2: Core Artifacts & Agent Logic

* **Focus**: Implement the generation and display of the core suite artifacts and the basic logic for the Chief of Staff agent.  
* **Stories**: E01-S03, E02-S02, E02-S03, E04-S01, E04-S02  
* **Goal**: A user can see their generated Brief and Plan. The Chief of Staff agent can read a user's DNA and log a summary.

### Sprint 3: Binge Learning & UI Polish

* **Focus**: Implement the Binge Learning episode generation and refine the user interface.  
* **Stories**: E03-S01, E03-S02, E04-S03, E05-S02  
* **Goal**: A user can generate and view a personalized Binge Learning episode. The UI is mobile-responsive and polished.

### Sprint 4: CJS Rail & Admin Enhancements

* **Focus**: Implement the foundational features of the CJS execution rail and enhance the admin console.  
* **Stories**: E06-S01, E06-S02, E06-S03, E05-S03  
* **Goal**: A user can upload their resume for analysis. The admin can control features via feature flags. The V1 MVP is feature-complete for the demo.


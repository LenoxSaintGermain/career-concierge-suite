V1 MVP Specification Sheet for the **Career Concierge OS**

, structured for development and execution.

### **1\. Product Vision & Core Concepts**

The Career Concierge OS is an editorial, cinematic workspace designed for concierge-led career acceleration (Apple UX meets Salesforce capability depth). It operates on five foundational concepts:

* **Professional DNA:** The user's intake data acts as a living, queryable dataset in Firestore, serving as the single source of truth rather than a static PDF.  
* **Agent-as-Position:** AI agents act as hired staff with defined roles, CVs (system prompts), responsibilities, and guardrails.  
* **Binge Learning:** Training content is delivered as Netflix-style micro-dramas optimized for dopamine-driven habit formation.  
* **Chief of Staff Orchestration:** A primary agent orchestrates specialized vertical agents (intake, resume review, marketing).  
* **Silent V2 Migration:** The system is designed to allow underlying agentic architecture upgrades without disrupting the user experience.

### **2\. Target User Personas**

* **The Career Accelerator:** Mid-to-senior professionals aiming to move into a specific next role.  
* **The Skill-Sharpener:** Professionals wanting to stay sharp with AI and industry trends without actively job searching.  
* **The Direction-Seeker:** Professionals feeling stalled and looking for a structured career direction.  
* **The Concierge/Admin:** Internal operators managing clients, agent configurations, and system health.

### **3\. Technology Stack & Architecture**

* **Frontend:** Vite \+ React \+ TypeScript (Single-page application with Firebase client SDK).  
* **Backend API:** Express.js (Node.js) hosted on Google Cloud Run (Region: europe-west1).  
* **Database:** Firestore (Native mode).  
* **Authentication:** Firebase Authentication (Email/password, Admin roles via custom claims).  
* **AI Models:** Google Gemini via `@google/genai` (gemini-3-flash-preview for text, gemini-2.5-flash-image-preview for images, veo-3.1-generate-preview for video).  
* **Voice:** Sesame / Gemini Live.  
* **Orchestration:** N8N/Workflows for agent orchestration, and RAG with vector embeddings for memory.

### **4\. Firestore Data Model**

The database utilizes the following schema structure:

* `system/career-concierge-config`: Global app configuration (models, prompts, flags).  
* `clients/{clientId}/`: Client profile data (name, email, etc.).  
* `clients/{clientId}/artifacts/`: Contains generated artifacts such as `brief`, `plan`, `profile`, `ai_profile`, `gaps`, `suite_distilled`, `readiness`, and `cjs_execution`.  
* `clients/{clientId}/artifacts/episodes`: Stored binge-learning episodes.  
* `agents/{agentId}`: Stores agent definitions including role, systemPrompt, parameters, and owner.  
* `logs/{userId}/interactions/{interactionId}`: Stores agent inputs, outputs, models, and timestamps.

### **5\. V1 Core Epics**

* **E01: Smart Start Intake & DNA (P0):** Capture the user's "Professional DNA" via a conversational UI and store it as the single source of truth. Submitting the intake triggers the backend API to generate all core suite artifacts.  
* **E02: Agentic Framework & Orchestration (P0):** Establish the Chief of Staff agent with specific parameters in Firestore. The agent must read the user's DNA, produce human-readable summaries, and log actionable recommendations.  
* **E03: Binge Learning Episode Generation (P0):** Implement the pipeline to generate structured micro-dramas (hook card, lesson swipes, challenge terminal, reward asset, cliffhanger) based on a target skill and the user's DNA.  
* **E04: Core Suite Artifacts & UI (P1):** Develop the mobile-first "Module Grid Dashboard" containing 11 specific tiles, and build consistent artifact views (The Brief, Your Plan, Your Profile, etc.).  
* **E05: Admin Console & System Ops (P1):** Build a secure admin portal to control model routing, edit system prompts (`suite_appendix`, `binge_appendix`, etc.) without redeploying, and toggle feature flags.  
* **E06: ConciergeJobSearch (CJS) Execution Rail (P2):** Implement foundational job search features, including a Resume Upload tool, a Resume Reviewer Agent, and a Search Strategist Agent to map out multi-channel job hunting.

### **6\. Key API Endpoints**

* `GET /health`: Health check.  
* `GET /v1/public/config` & `GET/PUT /v1/admin/config`: Fetch and update configurations.  
* `POST /v1/suite/generate`: Generates core artifacts based on intake payload.  
* `POST /v1/binge/episode`: Generates a single binge-learning episode.  
* `POST /v1/voice/synthesize`: Synthesizes voice narration for the concierge.

### **7\. End-to-End Core Demo Loop**

For the MVP/Investor Demo, the following loop must function flawlessly:

1. **Smart Start Intake:** User submits the conversational intake.  
2. **Professional DNA:** Data is accurately saved to Firestore.  
3. **Artifact Generation:** The system automatically generates the Brief, Plan, Profile, AI Profile, and Gap Analysis.  
4. **Binge Episode:** A customized micro-drama is generated and displayed.  
5. **Agent Orchestration:** The Chief of Staff agent successfully produces a summary and logs next steps.


# Jim's Notes \- Key Requirements Extracted

## Core Product Concepts

1. **Professional DNA** \- Smart Start intake as single source of truth, stored in Firestore (not PDFs)  
2. **Agent-as-Position** \- Agents have roles, CVs, responsibilities, boundaries, KPIs, guardrails  
3. **Binge Learning** \- Netflix-style episodic micro-dramas tied to user's DNA for habit formation  
4. **Chief of Staff Agent** \- Orchestrates vertical agents (intake, resume review, marketing, etc.)  
5. **Silent V2 Migration** \- Deliverables stay same, experience/orchestration silently improves

## Architecture

- GCP \+ Firestore (Native mode) \+ Cloud Run \+ Secret Manager  
- N8N/Workflows for agent orchestration  
- RAG with vector embeddings (Firestore for MVP, Pinecone/Vertex later)  
- Cloud Storage for binary artifacts (videos, images)

## Firestore Schema

- users/{userId}: name, email, createdAt, personaTag, lastActive  
- dna/{userId}: assessmentResults, gapAnalysis, insetReportUrl  
- episodes/{episodeId}: templateId, scenes, generatedAssets  
- memory/{userId}/events/{eventId}: timestamp, eventType, text, source  
- agents/{agentId}: role, systemPrompt, parameters, owner  
- logs/{userId}/interactions/{interactionId}: inputText, outputText, model, timestamp

## MVP Epics (from notes)

1. Smart Start Intake (P0)  
2. Professional DNA Model & Storage (P0)  
3. Initial Agent Framework (P0-P1)  
4. Episode/Binge-Learning Generation Pipeline (P0 demo)  
5. UI: Tiles & User Experience Grid (P1)  
6. RAG & Vector Memory (P1)  
7. Admin & Onboarding Infrastructure (P0)

## MVP Demo Must Show

1. Intake submitted → Firestore shows user \+ dna doc  
2. Agent (chief-of-staff) produces summary from DNA \+ logs next steps  
3. Episode generation triggered and stored (script \+ thumbnail); playable via UI  
4. Admin dashboard shows job logs and ingestion health

## Key Personas

- Anonymous visitor (intake)  
- Logged-in user (view/edit DNA, play episodes)  
- Admin/concierge (batch uploads, agent config)  
- Engineer (schema, APIs, deployment)  
- Operator (human-in-the-loop validation)

## Sprint Plan (4-week)

- Week 1: Core infra \+ Intake  
- Week 2: Agent skeleton \+ Storage  
- Week 3: Episode creation pipeline \+ templates  
- Week 4: UI tiles \+ demo polish \+ admin


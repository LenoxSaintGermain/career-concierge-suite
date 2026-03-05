# Career Concierge V1: Test User Specifications

## 1. Introduction

This document provides detailed specifications for four test user personas, designed to validate the core workflows and features of the Career Concierge V1 MVP. Each user profile includes a persona, a specific journey flow, sample intake data (their "Professional DNA"), and the expected outcomes and acceptance criteria for their journey. These specs are intended to be used for E2E testing, demo script creation, and agent training.

---

## 2. Test User 1: Donell Woodson - The Skill-Sharpener

### 2.1 Persona Profile

| Attribute | Description |
| :--- | :--- |
| **Name** | Donell Woodson |
| **Archetype** | The Skill-Sharpener |
| **Role** | Senior Program Manager, Enterprise SaaS |
| **Goal** | Stay current with AI trends to maintain his edge and increase his value within his current company. He is not actively job searching but wants to be prepared for future opportunities and lead AI-related initiatives. |
| **Pain Points** | Feels overwhelmed by the pace of AI change; unsure which skills are hype vs. high-value; lacks a structured way to learn and apply new AI tools in his day-to-day work. |
| **Primary Intent** | "Stay sharp in my current role." |

### 2.2 End-to-End Journey Flow

1.  **Entry**: Donell lands on the SkillSync AI page and signs up for the **SkillSync AI Premier** tier.
2.  **Intake**: He completes the Smart Start Intake, focusing on his desire to build a personal AI toolkit and lead AI strategy.
3.  **Artifact Review**: He reviews his generated artifacts, paying close attention to his **AI Profile** and **Gaps** to understand his current state.
4.  **Binge Learning**: He engages with the **Episodes** module to consume personalized micro-dramas focused on "AI Strategy & Leadership."
5.  **Plan Execution**: He follows the recommendations in **Your Plan**, which focus on internal projects and skill development rather than an external job search.

### 2.3 Sample Intake Data (Professional DNA)

| Field ID | Value |
| :--- | :--- |
| `outcomes_goals` | ["Professional Visibility", "Increased Stability"] |
| `target_compensation_level` | "$200k-$299k" |
| `current_or_target_job_title` | "Senior Program Manager" |
| `current_or_target_salary` | "$215,000" |
| `benefits_under_review` | false |
| `ai_usage_frequency` | "Regularly" |
| `enterprise_context` | ["ChatGPT Enterprise", "Copilot"] |
| `job_description` | "Leads cross-functional teams to deliver complex software projects on time and within budget. Responsible for roadmap planning, stakeholder communication, and risk management..." |
| `resume_source` | "resume_donell_woodson_2026.pdf" |
| `bio_alignment_requested` | true |
| `foundational_interests` | ["Building a personal Ai toolkit for daily professional use", "Staying ahead of emerging Ai trends and innovations", "Ai Strategy & Leadership"] |
| `advanced_interests` | ["Enterprise Ai Architecture", "Automation Architecture & Workflow Design"] |
| `learning_modalities` | ["Auditory (podcasts, narrated lessons)", "Hands-on applied exercises"] |
| `current_title` | "Senior Program Manager" |
| `industry` | "Enterprise SaaS" |
| `target` | "Principal Program Manager or Director of AI Transformation" |
| `pressure_breaks` | "Time" |
| `work_style` | "A template" |
| `constraints` | "Limited time for learning outside of work hours." |

### 2.4 Acceptance Criteria

| AC # | Acceptance Criteria |
| :--- | :--- |
| AC-1 | The generated **AI Profile** artifact should accurately reflect Donell's regular AI usage and identify his work style as suited for template-driven AI tools. |
| AC-2 | The **Gaps** artifact must highlight the gap between his current program management skills and the advanced skills required for a Director of AI Transformation role. |
| AC-3 | The first generated **Binge Learning Episode** must be on the topic of "AI Strategy & Leadership" and should be delivered in an auditory format (i.e., with voice narration). |
| AC-4 | **Your Plan** must contain actionable steps for internal projects, such as "Propose a pilot project using Copilot to automate status reporting." |
| AC-5 | The **CJS Execution** module should be accessible but should not contain any active job search recommendations. |


---

## 3. Test User 2: Garry Francois - The Career Accelerator

### 3.1 Persona Profile

| Attribute | Description |
| :--- | :--- |
| **Name** | Garry Francois |
| **Archetype** | The Career Accelerator |
| **Role** | Marketing Manager, CPG |
| **Goal** | Actively and aggressively pursue a promotion to Director of Marketing within the next 6-9 months. He wants to leverage AI to outperform his peers and demonstrate clear strategic value to leadership. |
| **Pain Points** | Works in a traditional industry that is slow to adopt new tech; needs to build a strong business case for AI-driven marketing initiatives; struggles to translate AI capabilities into measurable ROI. |
| **Primary Intent** | "Move into a specific next role." |

### 3.2 End-to-End Journey Flow

1.  **Entry**: Garry is referred by a colleague and signs up for the **ConciergeJobSearch (CJS) Premier** tier.
2.  **Intake**: He completes the Smart Start Intake, emphasizing his goal of a promotion and his need for a clear, data-driven plan.
3.  **Artifact Review**: He immediately navigates to **The Brief** and **Your Plan** to understand his 72-hour and 2-week sprint objectives.
4.  **CJS Execution**: He spends most of his time in the **CJS Execution** module, uploading his resume for optimization and working with the Search Strategist agent.
5.  **Asset Generation**: He uses the **Your Assets** module to store and iterate on resume versions, outreach drafts for internal networking, and presentation scripts for his project proposals.

### 3.3 Sample Intake Data (Professional DNA)

| Field ID | Value |
| :--- | :--- |
| `outcomes_goals` | ["Professional Advancement", "Increased Compensation"] |
| `target_compensation_level` | "$150k-$199k" |
| `current_or_target_job_title` | "Director of Marketing" |
| `current_or_target_salary` | "$180,000" |
| `benefits_under_review` | true |
| `ai_usage_frequency` | "Occasionally" |
| `enterprise_context` | ["No formal mandate"] |
| `job_description` | "Seeking a Director of Marketing to lead our brand strategy, manage a team of 5, and drive growth in key market segments..." |
| `resume_source` | "Garry_Francois_Resume_Q1_2026.docx" |
| `bio_alignment_requested` | true |
| `foundational_interests` | ["Using Ai for career development and upskilling", "Ai Strategy & Leadership"] |
| `advanced_interests` | ["Ai-Driven Customer Experience Optimization", "Ai for Business Intelligence & Real-Time Insights"] |
| `learning_modalities` | ["Interactive coaching (live/async feedback loops)", "Hands-on applied exercises"] |
| `current_title` | "Marketing Manager" |
| `industry` | "Consumer Packaged Goods (CPG)" |
| `target` | "Director of Marketing" |
| `pressure_breaks` | "Clarity" |
| `work_style` | "A conversation" |
| `constraints` | "Needs to show ROI for any new initiatives." |

### 3.4 Acceptance Criteria

| AC # | Acceptance Criteria |
| :--- | :--- |
| AC-1 | The **Brief** must provide a clear, concise summary of Garry's goal and the primary obstacle (demonstrating ROI). |
| AC-2 | **Your Plan** must include a 72-hour action item to "Identify 3 marketing KPIs that can be impacted by AI-driven customer segmentation." |
| AC-3 | The **CJS Execution** module must be the primary focus of his dashboard, and the Resume Reviewer agent must provide specific suggestions for tailoring his resume to the Director role. |
| AC-4 | The Search Strategist agent must generate a strategy focused on internal networking and project proposals, rather than external job applications. |
| AC-5 | The **Your Assets** module must allow him to upload and store at least three different versions of his resume. |


---

## 4. Test User 3: Taylor Fulton - The Direction-Seeker

### 4.1 Persona Profile

| Attribute | Description |
| :--- | :--- |
| **Name** | Taylor Fulton |
| **Archetype** | The Direction-Seeker |
| **Role** | Project Manager, Non-Profit |
| **Goal** | Feels stalled in her current role and is exploring a potential career transition into the tech sector. She is unsure of her transferable skills and needs a structured path to gain clarity and confidence. |
| **Pain Points** | Lacks a professional network in the tech industry; her resume is heavily focused on non-profit work; she is overwhelmed by the number of potential career paths in tech. |
| **Primary Intent** | "I'm not sure yet, help me design a direction." |

### 4.2 End-to-End Journey Flow

1.  **Entry**: Taylor finds the service through a social media ad and signs up for the **SkillSync AI Foundation** tier.
2.  **Intake**: She completes the Smart Start Intake, expressing her uncertainty and her interest in understanding her transferable skills.
3.  **Artifact Review**: She focuses on her **Profile** and **Gaps** artifacts to understand her strengths and where she needs to develop.
4.  **MyConcierge**: She engages with the **MyConcierge** module to ask questions and get guidance on potential career paths.
5.  **Binge Learning**: She uses the **Episodes** module to explore foundational topics like "Process Automation / Workflow Optimization" to see if they spark her interest.

### 4.3 Sample Intake Data (Professional DNA)

| Field ID | Value |
| :--- | :--- |
| `outcomes_goals` | ["Professional Advancement", "Professional Visibility"] |
| `target_compensation_level` | "$100k-$149k" |
| `current_or_target_job_title` | "Technical Project Manager or Product Owner" |
| `current_or_target_salary` | "$120,000" |
| `benefits_under_review` | false |
| `ai_usage_frequency` | "Rarely or never" |
| `enterprise_context` | ["No formal mandate"] |
| `job_description` | "" |
| `resume_source` | "TaylorFulton_Resume_NonProfit.pdf" |
| `bio_alignment_requested` | false |
| `foundational_interests` | ["Start using Ai in career development and coaching activities", "Process Automation / Workflow Optimization"] |
| `advanced_interests` | [] |
| `learning_modalities` | ["Collaboration and group sessions", "Interactive coaching (live/async feedback loops)"] |
| `current_title` | "Project Manager" |
| `industry` | "Non-Profit" |
| `target` | "Not sure, maybe something in tech?" |
| `pressure_breaks` | "Confidence" |
| `work_style` | "A conversation" |
| `constraints` | "Needs a clear, step-by-step plan." |

### 4.4 Acceptance Criteria

| AC # | Acceptance Criteria |
| :--- | :--- |
| AC-1 | The **Profile** artifact must highlight Taylor's project management skills as highly transferable to the tech sector. |
| AC-2 | The **Gaps** artifact must identify a lack of technical skills (e.g., understanding of software development lifecycle) as a key area for development. |
| AC-3 | The **MyConcierge** module must provide a conversational interface where she can ask questions like "What tech roles are a good fit for my skills?" and receive a relevant, helpful response. |
| AC-4 | The **Episodes** module must recommend foundational topics to her, starting with "Process Automation / Workflow Optimization." |
| AC-5 | **Your Plan** should focus on exploration and learning, with action items like "Complete one introductory course on Agile methodologies" and "Schedule informational interviews with 3 people in tech." |


---

## 5. Test User 4: Derrick Gervin - The Free Course User

### 5.1 Persona Profile

| Attribute | Description |
| :--- | :--- |
| **Name** | Derrick Gervin |
| **Archetype** | The Free Course User |
| **Role** | Recent Graduate, Business Administration |
| **Goal** | Explore the world of AI and gain some foundational knowledge to add to his resume as he begins his job search. He is not ready to commit to a paid service but is eager to learn. |
| **Pain Points** | Limited budget; no practical experience with AI tools; needs to differentiate himself from other recent graduates. |
| **Primary Intent** | "Stay sharp in my current role" (as a student/job seeker). |

### 5.2 End-to-End Journey Flow

1.  **Entry**: Derrick finds the free SkillSync AI course through a university career services portal.
2.  **Intake**: He completes a simplified version of the Smart Start Intake, focusing on his foundational interests.
3.  **Limited Artifacts**: He receives access to a limited set of artifacts, primarily the **AI Readiness** report and a generic **Resource Guide**.
4.  **Binge Learning**: He has access to a curated playlist of introductory **Episodes** on foundational AI topics.
5.  **Upgrade Path**: After completing the free content, he is presented with a clear call-to-action to upgrade to a paid tier to unlock personalized artifacts and concierge services.

### 5.3 Sample Intake Data (Professional DNA)

| Field ID | Value |
| :--- | :--- |
| `outcomes_goals` | ["Professional Visibility"] |
| `target_compensation_level` | "Under $100k" |
| `current_or_target_job_title` | "Business Analyst or Junior Project Manager" |
| `current_or_target_salary` | "$75,000" |
| `benefits_under_review` | false |
| `ai_usage_frequency` | "Rarely or never" |
| `enterprise_context` | ["No formal mandate"] |
| `job_description` | "" |
| `resume_source` | "" |
| `bio_alignment_requested` | false |
| `foundational_interests` | ["Start using Ai in career development and coaching activities", "Building a personal Ai toolkit for daily professional use"] |
| `advanced_interests` | [] |
| `learning_modalities` | ["Hands-on applied exercises"] |
| `current_title` | "Recent Graduate" |
| `industry` | "Open to any" |
| `target` | "Entry-level business role" |
| `pressure_breaks` | "Confidence" |
| `work_style` | "A template" |
| `constraints` | "On a tight budget." |

### 5.4 Acceptance Criteria

| AC # | Acceptance Criteria |
| :--- | :--- |
| AC-1 | The intake process for the free tier must be shorter and simpler than the paid tiers, focusing only on foundational interests. |
| AC-2 | Derrick must only have access to the **AI Readiness** and a generic **Resource Guide** artifact. All other artifact modules (Brief, Plan, Gaps, etc.) must be locked. |
| AC-3 | The **Episodes** module must provide a pre-set playlist of 3-5 introductory videos, not personalized content. |
| AC-4 | Upon completion of the free content, a prominent and clear upgrade CTA must be displayed, outlining the benefits of the paid tiers. |
| AC-5 | The **MyConcierge** and **CJS Execution** modules must be completely disabled and not visible on his dashboard. |


---

## 6. Cross-User Test Matrix

This matrix maps each test user to the specific system modules and features they should exercise, providing a comprehensive coverage map for QA.

| Module / Feature | Donell Woodson (Skill-Sharpener) | Garry Francois (Career Accelerator) | Taylor Fulton (Direction-Seeker) | Derrick Gervin (Free Tier) |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Start Intake** | Full intake, all fields | Full intake, all fields | Full intake, vague target | Simplified intake |
| **The Brief** | Generated, learning-focused | Generated, promotion-focused | Generated, exploration-focused | Locked |
| **Your Plan** | Internal projects, skill dev | 72-hour sprint, networking | Exploration, informational interviews | Locked |
| **Profile (Professional DNA)** | Accessible | Accessible | Accessible, highlights transferable skills | Locked |
| **AI Profile** | Primary focus, tool recommendations | Accessible | Accessible | Locked |
| **Gaps** | Primary focus, AI strategy gaps | Resume-to-role gap | Technical skills gap | Locked |
| **AI Readiness** | Accessible | Accessible | Accessible | Accessible (free) |
| **Episodes (Binge Learning)** | Personalized, AI Strategy topic | Personalized, Marketing AI topic | Personalized, foundational topics | Pre-set introductory playlist |
| **CJS Execution** | Accessible but inactive | Primary focus, resume + strategy | Not visible | Not visible |
| **Your Assets** | Accessible | Primary focus, resume versions | Accessible | Locked |
| **MyConcierge** | Accessible | Accessible | Primary focus, Q&A | Not visible |
| **Admin Console** | N/A | N/A | N/A | N/A |
| **Upgrade CTA** | N/A | N/A | N/A | Displayed after free content |

---

## 7. Firestore Seed Data

The following JSON objects represent the seed data that should be created in Firestore for each test user. These can be used to pre-populate the database for testing and demo purposes.

### 7.1 Donell Woodson

```json
{
  "clientId": "test_dwoodson_001",
  "name": "Donell Woodson",
  "email": "donell.woodson@test.concierge.ai",
  "tier": "premier",
  "intent": "current_role",
  "pace": "standard",
  "focus": "skills",
  "createdAt": "2026-03-05T10:00:00Z",
  "personaTag": "skill_sharpener",
  "answers": {
    "outcomes_goals": ["Professional Visibility", "Increased Stability"],
    "target_compensation_level": "$200k-$299k",
    "current_or_target_job_title": "Senior Program Manager",
    "current_or_target_salary": "$215,000",
    "benefits_under_review": false,
    "ai_usage_frequency": "Regularly",
    "enterprise_context": ["ChatGPT Enterprise", "Copilot"],
    "job_description": "Leads cross-functional teams to deliver complex software projects on time and within budget. Responsible for roadmap planning, stakeholder communication, and risk management for a portfolio of enterprise SaaS products.",
    "resume_source": "resume_donell_woodson_2026.pdf",
    "bio_alignment_requested": true,
    "foundational_interests": ["Building a personal Ai toolkit for daily professional use", "Staying ahead of emerging Ai trends and innovations", "Ai Strategy & Leadership"],
    "advanced_interests": ["Enterprise Ai Architecture", "Automation Architecture & Workflow Design"],
    "learning_modalities": ["Auditory (podcasts, narrated lessons)", "Hands-on applied exercises"],
    "current_title": "Senior Program Manager",
    "industry": "Enterprise SaaS",
    "target": "Principal Program Manager or Director of AI Transformation",
    "pressure_breaks": "Time",
    "work_style": "A template",
    "constraints": "Limited time for learning outside of work hours."
  }
}
```

### 7.2 Garry Francois

```json
{
  "clientId": "test_gfrancois_002",
  "name": "Garry Francois",
  "email": "garry.francois@test.concierge.ai",
  "tier": "premier",
  "intent": "target_role",
  "pace": "straight",
  "focus": "job_search",
  "createdAt": "2026-03-05T10:05:00Z",
  "personaTag": "career_accelerator",
  "answers": {
    "outcomes_goals": ["Professional Advancement", "Increased Compensation"],
    "target_compensation_level": "$150k-$199k",
    "current_or_target_job_title": "Director of Marketing",
    "current_or_target_salary": "$180,000",
    "benefits_under_review": true,
    "ai_usage_frequency": "Occasionally",
    "enterprise_context": ["No formal mandate"],
    "job_description": "Seeking a Director of Marketing to lead our brand strategy, manage a team of 5, and drive growth in key market segments. Must have experience with data-driven marketing, customer segmentation, and cross-functional leadership.",
    "resume_source": "Garry_Francois_Resume_Q1_2026.docx",
    "bio_alignment_requested": true,
    "foundational_interests": ["Using Ai for career development and upskilling", "Ai Strategy & Leadership"],
    "advanced_interests": ["Ai-Driven Customer Experience Optimization", "Ai for Business Intelligence & Real-Time Insights"],
    "learning_modalities": ["Interactive coaching (live/async feedback loops)", "Hands-on applied exercises"],
    "current_title": "Marketing Manager",
    "industry": "Consumer Packaged Goods (CPG)",
    "target": "Director of Marketing",
    "pressure_breaks": "Clarity",
    "work_style": "A conversation",
    "constraints": "Needs to show ROI for any new initiatives."
  }
}
```

### 7.3 Taylor Fulton

```json
{
  "clientId": "test_tfulton_003",
  "name": "Taylor Fulton",
  "email": "taylor.fulton@test.concierge.ai",
  "tier": "premier",
  "intent": "not_sure",
  "pace": "story",
  "focus": "skills",
  "createdAt": "2026-03-05T10:10:00Z",
  "personaTag": "direction_seeker",
  "answers": {
    "outcomes_goals": ["Professional Advancement", "Professional Visibility"],
    "target_compensation_level": "$100k-$149k",
    "current_or_target_job_title": "Technical Project Manager or Product Owner",
    "current_or_target_salary": "$120,000",
    "benefits_under_review": false,
    "ai_usage_frequency": "Rarely or never",
    "enterprise_context": ["No formal mandate"],
    "job_description": "",
    "resume_source": "TaylorFulton_Resume_NonProfit.pdf",
    "bio_alignment_requested": false,
    "foundational_interests": ["Start using Ai in career development and coaching activities", "Process Automation / Workflow Optimization"],
    "advanced_interests": [],
    "learning_modalities": ["Collaboration and group sessions", "Interactive coaching (live/async feedback loops)"],
    "current_title": "Project Manager",
    "industry": "Non-Profit",
    "target": "Not sure, maybe something in tech?",
    "pressure_breaks": "Confidence",
    "work_style": "A conversation",
    "constraints": "Needs a clear, step-by-step plan."
  }
}
```

### 7.4 Derrick Gervin

```json
{
  "clientId": "test_dgervin_004",
  "name": "Derrick Gervin",
  "email": "derrick.gervin@test.concierge.ai",
  "tier": "free",
  "intent": "current_role",
  "pace": "standard",
  "focus": "skills",
  "createdAt": "2026-03-05T10:15:00Z",
  "personaTag": "free_course_user",
  "answers": {
    "outcomes_goals": ["Professional Visibility"],
    "target_compensation_level": "Under $100k",
    "current_or_target_job_title": "Business Analyst or Junior Project Manager",
    "current_or_target_salary": "$75,000",
    "benefits_under_review": false,
    "ai_usage_frequency": "Rarely or never",
    "enterprise_context": ["No formal mandate"],
    "job_description": "",
    "resume_source": "",
    "bio_alignment_requested": false,
    "foundational_interests": ["Start using Ai in career development and coaching activities", "Building a personal Ai toolkit for daily professional use"],
    "advanced_interests": [],
    "learning_modalities": ["Hands-on applied exercises"],
    "current_title": "Recent Graduate",
    "industry": "Open to any",
    "target": "Entry-level business role",
    "pressure_breaks": "Confidence",
    "work_style": "A template",
    "constraints": "On a tight budget."
  }
}
```

---

## 8. Expected Artifact Output Summaries

For each test user, the following table outlines what the key generated artifacts should contain. This serves as a validation rubric for the generation pipeline.

### 8.1 The Brief

| User | "What I Learned" Summary | "What Matters Most" Values | "Next 72 Hours" Actions |
| :--- | :--- | :--- | :--- |
| **Donell** | Senior PM in SaaS, regular AI user, wants to lead AI transformation internally. Time-constrained. | Stability, Visibility, Mastery | Audit current Copilot usage for automation opportunities. Identify one internal process to propose an AI pilot for. |
| **Garry** | Marketing Manager in CPG, occasional AI user, aggressively pursuing Director promotion. Needs to prove ROI. | Advancement, Compensation, Clarity | Identify 3 marketing KPIs impacted by AI segmentation. Draft a 1-page proposal for an AI-driven campaign pilot. |
| **Taylor** | PM in Non-Profit, no AI experience, uncertain about direction, exploring tech transition. Needs confidence. | Growth, Direction, Support | Research 5 tech companies that value non-profit experience. Complete one introductory Agile course. |
| **Derrick** | N/A (Locked) | N/A (Locked) | N/A (Locked) |

### 8.2 Your Plan (2-Week Sprint)

| User | Week 1 Focus | Week 2 Focus |
| :--- | :--- | :--- |
| **Donell** | Complete AI Strategy & Leadership Episode 1. Audit 3 workflows for automation potential. Draft pilot proposal outline. | Present pilot proposal to manager. Begin hands-on exercise with Copilot for project reporting. Review Enterprise AI Architecture Episode. |
| **Garry** | Finalize resume with Resume Reviewer suggestions. Identify 5 internal stakeholders for networking. Draft outreach messages. | Send outreach messages. Prepare a 5-minute presentation on AI-driven marketing ROI. Schedule 2 informational meetings. |
| **Taylor** | Complete "Intro to Process Automation" Episode. Research 5 tech companies. Draft a list of transferable skills from PM experience. | Schedule 3 informational interviews. Start an introductory Agile course. Update resume with transferable skills framing. |
| **Derrick** | N/A (Locked) | N/A (Locked) |

### 8.3 Binge Episode Topics

| User | Episode 1 Topic | Episode 2 Topic | Episode 3 Topic |
| :--- | :--- | :--- | :--- |
| **Donell** | AI Strategy & Leadership: How to Pitch an AI Pilot to Your VP | Enterprise AI Architecture: The 3 Patterns Every PM Should Know | Automation Architecture: From Manual Status Reports to Copilot Dashboards |
| **Garry** | AI-Driven Customer Segmentation: The CPG Playbook | Business Intelligence: Real-Time Insights for Marketing Managers | Building the Business Case: How to Prove AI ROI to a Skeptical CFO |
| **Taylor** | Process Automation 101: What It Actually Means for Your Career | From Non-Profit PM to Tech PM: The Skills You Already Have | Agile for Career Changers: A 15-Minute Crash Course |
| **Derrick** | What is AI? A No-Jargon Introduction (Pre-set) | 5 AI Tools Every Job Seeker Should Know (Pre-set) | How to Talk About AI in Your Next Interview (Pre-set) |

---

*End of Test User Specifications*

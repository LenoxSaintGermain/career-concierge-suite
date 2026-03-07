import React from 'react';

type DeliveryStatus = 'done' | 'in_progress' | 'queued' | 'blocked';

interface RoadmapNode {
  id: string;
  phase: string;
  window: string;
  headline: string;
  epics: string[];
  stories: string[];
  status: DeliveryStatus;
}

interface EpicRow {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: DeliveryStatus;
  stories: string[];
  focus: string;
}

interface StoryRow {
  id: string;
  epic: string;
  title: string;
  status: DeliveryStatus;
  surface: string;
  validation: string;
}

interface PersonaTrack {
  id: string;
  name: string;
  archetype: string;
  tier: string;
  intent: string;
  status: DeliveryStatus;
  stories: string[];
  acceptanceFocus: string[];
  nextGate: string;
}

interface MasterTask {
  id: string;
  title: string;
  status: DeliveryStatus;
  goal: string;
  surfaces: string;
  stories: string[];
  personas: string[];
}

type RoadmapPanel = 'overview' | 'charter' | 'validation';
type CharterTone = 'strong' | 'building' | 'queued' | 'gap';

interface CharterCheckpoint {
  id: string;
  lane: 'Foundation' | 'Journey OS' | 'Episodes + Media' | 'Staff + Ops';
  title: string;
  source: 'Jim' | 'Lucid' | 'Shared';
  note: string;
  epics?: string[];
  tasks?: string[];
  forcedScore?: number;
}

const ROADMAP_NODES: RoadmapNode[] = [
  {
    id: 's1',
    phase: 'Sprint 1',
    window: 'Weeks 1-2',
    headline: 'Foundation and intake baseline',
    epics: ['E01', 'E05'],
    stories: ['E01-S01', 'E01-S02', 'E05-S01'],
    status: 'done',
  },
  {
    id: 's2',
    phase: 'Sprint 2',
    window: 'Weeks 3-4',
    headline: 'Core artifacts and orchestration bridge',
    epics: ['E01', 'E02', 'E04'],
    stories: ['E01-S03', 'E04-S01', 'E04-S02', 'E02-S03'],
    status: 'done',
  },
  {
    id: 's3',
    phase: 'Sprint 3',
    window: 'Weeks 5-6',
    headline: 'Binge feed and responsive polish',
    epics: ['E03', 'E04', 'E05'],
    stories: ['E03-S01', 'E03-S02', 'E04-S03', 'E05-S02'],
    status: 'in_progress',
  },
  {
    id: 's4',
    phase: 'Sprint 4',
    window: 'Weeks 7-8',
    headline: 'Execution rail and investor demo lock',
    epics: ['E02', 'E03', 'E05', 'E06'],
    stories: ['E02-S04', 'E03-S03', 'E05-S03', 'E06-S01', 'E06-S02', 'E06-S03'],
    status: 'in_progress',
  },
  {
    id: 's5',
    phase: 'Sprint 5',
    window: 'Weeks 9-10',
    headline: 'Brand OS hardening, cinematic Episodes, and media pipeline',
    epics: ['E07', 'E08', 'E09'],
    stories: ['E07-S04', 'E08-S01', 'E08-S02', 'E08-S03', 'E08-S04', 'E08-S05', 'E09-S01', 'E09-S02', 'E09-S03', 'E09-S04', 'E09-S05', 'E09-S06', 'E09-S07'],
    status: 'queued',
  },
  {
    id: 's6',
    phase: 'Sprint 6',
    window: 'Weeks 11-12',
    headline: 'Agentic staff operating model and orchestration control plane',
    epics: ['E10'],
    stories: ['E10-S01', 'E10-S02', 'E10-S03', 'E10-S04', 'E10-S05', 'E10-S06', 'E10-S07'],
    status: 'queued',
  },
];

const EPIC_ROWS: EpicRow[] = [
  {
    id: 'E01',
    title: 'Smart Start Intake & Professional DNA',
    priority: 'P0',
    status: 'done',
    stories: ['E01-S01', 'E01-S02', 'E01-S03'],
    focus: 'Intake completion, persistence, and core artifact generation integrity.',
  },
  {
    id: 'E02',
    title: 'Agentic Framework & Orchestration',
    priority: 'P0',
    status: 'in_progress',
    stories: ['E02-S01', 'E02-S02', 'E02-S03', 'E02-S04'],
    focus: 'Chief of Staff orchestration, interaction logs, and approval controls.',
  },
  {
    id: 'E03',
    title: 'Binge Learning Episode Generation',
    priority: 'P0',
    status: 'in_progress',
    stories: ['E03-S01', 'E03-S02', 'E03-S03'],
    focus: 'Episode quality, schema compliance, and model/cost routing behavior.',
  },
  {
    id: 'E04',
    title: 'Core Suite Artifacts & UI',
    priority: 'P1',
    status: 'in_progress',
    stories: ['E04-S01', 'E04-S02', 'E04-S03'],
    focus: 'Module UX consistency and mobile rendering quality across surfaces.',
  },
  {
    id: 'E05',
    title: 'Admin Console & System Ops',
    priority: 'P1',
    status: 'in_progress',
    stories: ['E05-S01', 'E05-S02', 'E05-S03'],
    focus: 'Admin access reliability, prompt controls, and feature-toggle correctness.',
  },
  {
    id: 'E06',
    title: 'ConciergeJobSearch Execution Rail',
    priority: 'P2',
    status: 'done',
    stories: ['E06-S01', 'E06-S02', 'E06-S03'],
    focus: 'Resume upload, review agent output, and search strategy artifact flow.',
  },
  {
    id: 'E07',
    title: 'Editorial Grid Brand OS',
    priority: 'P1',
    status: 'in_progress',
    stories: ['E07-S01', 'E07-S02', 'E07-S03', 'E07-S04'],
    focus: 'Shared brand tokens, workflow-label sync, logo injection, and shell hierarchy controls.',
  },
  {
    id: 'E08',
    title: 'Client-Facing Cinematic Episodes Player',
    priority: 'P1',
    status: 'queued',
    stories: ['E08-S01', 'E08-S02', 'E08-S03', 'E08-S04', 'E08-S05'],
    focus: 'Separate BTS/operator mode from the final user-facing micro-drama player.',
  },
  {
    id: 'E09',
    title: 'Content Director Media Pipeline',
    priority: 'P1',
    status: 'in_progress',
    stories: ['E09-S01', 'E09-S02', 'E09-S03', 'E09-S04', 'E09-S05', 'E09-S06', 'E09-S07'],
    focus: 'Library-first media planning, bespoke thresholds, and dedicated async generation architecture.',
  },
  {
    id: 'E10',
    title: 'Agentic Staff Operating Model',
    priority: 'P1',
    status: 'queued',
    stories: ['E10-S01', 'E10-S02', 'E10-S03', 'E10-S04', 'E10-S05', 'E10-S06', 'E10-S07'],
    focus: 'Canonical staff contracts, orchestration governance, admin control-plane visibility, and current-stack discipline.',
  },
  {
    id: 'E11',
    title: 'Sample Persona Test Harness',
    priority: 'P1',
    status: 'queued',
    stories: ['E11-S01', 'E11-S02', 'E11-S03'],
    focus: 'Quick-launch, reset, and validation shortcuts for seeded demo personas.',
  },
];

const STORY_ROWS: StoryRow[] = [
  {
    id: 'E01-S01',
    epic: 'E01',
    title: 'New User Intake',
    status: 'done',
    surface: 'Start Here / Intake',
    validation: 'Submit full intake and verify client doc + answers persist in Firestore.',
  },
  {
    id: 'E01-S02',
    epic: 'E01',
    title: 'Returning User Intake',
    status: 'done',
    surface: 'Auth + Routing',
    validation: 'Login with completed and incomplete profiles and confirm routing branch.',
  },
  {
    id: 'E01-S03',
    epic: 'E01',
    title: 'Suite Artifact Generation Trigger',
    status: 'done',
    surface: 'Suite API',
    validation: 'Confirm brief/plan/profile/ai_profile/gaps all regenerate after intake submit.',
  },
  {
    id: 'E02-S01',
    epic: 'E02',
    title: 'Agent Role Definition',
    status: 'done',
    surface: 'Firestore agents',
    validation: 'Create typed `agents` docs and verify required roles are present.',
  },
  {
    id: 'E02-S02',
    epic: 'E02',
    title: 'Agent DNA Access',
    status: 'done',
    surface: 'Agent orchestration',
    validation: 'Read DNA + artifacts through scoped agent policy definitions; writes limited to approved destinations only.',
  },
  {
    id: 'E02-S03',
    epic: 'E02',
    title: 'Agent Summary & Logging',
    status: 'done',
    surface: 'Chief of Staff',
    validation: 'Generate summary and recommendations into `clients/{id}/interactions`.',
  },
  {
    id: 'E02-S04',
    epic: 'E02',
    title: 'Human-in-the-Loop Validation',
    status: 'in_progress',
    surface: 'Admin queue',
    validation: 'Approval items must appear in global admin queue and support cross-user approve/reject actions.',
  },
  {
    id: 'E03-S01',
    epic: 'E03',
    title: 'Pilot Episode Generation',
    status: 'in_progress',
    surface: 'Episodes',
    validation: 'Generate personalized episode and confirm structured render in feed.',
  },
  {
    id: 'E03-S02',
    epic: 'E03',
    title: 'Episode Template Engine',
    status: 'in_progress',
    surface: 'Prompt orchestration',
    validation: 'Validate JSON structure consistency across multiple generated episodes.',
  },
  {
    id: 'E03-S03',
    epic: 'E03',
    title: 'Model Cost Control',
    status: 'in_progress',
    surface: 'Admin + Binge API',
    validation: 'Switch model/temperature in Admin and confirm effective runtime model.',
  },
  {
    id: 'E04-S01',
    epic: 'E04',
    title: 'Module Grid Dashboard',
    status: 'done',
    surface: 'Suite home',
    validation: 'Verify module order, lock states, and modal opens for every tile.',
  },
  {
    id: 'E04-S02',
    epic: 'E04',
    title: 'Artifact Views',
    status: 'done',
    surface: 'Artifact surfaces',
    validation: 'Confirm all artifact views render and missing-state fallback works.',
  },
  {
    id: 'E04-S03',
    epic: 'E04',
    title: 'Mobile-First Responsive Design',
    status: 'in_progress',
    surface: 'Mobile suite',
    validation: 'Run complete flow at mobile breakpoints and check for overflow/regressions.',
  },
  {
    id: 'E05-S01',
    epic: 'E05',
    title: 'Secure Admin Access',
    status: 'in_progress',
    surface: 'Admin console',
    validation: 'Allowlist admins only; non-admin gets `admin_required` response.',
  },
  {
    id: 'E05-S02',
    epic: 'E05',
    title: 'Prompt Management',
    status: 'done',
    surface: 'Admin prompts',
    validation: 'Update appendices and verify generated outputs reflect new prompt deltas.',
  },
  {
    id: 'E05-S03',
    epic: 'E05',
    title: 'Feature Flags',
    status: 'done',
    surface: 'Public config + UI',
    validation: 'Toggle episodes/CJS and verify module visibility changes immediately, including free-tier gating rules.',
  },
  {
    id: 'E06-S01',
    epic: 'E06',
    title: 'Resume Upload',
    status: 'done',
    surface: 'CJS execution',
    validation: 'Upload PDF/DOCX to Cloud Storage and persist path into client profile.',
  },
  {
    id: 'E06-S02',
    epic: 'E06',
    title: 'Resume Review Agent',
    status: 'done',
    surface: 'CJS agent output',
    validation: 'Generate `resume_review` artifact from uploaded resume and target role.',
  },
  {
    id: 'E06-S03',
    epic: 'E06',
    title: 'Search Strategy Generation',
    status: 'done',
    surface: 'CJS strategy',
    validation: 'Generate `search_strategy` artifact with personalized multi-channel plan.',
  },
  {
    id: 'E07-S01',
    epic: 'E07',
    title: 'Shared Brand Token System',
    status: 'done',
    surface: 'Admin config + public config',
    validation: 'Save brand identity/palette/hierarchy values and confirm the shell rehydrates with the same config.',
  },
  {
    id: 'E07-S02',
    epic: 'E07',
    title: 'Admin Brand Studio + Preview',
    status: 'done',
    surface: 'Admin console',
    validation: 'Edit Brand Studio values and confirm preview + saved shell state stay in sync.',
  },
  {
    id: 'E07-S03',
    epic: 'E07',
    title: 'Logo Propagation',
    status: 'done',
    surface: 'Header + prologue',
    validation: 'Save a logo URL and confirm it renders in shell header/prologue without layout breakage.',
  },
  {
    id: 'E07-S04',
    epic: 'E07',
    title: 'Workflow Label + Overlay Sync',
    status: 'in_progress',
    surface: 'Suite shell',
    validation: 'Confirm eyebrows/titles/overlay copy match the official workflow language; deeper artifact-body copy remains separate.',
  },
  {
    id: 'E08-S01',
    epic: 'E08',
    title: 'Client Episodes View vs BTS Mode',
    status: 'queued',
    surface: 'Episodes IA',
    validation: 'Default Episodes mode must hide art-director/model-routing language while preserving operator access in a separate mode.',
  },
  {
    id: 'E08-S02',
    epic: 'E08',
    title: 'Cinematic Vertical Micro-Drama Player',
    status: 'queued',
    surface: 'Episodes player',
    validation: 'Episodes should read as cold open -> beats -> challenge -> continuation in a portrait-forward stage.',
  },
  {
    id: 'E08-S03',
    epic: 'E08',
    title: 'Editorial Context Overlays + Challenge Cards',
    status: 'queued',
    surface: 'Episodes overlays',
    validation: 'Context notes must be concise/editorial and challenge cards must test judgment without exposing backend machinery.',
  },
  {
    id: 'E08-S04',
    epic: 'E08',
    title: 'Mobile/Desktop Editorial Adaptation',
    status: 'queued',
    surface: 'Responsive Episodes UI',
    validation: 'Mobile stays portrait-first and immersive; desktop balances identity rail, stage, and context column.',
  },
  {
    id: 'E08-S05',
    epic: 'E08',
    title: 'Brand-System Design QA Guardrails',
    status: 'queued',
    surface: 'Episodes design QA',
    validation: 'Episodes redesign must remain compliant with Brand Studio palette, hierarchy, spacing, and motion rules.',
  },
  {
    id: 'E09-S01',
    epic: 'E09',
    title: 'Content Director Planning Trigger',
    status: 'done',
    surface: 'Intake -> learning/episode plan',
    validation: 'Create learning-plan and episode-plan seeds once intake + first-order client signal are available.',
  },
  {
    id: 'E09-S02',
    epic: 'E09',
    title: 'Reusable Media Library + Taxonomy',
    status: 'in_progress',
    surface: 'Media library',
    validation: 'Generic concept assets must be tagged and retrievable without regeneration.',
  },
  {
    id: 'E09-S03',
    epic: 'E09',
    title: 'Library-First Resolver + Gap Analysis',
    status: 'done',
    surface: 'Episode asset resolution',
    validation: 'Resolver now reuses tagged library assets first, classifies unresolved reusable tags versus bespoke needs, and writes the decision summary into orchestration runs.',
  },
  {
    id: 'E09-S04',
    epic: 'E09',
    title: 'Cloud Run Media-Pipeline Service',
    status: 'queued',
    surface: 'Async media jobs',
    validation: 'Long-running generation should move through a dedicated worker/service with job state and retries.',
  },
  {
    id: 'E09-S05',
    epic: 'E09',
    title: 'Cloud Storage + Firestore Metadata Model',
    status: 'queued',
    surface: 'Storage architecture',
    validation: 'Binary media belongs in Cloud Storage; Firestore stores tags, manifests, lineage, and status.',
  },
  {
    id: 'E09-S06',
    epic: 'E09',
    title: 'Operator Lineage vs Client Output Boundary',
    status: 'queued',
    surface: 'Operator mode + client mode',
    validation: 'Operators can inspect provenance while clients only see final assembled episode media.',
  },
  {
    id: 'E09-S07',
    epic: 'E09',
    title: 'Admin Media-Pipeline Console',
    status: 'queued',
    surface: 'Admin media operations',
    validation: 'Admin should expose queue health, failures, retries, approvals, library status, and pipeline configuration in one section.',
  },
  {
    id: 'E10-S01',
    epic: 'E10',
    title: 'Canonical Staff Registry + Contracts',
    status: 'queued',
    surface: 'Agent registry + governance docs',
    validation: 'Each MVP staff role must define trigger, read/write scope, IO shape, and approval policy.',
  },
  {
    id: 'E10-S02',
    epic: 'E10',
    title: 'Intent/Tier Handoff Graph',
    status: 'queued',
    surface: 'Chief of Staff orchestration',
    validation: 'Intent and tier should change which downstream staff roles are invoked and why.',
  },
  {
    id: 'E10-S03',
    epic: 'E10',
    title: 'Firestore Orchestration Memory Model',
    status: 'queued',
    surface: 'Firestore orchestration runs',
    validation: 'Runs, evidence, plans, and evaluation notes should be inspectable without introducing a new primary data stack.',
  },
  {
    id: 'E10-S04',
    epic: 'E10',
    title: 'Admin Orchestration Control Plane',
    status: 'queued',
    surface: 'Admin orchestration operations',
    validation: 'Admin should expose staff roster, run history, policy controls, approvals, and evaluation state in one operating section.',
  },
  {
    id: 'E10-S05',
    epic: 'E10',
    title: 'Human Escalation + Approval Discipline',
    status: 'queued',
    surface: 'Admin approvals + concierge escalation',
    validation: 'Sensitive outbound or bespoke actions should route into role-aware approval and escalation flows.',
  },
  {
    id: 'E10-S06',
    epic: 'E10',
    title: 'Current-Stack Channel/Runtime Policy',
    status: 'queued',
    surface: 'Architecture governance',
    validation: 'Staffing work should stay aligned to the current web OS stack and explicitly defer alternate channel-native architectures.',
  },
  {
    id: 'E10-S07',
    epic: 'E10',
    title: 'Staff Effectiveness Telemetry',
    status: 'queued',
    surface: 'Evaluation + confidence signals',
    validation: 'Operators should be able to review staff confidence and policy flags without exposing them in the client suite.',
  },
  {
    id: 'E11-S01',
    epic: 'E11',
    title: 'One-Click Sample Persona Launch',
    status: 'queued',
    surface: 'Admin persona harness',
    validation: 'Launch each seeded sample user quickly without manual credential handling.',
  },
  {
    id: 'E11-S02',
    epic: 'E11',
    title: 'Persona Reset + Reseed Controls',
    status: 'queued',
    surface: 'Admin persona harness',
    validation: 'Reset and reseed deterministic persona state without disturbing unrelated users.',
  },
  {
    id: 'E11-S03',
    epic: 'E11',
    title: 'Persona-Aware Validation Shortcuts',
    status: 'queued',
    surface: 'Roadmap validation',
    validation: 'Tie launch, reset, and proof-capture actions directly to each sample persona checklist.',
  },
];

const PERSONA_TRACKS: PersonaTrack[] = [
  {
    id: 'TU1',
    name: 'Donell Woodson',
    archetype: 'Skill-Sharpener',
    tier: 'SkillSync AI Premier',
    intent: 'Stay sharp in current role',
    status: 'in_progress',
    stories: ['E03-S01', 'E03-S02', 'E04-S02', 'E05-S02', 'E08-S01', 'E08-S02', 'E09-S01', 'E09-S03', 'E09-S07', 'E10-S02', 'E10-S03', 'E11-S01', 'E11-S03'],
    acceptanceFocus: [
      'AI Profile reflects regular AI usage + template work style.',
      'Episode sequence starts with AI Strategy and Leadership in voice-first format.',
      'Plan outputs internal AI initiative actions, not external search steps.',
    ],
    nextGate: 'Run TU1 validation against narrated episode routing and passive CJS behavior.',
  },
  {
    id: 'TU2',
    name: 'Garry Francois',
    archetype: 'Career Accelerator',
    tier: 'CJS Premier',
    intent: 'Move into a specific next role',
    status: 'in_progress',
    stories: ['E06-S01', 'E06-S02', 'E06-S03', 'E02-S04', 'E09-S01', 'E09-S03', 'E09-S07', 'E10-S02', 'E10-S05', 'E11-S01', 'E11-S03'],
    acceptanceFocus: [
      'Your Plan includes KPI and ROI-driven 72-hour actions.',
      'CJS rail drives resume review + internal promotion strategy.',
      'Assets supports multi-version resume and proposal iteration.',
    ],
    nextGate: 'Run TU2 manual validation and tune scoring + strategy outputs from live resume inputs.',
  },
  {
    id: 'TU3',
    name: 'Taylor Fulton',
    archetype: 'Direction-Seeker',
    tier: 'SkillSync Foundation',
    intent: 'Need help designing direction',
    status: 'in_progress',
    stories: ['E04-S02', 'E03-S01', 'E04-S03', 'E02-S03', 'E08-S01', 'E08-S02', 'E09-S01', 'E09-S03', 'E09-S07', 'E10-S02', 'E10-S03', 'E11-S01', 'E11-S03'],
    acceptanceFocus: [
      'Profile and Gaps highlight transferable skills into tech pathways.',
      'Episode sequence starts with foundational process automation tracks.',
      'MyConcierge guidance remains conversational and confidence-building.',
    ],
    nextGate: 'Run TU3 validation against the shipped MyConcierge flow and exploration-first plan outputs.',
  },
  {
    id: 'TU4',
    name: 'Derrick Gervin',
    archetype: 'Free Course User',
    tier: 'Free Foundation Access',
    intent: 'Learn AI fundamentals before upgrading',
    status: 'in_progress',
    stories: ['E01-S01', 'E03-S01', 'E05-S03', 'E08-S01', 'E08-S02', 'E09-S01', 'E09-S03', 'E09-S07', 'E10-S02', 'E10-S06', 'E11-S01', 'E11-S03'],
    acceptanceFocus: [
      'Short intake only for foundational interests.',
      'Only readiness + generic resource guide are visible.',
      'Upgrade CTA appears after free playlist completion.',
    ],
    nextGate: 'Run TU4 validation against hidden paid modules, starter playlist behavior, and upgrade CTA copy.',
  },
];

const MASTER_TASKLIST: MasterTask[] = [
  {
    id: 'MTL-01',
    title: 'Persona fixture seed + deterministic intake payloads',
    status: 'done',
    goal: 'Create reusable test accounts/data aligned to all four test-user specs.',
    surfaces: 'Auth, Firestore clients',
    stories: ['E01-S01', 'E01-S02'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-02',
    title: 'Intent-based journey routing in suite home + module unlock order',
    status: 'done',
    goal: 'Prioritize module order and CTA by intent: current role, target role, or unsure.',
    surfaces: 'Suite Home, Routing',
    stories: ['E04-S01', 'E05-S03'],
    personas: ['TU1', 'TU2', 'TU3'],
  },
  {
    id: 'MTL-03',
    title: 'Chief of Staff interaction ledger',
    status: 'done',
    goal: 'Persist conversation summary + next-action records for demo audit trail.',
    surfaces: 'Chief of Staff, Firestore interactions',
    stories: ['E02-S03'],
    personas: ['TU1', 'TU2', 'TU3'],
  },
  {
    id: 'MTL-04',
    title: 'Episode personalization and modality routing',
    status: 'in_progress',
    goal: 'Shipped deterministic topic routing and narrated delivery path; persona QA still pending.',
    surfaces: 'Episodes, Binge API',
    stories: ['E03-S01', 'E03-S02', 'E03-S03'],
    personas: ['TU1', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-05',
    title: 'CJS execution rail (upload, resume review, search strategy)',
    status: 'done',
    goal: 'Deliver full promotion/job-search workflow with persisted artifacts.',
    surfaces: 'CJS Execution, Assets, API',
    stories: ['E06-S01', 'E06-S02', 'E06-S03'],
    personas: ['TU2'],
  },
  {
    id: 'MTL-06',
    title: 'Free-tier constrained surface + upgrade conversion CTA',
    status: 'in_progress',
    goal: 'Shipped free-tier gating, starter playlist, and upgrade CTA; persona QA still pending.',
    surfaces: 'Auth, Module visibility, Plan/CTA',
    stories: ['E05-S03', 'E04-S01'],
    personas: ['TU4'],
  },
  {
    id: 'MTL-07',
    title: 'Mobile completion pass for intake, episodes, and roadmap surfaces',
    status: 'in_progress',
    goal: 'Remove overflow and interaction regressions for iOS and Android demo runs.',
    surfaces: 'Responsive UI',
    stories: ['E04-S03'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-08',
    title: 'Manual QA script and acceptance proof capture',
    status: 'in_progress',
    goal: 'Produce one-click validation checklist per persona with evidence links.',
    surfaces: 'Roadmap module, Docs',
    stories: ['E02-S04', 'E04-S02'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-09',
    title: 'Editorial grid brand OS + workflow label sync',
    status: 'in_progress',
    goal: 'Replace POC shell language with official naming, palette, overlay treatment, and admin-tunable hierarchy.',
    surfaces: 'Admin, Suite shell, Public config',
    stories: ['E07-S01', 'E07-S02', 'E07-S03', 'E07-S04'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-10',
    title: 'Client-facing cinematic Episodes player',
    status: 'queued',
    goal: 'Replace BTS-style Episodes with the final user-facing micro-drama player while keeping a separate operator mode.',
    surfaces: 'Episodes, Binge API, Operator mode',
    stories: ['E08-S01', 'E08-S02', 'E08-S03', 'E08-S04', 'E08-S05'],
    personas: ['TU1', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-11',
    title: 'Content Director media orchestration + reusable library pipeline',
    status: 'in_progress',
    goal: 'Move episode media planning to a library-first pipeline with bespoke generation only for client-specific value.',
    surfaces: 'Media library, async jobs, operator mode',
    stories: ['E09-S01', 'E09-S02', 'E09-S03', 'E09-S04', 'E09-S05', 'E09-S06', 'E09-S07'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-12',
    title: 'Agentic staff operating model + orchestration control plane',
    status: 'queued',
    goal: 'Formalize the staff roster, handoff graph, evidence model, and admin orchestration console on the current stack.',
    surfaces: 'Chief of Staff, Admin, Firestore orchestration runs',
    stories: ['E10-S01', 'E10-S02', 'E10-S03', 'E10-S04', 'E10-S05', 'E10-S06', 'E10-S07'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
  {
    id: 'MTL-13',
    title: 'Sample persona test harness + quick-switch ops',
    status: 'queued',
    goal: 'Let operators launch, reset, and validate seeded sample users without manual auth and state wrangling.',
    surfaces: 'Admin, Roadmap validation, Persona fixtures',
    stories: ['E11-S01', 'E11-S02', 'E11-S03'],
    personas: ['TU1', 'TU2', 'TU3', 'TU4'],
  },
];

const CHARTER_CHECKPOINTS: CharterCheckpoint[] = [
  {
    id: 'CC-01',
    lane: 'Foundation',
    title: 'Professional DNA in Firestore',
    source: 'Jim',
    note: 'Single source of truth for the suite and downstream staff.',
    epics: ['E01', 'E04'],
    tasks: ['MTL-01', 'MTL-02'],
  },
  {
    id: 'CC-02',
    lane: 'Foundation',
    title: 'Agent-as-position governance',
    source: 'Jim',
    note: 'Roles, guardrails, scopes, and operational visibility must be explicit.',
    epics: ['E02', 'E10'],
    tasks: ['MTL-03', 'MTL-12'],
  },
  {
    id: 'CC-03',
    lane: 'Journey OS',
    title: 'Conversational intake + intent routing',
    source: 'Lucid',
    note: 'Current role, next role, and not sure must route differently.',
    epics: ['E01', 'E04', 'E05'],
    tasks: ['MTL-02'],
  },
  {
    id: 'CC-04',
    lane: 'Journey OS',
    title: 'Brief + Plan editorial OS',
    source: 'Lucid',
    note: 'The Brief, Plan, and suite pacing remain the operating center.',
    epics: ['E04', 'E07'],
    tasks: ['MTL-09'],
  },
  {
    id: 'CC-05',
    lane: 'Journey OS',
    title: 'Public AI Concierge onboarding',
    source: 'Lucid',
    note: 'Voice-led pre-auth entry is still only partially modeled.',
    epics: ['E01', 'E05'],
    forcedScore: 0.45,
  },
  {
    id: 'CC-06',
    lane: 'Journey OS',
    title: 'Concierge scheduling + booking ops',
    source: 'Jim',
    note: 'Calendar/date-time onboarding remains the clearest uncovered baseline.',
    forcedScore: 0,
  },
  {
    id: 'CC-07',
    lane: 'Episodes + Media',
    title: 'DNA-linked binge learning',
    source: 'Jim',
    note: 'Episode generation exists; final cinematic player is still queued.',
    epics: ['E03', 'E08'],
    tasks: ['MTL-04', 'MTL-10'],
  },
  {
    id: 'CC-08',
    lane: 'Episodes + Media',
    title: 'Library-first bespoke media pipeline',
    source: 'Shared',
    note: 'Reusable library, lineage, and admin media ops are defined but not shipped.',
    epics: ['E09'],
    tasks: ['MTL-11'],
  },
  {
    id: 'CC-09',
    lane: 'Staff + Ops',
    title: 'Chief of Staff orchestration loop',
    source: 'Jim',
    note: 'Summary logging ships today; full control-plane visibility remains queued.',
    epics: ['E02', 'E10'],
    tasks: ['MTL-03', 'MTL-12'],
  },
  {
    id: 'CC-10',
    lane: 'Staff + Ops',
    title: 'Admin control plane + approvals',
    source: 'Jim',
    note: 'Approvals and admin config exist; staffing/media ops still need consolidation.',
    epics: ['E05', 'E09', 'E10'],
    tasks: ['MTL-08', 'MTL-11', 'MTL-12'],
  },
  {
    id: 'CC-11',
    lane: 'Staff + Ops',
    title: 'Current-stack alignment',
    source: 'Shared',
    note: 'Stay on the Firebase / Cloud Run / Gemini path rather than re-platforming.',
    epics: ['E09', 'E10'],
    tasks: ['MTL-11', 'MTL-12'],
  },
];

const statusLabel: Record<DeliveryStatus, string> = {
  done: 'Shipped',
  in_progress: 'Active',
  queued: 'Queued',
  blocked: 'Blocked',
};

const statusTone: Record<DeliveryStatus, string> = {
  done: 'text-emerald-700 border-emerald-500/35 bg-emerald-50',
  in_progress: 'text-brand-teal border-brand-teal/35 bg-[#eaf8f7]',
  queued: 'text-black/50 border-black/15 bg-white',
  blocked: 'text-red-700 border-red-400/35 bg-red-50',
};

const nodeGlow: Record<DeliveryStatus, string> = {
  done: 'shadow-[0_0_0_1px_rgba(5,150,105,0.25),0_16px_30px_-20px_rgba(5,150,105,0.7)]',
  in_progress: 'shadow-[0_0_0_1px_rgba(14,159,150,0.35),0_16px_30px_-20px_rgba(14,159,150,0.75)]',
  queued: 'shadow-[0_0_0_1px_rgba(17,24,39,0.12),0_12px_24px_-20px_rgba(17,24,39,0.4)]',
  blocked: 'shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_16px_30px_-20px_rgba(239,68,68,0.6)]',
};

const dotTone: Record<DeliveryStatus, string> = {
  done: 'bg-emerald-500',
  in_progress: 'bg-brand-teal animate-pulse',
  queued: 'bg-black/25',
  blocked: 'bg-red-500',
};

const progressScore: Record<DeliveryStatus, number> = {
  done: 1,
  in_progress: 0.68,
  queued: 0.25,
  blocked: 0,
};

const charterToneMeta: Record<
  CharterTone,
  { label: string; card: string; dot: string; text: string }
> = {
  strong: {
    label: 'Strong',
    card: 'border-emerald-500/35 bg-emerald-50',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  building: {
    label: 'Building',
    card: 'border-brand-teal/35 bg-[#eaf8f7]',
    dot: 'bg-brand-teal',
    text: 'text-brand-teal',
  },
  queued: {
    label: 'Queued',
    card: 'border-black/10 bg-white',
    dot: 'bg-black/35',
    text: 'text-black/60',
  },
  gap: {
    label: 'Gap',
    card: 'border-amber-500/35 bg-amber-50',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
};

const laneOrder = ['Foundation', 'Journey OS', 'Episodes + Media', 'Staff + Ops'] as const;

const formatPercent = (value: number) => `${Math.max(0, Math.min(100, Math.round(value)))}%`;

const describeConfidence = (value: number) => {
  if (value >= 82) return 'Strong alignment';
  if (value >= 65) return 'On track, still maturing';
  if (value >= 45) return 'Partial coverage';
  return 'Needs structural work';
};

export const RoadmapView: React.FC = () => {
  const [panel, setPanel] = React.useState<RoadmapPanel>('overview');
  const doneCount = ROADMAP_NODES.filter((node) => node.status === 'done').length;
  const activeCount = ROADMAP_NODES.filter((node) => node.status === 'in_progress').length;
  const blockedTasks = MASTER_TASKLIST.filter((task) => task.status === 'blocked').length;
  const queuedTasks = MASTER_TASKLIST.filter((task) => task.status === 'queued').length;
  const activeTasks = MASTER_TASKLIST.filter((task) => task.status === 'in_progress').length;
  const storyCount = STORY_ROWS.length;
  const epicCount = EPIC_ROWS.length;
  const epicStatus = Object.fromEntries(EPIC_ROWS.map((epic) => [epic.id, epic.status])) as Record<string, DeliveryStatus>;
  const taskStatus = Object.fromEntries(MASTER_TASKLIST.map((task) => [task.id, task.status])) as Record<string, DeliveryStatus>;
  const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  const getLinkedScore = (checkpoint: CharterCheckpoint) => {
    if (typeof checkpoint.forcedScore === 'number') return checkpoint.forcedScore;
    const linkedScores = [
      ...(checkpoint.epics ?? []).map((id) => progressScore[epicStatus[id] ?? 'queued']),
      ...(checkpoint.tasks ?? []).map((id) => progressScore[taskStatus[id] ?? 'queued']),
    ];
    return average(linkedScores);
  };

  const charterRows = CHARTER_CHECKPOINTS.map((checkpoint) => {
    const score = getLinkedScore(checkpoint);
    const tone: CharterTone = score >= 0.85 ? 'strong' : score >= 0.5 ? 'building' : score > 0 ? 'queued' : 'gap';
    return {
      ...checkpoint,
      score,
      percentage: Math.round(score * 100),
      tone,
    };
  });

  const baselineConfidence = average(charterRows.map((row) => row.score)) * 100;
  const executionConfidence = average(MASTER_TASKLIST.map((task) => progressScore[task.status])) * 100;
  const agenticConfidence = average(
    EPIC_ROWS.filter((epic) => ['E02', 'E08', 'E09', 'E10'].includes(epic.id)).map((epic) => progressScore[epic.status]),
  ) * 100;
  const highestRisk = charterRows
    .filter((row) => row.tone === 'gap' || row.tone === 'queued')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const activeTaskRows = MASTER_TASKLIST.filter((task) => task.status === 'in_progress');
  const queuedEpicRows = EPIC_ROWS.filter((epic) => epic.status === 'queued');
  const laneSummaries = laneOrder.map((lane) => {
    const items = charterRows.filter((row) => row.lane === lane);
    const score = average(items.map((item) => item.score)) * 100;
    const strongCount = items.filter((item) => item.tone === 'strong').length;
    const riskCount = items.filter((item) => item.tone === 'gap' || item.tone === 'queued').length;
    return { lane, items, score, strongCount, riskCount };
  });
  const panelOptions: Array<{ id: RoadmapPanel; label: string; helper: string }> = [
    { id: 'overview', label: 'Plan', helper: 'Charter map + live confidence' },
    { id: 'charter', label: 'Charter', helper: 'Baseline audit + operating model' },
    { id: 'validation', label: 'Validation', helper: 'Personas, tasks, and stories' },
  ];

  return (
    <section className="space-y-5">
      <header className="border border-black/10 bg-white px-5 py-5 md:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Roadmap + Charter Surface</div>
            <h3 className="mt-3 text-3xl leading-none font-editorial italic md:text-4xl">Execution map for the OS.</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/55">
              Compact operator view of the roadmap, charter confidence, and validation surfaces. Confidence updates as
              epic and task states move.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-[360px]">
            <div className="border border-black/10 bg-[#eaf8f7] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">Baseline Confidence</div>
              <div className="mt-2 text-3xl leading-none font-editorial">{formatPercent(baselineConfidence)}</div>
              <div className="mt-1 text-xs text-black/55">{describeConfidence(baselineConfidence)}</div>
            </div>
            <div className="border border-black/10 bg-white px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Execution Confidence</div>
              <div className="mt-2 text-3xl leading-none font-editorial">{formatPercent(executionConfidence)}</div>
              <div className="mt-1 text-xs text-black/55">{activeTasks} active tasks in motion</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {panelOptions.map((option) => {
          const isActive = panel === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPanel(option.id)}
              className={`border px-4 py-2 text-left transition ${
                isActive
                  ? 'border-brand-teal bg-[#eaf8f7] text-brand-teal'
                  : 'border-black/10 bg-white text-black/55 hover:border-brand-teal/35 hover:text-black'
              }`}
            >
              <div className="text-[11px] uppercase tracking-[0.22em]">{option.label}</div>
              <div className="mt-1 text-xs">{option.helper}</div>
            </button>
          );
        })}
      </div>

      {panel === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <article className="border border-brand-teal/15 bg-[#020709] px-5 py-5 text-white">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/45">
                <span>{doneCount} / {ROADMAP_NODES.length} sprints</span>
                <span>Operator</span>
              </div>
              <h4 className="mt-8 text-4xl leading-none font-editorial">Roadmap</h4>
              <p className="mt-6 border-l border-brand-teal/60 pl-4 text-sm leading-relaxed text-white/70">
                Charter view for the POC-to-OS plan. Use this to track confidence, live execution, and the next gated
                unlocks without wading through the full backlog every time.
              </p>
              <div className="mt-8 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between gap-4">
                  <span>Deploy now</span>
                  <span className="font-medium text-white">6 AI roles</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Human roles</span>
                  <span className="font-medium text-white">2 operators</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Deferred roles</span>
                  <span className="font-medium text-white">2 queued</span>
                </div>
              </div>
              <div className="mt-8 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/45">
                Confidence is derived from live epic and task status, so it moves as delivery states change.
              </div>
            </article>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <article className="border border-black/10 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Backlog Scope</div>
                  <div className="mt-2 text-2xl font-editorial">
                    {storyCount}
                    <span className="mx-2 text-black/20">/</span>
                    {epicCount}
                  </div>
                  <p className="mt-1 text-xs text-black/55">stories / epics</p>
                </article>
                <article className="border border-black/10 bg-[#eaf8f7] p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">Agentic Confidence</div>
                  <div className="mt-2 text-2xl font-editorial">{formatPercent(agenticConfidence)}</div>
                  <p className="mt-1 text-xs text-black/55">E02 + E08 + E09 + E10</p>
                </article>
                <article className="border border-black/10 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Delivery Pulse</div>
                  <div className="mt-2 text-2xl font-editorial">{doneCount} shipped</div>
                  <p className="mt-1 text-xs text-black/55">{activeCount} active roadmap phases</p>
                </article>
                <article className="border border-black/10 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Priority Gaps</div>
                  <div className="mt-2 text-2xl font-editorial">{highestRisk.length}</div>
                  <p className="mt-1 text-xs text-black/55">charter checkpoints under pressure</p>
                </article>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {laneSummaries.map((lane) => (
                  <article
                    key={lane.lane}
                    className={`border p-4 ${lane.score >= 82 ? 'border-emerald-500/35 bg-emerald-50' : lane.score >= 50 ? 'border-brand-teal/35 bg-[#eaf8f7]' : 'border-black/10 bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">{lane.lane}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-black/45">{formatPercent(lane.score)}</div>
                    </div>
                    <h5 className="mt-3 text-[28px] leading-[1] font-editorial italic">{lane.lane}</h5>
                    <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-black/45">
                      <span>{lane.strongCount} strong</span>
                      <span>{lane.riskCount} at risk</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {lane.items.map((item) => (
                        <span
                          key={item.id}
                          className={`border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${charterToneMeta[item.tone].card} ${charterToneMeta[item.tone].text}`}
                        >
                          {item.id}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ROADMAP_NODES.map((node) => (
                <article key={node.id} className={`border p-4 ${statusTone[node.status]} ${nodeGlow[node.status]}`}>
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em]">
                    <span>{node.phase}</span>
                    <span className="opacity-70">{node.window}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotTone[node.status]}`} />
                    <span>{statusLabel[node.status]}</span>
                  </div>
                  <h4 className="mt-4 text-[34px] leading-[1.02] font-editorial italic">{node.headline}</h4>
                  <div className="mt-4 text-[10px] uppercase tracking-[0.18em] opacity-70">Epics · {node.epics.join(' · ')}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {node.stories.slice(0, 6).map((story) => (
                      <span key={story} className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                        {story}
                      </span>
                    ))}
                    {node.stories.length > 6 && (
                      <span className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                        +{node.stories.length - 6}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-4">
              <article className="border border-black/10 bg-white p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Primary Gaps</div>
                <div className="mt-4 space-y-3">
                  {highestRisk.map((item) => (
                    <div key={item.id} className={`border p-3 ${charterToneMeta[item.tone].card}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{item.id}</div>
                        <div className={`text-[10px] uppercase tracking-[0.18em] ${charterToneMeta[item.tone].text}`}>
                          {charterToneMeta[item.tone].label}
                        </div>
                      </div>
                      <div className="mt-2 text-lg leading-tight font-editorial">{item.title}</div>
                      <p className="mt-2 text-xs leading-relaxed text-black/60">{item.note}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="border border-black/10 bg-white p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Active Now</div>
                <div className="mt-4 space-y-3">
                  {activeTaskRows.map((task) => (
                    <div key={task.id} className="border border-black/10 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{task.id}</div>
                      <div className="mt-2 text-lg leading-tight font-editorial">{task.title}</div>
                      <p className="mt-2 text-xs leading-relaxed text-black/60">{task.goal}</p>
                    </div>
                  ))}
                </div>
              </article>
            </aside>
          </div>
        </div>
      )}

      {panel === 'charter' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <article className="border border-brand-teal/15 bg-[#020709] p-5 text-white">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Execution Charter</div>
              <div className="mt-4 text-5xl leading-none font-editorial">{formatPercent(baselineConfidence)}</div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Confidence that the OS roadmap reflects Jim + Lucid baselines. This score updates from live epic and
                task status, not a static note.
              </p>
            </article>
            <article className="border border-black/10 bg-white p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Recommended Staff</div>
              <div className="mt-4 space-y-3 text-sm text-black/70">
                <div className="flex items-center justify-between gap-4">
                  <span>Deploy now</span>
                  <span className="font-medium text-black">6 AI roles</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Defer</span>
                  <span className="font-medium text-black">Content Director, Evaluator</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Human operators</span>
                  <span className="font-medium text-black">2 roles</span>
                </div>
              </div>
            </article>
            <article className="border border-black/10 bg-white p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Shared Notebook</div>
              <p className="mt-3 text-sm leading-relaxed text-black/60">
                Agents stay in sync through Firestore-backed orchestration runs, interactions, plans, and approvals,
                not hidden prompt history.
              </p>
              <div className="mt-4 space-y-2 text-[11px] uppercase tracking-[0.18em] text-black/45">
                <div>`system/agent-registry`</div>
                <div>`clients/{'{uid}'}/orchestration_runs`</div>
                <div>`clients/{'{uid}'}/interactions`</div>
                <div>`clients/{'{uid}'}/episode_plans`</div>
              </div>
            </article>
          </aside>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {laneSummaries.map((lane) => (
                <article key={lane.lane} className="border border-black/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">{lane.lane}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-black/45">{formatPercent(lane.score)}</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {lane.items.map((item) => (
                      <div key={item.id} className={`border p-3 ${charterToneMeta[item.tone].card}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">
                            {item.id} · {item.source}
                          </div>
                          <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] ${charterToneMeta[item.tone].text}`}>
                            <span className={`h-2 w-2 rounded-full ${charterToneMeta[item.tone].dot}`} />
                            {charterToneMeta[item.tone].label}
                          </div>
                        </div>
                        <div className="mt-2 text-xl leading-tight font-editorial">{item.title}</div>
                        <p className="mt-2 text-xs leading-relaxed text-black/60">{item.note}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.epics?.map((epic) => (
                            <span key={epic} className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                              {epic}
                            </span>
                          ))}
                          {item.tasks?.map((task) => (
                            <span key={task} className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                              {task}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {panel === 'validation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {PERSONA_TRACKS.map((persona) => (
              <article key={persona.id} className={`border p-4 ${statusTone[persona.status]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em]">{persona.id} · {persona.archetype}</div>
                    <h4 className="mt-2 text-2xl leading-tight font-editorial">{persona.name}</h4>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-70">{persona.tier}</div>
                  </div>
                  <span className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                    {statusLabel[persona.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed opacity-85">{persona.intent}</p>
                <div className="mt-3 space-y-1.5">
                  {persona.acceptanceFocus.map((item) => (
                    <p key={item} className="text-sm leading-relaxed opacity-80">
                      {item}
                    </p>
                  ))}
                </div>
                <div className="mt-4 border border-current/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] opacity-80">
                  Next Gate · {persona.nextGate}
                </div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <article className="border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Master Tasks</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">
                  {activeTasks} active · {queuedTasks} queued · {blockedTasks} blocked
                </div>
              </div>
              <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {MASTER_TASKLIST.map((task) => (
                  <div key={task.id} className={`border p-3 ${statusTone[task.status]}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] uppercase tracking-[0.18em]">{task.id}</div>
                      <span className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                        {statusLabel[task.status]}
                      </span>
                    </div>
                    <div className="mt-2 text-lg leading-tight font-editorial">{task.title}</div>
                    <p className="mt-2 text-xs leading-relaxed opacity-80">{task.goal}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">Story Validation Grid</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{storyCount} rows</div>
              </div>
              <div className="mt-4 max-h-[42vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  {STORY_ROWS.map((story) => (
                    <div key={story.id} className={`border px-3 py-3 ${statusTone[story.status]}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[10px] uppercase tracking-[0.18em]">
                          {story.id} · {story.epic} · {story.surface}
                        </div>
                        <span className="border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                          {statusLabel[story.status]}
                        </span>
                      </div>
                      <div className="mt-2 text-lg leading-tight font-editorial">{story.title}</div>
                      <p className="mt-2 text-xs leading-relaxed opacity-80">{story.validation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      <div className="border border-black/10 bg-white p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-black/40">Log Binding</div>
        <p className="mt-2 text-sm leading-relaxed text-black/60">
          Canonical tracking remains in <code>docs/backlog-ledger.md</code>, <code>docs/progress-log.md</code>, and{' '}
          <code>docs/mvp/demo_master_tasklist.md</code>. Current pulse: {activeTasks} active · {queuedTasks} queued ·{' '}
          {blockedTasks} blocked.
        </p>
      </div>
    </section>
  );
};

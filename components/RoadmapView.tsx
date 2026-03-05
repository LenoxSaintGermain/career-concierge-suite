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
    status: 'in_progress',
    surface: 'Agent orchestration',
    validation: 'Read DNA + artifacts via agent context without client write privilege.',
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
    validation: 'Outbound actions must queue as `pending_approval` before execution.',
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
];

const PERSONA_TRACKS: PersonaTrack[] = [
  {
    id: 'TU1',
    name: 'Donell Woodson',
    archetype: 'Skill-Sharpener',
    tier: 'SkillSync AI Premier',
    intent: 'Stay sharp in current role',
    status: 'in_progress',
    stories: ['E03-S01', 'E03-S02', 'E04-S02', 'E05-S02'],
    acceptanceFocus: [
      'AI Profile reflects regular AI usage + template work style.',
      'Episode sequence starts with AI Strategy and Leadership in voice-first format.',
      'Plan outputs internal AI initiative actions, not external search steps.',
    ],
    nextGate: 'Lock episode modality routing + AI Profile precision checks.',
  },
  {
    id: 'TU2',
    name: 'Garry Francois',
    archetype: 'Career Accelerator',
    tier: 'CJS Premier',
    intent: 'Move into a specific next role',
    status: 'in_progress',
    stories: ['E06-S01', 'E06-S02', 'E06-S03', 'E02-S04'],
    acceptanceFocus: [
      'Your Plan includes KPI and ROI-driven 72-hour actions.',
      'CJS rail drives resume review + internal promotion strategy.',
      'Assets supports multi-version resume and proposal iteration.',
    ],
    nextGate: 'Run persona validation for TU2 and tune scoring + rewrite heuristics.',
  },
  {
    id: 'TU3',
    name: 'Taylor Fulton',
    archetype: 'Direction-Seeker',
    tier: 'SkillSync Foundation',
    intent: 'Need help designing direction',
    status: 'in_progress',
    stories: ['E04-S02', 'E03-S01', 'E04-S03', 'E02-S03'],
    acceptanceFocus: [
      'Profile and Gaps highlight transferable skills into tech pathways.',
      'Episode sequence starts with foundational process automation tracks.',
      'MyConcierge guidance remains conversational and confidence-building.',
    ],
    nextGate: 'Add guided MyConcierge prompts + direction-specific plan templates.',
  },
  {
    id: 'TU4',
    name: 'Derrick Gervin',
    archetype: 'Free Course User',
    tier: 'Free Foundation Access',
    intent: 'Learn AI fundamentals before upgrading',
    status: 'in_progress',
    stories: ['E01-S01', 'E03-S01', 'E05-S03'],
    acceptanceFocus: [
      'Short intake only for foundational interests.',
      'Only readiness + generic resource guide are visible.',
      'Upgrade CTA appears after free playlist completion.',
    ],
    nextGate: 'Finalize free-tier playlist targeting and post-completion upgrade messaging.',
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
    status: 'in_progress',
    goal: 'Persist conversation summary + next-action records for demo audit trail.',
    surfaces: 'Chief of Staff, Firestore interactions',
    stories: ['E02-S03'],
    personas: ['TU1', 'TU2', 'TU3'],
  },
  {
    id: 'MTL-04',
    title: 'Episode personalization and modality routing',
    status: 'in_progress',
    goal: 'Match first episode topic + format to user focus and learning modality.',
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
    goal: 'Gate modules/artifacts for free users and route to clear upgrade sequence.',
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

export const RoadmapView: React.FC = () => {
  const doneCount = ROADMAP_NODES.filter((node) => node.status === 'done').length;
  const activeCount = ROADMAP_NODES.filter((node) => node.status === 'in_progress').length;
  const blockedTasks = MASTER_TASKLIST.filter((task) => task.status === 'blocked').length;
  const queuedTasks = MASTER_TASKLIST.filter((task) => task.status === 'queued').length;
  const activeTasks = MASTER_TASKLIST.filter((task) => task.status === 'in_progress').length;

  return (
    <section className="space-y-8">
      <header className="border border-black/10 bg-white px-6 py-6 md:px-8">
        <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Execution Roadmap Surface</div>
        <h3 className="mt-3 text-4xl leading-none font-editorial italic">Career Concierge V1 path.</h3>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-black/55">
          Live validation board for epics and stories. Use this as the in-app guide for what to test, what is in
          motion, and what remains queued.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-black/10 bg-white p-5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-black/40">Backlog Scope</div>
          <div className="mt-2 text-2xl leading-tight font-editorial">
            18 stories
            <span className="mx-2 text-black/35">/</span>
            6 epics
          </div>
          <p className="mt-2 text-sm text-black/55">Source: Career Concierge V1 MVP Specification.</p>
        </div>
        <div className="border border-black/10 bg-[#eaf8f7] p-5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Delivery Pulse</div>
          <div className="mt-2 text-2xl font-editorial">
            {doneCount} shipped · {activeCount} active
          </div>
          <p className="mt-2 text-sm text-black/60">Primary gap remains orchestration + CJS rail implementation.</p>
        </div>
        <div className="border border-black/10 bg-white p-5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-black/40">Demo Focus</div>
          <div className="mt-2 text-2xl font-editorial">Chief of Staff loop</div>
          <p className="mt-2 text-sm text-black/55">
            Intake → artifacts → episode → Chief of Staff summary log is the investor sequence.
          </p>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="pointer-events-none absolute left-6 right-6 top-[18px] hidden h-[1px] bg-gradient-to-r from-brand-teal/60 via-brand-teal/30 to-black/10 2xl:block" />
        {ROADMAP_NODES.map((node) => (
          <article
            key={node.id}
            className={`relative border p-5 md:p-6 min-h-[360px] ${statusTone[node.status]} ${nodeGlow[node.status]}`}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-[10px] uppercase tracking-[0.24em]">{node.phase}</div>
              <div className="text-[10px] uppercase tracking-[0.24em] opacity-70">{node.window}</div>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${dotTone[node.status]}`} />
              <div className="text-[10px] uppercase tracking-[0.24em]">{statusLabel[node.status]}</div>
            </div>

            <h4 className="text-[40px] leading-[1.08] font-editorial italic">{node.headline}</h4>
            <div className="mt-4 text-xs uppercase tracking-[0.22em] opacity-70">Epics: {node.epics.join(' · ')}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {node.stories.map((story) => (
                <span key={story} className="border border-current/25 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {story}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="space-y-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-black/40">Epic Grid</div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {EPIC_ROWS.map((epic) => (
            <article key={epic.id} className={`border p-5 ${statusTone[epic.status]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em]">
                    {epic.id} · {epic.priority}
                  </div>
                  <h4 className="mt-2 text-2xl leading-tight font-editorial">{epic.title}</h4>
                </div>
                <span className="border border-current/25 px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                  {statusLabel[epic.status]}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {epic.stories.map((story) => (
                  <span key={story} className="border border-current/25 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {story}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed opacity-80">{epic.focus}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-black/40">Story Validation Grid</div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {STORY_ROWS.map((story) => (
            <article key={story.id} className={`border p-4 ${statusTone[story.status]}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.22em]">
                  {story.id} · {story.epic}
                </div>
                <span className="border border-current/25 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {statusLabel[story.status]}
                </span>
              </div>
              <h5 className="mt-2 text-xl leading-tight font-editorial">{story.title}</h5>
              <div className="mt-3 text-[10px] uppercase tracking-[0.22em] opacity-70">{story.surface}</div>
              <p className="mt-2 text-sm leading-relaxed opacity-80">{story.validation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-black/40">Demo Readiness Tracks (Test Users)</div>
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {PERSONA_TRACKS.map((persona) => (
            <article key={persona.id} className={`border p-5 ${statusTone[persona.status]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em]">
                    {persona.id} · {persona.archetype}
                  </div>
                  <h4 className="mt-2 text-3xl leading-tight font-editorial">{persona.name}</h4>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.22em] opacity-75">{persona.tier}</div>
                </div>
                <span className="border border-current/25 px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                  {statusLabel[persona.status]}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed opacity-90">{persona.intent}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {persona.stories.map((story) => (
                  <span key={story} className="border border-current/25 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {story}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {persona.acceptanceFocus.map((item) => (
                  <p key={item} className="text-sm leading-relaxed opacity-80">
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-4 border border-current/25 px-3 py-2 text-[10px] uppercase tracking-[0.2em] opacity-85">
                Next Gate: {persona.nextGate}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-black/40">Master Tasklist (Roadmap + Test Specs)</div>
        <div className="grid grid-cols-1 gap-3">
          {MASTER_TASKLIST.map((task) => (
            <article key={task.id} className={`border p-4 ${statusTone[task.status]}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.22em]">{task.id}</div>
                <span className="border border-current/25 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {statusLabel[task.status]}
                </span>
              </div>
              <h5 className="mt-2 text-2xl leading-tight font-editorial">{task.title}</h5>
              <p className="mt-2 text-sm leading-relaxed opacity-80">{task.goal}</p>
              <div className="mt-3 text-[10px] uppercase tracking-[0.2em] opacity-70">Surfaces: {task.surfaces}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {task.stories.map((story) => (
                  <span key={story} className="border border-current/25 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {story}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.2em] opacity-70">
                Persona Coverage: {task.personas.join(' · ')}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="border border-black/10 bg-white p-6">
        <div className="text-[10px] uppercase tracking-[0.24em] text-black/40">Log Binding</div>
        <p className="mt-3 text-sm leading-relaxed text-black/60">
          Canonical tracking remains in <code>docs/backlog-ledger.md</code>, <code>docs/progress-log.md</code>, and{' '}
          <code>docs/mvp/demo_master_tasklist.md</code>. Current pulse: {activeTasks} active · {queuedTasks} queued ·{' '}
          {blockedTasks} blocked.
        </p>
      </div>
    </section>
  );
};

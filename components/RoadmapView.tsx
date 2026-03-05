import React from 'react';

type NodeStatus = 'done' | 'in_progress' | 'queued';

interface RoadmapNode {
  id: string;
  phase: string;
  window: string;
  headline: string;
  epics: string[];
  stories: string[];
  status: NodeStatus;
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
    status: 'in_progress',
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
    status: 'queued',
  },
];

const statusLabel: Record<NodeStatus, string> = {
  done: 'Shipped',
  in_progress: 'Active',
  queued: 'Queued',
};

const statusTone: Record<NodeStatus, string> = {
  done: 'text-emerald-700 border-emerald-500/35 bg-emerald-50',
  in_progress: 'text-brand-teal border-brand-teal/35 bg-[#eaf8f7]',
  queued: 'text-black/50 border-black/15 bg-white',
};

const nodeGlow: Record<NodeStatus, string> = {
  done: 'shadow-[0_0_0_1px_rgba(5,150,105,0.25),0_16px_30px_-20px_rgba(5,150,105,0.7)]',
  in_progress: 'shadow-[0_0_0_1px_rgba(14,159,150,0.35),0_16px_30px_-20px_rgba(14,159,150,0.75)]',
  queued: 'shadow-[0_0_0_1px_rgba(17,24,39,0.12),0_12px_24px_-20px_rgba(17,24,39,0.4)]',
};

export const RoadmapView: React.FC = () => {
  const doneCount = ROADMAP_NODES.filter((node) => node.status === 'done').length;
  const activeCount = ROADMAP_NODES.filter((node) => node.status === 'in_progress').length;

  return (
    <section className="space-y-8">
      <header className="border border-black/10 bg-white px-6 py-6 md:px-8">
        <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Admin Roadmap Surface</div>
        <h3 className="mt-3 text-4xl leading-none font-editorial italic">Career Concierge V1 path.</h3>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/55">
          A node-based execution map tied to the MVP spec backlog. This module is intentionally admin-only and sits
          at the end of the suite to keep delivery progress visible without pulling focus from client content.
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
              <div
                className={`h-3 w-3 rounded-full ${
                  node.status === 'done'
                    ? 'bg-emerald-500'
                    : node.status === 'in_progress'
                      ? 'bg-brand-teal animate-pulse'
                      : 'bg-black/25'
                }`}
              />
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

      <div className="border border-black/10 bg-white p-6">
        <div className="text-[10px] uppercase tracking-[0.24em] text-black/40">Progress Log Link</div>
        <p className="mt-3 text-sm leading-relaxed text-black/60">
          This roadmap is backed by the repo log in <code>docs/progress-log.md</code>. Update that log in every
          implementation pass to keep sprint node status and shipped scope aligned.
        </p>
      </div>
    </section>
  );
};

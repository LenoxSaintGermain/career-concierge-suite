import React from 'react';
import { ClientDoc, SuiteModuleId } from '../types';

type Props = {
  client: ClientDoc | null;
  onOpenModule: (id: SuiteModuleId) => void;
};

export function SkillSyncTeamView({ client, onOpenModule }: Props) {
  const tier = String(client?.demo_profile?.tier || client?.account?.tier || '').toLowerCase();
  const isFreeTier = tier === 'free_foundation_access';

  const team = [
    {
      label: 'AI Concierge',
      detail: 'Keeps momentum moving, frames next actions, and points you back into the right module.',
      action: 'Open MyConcierge',
      module: 'my_concierge' as SuiteModuleId,
    },
    {
      label: 'Episodes Showrunner',
      detail: 'Translates your learning arc into short-form story-driven programming and related TV rails.',
      action: 'Open Episodes',
      module: 'episodes' as SuiteModuleId,
    },
    {
      label: 'Human Concierge',
      detail: isFreeTier
        ? 'Available as an upgrade path when you need higher-touch support.'
        : 'Available for Smart Start follow-up, strategic guidance, and escalation moments.',
      action: isFreeTier ? 'View readiness path' : 'Request human follow-up',
      module: isFreeTier ? ('readiness' as SuiteModuleId) : ('my_concierge' as SuiteModuleId),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">SkillSync AI Team</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">Who helps, and when to use AI versus human support.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/60">
          This is the client-safe roster. It explains the support posture without exposing prompts, runs, or operator controls.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {team.map((member) => (
          <article key={member.label} className="border border-black/10 bg-[#fbf8f2] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-brand-teal">{member.label}</div>
            <p className="mt-4 text-sm leading-relaxed text-black/60">{member.detail}</p>
            <button
              type="button"
              onClick={() => onOpenModule(member.module)}
              className="mt-5 px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em]"
            >
              {member.action}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

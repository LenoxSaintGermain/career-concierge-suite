import React, { useMemo, useState } from 'react';
import { ClientDoc, SuiteModuleId } from '../types';
import { resolveApiOrigin } from '../services/apiOrigin';

type ConciergeMode = 'human' | 'ai';

type ConciergeResponse = {
  eyebrow: string;
  headline: string;
  summary: string;
  guidance: string[];
  nextActions: string[];
};

const nonEmpty = (value: unknown) => String(value ?? '').trim();
const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];

const suggestedTechRoles = (client: ClientDoc): string[] => {
  const answers = client.intake?.answers ?? {};
  const currentTitle = nonEmpty(answers.current_title || answers.current_or_target_job_title).toLowerCase();
  const target = nonEmpty(answers.target || answers.current_or_target_job_title).toLowerCase();
  const roles = new Set<string>();

  if (currentTitle.includes('project manager') || target.includes('project manager')) {
    roles.add('Technical Project Manager');
    roles.add('Implementation Manager');
  }
  if (currentTitle.includes('program') || target.includes('program')) {
    roles.add('Program Manager');
  }
  roles.add('Product Operations Manager');
  roles.add('Junior Product Owner');

  return [...roles].slice(0, 4);
};

const quickPromptsForClient = (client: ClientDoc): string[] => {
  switch (client.intent) {
    case 'current_role':
      return [
        'What internal AI initiative should I pitch first?',
        'How should I use AI without creating extra noise?',
        'What should I focus on this week to stay sharp?',
      ];
    case 'target_role':
      return [
        'How do I position myself for promotion internally?',
        'What proof points do I need for the next role?',
        'How should I structure my networking this week?',
      ];
    default:
      return [
        'What tech roles are a good fit for my skills?',
        'What strengths from my current background transfer best?',
        'What should I learn first so I stop feeling stalled?',
      ];
  }
};

const buildResponse = (client: ClientDoc, mode: ConciergeMode, question: string): ConciergeResponse => {
  const answers = client.intake?.answers ?? {};
  const currentTitle = nonEmpty(answers.current_title || answers.current_or_target_job_title) || 'your current role';
  const targetRole = nonEmpty(answers.target || answers.current_or_target_job_title) || 'your next role';
  const industry = nonEmpty(answers.industry) || 'your industry';
  const workStyle = nonEmpty(answers.work_style) || 'a conversation';
  const constraints = nonEmpty(answers.constraints) || 'limited time and competing priorities';
  const q = question.toLowerCase();

  if (client.intent === 'not_sure' || q.includes('tech role') || q.includes('fit for my skills')) {
    const roles = suggestedTechRoles(client);
    return {
      eyebrow: 'Direction Design',
      headline: `Your ${currentTitle} background already maps to viable tech lanes.`,
      summary: `You do not need to invent a new identity from scratch. Your strongest transfer signals are cross-functional coordination, stakeholder management, and delivery under ambiguity. In ${industry}, those strengths translate cleanly into tech-adjacent operating roles.`,
      guidance: [
        `Best-fit roles to investigate first: ${roles.join(', ')}.`,
        'Lead with execution pattern, stakeholder alignment, and process ownership rather than the sector label on your resume.',
        `Because you prefer ${workStyle.toLowerCase()}, keep this path concrete: short experiments, visible wins, and guided feedback loops.`,
      ],
      nextActions: [
        'Complete one introductory Agile or SDLC course.',
        'Schedule three informational interviews with people in tech-adjacent delivery roles.',
        'Rewrite your top resume bullets in transferable-skills language.',
      ],
    };
  }

  if (client.intent === 'current_role' || mode === 'human') {
    return {
      eyebrow: 'Internal Momentum',
      headline: `Use AI to increase internal leverage before you widen the search field.`,
      summary: `Your highest-value move is not a broad external search. It is to convert your current ${currentTitle} scope into visible AI-enabled leadership inside ${industry}.`,
      guidance: [
        'Start with one internal workflow where speed and clarity matter every week.',
        'Translate AI usage into executive-safe language: time saved, reporting quality, and decision confidence.',
        `Because your current constraint is ${constraints.toLowerCase()}, choose a pilot that fits into existing work rather than adding a side project.`,
      ],
      nextActions: [
        'Audit three recurring workflows for Copilot or AI-assisted automation potential.',
        'Draft a one-page pilot proposal tied to a current team bottleneck.',
        'Use Episodes and Your AI Profile as the rehearsal lane before pitching upward.',
      ],
    };
  }

  return {
    eyebrow: 'Promotion Track',
    headline: `Build a promotion case around proof, sponsors, and ROI.`,
    summary: `To move from ${currentTitle} toward ${targetRole}, your narrative needs to sound like strategic ownership, not just reliable execution. The strongest path is internal visibility plus evidence that your decisions improve business outcomes.`,
    guidance: [
      'Anchor your story in three KPI movements that leadership already cares about.',
      'Turn one live initiative into a proposal that makes AI-driven leverage visible and measurable.',
      'Map sponsors, peers, and decision-makers before you expand outward.',
    ],
    nextActions: [
      'Identify the three KPIs most likely to move if your proposal lands.',
      'Draft a short internal outreach note for sponsors and adjacent leaders.',
      'Use ConciergeJobSearch and Assets to tighten resume, scripts, and proposal versions in parallel.',
    ],
  };
};

export function MyConciergeView(props: {
  client: ClientDoc | null;
  onOpenModule: (id: SuiteModuleId) => void;
}) {
  const [mode, setMode] = useState<ConciergeMode>('human');
  const [prompt, setPrompt] = useState('');
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const client = props.client;

  const quickPrompts = useMemo(() => (client ? quickPromptsForClient(client) : []), [client]);
  const suggestedResponse = useMemo(() => {
    if (!client) return null;
    const fallbackPrompt = quickPrompts[0] || 'What should I focus on next?';
    return buildResponse(client, mode, prompt || fallbackPrompt);
  }, [client, mode, prompt, quickPrompts]);

  if (!client) {
    return (
      <div className="border border-black/5 bg-gray-50 p-6">
        <div className="text-2xl font-editorial italic">MyConcierge needs your intake context.</div>
        <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-xl">
          Complete Smart Start Intake first so this guidance can ground itself in your Professional DNA and generated suite.
        </p>
        <button
          type="button"
          onClick={() => props.onOpenModule('intake')}
          className="mt-6 px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em]"
        >
          Start Intake
        </button>
      </div>
    );
  }

  const requestHumanHandoff = async () => {
    if (!client || !suggestedResponse) return;
    const email = nonEmpty(client.email);
    if (!email) {
      setHandoffStatus('This account is missing an email, so the operator handoff could not be logged.');
      return;
    }
    setHandoffBusy(true);
    setHandoffStatus(null);
    try {
      const resp = await fetch(`${resolveApiOrigin()}/v1/public/concierge-request`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          request_kind: 'smart_start_booking',
          name: nonEmpty(client.display_name) || nonEmpty(client.demo_profile?.name) || 'Client',
          email,
          goal: `${suggestedResponse.headline} — ${prompt || quickPrompts[0] || 'Follow-up request from MyConcierge'}`,
          preferred_timing: 'Follow up with next available Smart Start slot',
          source: 'my_concierge',
          client_uid: client.uid,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || resp.statusText);
      }
      setHandoffStatus('Human concierge follow-up requested. Operator queue now has your handoff context.');
    } catch (error: any) {
      setHandoffStatus(error?.message ?? 'Unable to request human follow-up.');
    } finally {
      setHandoffBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">MyConcierge</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">A guided conversation for direction, clarity, and next moves.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-2xl">
          This surface mirrors the Lucidchart partner flow: intent-led guidance, conversational prompts, and a clear handoff into Profile, Gaps, Plan, or Episodes.
        </p>
      </div>

      <section className="border border-black/10 bg-gray-50 p-5 md:p-6 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">What are we optimizing for right now?</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={() => setMode('human')}
              className={`text-left border p-4 transition-colors ${
                mode === 'human' ? 'border-brand-teal bg-brand-soft' : 'border-black/10 hover-border-brand-teal'
              }`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Human Concierge</div>
              <div className="text-lg font-editorial italic mt-2">Stay sharp in my current role</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`text-left border p-4 transition-colors ${
                mode === 'ai' ? 'border-brand-teal bg-brand-soft' : 'border-black/10 hover-border-brand-teal'
              }`}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">AI Concierge</div>
              <div className="text-lg font-editorial italic mt-2">Move into a specific next role</div>
            </button>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Quick prompts</div>
          <div className="flex flex-wrap gap-2 mt-3">
            {quickPrompts.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setPrompt(entry)}
                className={`px-3 py-2 text-[11px] uppercase tracking-[0.16em] border transition-colors ${
                  prompt === entry ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 hover-border-brand-teal'
                }`}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-700">Ask MyConcierge directly</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="What tech roles are a good fit for my skills?"
            className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm leading-relaxed bg-white"
          />
        </div>
      </section>

      {suggestedResponse && (
        <section className="border border-black/10 bg-white p-5 md:p-6 space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">{suggestedResponse.eyebrow}</div>
            <div className="text-3xl font-editorial italic mt-2 leading-tight">{suggestedResponse.headline}</div>
            <p className="text-sm text-gray-700 leading-relaxed mt-4 max-w-3xl">{suggestedResponse.summary}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="border border-black/5 bg-gray-50 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-3">Guidance</div>
              <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
                {suggestedResponse.guidance.map((entry) => (
                  <li key={entry}>• {entry}</li>
                ))}
              </ul>
            </div>
            <div className="border border-black/5 bg-gray-50 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-3">Next Actions</div>
              <ul className="space-y-3 text-sm text-gray-700 leading-relaxed">
                {suggestedResponse.nextActions.map((entry) => (
                  <li key={entry}>• {entry}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border border-black/5 bg-[#f6f3ec] p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Concierge handoff</div>
            <div className="mt-2 text-xl font-editorial italic leading-tight">Escalate this thread into a tracked human follow-up when needed.</div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-700">
              AI Concierge keeps the guidance moving. Human Concierge is the escalation lane for Smart Start scheduling, premium support, and higher-touch direction changes.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={requestHumanHandoff}
                disabled={handoffBusy}
                className="px-4 py-3 border border-black/10 bg-white text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal disabled:opacity-50"
              >
                {handoffBusy ? 'Requesting…' : 'Request human follow-up'}
              </button>
              <button
                type="button"
                onClick={() => props.onOpenModule('plan')}
                className="px-4 py-3 border border-black/10 bg-white text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
              >
                Continue in Your Plan
              </button>
            </div>
            {handoffStatus ? (
              <div className="mt-4 border border-black/10 bg-white px-4 py-3 text-xs leading-relaxed text-gray-700">
                {handoffStatus}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => props.onOpenModule('profile')}
              className="px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em]"
            >
              Open Your Profile
            </button>
            <button
              type="button"
              onClick={() => props.onOpenModule('gaps')}
              className="px-4 py-3 border border-black/10 bg-white text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
            >
              Open Your Gaps
            </button>
            <button
              type="button"
              onClick={() => props.onOpenModule('plan')}
              className="px-4 py-3 border border-black/10 bg-white text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
            >
              Open Your Plan
            </button>
            <button
              type="button"
              onClick={() => props.onOpenModule('episodes')}
              className="px-4 py-3 border border-black/10 bg-white text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
            >
              Open Episodes
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

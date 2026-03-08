import React, { useMemo, useState } from 'react';
import { ClientDoc, SuiteModuleId } from '../types';
import { logClientInteraction } from '../services/interactionService';

type Props = {
  client: ClientDoc | null;
  onOpenModule: (id: SuiteModuleId) => void;
};

export function EventsNetworkingView({ client, onOpenModule }: Props) {
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);

  const events = useMemo(() => {
    const intent = client?.intent || 'current_role';
    if (intent === 'target_role') {
      return [
        { id: 'evt-1', title: 'Director-Level Career Strategy Salon', detail: 'A high-signal operator session on internal mobility and sponsor mapping.' },
        { id: 'evt-2', title: 'AI ROI Roundtable', detail: 'Short case-study discussion for leaders translating AI usage into KPI language.' },
        { id: 'evt-3', title: 'Executive Networking Sprint', detail: 'Structured practice for sponsor outreach and follow-up.' },
      ];
    }
    if (intent === 'not_sure') {
      return [
        { id: 'evt-1', title: 'Tech Pathways Open Studio', detail: 'Exploratory session for adjacent-role mapping and transferable skills.' },
        { id: 'evt-2', title: 'AI Fundamentals Circle', detail: 'A beginner-friendly discussion on practical AI use at work.' },
        { id: 'evt-3', title: 'Confidence Through Career Experiments', detail: 'Short workshop on low-risk learning moves and reflection loops.' },
      ];
    }
    return [
      { id: 'evt-1', title: 'Internal Influence Lab', detail: 'A concise event on pitching internal initiatives and building visible leverage.' },
      { id: 'evt-2', title: 'Quiet Leadership in AI', detail: 'Editorial conversation on bringing AI into teams without hype.' },
      { id: 'evt-3', title: 'Signal Over Noise Networking Hour', detail: 'A structured networking format for focused operator conversations.' },
    ];
  }, [client?.intent]);

  const saveInterest = async (id: string, title: string) => {
    if (!client) return;
    await logClientInteraction(client.uid, {
      id: `event-interest-${id}`,
      type: 'event_interest',
      title: `Saved interest · ${title}`,
      summary: `Client marked interest in ${title}.`,
      status: 'logged',
      requires_approval: false,
      next_actions: ['Review event fit', 'Follow up via concierge if requested'],
      client_uid: client.uid,
      client_email: client.email,
      client_name: client.display_name,
      source: 'events_module',
    });
    setSavedIds((prev) => ({ ...prev, [id]: true }));
    setStatus('Interest saved. The operator ledger now has the signal.');
  };

  if (!client) {
    return <div className="border border-black/10 bg-[#fbf8f2] p-6 text-sm text-black/55">Complete intake to unlock event recommendations.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">Events & Networking</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">Curated opportunities with clean follow-up paths.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/60">
          Save interest, request concierge help, and keep networking actions tied to the OS without inventing fake RSVP integrations.
        </p>
      </div>

      {status ? <div className="border border-black/10 bg-white px-4 py-3 text-xs text-black/65">{status}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <article key={event.id} className="border border-black/10 bg-[#fbf8f2] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-brand-teal">Curated event</div>
            <h3 className="mt-3 text-2xl font-editorial leading-tight">{event.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-black/60">{event.detail}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveInterest(event.id, event.title)}
                className={`border px-3 py-2 text-[10px] uppercase tracking-[0.16em] ${
                  savedIds[event.id]
                    ? 'border-brand-teal bg-[#eaf8f7] text-brand-teal'
                    : 'border-black/12 text-black/65 hover:border-brand-teal'
                }`}
              >
                {savedIds[event.id] ? 'Interest saved' : 'Save interest'}
              </button>
              <button
                type="button"
                onClick={() => onOpenModule('my_concierge')}
                className="border border-black/12 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-black/65 hover:border-brand-teal"
              >
                Ask concierge
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

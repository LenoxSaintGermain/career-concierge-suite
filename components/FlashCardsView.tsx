import React, { useEffect, useMemo, useState } from 'react';
import { ClientDoc } from '../types';

type Props = {
  client: ClientDoc | null;
};

type CardState = Record<string, 'low' | 'medium' | 'high'>;

const storageKey = (uid: string) => `skillsync-flashcards:${uid}`;

export function FlashCardsView({ client }: Props) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<CardState>({});

  const cards = useMemo(() => {
    const answers = client?.intake?.answers ?? {};
    const focus = client?.preferences?.focus || 'skills';
    const target = String(answers.target || answers.current_or_target_job_title || 'your next role');
    const outcomes = Array.isArray(answers.outcomes_goals) ? answers.outcomes_goals : [];
    return [
      { id: 'fc-1', front: 'Current focus', back: `Your current focus rail is ${focus}.` },
      { id: 'fc-2', front: 'Target role', back: `The current target direction is ${target}.` },
      { id: 'fc-3', front: 'Pressure point', back: `Primary constraint: ${String(answers.constraints || 'time and clarity under pressure')}.` },
      { id: 'fc-4', front: 'Outcome to optimize', back: `Current outcome signal: ${String(outcomes[0] || 'professional momentum')}.` },
      { id: 'fc-5', front: 'Weekly move', back: 'Protect one visible action block and one reflection block each week.' },
      { id: 'fc-6', front: 'AI habit', back: 'Use AI for structured first drafts, then tighten with your own judgment.' },
    ];
  }, [client]);

  useEffect(() => {
    if (!client?.uid) return;
    const raw = window.localStorage.getItem(storageKey(client.uid));
    if (!raw) return;
    try {
      setRatings(JSON.parse(raw));
    } catch {
      setRatings({});
    }
  }, [client?.uid]);

  const setRating = (id: string, rating: 'low' | 'medium' | 'high') => {
    if (!client?.uid) return;
    setRatings((prev) => {
      const next = { ...prev, [id]: rating };
      window.localStorage.setItem(storageKey(client.uid), JSON.stringify(next));
      return next;
    });
  };

  if (!client) {
    return <div className="border border-black/10 bg-[#fbf8f2] p-6 text-sm text-black/55">Complete intake to generate flash cards.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">Flash Cards</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">Short review decks for your current plan.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/60">
          These cards are lightweight recall prompts, not certification. Confidence ratings persist locally so you can come back without starting over.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const isOpen = revealed[card.id] === true;
          const rating = ratings[card.id];
          return (
            <article key={card.id} className="border border-black/10 bg-[#fbf8f2] p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{card.id.replace('fc-', 'Deck ')}</div>
              <div className="mt-4 text-2xl font-editorial leading-tight">{isOpen ? card.back : card.front}</div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRevealed((prev) => ({ ...prev, [card.id]: !isOpen }))}
                  className="border border-black/12 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-black/65 hover:border-brand-teal"
                >
                  {isOpen ? 'Hide answer' : 'Reveal answer'}
                </button>
                {(['low', 'medium', 'high'] as const).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setRating(card.id, entry)}
                    className={`border px-3 py-2 text-[10px] uppercase tracking-[0.16em] ${
                      rating === entry
                        ? 'border-brand-teal bg-[#eaf8f7] text-brand-teal'
                        : 'border-black/12 text-black/65 hover:border-brand-teal'
                    }`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

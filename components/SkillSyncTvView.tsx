import React, { useEffect, useMemo, useState } from 'react';
import { ClientDoc, ResolvedCuratedMediaItem } from '../types';
import { fetchCuratedMediaLibrary } from '../services/bingeApi';

type Props = {
  client: ClientDoc | null;
};

export function SkillSyncTvView({ client }: Props) {
  const [items, setItems] = useState<ResolvedCuratedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCuratedMediaLibrary('episodes')
      .then((response) => {
        if (!cancelled) setItems(response.items || []);
      })
      .catch((nextError: any) => {
        if (!cancelled) setError(nextError?.message ?? 'Unable to load TV programming.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rails = useMemo(() => {
    const starter = items.slice(0, 3);
    const focus = items.filter((item) => {
      const focus = client?.preferences?.focus;
      return focus ? item.tags.some((tag) => tag.toLowerCase().includes(focus)) : false;
    });
    return [
      { label: 'Starter Programming', description: 'A curated public rail for fast onboarding.', items: starter },
      {
        label: 'For Your Current Arc',
        description: 'Personalized from your current focus and journey signals.',
        items: focus.length ? focus.slice(0, 4) : items.slice(0, 4),
      },
    ].filter((rail) => rail.items.length > 0);
  }, [client?.preferences?.focus, items]);

  if (loading) {
    return <div className="border border-black/10 bg-[#fbf8f2] p-6 text-sm text-black/55">Loading programming…</div>;
  }

  if (error) {
    return <div className="border border-red-500/20 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">SkillSync AI TV</div>
        <h2 className="text-3xl md:text-4xl font-editorial leading-tight">Editorial programming for the current learning arc.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/60">
          This surface is the client-safe video rail: curated series, contextual rails, and return-to-plan learning, without BTS prompt or model language.
        </p>
      </div>

      {rails.map((rail) => (
        <section key={rail.label} className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">{rail.label}</div>
              <div className="mt-2 text-xl font-editorial italic">{rail.description}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rail.items.map((item) => (
              <article key={item.id} className="border border-black/10 bg-[#fbf8f2] p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{item.platform_resolved}</div>
                <h3 className="mt-3 text-2xl font-editorial leading-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/60">{item.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-black/55">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => window.open(item.open_url, '_blank', 'noopener,noreferrer')}
                  className="mt-5 px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em]"
                >
                  Open episode
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

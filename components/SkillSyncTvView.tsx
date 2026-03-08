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
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const preferred = await fetchCuratedMediaLibrary('tv').catch(() => null);
      const fallback =
        preferred && Array.isArray(preferred.items) && preferred.items.length > 0
          ? preferred
          : await fetchCuratedMediaLibrary('episodes');
      const nextItems = fallback.items || [];
      if (!cancelled) {
        setItems(nextItems);
        setActiveItemId((current) => current || nextItems[0]?.id || null);
      }
    })()
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

  const featuredItem = useMemo(() => {
    const selected = rails.flatMap((rail) => rail.items).find((item) => item.id === activeItemId);
    return selected || rails.flatMap((rail) => rail.items)[0] || null;
  }, [activeItemId, rails]);

  const hasPlayableDirectVideo = (url: string) => /\.(mp4|webm|ogg)(\?|$)/i.test(url);

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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="border border-black/10 bg-[#08161a] p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)]">
          {featuredItem?.embed_url ? (
            <div className="aspect-video overflow-hidden bg-black">
              {featuredItem.platform_resolved === 'direct' && hasPlayableDirectVideo(featuredItem.embed_url) ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                  src={featuredItem.embed_url}
                />
              ) : (
                <iframe
                  src={featuredItem.embed_url}
                  title={featuredItem.title}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          ) : (
            <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_top,#164850_0%,#08161a_58%,#050c0f_100%)] text-[#dce7e8]">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(45,197,194,0.16),transparent_42%)]" />
              <div className="flex h-full flex-col justify-between p-6 md:p-8">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.26em] text-[#7fe3dd]">Programming preview</div>
                  <h3 className="mt-4 text-3xl font-editorial leading-tight md:text-5xl">
                    {featuredItem?.title || 'SkillSync AI TV is staging a client-safe video preview.'}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
                    {featuredItem?.subtitle ||
                      'A placeholder editorial reel will live here until the curated library or media pipeline publishes the final video surface.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-white/60">
                  <span className="inline-flex items-center gap-2 border border-white/15 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-[#7fe3dd]" />
                    Coming soon
                  </span>
                  <span className="inline-flex border border-white/15 px-3 py-2">Placeholder stage</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="border border-black/10 bg-[#fbf8f2] p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">Now showing</div>
          <h3 className="mt-3 text-3xl font-editorial leading-tight">{featuredItem?.title || 'Programming preview'}</h3>
          <p className="mt-4 text-sm leading-relaxed text-black/60">
            {featuredItem?.subtitle ||
              'The stage is ready for a curated library asset or a temporary editorial placeholder while the final reel is produced.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(featuredItem?.tags || ['editorial', 'tv', 'learning']).slice(0, 5).map((tag) => (
              <span key={tag} className="border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-black/55">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {featuredItem?.open_url ? (
              <button
                type="button"
                onClick={() => window.open(featuredItem.open_url, '_blank', 'noopener,noreferrer')}
                className="btn-brand px-4 py-3 text-[10px] uppercase tracking-[0.22em]"
              >
                Open source
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="border border-black/10 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-black/35"
              >
                Placeholder only
              </button>
            )}
          </div>
        </aside>
      </section>

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
              <article
                key={item.id}
                className={`border p-4 transition-all ${
                  activeItemId === item.id
                    ? 'border-brand-teal bg-[#eef8f6] shadow-[0_16px_36px_-26px_rgba(14,159,150,0.45)]'
                    : 'border-black/10 bg-[#fbf8f2]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{item.platform_resolved}</div>
                  <button
                    type="button"
                    onClick={() => setActiveItemId(item.id)}
                    className="text-[10px] uppercase tracking-[0.18em] text-brand-teal"
                  >
                    Stage
                  </button>
                </div>
                <h3 className="mt-3 text-2xl font-editorial leading-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/60">{item.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-black/55">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveItemId(item.id)}
                    className="btn-brand px-4 py-3 text-[10px] uppercase tracking-[0.22em]"
                  >
                    Watch here
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(item.open_url, '_blank', 'noopener,noreferrer')}
                    className="border border-black/10 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-black/60"
                  >
                    Open source
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

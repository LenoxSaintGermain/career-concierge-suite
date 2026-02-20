import React, { useEffect, useMemo, useState } from 'react';
import { BingeEpisode } from '../types';
import { generateBingeEpisode } from '../services/bingeApi';

type Scene = 'hook' | 'swipe1' | 'swipe2' | 'swipe3' | 'challenge' | 'reward';

export function BingeFeedView(props: { onOpenPlan: () => void }) {
  const [episode, setEpisode] = useState<BingeEpisode | null>(null);
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState<Scene>('hook');
  const [terminalInput, setTerminalInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const swipes = useMemo(() => episode?.lesson_swipes ?? [], [episode?.lesson_swipes]);
  const recommendedModels = useMemo(() => episode?.art_direction?.recommended_models ?? [], [episode?.art_direction]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const e = await generateBingeEpisode();
      setEpisode(e);
      setScene('hook');
      setTerminalInput('');
    } catch (e: any) {
      setEpisode(null);
      setLoadError(e?.message ?? 'Unable to load episode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const next = () => {
    setScene((s) => {
      if (s === 'hook') return 'swipe1';
      if (s === 'swipe1') return 'swipe2';
      if (s === 'swipe2') return 'swipe3';
      if (s === 'swipe3') return 'challenge';
      if (s === 'challenge') return 'reward';
      return s;
    });
  };

  const renderCard = (label: string, body: string) => (
    <div className="border border-black/5 bg-gray-50 p-6">
      <div className="text-[10px] uppercase tracking-widest text-brand-teal mb-4">{label}</div>
      <div className="text-xl md:text-2xl font-editorial italic leading-relaxed">{body}</div>
    </div>
  );

  if (loading && !episode) {
    return (
      <div className="py-16 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Generating episode…</div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="border border-black/5 bg-gray-50 p-6">
        <div className="text-2xl font-editorial italic">Unable to load episode.</div>
        {loadError && (
          <p className="mt-4 text-sm text-red-700 leading-relaxed">{loadError}</p>
        )}
        <button
          onClick={load}
          className="mt-6 px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">Episodes</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">{episode.title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          No lectures. No quizzes. You survive a micro-drama by executing the skill.
        </p>
      </div>

      <section className="border border-black/5 p-5 bg-brand-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Art Director Queue</div>
            <div className="text-lg font-editorial italic mt-1">Model routing for multimedia generation.</div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
            {loading ? 'Generating...' : 'Ready'}
          </div>
        </div>
        {recommendedModels.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendedModels.map((entry, idx) => (
              <div key={`${entry.kind}-${idx}`} className="bg-white border border-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">{entry.kind}</div>
                <div className="font-mono text-xs mt-1">{entry.model}</div>
                {entry.note && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{entry.note}</p>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white border border-black/10 p-3">
            <div className="uppercase tracking-[0.2em] text-black/50 mb-2">Image prompt</div>
            <p className="leading-relaxed text-gray-700">{episode.art_direction?.image_prompt ?? 'Not provided'}</p>
          </div>
          <div className="bg-white border border-black/10 p-3">
            <div className="uppercase tracking-[0.2em] text-black/50 mb-2">Video prompt</div>
            <p className="leading-relaxed text-gray-700">{episode.art_direction?.video_prompt ?? 'Not provided'}</p>
          </div>
          <div className="bg-white border border-black/10 p-3">
            <div className="uppercase tracking-[0.2em] text-black/50 mb-2">Audio prompt</div>
            <p className="leading-relaxed text-gray-700">{episode.art_direction?.audio_prompt ?? 'Not provided'}</p>
          </div>
        </div>
      </section>

      {scene === 'hook' && renderCard('Cold Open', episode.hook_card)}
      {scene === 'swipe1' && renderCard('Swipe 1', swipes[0] ?? '…')}
      {scene === 'swipe2' && renderCard('Swipe 2', swipes[1] ?? '…')}
      {scene === 'swipe3' && renderCard('Swipe 3', swipes[2] ?? '…')}

      {scene === 'challenge' && (
        <div className="border border-black/5 p-6">
          <div className="text-[10px] uppercase tracking-widest text-brand-teal mb-4">Guided Outcome</div>
          <div className="text-xl font-editorial italic leading-relaxed">{episode.challenge_terminal.prompt}</div>
          <div className="mt-6">
            <textarea
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder={episode.challenge_terminal.placeholder}
              className="w-full min-h-32 border border-black/10 focus-border-brand-teal outline-none p-4 font-mono text-xs leading-relaxed"
            />
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            MVP behavior: any attempt advances. Phase 1: we’ll evaluate and fail-forward.
          </p>
        </div>
      )}

      {scene === 'reward' && (
        <div className="border border-black/5 bg-gray-50 p-6">
          <div className="text-[10px] uppercase tracking-widest text-brand-teal mb-4">Unlocked</div>
          <div className="text-2xl font-editorial italic leading-relaxed">{episode.reward_asset}</div>
          <div className="mt-6 border-t border-black/5 pt-6">
            <div className="text-[10px] uppercase tracking-widest opacity-50 mb-3">Cliffhanger</div>
            <div className="text-lg font-editorial italic leading-relaxed">{episode.cliffhanger}</div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={load}
              className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
            >
              Next Episode
            </button>
            <button
              onClick={props.onOpenPlan}
              className="px-5 py-3 border border-black/20 text-black text-xs uppercase tracking-[0.25em] hover-border-brand-teal transition-colors"
            >
              Open Your Plan
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setScene('hook')}
          className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          Restart episode
        </button>
        <button
          onClick={next}
          disabled={scene === 'reward'}
          className="text-xs uppercase tracking-widest text-brand-teal hover:opacity-100 transition-opacity disabled:opacity-20"
        >
          {scene === 'reward' ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}

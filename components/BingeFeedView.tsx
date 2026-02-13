import React, { useEffect, useMemo, useState } from 'react';
import { BingeEpisode } from '../types';
import { generateBingeEpisode } from '../services/bingeApi';

type Scene = 'hook' | 'swipe1' | 'swipe2' | 'swipe3' | 'challenge' | 'reward';

export function BingeFeedView(props: { onOpenPlan: () => void }) {
  const [episode, setEpisode] = useState<BingeEpisode | null>(null);
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState<Scene>('hook');
  const [terminalInput, setTerminalInput] = useState('');

  const swipes = useMemo(() => episode?.lesson_swipes ?? [], [episode?.lesson_swipes]);

  const load = async () => {
    setLoading(true);
    try {
      const e = await generateBingeEpisode();
      setEpisode(e);
      setScene('hook');
      setTerminalInput('');
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
      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">{label}</div>
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
        <button
          onClick={load}
          className="mt-6 px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Episodes</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">{episode.title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          No lectures. No quizzes. You survive a micro-drama by executing the skill.
        </p>
      </div>

      {scene === 'hook' && renderCard('Cold Open', episode.hook_card)}
      {scene === 'swipe1' && renderCard('Swipe 1', swipes[0] ?? '…')}
      {scene === 'swipe2' && renderCard('Swipe 2', swipes[1] ?? '…')}
      {scene === 'swipe3' && renderCard('Swipe 3', swipes[2] ?? '…')}

      {scene === 'challenge' && (
        <div className="border border-black/5 p-6">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Guided Outcome</div>
          <div className="text-xl font-editorial italic leading-relaxed">{episode.challenge_terminal.prompt}</div>
          <div className="mt-6">
            <textarea
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder={episode.challenge_terminal.placeholder}
              className="w-full min-h-32 border border-black/10 focus:border-black outline-none p-4 font-mono text-xs leading-relaxed"
            />
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            MVP behavior: any attempt advances. Phase 1: we’ll evaluate and fail-forward.
          </p>
        </div>
      )}

      {scene === 'reward' && (
        <div className="border border-black/5 bg-gray-50 p-6">
          <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Unlocked</div>
          <div className="text-2xl font-editorial italic leading-relaxed">{episode.reward_asset}</div>
          <div className="mt-6 border-t border-black/5 pt-6">
            <div className="text-[10px] uppercase tracking-widest opacity-50 mb-3">Cliffhanger</div>
            <div className="text-lg font-editorial italic leading-relaxed">{episode.cliffhanger}</div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={load}
              className="px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors"
            >
              Next Episode
            </button>
            <button
              onClick={props.onOpenPlan}
              className="px-5 py-3 border border-black/20 text-black text-xs uppercase tracking-[0.25em] hover:border-black transition-colors"
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
          className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20"
        >
          {scene === 'reward' ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}


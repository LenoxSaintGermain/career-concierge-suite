import React, { useEffect, useMemo, useState } from 'react';
import { BingeEpisode, GeneratedMediaPack } from '../types';
import { generateBingeEpisode, generateEpisodeMediaPack, refreshVideoOperation } from '../services/bingeApi';

type Scene = 'hook' | 'swipe1' | 'swipe2' | 'swipe3' | 'challenge' | 'reward';

export function BingeFeedView(props: { onOpenPlan: () => void }) {
  const [episode, setEpisode] = useState<BingeEpisode | null>(null);
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState<Scene>('hook');
  const [terminalInput, setTerminalInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mediaPack, setMediaPack] = useState<GeneratedMediaPack | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoRefreshBusy, setVideoRefreshBusy] = useState(false);

  const swipes = useMemo(() => episode?.lesson_swipes ?? [], [episode?.lesson_swipes]);
  const recommendedModels = useMemo(() => episode?.art_direction?.recommended_models ?? [], [episode?.art_direction]);
  const imageAsset = useMemo(
    () => mediaPack?.assets.find((asset) => asset.kind === 'image'),
    [mediaPack]
  );
  const videoAsset = useMemo(
    () => mediaPack?.assets.find((asset) => asset.kind === 'video'),
    [mediaPack]
  );

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    setMediaPack(null);
    setMediaError(null);
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

  const loadMediaPack = async () => {
    if (!episode) return;
    setMediaLoading(true);
    setMediaError(null);
    try {
      const next = await generateEpisodeMediaPack(episode);
      setMediaPack(next);
    } catch (e: any) {
      setMediaError(e?.message ?? 'Unable to generate media pack.');
    } finally {
      setMediaLoading(false);
    }
  };

  const refreshVideoStatus = async () => {
    const operationName = videoAsset?.video_operation_name;
    if (!operationName || !mediaPack) return;

    setVideoRefreshBusy(true);
    setMediaError(null);
    try {
      const status = await refreshVideoOperation(operationName);
      setMediaPack((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assets: prev.assets.map((asset) => {
            if (asset.kind !== 'video') return asset;
            return {
              ...asset,
              status: status.done && status.video_uri ? 'generated' : asset.status,
              video_done: status.done,
              video_uri: status.video_uri ?? undefined,
            };
          }),
        };
      });
    } catch (e: any) {
      setMediaError(e?.message ?? 'Unable to refresh video status.');
    } finally {
      setVideoRefreshBusy(false);
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
          <div className="flex items-center gap-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
              {mediaLoading ? 'Generating scene pack...' : loading ? 'Generating...' : 'Ready'}
            </div>
            <button
              onClick={loadMediaPack}
              disabled={mediaLoading}
              className="px-3 py-2 btn-brand text-[10px] uppercase tracking-[0.2em] disabled:opacity-40"
            >
              {mediaLoading ? 'Working…' : 'Generate Scene Pack'}
            </button>
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
        {mediaError && (
          <div className="mt-4 border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-700 leading-relaxed">
            {mediaError}
          </div>
        )}
        {mediaPack && (
          <div className="mt-4 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">Generated Narrative Assets</div>
            <div className="text-xs text-gray-600 leading-relaxed">{mediaPack.narrative}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border border-black/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">Image Still</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">{imageAsset?.status ?? 'n/a'}</div>
                </div>
                {imageAsset?.image_data_url ? (
                  <img
                    src={imageAsset.image_data_url}
                    alt="Generated episode still"
                    className="w-full aspect-video object-cover border border-black/10"
                  />
                ) : (
                  <div className="w-full aspect-video border border-dashed border-black/20 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-black/40">
                    image unavailable
                  </div>
                )}
                <div className="text-[11px] font-mono text-black/70">{imageAsset?.model ?? 'n/a'}</div>
                {imageAsset?.note && <p className="text-xs text-gray-600 leading-relaxed">{imageAsset.note}</p>}
              </div>

              <div className="bg-white border border-black/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">Video Clip</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">{videoAsset?.status ?? 'n/a'}</div>
                </div>
                <div className="text-[11px] font-mono text-black/70">{videoAsset?.model ?? 'n/a'}</div>
                {videoAsset?.note && <p className="text-xs text-gray-600 leading-relaxed">{videoAsset.note}</p>}
                {videoAsset?.video_uri ? (
                  <a
                    href={videoAsset.video_uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs uppercase tracking-[0.2em] text-brand-teal hover:opacity-70"
                  >
                    Open Generated Clip
                  </a>
                ) : (
                  <p className="text-xs text-black/50 leading-relaxed">
                    No video URI yet. If queued, refresh status after a short delay.
                  </p>
                )}
                {videoAsset?.video_operation_name && !videoAsset.video_done && (
                  <button
                    onClick={refreshVideoStatus}
                    disabled={videoRefreshBusy}
                    className="px-3 py-2 border border-black/20 text-[10px] uppercase tracking-[0.2em] hover-border-brand-teal disabled:opacity-40"
                  >
                    {videoRefreshBusy ? 'Refreshing…' : 'Refresh Video Status'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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

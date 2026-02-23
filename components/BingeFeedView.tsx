import React, { useEffect, useMemo, useState } from 'react';
import { BingeEpisode, CuratedMediaLibraryResponse, GeneratedMediaPack, ResolvedCuratedMediaItem } from '../types';
import {
  fetchCuratedMediaLibrary,
  generateBingeEpisode,
  generateEpisodeMediaPack,
  refreshVideoOperation,
} from '../services/bingeApi';

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
  const [library, setLibrary] = useState<CuratedMediaLibraryResponse | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);

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
  const activeMedia = useMemo<ResolvedCuratedMediaItem | null>(() => {
    if (!library?.items?.length) return null;
    if (!activeMediaId) return library.items[0];
    return library.items.find((item) => item.id === activeMediaId) ?? library.items[0];
  }, [library?.items, activeMediaId]);

  const hasCuratedButNoMatch =
    Boolean(library) && (library.total_items ?? 0) > 0 && (library.matched_items ?? 0) === 0;
  const libraryStatusText = libraryLoading
    ? 'Resolving routed media...'
    : hasCuratedButNoMatch
      ? 'Library loaded, no route match'
      : activeMedia
        ? 'Routed media ready'
        : 'No media mapped yet';
  const queueStatusText = mediaLoading
    ? 'Generating scene pack...'
    : mediaPack
      ? 'Scene pack ready'
      : 'Ready';
  const featuredBackdrop = useMemo(() => {
    return activeMedia?.thumbnail_url || imageAsset?.image_data_url || '';
  }, [activeMedia?.thumbnail_url, imageAsset?.image_data_url]);
  const routeSummary = useMemo(() => {
    if (!library?.context) return null;
    return `${library.context.intake_complete ? 'post-intake' : 'pre-intake'} / ${library.context.intent || 'all intents'} / ${library.context.focus || 'all focuses'} / ${library.context.pace || 'all paces'}`;
  }, [library?.context]);

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

  const loadCuratedLibrary = async () => {
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const payload = await fetchCuratedMediaLibrary('episodes');
      setLibrary(payload);
      setActiveMediaId((prev) => {
        if (prev && payload.items.some((item) => item.id === prev)) return prev;
        return payload.items[0]?.id ?? null;
      });
    } catch (e: any) {
      setLibrary(null);
      setLibraryError(e?.message ?? 'Unable to load external media library.');
    } finally {
      setLibraryLoading(false);
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
    loadCuratedLibrary();
  }, []);

  useEffect(() => {
    if (!activeMedia?.embed_url) {
      setEmbedLoading(false);
      return;
    }
    setEmbedLoading(true);
  }, [activeMedia?.id, activeMedia?.embed_url]);

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
    <div className="relative overflow-hidden border border-[#224048] bg-[#0b1f24] p-6 text-[#dde8ea]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#2dc5c220] blur-2xl" />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest text-brand-teal mb-4">{label}</div>
        <div className="text-2xl font-editorial italic leading-relaxed">{body}</div>
      </div>
    </div>
  );

  if (loading && !episode) {
    return (
      <div className="space-y-5 py-10">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Preparing episodes workspace...</div>
          <div className="text-xs text-gray-500 mt-2">Loading story state, mapped media, and cinematic surfaces.</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-28 border border-black/10 bg-gray-100 animate-pulse" />
          <div className="h-28 border border-black/10 bg-gray-100 animate-pulse" />
          <div className="h-28 border border-black/10 bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="border border-black/5 bg-gray-50 p-6">
        <div className="text-2xl font-editorial italic">Unable to load episode.</div>
        {loadError && <p className="mt-4 text-sm text-red-700 leading-relaxed">{loadError}</p>}
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
    <div className="space-y-8">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-teal mb-3">Episodes</div>
        <h2 className="text-4xl md:text-6xl font-editorial leading-[0.95]">{episode.title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          No lectures. No quizzes. You survive a micro-drama by executing the skill.
        </p>
      </div>

      <section className="relative overflow-hidden border border-[#173841] bg-[#07161a] text-[#dce7e8] p-4 md:p-6">
        {featuredBackdrop && (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${featuredBackdrop})` }}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(38,200,188,0.20),rgba(7,22,26,0.95)_64%)]" />

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Curated Library</div>
              <div className="text-2xl md:text-3xl font-editorial italic mt-2">Cinematic gallery, routed by journey context.</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7] mt-3">{libraryStatusText}</div>
            </div>
            <button
              onClick={loadCuratedLibrary}
              disabled={libraryLoading}
              className="px-3 py-2 border border-[#2d4a51] bg-[#0f242a] text-[10px] uppercase tracking-[0.2em] hover-border-brand-teal disabled:opacity-40"
            >
              {libraryLoading ? 'Refreshing routes...' : 'Refresh Library'}
            </button>
          </div>

          {libraryError && (
            <div className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 leading-relaxed">
              {libraryError}
            </div>
          )}

          {libraryLoading && !library ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-4">
              <div className="h-64 border border-[#29464d] bg-[#10262b] animate-pulse" />
              <div className="h-64 border border-[#29464d] bg-[#10262b] animate-pulse" />
            </div>
          ) : activeMedia ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_0.78fr] gap-4">
                <div className="border border-[#29464d] bg-[#0d2227] p-3 md:p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#8aa0a4]">{activeMedia.platform_resolved}</div>
                      <div className="text-3xl md:text-4xl font-editorial italic mt-2 leading-[0.92]">
                        {activeMedia.title || 'Untitled Media'}
                      </div>
                    </div>
                    <a
                      href={activeMedia.open_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] uppercase tracking-[0.2em] text-brand-teal hover:opacity-70"
                    >
                      Open Source
                    </a>
                  </div>

                  {activeMedia.embed_url ? (
                    <div className="relative overflow-hidden border border-[#314f56] bg-black">
                      {activeMedia.platform_resolved === 'direct' ? (
                        <video
                          controls
                          preload="metadata"
                          src={activeMedia.embed_url}
                          poster={activeMedia.thumbnail_url || undefined}
                          onLoadedData={() => setEmbedLoading(false)}
                          className="w-full aspect-video object-cover"
                        />
                      ) : (
                        <iframe
                          src={activeMedia.embed_url}
                          title={activeMedia.title || 'External media'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="eager"
                          onLoad={() => setEmbedLoading(false)}
                          className="w-full aspect-video"
                        />
                      )}
                      {embedLoading && (
                        <div className="absolute inset-0 border border-brand-teal/20 bg-[#0a1f24]/95 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal animate-pulse">Loading media preview...</div>
                            <div className="text-xs text-[#a2b8bc] mt-2">Preparing playback surface</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-video border border-dashed border-[#36535a] flex flex-col items-center justify-center text-center p-6 bg-[#0a1d22]">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#8da3a7]">Preview unavailable</div>
                      <div className="text-sm text-[#a9bcc0] mt-2">Open this source in a new tab.</div>
                    </div>
                  )}

                  {activeMedia.subtitle && <p className="text-sm text-[#afc2c6] leading-relaxed">{activeMedia.subtitle}</p>}
                </div>

                <div className="border border-[#29464d] bg-[#0d2227] p-3 md:p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#90a5a9] mb-3">Media Grid</div>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[470px]">
                    {library?.items.map((item) => {
                      const active = activeMedia.id === item.id;
                      const thumb = item.thumbnail_url || '';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveMediaId(item.id)}
                          className={`relative min-w-[230px] lg:min-w-0 text-left border transition-all p-3 ${
                            active
                              ? 'border-brand-teal bg-[#153740]'
                              : 'border-[#35535b] bg-[#102830] hover-border-brand-teal'
                          }`}
                        >
                          {thumb && (
                            <div
                              className="absolute inset-0 opacity-25 bg-cover bg-center"
                              style={{ backgroundImage: `url(${thumb})` }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-[#08191d]/30 to-[#08191d]/95" />
                          <div className="relative">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[#95acb0]">{item.platform_resolved}</div>
                            <div className="mt-2 text-lg font-editorial italic leading-[1.05] text-[#e7eff1]">
                              {item.title || 'Untitled media'}
                            </div>
                            {item.subtitle && <div className="text-xs text-[#b5c7ca] mt-2 line-clamp-2">{item.subtitle}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {routeSummary && (
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Routing context: {routeSummary}</div>
              )}
            </>
          ) : hasCuratedButNoMatch ? (
            <div className="border border-[#2d4a51] bg-[#0d2329] p-4 space-y-2">
              <div className="text-sm text-[#d4e0e2]">
                Library has {library?.total_items ?? 0} media item(s), but none match this routing context.
              </div>
              <div className="text-xs text-[#9db2b6]">
                Check surface + intent/focus/pace filters in Admin, or relax filters for pre-intake users.
              </div>
            </div>
          ) : (
            <div className="border border-[#2d4a51] bg-[#0d2329] p-4 text-sm text-[#a8bcc0]">
              No external media has been added yet. Add a YouTube/Vimeo item in Admin and map it to Episodes.
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden border border-[#173841] bg-[#07161a] text-[#dce7e8] p-4 md:p-6 space-y-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_14%,rgba(38,200,188,0.14),transparent_52%)]" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Art Director Queue</div>
            <div className="text-2xl md:text-3xl font-editorial italic mt-2">Model routing for multimedia generation.</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8fa4a8]">{queueStatusText}</div>
            <button
              onClick={loadMediaPack}
              disabled={mediaLoading}
              className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.2em] disabled:opacity-40"
            >
              {mediaLoading ? 'Working...' : 'Generate Scene Pack'}
            </button>
          </div>
        </div>

        {recommendedModels.length > 0 && (
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendedModels.map((entry, idx) => (
              <div key={`${entry.kind}-${idx}`} className="border border-[#2e4c53] bg-[#0d2329] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#91a7ab]">{entry.kind}</div>
                <div className="font-mono text-xs mt-1 text-[#dce7e8]">{entry.model}</div>
                {entry.note && <p className="text-xs text-[#a9bcc0] mt-2 leading-relaxed">{entry.note}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="border border-[#2e4c53] bg-[#0d2329] p-3">
            <div className="uppercase tracking-[0.2em] text-[#8ea3a7] mb-2">Image prompt</div>
            <p className="leading-relaxed text-[#d6e2e4]">{episode.art_direction?.image_prompt ?? 'Not provided'}</p>
          </div>
          <div className="border border-[#2e4c53] bg-[#0d2329] p-3">
            <div className="uppercase tracking-[0.2em] text-[#8ea3a7] mb-2">Video prompt</div>
            <p className="leading-relaxed text-[#d6e2e4]">{episode.art_direction?.video_prompt ?? 'Not provided'}</p>
          </div>
          <div className="border border-[#2e4c53] bg-[#0d2329] p-3">
            <div className="uppercase tracking-[0.2em] text-[#8ea3a7] mb-2">Audio prompt</div>
            <p className="leading-relaxed text-[#d6e2e4]">{episode.art_direction?.audio_prompt ?? 'Not provided'}</p>
          </div>
        </div>

        {mediaError && (
          <div className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 leading-relaxed">
            {mediaError}
          </div>
        )}

        {mediaPack && (
          <div className="relative space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Generated Narrative Assets</div>
            <div className="text-xs text-[#a9bcc0] leading-relaxed">{mediaPack.narrative}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-[#2e4c53] bg-[#0d2329] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Image still</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">{imageAsset?.status ?? 'n/a'}</div>
                </div>
                {imageAsset?.image_data_url ? (
                  <img
                    src={imageAsset.image_data_url}
                    alt="Generated episode still"
                    className="w-full aspect-video object-cover border border-[#37565d]"
                  />
                ) : (
                  <div className="w-full aspect-video border border-dashed border-[#36535a] flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-[#8aa0a4]">
                    image unavailable
                  </div>
                )}
                <div className="text-[11px] font-mono text-[#c6d6d9]">{imageAsset?.model ?? 'n/a'}</div>
                {imageAsset?.note && <p className="text-xs text-[#a9bcc0] leading-relaxed">{imageAsset.note}</p>}
              </div>

              <div className="border border-[#2e4c53] bg-[#0d2329] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">Video clip</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">{videoAsset?.status ?? 'n/a'}</div>
                </div>
                <div className="text-[11px] font-mono text-[#c6d6d9]">{videoAsset?.model ?? 'n/a'}</div>
                {videoAsset?.note && <p className="text-xs text-[#a9bcc0] leading-relaxed">{videoAsset.note}</p>}
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
                  <p className="text-xs text-[#a9bcc0] leading-relaxed">
                    No video URI yet. If queued, refresh status after a short delay.
                  </p>
                )}
                {videoAsset?.video_operation_name && !videoAsset.video_done && (
                  <button
                    onClick={refreshVideoStatus}
                    disabled={videoRefreshBusy}
                    className="px-3 py-2 border border-[#3a5961] bg-[#102930] text-[10px] uppercase tracking-[0.2em] hover-border-brand-teal disabled:opacity-40"
                  >
                    {videoRefreshBusy ? 'Refreshing...' : 'Refresh Video Status'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {scene === 'hook' && renderCard('Cold Open', episode.hook_card)}
      {scene === 'swipe1' && renderCard('Swipe 1', swipes[0] ?? '...')}
      {scene === 'swipe2' && renderCard('Swipe 2', swipes[1] ?? '...')}
      {scene === 'swipe3' && renderCard('Swipe 3', swipes[2] ?? '...')}

      {scene === 'challenge' && (
        <div className="border border-[#224048] bg-[#0b1f24] p-6 text-[#dde8ea]">
          <div className="text-[10px] uppercase tracking-widest text-brand-teal mb-4">Guided Outcome</div>
          <div className="text-2xl font-editorial italic leading-relaxed">{episode.challenge_terminal.prompt}</div>
          <div className="mt-6">
            <textarea
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder={episode.challenge_terminal.placeholder}
              className="w-full min-h-32 border border-[#34535a] bg-[#0a1d22] focus-border-brand-teal outline-none p-4 font-mono text-xs leading-relaxed text-[#dce7e8]"
            />
          </div>
          <p className="text-xs text-[#9bb0b4] mt-3 leading-relaxed">
            MVP behavior: any attempt advances. Phase 1: we will evaluate and fail-forward.
          </p>
        </div>
      )}

      {scene === 'reward' && (
        <div className="border border-[#224048] bg-[#0b1f24] p-6 text-[#dde8ea]">
          <div className="text-[10px] uppercase tracking-widest text-brand-teal mb-4">Unlocked</div>
          <div className="text-3xl font-editorial italic leading-relaxed">{episode.reward_asset}</div>
          <div className="mt-6 border-t border-[#28474f] pt-6">
            <div className="text-[10px] uppercase tracking-widest text-[#8da2a6] mb-3">Cliffhanger</div>
            <div className="text-xl font-editorial italic leading-relaxed">{episode.cliffhanger}</div>
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
              className="px-5 py-3 border border-[#3b5a61] text-[#dde8ea] text-xs uppercase tracking-[0.25em] hover-border-brand-teal transition-colors"
            >
              Open Your Plan
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-black/10">
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

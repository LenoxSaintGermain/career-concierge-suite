import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BingeEpisode, ClientDoc, CuratedMediaLibraryResponse, GeneratedMediaPack, ResolvedCuratedMediaItem } from '../types';
import {
  fetchCuratedMediaLibrary,
  generateBingeEpisode,
  generateEpisodeMediaPack,
  refreshVideoOperation,
} from '../services/bingeApi';
import { synthesizeConciergeVoice } from '../services/voiceApi';

type Scene = 'hook' | 'swipe1' | 'swipe2' | 'swipe3' | 'challenge' | 'reward';

const FREE_TIER_PLAYLIST: BingeEpisode[] = [
  {
    episode_id: 'free-foundation-01',
    title: 'What is AI? A No-Jargon Introduction',
    hook_card: 'Start with one clear mental model before you chase tooling.',
    lesson_swipes: [
      'AI is useful when it reduces friction in a real workflow.',
      'One repeatable use case beats ten vague experiments.',
      'Clarity matters more than speed in the first week.',
    ],
    challenge_terminal: {
      prompt: 'Write one sentence: where could AI save you time this week?',
      placeholder: 'AI could help me...',
    },
    reward_asset: 'Starter Resource Guide unlocked.',
    cliffhanger: 'Next up: the job-seeker toolkit that turns curiosity into signal.',
  },
  {
    episode_id: 'free-foundation-02',
    title: '5 AI Tools Every Job Seeker Should Know',
    hook_card: 'You do not need every tool. You need the right stack for signal.',
    lesson_swipes: [
      'Use one drafting tool, one research tool, and one scheduling or note tool.',
      'Your stack should shorten prep time, not create a second job.',
      'Pick tools you can explain confidently in an interview.',
    ],
    challenge_terminal: {
      prompt: 'Which one tool will you test first, and for what job-search task?',
      placeholder: 'I will test...',
    },
    reward_asset: 'Starter stack recommendations unlocked.',
    cliffhanger: 'Next up: how to talk about AI without sounding inflated.',
  },
  {
    episode_id: 'free-foundation-03',
    title: 'How to Talk About AI in Your Next Interview',
    hook_card: 'The wrong answer sounds trendy. The right answer sounds useful.',
    lesson_swipes: [
      'Describe the workflow you improved, not the jargon you learned.',
      'Use AI as evidence of judgment and efficiency, not magic.',
      'Tie every example back to a business or team outcome.',
    ],
    challenge_terminal: {
      prompt: 'Draft one interview line that explains how you use AI responsibly.',
      placeholder: 'I use AI to...',
    },
    reward_asset: 'Interview framing template unlocked.',
    cliffhanger: 'Upgrade path opens your personalized Brief, Plan, and concierge support.',
  },
];

const nonEmpty = (value: unknown) => String(value ?? '').trim();
const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];

const resolveTargetSkill = (client: ClientDoc | null): string | undefined => {
  const answers = client?.intake?.answers ?? {};
  const intent = client?.intent ?? 'current_role';
  const advanced = asList(answers.advanced_interests);
  const foundational = asList(answers.foundational_interests);
  const industry = nonEmpty(answers.industry).toLowerCase();

  if (advanced.some((entry) => entry.includes('Ai-Driven Customer Experience Optimization')) || industry.includes('consumer packaged goods')) {
    return 'AI-driven customer segmentation and marketing ROI';
  }
  if (advanced.some((entry) => entry.includes('Enterprise Ai Architecture'))) {
    return 'AI Strategy & Leadership';
  }
  if (foundational.some((entry) => entry.includes('Ai Strategy & Leadership'))) {
    return 'AI Strategy & Leadership';
  }
  if (foundational.some((entry) => entry.includes('Process Automation / Workflow Optimization'))) {
    return 'Process Automation / Workflow Optimization';
  }
  if (intent === 'target_role') return 'Internal promotion strategy and ROI storytelling';
  if (intent === 'not_sure') return 'Process Automation / Workflow Optimization';
  return 'AI Strategy & Leadership';
};

const prefersNarration = (client: ClientDoc | null) =>
  asList(client?.intake?.answers?.learning_modalities).some((entry) => entry.includes('Auditory'));

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export function BingeFeedView(props: { onOpenPlan: () => void; isFreeTier?: boolean; client: ClientDoc | null }) {
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
  const [heroRevealed, setHeroRevealed] = useState(true);
  const [queueRevealed, setQueueRevealed] = useState(true);
  const [storyRevealed, setStoryRevealed] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [playlistEpisodeId, setPlaylistEpisodeId] = useState(FREE_TIER_PLAYLIST[0].episode_id);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const queueSectionRef = useRef<HTMLElement | null>(null);
  const storySectionRef = useRef<HTMLDivElement | null>(null);
  const mediaStageRef = useRef<HTMLDivElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioContextRef = useRef<AudioContext | null>(null);
  const previewAudioUnlockedRef = useRef(false);
  const isFreeTier = Boolean(props.isFreeTier);
  const targetSkill = useMemo(() => resolveTargetSkill(props.client), [props.client]);
  const wantsNarration = useMemo(() => prefersNarration(props.client), [props.client]);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (previewAudioContextRef.current) {
        void previewAudioContextRef.current.close().catch(() => undefined);
        previewAudioContextRef.current = null;
      }
    };
  }, []);

  const swipes = useMemo(() => episode?.lesson_swipes ?? [], [episode?.lesson_swipes]);
  const recommendedModels = useMemo(() => episode?.art_direction?.recommended_models ?? [], [episode?.art_direction]);
  const freeTierQueue = useMemo(() => FREE_TIER_PLAYLIST, []);
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
  const sceneSteps: Array<{ id: Scene; label: string }> = [
    { id: 'hook', label: 'Cold Open' },
    { id: 'swipe1', label: 'Swipe I' },
    { id: 'swipe2', label: 'Swipe II' },
    { id: 'swipe3', label: 'Swipe III' },
    { id: 'challenge', label: 'Challenge' },
    { id: 'reward', label: 'Reward' },
  ];

  const load = async () => {
    if (isFreeTier) {
      setEpisode(FREE_TIER_PLAYLIST[0]);
      setScene('hook');
      setTerminalInput('');
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setMediaPack(null);
    setMediaError(null);
    try {
      const e = await generateBingeEpisode(targetSkill);
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
    if (isFreeTier) {
      setLibrary(null);
      setLibraryError(null);
      setLibraryLoading(false);
      return;
    }
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
    if (!isFreeTier) loadCuratedLibrary();
  }, [isFreeTier, targetSkill]);

  useEffect(() => {
    if (!isFreeTier) return;
    const selected = FREE_TIER_PLAYLIST.find((entry) => entry.episode_id === playlistEpisodeId) ?? FREE_TIER_PLAYLIST[0];
    setEpisode(selected);
    setScene('hook');
    setTerminalInput('');
  }, [isFreeTier, playlistEpisodeId]);

  useEffect(() => {
    if (!activeMedia?.embed_url) {
      setEmbedLoading(false);
      return;
    }
    setEmbedLoading(true);
  }, [activeMedia?.id, activeMedia?.embed_url]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setHeroRevealed(true);
      setQueueRevealed(true);
      setStoryRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const marker = (entry.target as HTMLElement).dataset.reveal;
          if (marker === 'hero') setHeroRevealed(true);
          if (marker === 'queue') setQueueRevealed(true);
          if (marker === 'story') setStoryRevealed(true);
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    if (heroSectionRef.current) observer.observe(heroSectionRef.current);
    if (queueSectionRef.current) observer.observe(queueSectionRef.current);
    if (storySectionRef.current) observer.observe(storySectionRef.current);

    return () => observer.disconnect();
  }, []);

  const onHeroMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx * 4.5, y: -ny * 4.5 });
  };

  const onHeroLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const jumpToMediaStage = () => {
    mediaStageRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const ensurePreviewAudioUnlocked = async () => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!previewAudioContextRef.current) {
      previewAudioContextRef.current = new AudioContextCtor();
    }
    const context = previewAudioContextRef.current;
    if (context.state === 'suspended') {
      await context.resume();
    }
    if (!previewAudioUnlockedRef.current) {
      const unlockBuffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = unlockBuffer;
      source.connect(context.destination);
      source.start(0);
      previewAudioUnlockedRef.current = true;
    }
  };

  const playVoiceResponse = async (mimeType: string, audioBase64: string) => {
    const bytes = base64ToBytes(audioBase64);
    const mime = String(mimeType || 'audio/wav');
    const lowerMime = mime.toLowerCase();
    const context = previewAudioContextRef.current;

    if (context && !lowerMime.startsWith('audio/pcm')) {
      try {
        if (context.state === 'suspended') await context.resume();
        const raw = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const decoded = await context.decodeAudioData(raw as ArrayBuffer);
        const source = context.createBufferSource();
        source.buffer = decoded;
        source.connect(context.destination);
        source.start();
        return;
      } catch {
        // Fallback to element playback.
      }
    }

    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'auto';
    activeAudioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
  };

  const playNarration = async () => {
    if (!episode) return;
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      await ensurePreviewAudioUnlocked();
      const narrationScript = [
        episode.title,
        episode.hook_card,
        ...episode.lesson_swipes,
        episode.challenge_terminal.prompt,
        episode.cliffhanger,
      ].join(' ');
      const response = await synthesizeConciergeVoice(narrationScript);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      await playVoiceResponse(response.mime_type || 'audio/wav', response.audio_base64);
    } catch (error: any) {
      setVoiceError(error?.message ?? 'Episode narration failed.');
    } finally {
      setVoiceBusy(false);
    }
  };

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
        <div className="flex flex-wrap items-center gap-3 mt-5">
          {!isFreeTier && (wantsNarration || Boolean(episode.art_direction?.audio_prompt)) && (
            <button
              type="button"
              onClick={playNarration}
              disabled={voiceBusy}
              className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
            >
              {voiceBusy ? 'Scoring narration...' : 'Play Narrated Delivery'}
            </button>
          )}
          {targetSkill && !isFreeTier && (
            <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">
              Routed topic: {targetSkill}
            </div>
          )}
        </div>
        {voiceError && (
          <div className="mt-4 border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
            {voiceError}
          </div>
        )}
      </div>

      {isFreeTier && (
        <section className="border border-black/10 bg-white p-5 md:p-6 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Starter Playlist</div>
            <div className="text-3xl font-editorial italic mt-2">Three foundational episodes, pre-set for free users.</div>
            <p className="text-sm text-gray-700 leading-relaxed mt-3 max-w-2xl">
              This free-tier queue is intentionally fixed. Upgrade unlocks personalized episode sequencing, narrated delivery, and concierge-guided pathways.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {freeTierQueue.map((entry, index) => {
              const active = entry.episode_id === playlistEpisodeId;
              return (
                <button
                  key={entry.episode_id}
                  type="button"
                  onClick={() => setPlaylistEpisodeId(entry.episode_id)}
                  className={`text-left border p-4 transition-colors ${
                    active ? 'border-brand-teal bg-brand-soft' : 'border-black/10 hover-border-brand-teal'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Episode {index + 1}</div>
                  <div className="text-xl font-editorial italic mt-3 leading-tight">{entry.title}</div>
                  <p className="text-sm text-gray-600 leading-relaxed mt-3">{entry.hook_card}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!isFreeTier && (
        <section
          ref={heroSectionRef}
          data-reveal="hero"
          className={`relative overflow-hidden border border-[#173841] bg-[#07161a] text-[#dce7e8] p-4 md:p-6 transition-all dur-cinematic ease-exit ${
            heroRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
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
              <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Cinematic Studio</div>
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
              <div
                className="relative overflow-hidden border border-[#2a4a52] bg-[#081a1f] min-h-[320px] md:min-h-[360px] p-4 md:p-6"
                onMouseMove={onHeroMove}
                onMouseLeave={onHeroLeave}
                style={
                  reduceMotion
                    ? undefined
                    : {
                        transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                      }
                }
              >
                {(activeMedia.thumbnail_url || featuredBackdrop) && (
                  <div
                    className="absolute inset-0 bg-cover bg-center scale-[1.02]"
                    style={{ backgroundImage: `url(${activeMedia.thumbnail_url || featuredBackdrop})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#050f12] via-[#081820]/75 to-[#081820]/35" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061319]/95 via-transparent to-transparent" />
                <div className="relative h-full flex flex-col justify-between gap-5">
                  <div className="max-w-2xl">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">
                      {activeMedia.platform_resolved} spotlight
                    </div>
                    <div className="text-4xl md:text-6xl font-editorial leading-[0.9] mt-3">
                      {activeMedia.title || episode.title}
                    </div>
                    {activeMedia.subtitle && (
                      <p className="text-sm md:text-base text-[#c6d7da] mt-4 leading-relaxed max-w-xl">
                        {activeMedia.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={jumpToMediaStage}
                      className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em]"
                    >
                      Watch Preview
                    </button>
                    <a
                      href={activeMedia.open_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 border border-[#3a5b63] bg-[#0b2026]/70 text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
                    >
                      Open Source
                    </a>
                    {routeSummary && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#97b0b4]">
                        {routeSummary}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.22fr_0.78fr] gap-4">
                <div
                  ref={mediaStageRef}
                  className="border border-[#29464d] bg-[#0d2227] p-3 md:p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#8aa0a4]">Now Playing</div>
                      <div className="text-2xl md:text-3xl font-editorial italic mt-2 leading-[0.92]">
                        {activeMedia.title || 'Untitled media'}
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#8ea3a7]">
                      {activeMedia.platform_resolved}
                    </div>
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
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[470px]">
                    {library?.items.map((item) => {
                      const active = activeMedia.id === item.id;
                      const thumb = item.thumbnail_url || '';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveMediaId(item.id)}
                          className={`relative min-w-[230px] shrink-0 snap-start lg:min-w-0 lg:shrink text-left border transition-all dur-sm ease-exit hover:-translate-y-0.5 p-3 ${
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
      )}

      {isFreeTier && (
        <section className="border border-brand-teal/30 bg-brand-soft p-5 md:p-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Upgrade Path</div>
          <div className="text-3xl md:text-4xl font-editorial italic mt-2">Unlock your personalized suite.</div>
          <p className="text-sm text-gray-700 leading-relaxed mt-3 max-w-2xl">
            You completed the free foundation experience. Upgrade to unlock The Brief, Your Plan, Profile/Gaps, and
            ConciergeJobSearch execution support.
          </p>
          <button
            type="button"
            onClick={props.onOpenPlan}
            className="mt-5 px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em]"
          >
            View Upgrade Guide
          </button>
        </section>
      )}

      {!isFreeTier && (
        <section
          ref={queueSectionRef}
          data-reveal="queue"
          className={`relative overflow-hidden border border-[#173841] bg-[#07161a] text-[#dce7e8] p-4 md:p-6 space-y-4 transition-all dur-cinematic ease-exit ${
            queueRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
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
      )}

      <div className="border border-black/10 bg-white/60 p-3 md:p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-black/45 mb-3">Episode Progression</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {sceneSteps.map((step, idx) => {
            const active = step.id === scene;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setScene(step.id)}
                className={`shrink-0 snap-start px-3 py-2 text-[10px] uppercase tracking-[0.2em] border transition-all ${
                  active
                    ? 'border-brand-teal bg-brand-soft text-brand-teal'
                    : 'border-black/15 text-black/55 hover-border-brand-teal'
                }`}
              >
                {(idx + 1).toString().padStart(2, '0')} · {step.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={storySectionRef}
        data-reveal="story"
        className={`transition-all dur-cinematic ease-exit ${storyRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      >
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
      </div>

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

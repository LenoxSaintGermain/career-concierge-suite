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
type PlayerMode = 'client' | 'operator';
type BeatTone = 'dramatic' | 'teaching' | 'challenge' | 'resolution';

type ClientBeat = {
  id: Scene;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  aside: string;
  tone: BeatTone;
};

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

const inferEpisodeFocus = (targetSkill?: string) => {
  if (!targetSkill) return 'A guided episode tuned to the next highest-leverage concept in your journey.';
  return `This episode is tuned to ${targetSkill.toLowerCase()}.`;
};

const sceneLabel = (scene: Scene) => {
  if (scene === 'hook') return 'Cold Open';
  if (scene === 'swipe1') return 'Beat I';
  if (scene === 'swipe2') return 'Beat II';
  if (scene === 'swipe3') return 'Beat III';
  if (scene === 'challenge') return 'Challenge';
  return 'Resolution';
};

const buildEpisodeBeats = (episode: BingeEpisode | null, targetSkill?: string): ClientBeat[] => {
  if (!episode) return [];
  const swipes = episode.lesson_swipes ?? [];
  return [
    {
      id: 'hook',
      label: 'Cold Open',
      eyebrow: 'Opening tension',
      title: episode.title,
      body: episode.hook_card,
      aside: inferEpisodeFocus(targetSkill),
      tone: 'dramatic',
    },
    {
      id: 'swipe1',
      label: 'Beat I',
      eyebrow: 'Signal',
      title: 'What changes first',
      body: swipes[0] ?? 'The first pattern comes into focus.',
      aside: 'Treat the first beat as the operating principle, not trivia.',
      tone: 'teaching',
    },
    {
      id: 'swipe2',
      label: 'Beat II',
      eyebrow: 'Consequence',
      title: 'Where judgment matters',
      body: swipes[1] ?? swipes[0] ?? 'The second beat shows what the concept changes in practice.',
      aside: 'This is the pivot from concept to professional consequence.',
      tone: 'teaching',
    },
    {
      id: 'swipe3',
      label: 'Beat III',
      eyebrow: 'Transfer',
      title: 'How it lands in your work',
      body: swipes[2] ?? swipes[1] ?? swipes[0] ?? 'The final beat anchors the lesson in action.',
      aside: 'Look for a moment you can reuse this pattern in your own workflow.',
      tone: 'teaching',
    },
    {
      id: 'challenge',
      label: 'Challenge',
      eyebrow: 'Your turn',
      title: 'Respond before the answer is given',
      body: episode.challenge_terminal.prompt,
      aside: 'Good responses show judgment, clarity, and relevance to your role.',
      tone: 'challenge',
    },
    {
      id: 'reward',
      label: 'Resolution',
      eyebrow: 'Unlocked',
      title: episode.reward_asset,
      body: episode.cliffhanger,
      aside: 'Carry the pattern forward into the next episode or your plan.',
      tone: 'resolution',
    },
  ];
};

const toneClassName = (tone: BeatTone) => {
  if (tone === 'dramatic') return 'bg-[#102228] text-[#f1ebe1] border-[#35515a]';
  if (tone === 'challenge') return 'bg-[#13272c] text-[#f5eee6] border-[#41616a]';
  if (tone === 'resolution') return 'bg-[#f3efe7] text-[#241f1c] border-[#d8d0c3]';
  return 'bg-[#f7f3ec] text-[#241f1c] border-[#d8d0c3]';
};

export function BingeFeedView(props: {
  onOpenPlan: () => void;
  isFreeTier?: boolean;
  isAdminUser?: boolean;
  client: ClientDoc | null;
}) {
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
  const [mode, setMode] = useState<PlayerMode>('client');
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
  const episodeBeats = useMemo(() => buildEpisodeBeats(episode, targetSkill), [episode, targetSkill]);
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
  const activeBeat = useMemo(
    () => episodeBeats.find((beat) => beat.id === scene) ?? episodeBeats[0] ?? null,
    [episodeBeats, scene]
  );
  const nextBeat = useMemo(() => {
    if (!activeBeat) return null;
    const currentIndex = episodeBeats.findIndex((beat) => beat.id === activeBeat.id);
    return currentIndex >= 0 ? episodeBeats[currentIndex + 1] ?? null : null;
  }, [activeBeat, episodeBeats]);
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
    if (!props.isAdminUser && mode !== 'client') setMode('client');
  }, [mode, props.isAdminUser]);

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

  if (loading && !episode) {
    return (
      <div className="space-y-5 py-10">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Preparing the next episode...</div>
          <div className="text-xs text-gray-500 mt-2">Loading the cinematic stage, beats, and guidance notes.</div>
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
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="text-[10px] uppercase tracking-[0.26em] text-brand-teal">SkillSync Ai TV</div>
          <h2 className="mt-3 text-4xl md:text-6xl font-editorial leading-[0.92]">{episode.title}</h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-gray-600">
            A cinematic learning ritual built around short dramatic beats, clear context, and one practical choice at a time.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isFreeTier && (wantsNarration || Boolean(episode.art_direction?.audio_prompt)) && (
              <button
                type="button"
                onClick={playNarration}
                disabled={voiceBusy}
                className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
              >
                {voiceBusy ? 'Preparing narration...' : 'Play narration'}
              </button>
            )}
            {props.isAdminUser && !isFreeTier && (
              <div className="inline-flex border border-black/10 bg-white">
                <button
                  type="button"
                  onClick={() => setMode('client')}
                  className={`px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${
                    mode === 'client' ? 'bg-brand-soft text-brand-teal' : 'text-black/55'
                  }`}
                >
                  Client View
                </button>
                <button
                  type="button"
                  onClick={() => setMode('operator')}
                  className={`border-l border-black/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${
                    mode === 'operator' ? 'bg-[#102228] text-[#e6f1f3]' : 'text-black/55'
                  }`}
                >
                  Operator Mode
                </button>
              </div>
            )}
          </div>
          {voiceError && (
            <div className="mt-4 border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
              {voiceError}
            </div>
          )}
        </div>
        <div className="min-w-[220px] border border-black/10 bg-white px-4 py-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Episode posture</div>
          <div className="mt-3 text-2xl font-editorial italic leading-none">
            {isFreeTier ? 'Foundation track' : 'Personalized track'}
          </div>
          <div className="mt-3 text-sm leading-relaxed text-gray-600">
            {isFreeTier
              ? 'This playlist stays fixed for free users so the journey feels simple and demo-ready.'
              : inferEpisodeFocus(targetSkill)}
          </div>
        </div>
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

      {mode === 'client' && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.72fr_1.35fr_0.78fr]">
          <aside className="border border-black/10 bg-white p-5 md:p-6 space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">{activeBeat?.eyebrow ?? 'Episode'}</div>
              <div className="mt-3 text-3xl font-editorial italic leading-[0.95]">{activeBeat?.title ?? episode.title}</div>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-gray-700">
              <p>{activeBeat?.aside ?? inferEpisodeFocus(targetSkill)}</p>
              <p>
                {isFreeTier
                  ? 'Free access stays concise: one fixed playlist, one challenge, one clear upgrade path.'
                  : 'The player keeps the production machinery hidden so the user only sees the lesson, not the apparatus.'}
              </p>
            </div>
            <div className="border-t border-black/10 pt-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">What this episode teaches</div>
              <div className="mt-3 text-sm leading-relaxed text-gray-700">
                {targetSkill || 'A foundational AI behavior tied to your next career move.'}
              </div>
            </div>
            {!isFreeTier && activeMedia && (
              <div className="border-t border-black/10 pt-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Featured scene</div>
                <div className="mt-3 text-lg font-editorial italic leading-tight">
                  {activeMedia.title || 'Cinematic scene'}
                </div>
                {activeMedia.subtitle && (
                  <div className="mt-2 text-sm leading-relaxed text-gray-600">{activeMedia.subtitle}</div>
                )}
              </div>
            )}
          </aside>

          <div className="space-y-4">
            <section
              ref={heroSectionRef}
              data-reveal="hero"
              className={`relative overflow-hidden border border-[#173841] bg-[#07161a] p-4 md:p-6 text-[#e9efe9] transition-all dur-cinematic ease-exit ${
                heroRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
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
              {featuredBackdrop && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-35"
                  style={{ backgroundImage: `url(${featuredBackdrop})` }}
                />
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(38,200,188,0.18),rgba(7,22,26,0.94)_62%)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061319] via-[#061319]/55 to-transparent" />
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">{sceneLabel(scene)}</div>
                    <div className="mt-3 text-3xl md:text-5xl font-editorial leading-[0.9]">
                      {activeBeat?.title ?? episode.title}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#b9c8cb]">
                    {isFreeTier ? 'Foundation ritual' : 'Personalized episode'}
                  </div>
                </div>

                {!isFreeTier && activeMedia?.embed_url ? (
                  <div ref={mediaStageRef} className="relative overflow-hidden border border-[#314f56] bg-black">
                    {activeMedia.platform_resolved === 'direct' ? (
                      <video
                        controls
                        preload="metadata"
                        src={activeMedia.embed_url}
                        poster={activeMedia.thumbnail_url || undefined}
                        onLoadedData={() => setEmbedLoading(false)}
                        className="w-full aspect-[10/13] object-cover md:aspect-[16/10]"
                      />
                    ) : (
                      <iframe
                        src={activeMedia.embed_url}
                        title={activeMedia.title || 'Episode scene'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="eager"
                        onLoad={() => setEmbedLoading(false)}
                        className="w-full aspect-[10/13] md:aspect-[16/10]"
                      />
                    )}
                    {embedLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#081920]/90">
                        <div className="text-center">
                          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal animate-pulse">Preparing scene...</div>
                          <div className="mt-2 text-xs text-[#acc0c4]">Loading the stage</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`relative overflow-hidden border p-6 md:p-8 ${toneClassName(activeBeat?.tone ?? 'teaching')}`}>
                    <div className="max-w-2xl">
                      <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">{activeBeat?.label ?? 'Beat'}</div>
                      <div className="mt-4 text-3xl md:text-4xl font-editorial italic leading-[1.02]">
                        {scene === 'reward' ? episode.reward_asset : activeBeat?.body}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {sceneSteps.map((step, idx) => {
                    const active = step.id === scene;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setScene(step.id)}
                        className={`px-3 py-2 text-[10px] uppercase tracking-[0.2em] border transition-all ${
                          active
                            ? 'border-brand-teal bg-brand-soft text-brand-teal'
                            : 'border-white/15 text-[#d2dddf] hover-border-brand-teal'
                        }`}
                      >
                        {(idx + 1).toString().padStart(2, '0')} · {step.label}
                      </button>
                    );
                  })}
                </div>

                {scene !== 'challenge' && scene !== 'reward' && (
                  <div className="border border-white/10 bg-[#0b1d21]/80 p-4 text-sm leading-relaxed text-[#dbe7e9]">
                    {activeBeat?.body}
                  </div>
                )}

                {scene === 'challenge' && (
                  <div className="border border-[#34535a] bg-[#091b1f] p-4 md:p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">Challenge</div>
                    <div className="mt-3 text-xl font-editorial italic leading-relaxed text-[#f2ece3]">
                      {episode.challenge_terminal.prompt}
                    </div>
                    <textarea
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder={episode.challenge_terminal.placeholder}
                      className="mt-4 min-h-32 w-full border border-[#34535a] bg-[#0b2025] p-4 font-mono text-xs leading-relaxed text-[#dce7e8] outline-none focus-border-brand-teal"
                    />
                    <div className="mt-3 text-xs leading-relaxed text-[#9fb3b7]">
                      This is a judgment prompt, not a quiz. Use your own role, team, or transition goal in the response.
                    </div>
                  </div>
                )}

                {scene === 'reward' && (
                  <div className="border border-[#28474f] bg-[#0b1f24] p-4 md:p-5 text-[#e7efef]">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">Resolution</div>
                    <div className="mt-3 text-2xl font-editorial italic leading-relaxed">{episode.cliffhanger}</div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => setScene('hook')}
                    className="text-[10px] uppercase tracking-[0.22em] text-[#a7b8bb] hover:text-white"
                  >
                    Restart
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const currentIndex = sceneSteps.findIndex((step) => step.id === scene);
                        if (currentIndex > 0) setScene(sceneSteps[currentIndex - 1].id);
                      }}
                      disabled={scene === 'hook'}
                      className="text-[10px] uppercase tracking-[0.22em] text-[#a7b8bb] disabled:opacity-30"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      disabled={scene === 'reward' || (scene === 'challenge' && !terminalInput.trim())}
                      className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-40"
                    >
                      {scene === 'reward' ? 'Complete' : scene === 'challenge' ? 'Continue' : 'Next beat'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="border border-black/10 bg-white p-5 md:p-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Context overlay</div>
              <div className="mt-3 text-2xl font-editorial italic leading-none">{activeBeat?.label ?? 'Beat'}</div>
              <div className="mt-4 text-sm leading-relaxed text-gray-700">{activeBeat?.aside}</div>
            </section>
            <section className="border border-black/10 bg-white p-5 md:p-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Next beat</div>
              <div className="mt-3 text-lg font-editorial italic leading-tight">
                {nextBeat?.title ?? 'You are at the resolution.'}
              </div>
              <div className="mt-3 text-sm leading-relaxed text-gray-600">
                {nextBeat?.body ?? 'Move into your plan or next episode to continue the arc.'}
              </div>
            </section>
            {!isFreeTier && activeMedia && (
              <section className="border border-black/10 bg-white p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Scene companion</div>
                <div className="mt-3 text-lg font-editorial italic leading-tight">
                  {activeMedia.title || 'Related scene'}
                </div>
                {activeMedia.subtitle && (
                  <div className="mt-3 text-sm leading-relaxed text-gray-600">{activeMedia.subtitle}</div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={jumpToMediaStage}
                    className="px-3 py-2 border border-black/10 text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
                  >
                    Return to stage
                  </button>
                  <a
                    href={activeMedia.open_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 border border-black/10 text-[10px] uppercase tracking-[0.22em] hover-border-brand-teal"
                  >
                    Open full scene
                  </a>
                </div>
              </section>
            )}
            {isFreeTier && (
              <section className="border border-black/10 bg-white p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Unlock next</div>
                <div className="mt-3 text-2xl font-editorial italic leading-none">Upgrade the journey.</div>
                <div className="mt-3 text-sm leading-relaxed text-gray-600">
                  Unlock personalized sequencing, narrated delivery, The Brief, Your Plan, and concierge support.
                </div>
                <button
                  type="button"
                  onClick={props.onOpenPlan}
                  className="mt-4 px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em]"
                >
                  View upgrade guide
                </button>
              </section>
            )}
          </aside>
        </section>
      )}

      {mode === 'operator' && !isFreeTier && (
        <div className="space-y-6">
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
                  <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Operator media rail</div>
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
                    <div ref={mediaStageRef} className="border border-[#29464d] bg-[#0d2227] p-3 md:p-4 space-y-3">
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
        </div>
      )}

      {isFreeTier && mode === 'client' && (
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
    </div>
  );
}

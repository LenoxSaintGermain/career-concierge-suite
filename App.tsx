import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { SUITE_MODULES } from './suite/modules';
import { BrandConfig, ClientDoc, ClientWiki, PublicConfig, SuiteModule, SuiteModuleId } from './types';
import { loginWithCustomSessionToken, subscribeToAuth, logout } from './services/authService';
import { getOrCreateClient, markIntroSeen } from './services/clientService';
import { getArtifact } from './services/artifactService';
import { IntakeFlow } from './components/IntakeFlow';
import { BriefView } from './components/BriefView';
import { PlanView } from './components/PlanView';
import { JsonDoc } from './components/JsonDoc';
import { ProfileView } from './components/ProfileView';
import { MissionControlView } from './components/MissionControlView';
import { GapsView } from './components/GapsView';
import { SuiteDistilledView } from './components/SuiteDistilledView';
import { ReadinessView } from './components/ReadinessView';
import { CjsExecutionView } from './components/CjsExecutionView';
import { BingeFeedView } from './components/BingeFeedView';
import { AdminConsole } from './components/AdminConsole';
import { RoadmapView } from './components/RoadmapView';
import { AssetsView } from './components/AssetsView';
import { MyConciergeView } from './components/MyConciergeView';
import { SkillSyncTvView } from './components/SkillSyncTvView';
import { FlashCardsView } from './components/FlashCardsView';
import { EventsNetworkingView } from './components/EventsNetworkingView';
import { TelescopeView } from './components/TelescopeView';
import { SkillSyncTeamView } from './components/SkillSyncTeamView';
import { AmbientGuide } from './components/AmbientGuide';
import { DonnaShell } from './components/DonnaShell';
import { canAccessAdminConfig, fetchPublicConfig } from './services/adminApi';
import { cloneBrandConfig, getBrandModuleCopy, hexToRgba } from './config/brandSystem.js';
import { DEFAULT_DONNA_CONFIG } from './config/donnaDefaults';
import { fetchClientWiki } from './services/wikiService';
import { fetchClientMemory } from './services/memoryService';

type FirstMomentState = 'prologue' | 'concierge_brief' | 'grid';

const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  ui: {
    show_prologue: true,
    episodes_enabled: true,
  },
  brand: cloneBrandConfig(),
  operations: {
    cjs_enabled: true,
  },
  professional_dna: {
    hero_video_url: '',
    hero_video_title: '',
    hero_autoplay_muted: true,
    hero_loop: true,
    hero_fallback_image_url: '',
    hero_visible: false,
    journey_guide_video_provider: 'youtube',
    journey_guide_video_id: '',
    journey_guide_video_url: '',
    journey_guide_video_title: '',
    voice_agent_enabled: true,
    voice_model: 'gemini_live',
    voice_transcription_visible: false,
    voice_to_form_autofill: true,
  },
  voice: {
    elevenlabs_enabled: false,
    elevenlabs_agent_id: '',
    active_panel: 'gemini_live',
    gemini_live_model: '',
  },
  donna: DEFAULT_DONNA_CONFIG,
};

const headerScaleClass = {
  compact: 'text-xl md:text-2xl',
  standard: 'text-2xl md:text-3xl',
  hero: 'text-3xl md:text-4xl',
};

const subheaderScaleClass = {
  tight: 'text-[9px] tracking-[0.18em]',
  standard: 'text-[10px] tracking-[0.24em]',
  airy: 'text-[10px] tracking-[0.32em]',
};

const bodyDensityClass = {
  tight: 'text-xs leading-5',
  standard: 'text-sm leading-6',
  relaxed: 'text-base leading-7',
};

const tileTitleClass = {
  index: 'text-base md:text-lg font-editorial leading-tight',
  balanced: 'text-lg font-editorial leading-tight',
  title: 'text-xl font-editorial leading-tight',
};

const tileIndexClass = {
  index: 'text-sm opacity-55',
  balanced: 'text-xs opacity-30',
  title: 'text-[10px] opacity-20',
};

type JourneyActId = 'act_1' | 'act_2' | 'act_3' | 'act_4';

const JOURNEY_GUIDE_STORAGE_KEY = 'career_concierge_journey_guide_dismissed';
const JOURNEY_GUIDE_VISITS_STORAGE_KEY = 'career_concierge_journey_guide_visits';

const JOURNEY_ACTS: Array<{
  id: JourneyActId;
  label: string;
  title: string;
  accent: string;
  moduleIds: SuiteModuleId[];
}> = [
  {
    id: 'act_1',
    label: 'Act I',
    title: 'Establish Your Signal',
    accent: '#63CDB7',
    moduleIds: ['intake', 'brief', 'profile', 'ai_profile'],
  },
  {
    id: 'act_2',
    label: 'Act II',
    title: 'Read The Intelligence',
    accent: '#63CDB7',
    moduleIds: ['brief', 'suite_distilled', 'gaps', 'readiness'],
  },
  {
    id: 'act_3',
    label: 'Act III',
    title: 'Build The Momentum',
    accent: '#D19A47',
    moduleIds: ['plan', 'cjs_execution', 'my_concierge', 'telescope'],
  },
  {
    id: 'act_4',
    label: 'Act IV',
    title: 'Stay Sharp',
    accent: '#63CDB7',
    moduleIds: ['episodes', 'tv', 'flash_cards', 'events', 'team'],
  },
];

const toText = (value: unknown) => String(value ?? '').trim();

const deriveDisplayNameFromEmail = (email: string) => {
  const localPart = toText(email).split('@')[0] || '';
  const cleaned = localPart.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const getAccountLabel = (client: ClientDoc | null, user: User | null) =>
  toText(client?.display_name) ||
  toText(client?.demo_profile?.name) ||
  toText(user?.displayName) ||
  deriveDisplayNameFromEmail(toText(user?.email)) ||
  toText(user?.email) ||
  'Signed in';

const getClientFirstName = (client: ClientDoc | null, user: User | null) => {
  const display = toText(client?.display_name) || toText(client?.demo_profile?.name);
  if (display) return display.split(/\s+/)[0];
  const intakeName = toText(client?.intake?.answers?.name);
  if (intakeName) return intakeName.split(/\s+/)[0];
  return 'you';
};

const getClientTargetRole = (client: ClientDoc | null) => {
  const answers = client?.intake?.answers ?? {};
  return (
    toText(answers.target) ||
    toText(answers.current_or_target_job_title) ||
    toText(answers.current_title) ||
    'your next move'
  );
};

const getClientFocusLabel = (client: ClientDoc | null) => {
  const focus = toText(client?.preferences?.focus);
  if (focus === 'job_search') return 'market movement';
  if (focus === 'leadership') return 'leadership leverage';
  return 'working signal';
};

const hasPlayableDirectVideo = (url: string) => /\.(mp4|webm|ogg)(\?|$)/i.test(url);

const toSeed = (value: string) =>
  value.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);

const parseYouTubeId = (input: string) => {
  const value = toText(input);
  if (!value) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.replace(/\//g, '');
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
};

const parseVimeoId = (input: string) => {
  const value = toText(input);
  if (!value) return '';
  if (/^\d+$/.test(value)) return value;
  try {
    const url = new URL(value);
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.pop() || '';
  } catch {
    return '';
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [launchBootstrapPending, setLaunchBootstrapPending] = useState(false);
  const [launchBootstrapError, setLaunchBootstrapError] = useState<string | null>(null);

  const [clientLoaded, setClientLoaded] = useState(false);
  const [client, setClient] = useState<ClientDoc | null>(null);
  const [wiki, setWiki] = useState<ClientWiki | null>(null);
  const [memory, setMemory] = useState<import('./types').ClientMemory | null>(null);
  const [firstMoment, setFirstMoment] = useState<FirstMomentState>('grid');

  const [openModuleId, setOpenModuleId] = useState<SuiteModuleId | null>(null);
  const [hoveredModuleId, setHoveredModuleId] = useState<SuiteModuleId | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [publicConfig, setPublicConfig] = useState<PublicConfig>(DEFAULT_PUBLIC_CONFIG);
  const brand = useMemo<BrandConfig>(() => publicConfig.brand || cloneBrandConfig(), [publicConfig.brand]);

  const refreshPublicConfig = async () => {
    try {
      const config = await fetchPublicConfig();
      setPublicConfig(config);
    } catch {
      setPublicConfig(DEFAULT_PUBLIC_CONFIG);
    }
  };

  // Artifact cache for the currently-open module.
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<any>(null);

  const modalScrollRef = useRef<HTMLDivElement>(null);
  const launchQueryHandledRef = useRef(false);
  const [shellScrollDepth, setShellScrollDepth] = useState(0);
  const [journeyGuideOpen, setJourneyGuideOpen] = useState(false);
  const [journeyGuideDismissed, setJourneyGuideDismissed] = useState(false);
  const [activeJourneyAct, setActiveJourneyAct] = useState<JourneyActId>('act_1');
  const [journeyGuideVisits, setJourneyGuideVisits] = useState(0);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auth subscription
  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    refreshPublicConfig();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setShellScrollDepth(window.scrollY || 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setJourneyGuideDismissed(window.localStorage.getItem(JOURNEY_GUIDE_STORAGE_KEY) === 'true');
    setJourneyGuideVisits(Number(window.localStorage.getItem(JOURNEY_GUIDE_VISITS_STORAGE_KEY) || 0) || 0);
  }, []);

  useEffect(() => {
    if (!journeyGuideDismissed || typeof window === 'undefined') return;
    window.localStorage.setItem(JOURNEY_GUIDE_STORAGE_KEY, 'true');
  }, [journeyGuideDismissed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(JOURNEY_GUIDE_VISITS_STORAGE_KEY, String(journeyGuideVisits));
  }, [journeyGuideVisits]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const demoToken = params.get('demo_launch_token');
    if (!demoToken) return;

    let cancelled = false;
    setLaunchBootstrapPending(true);
    setLaunchBootstrapError(null);

    (async () => {
      try {
        await loginWithCustomSessionToken(demoToken);
        params.delete('demo_launch_token');
        params.delete('demo_persona');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      } catch (error: any) {
        if (!cancelled) {
          setLaunchBootstrapError(error?.message ?? 'Unable to launch sample persona.');
        }
      } finally {
        if (!cancelled) {
          setLaunchBootstrapPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-teal', brand.colors.accent);
    root.style.setProperty('--brand-teal-dark', brand.colors.accent_dark);
    root.style.setProperty('--brand-teal-soft', hexToRgba(brand.colors.accent, 0.14));
    root.style.setProperty('--brand-ink', brand.colors.ink);
    root.style.setProperty('--brand-page', brand.colors.page_background);
    root.style.setProperty('--brand-surface', brand.colors.surface_background);
    root.style.setProperty('--brand-grid', brand.colors.grid_line);
    root.style.setProperty('--brand-overlay', brand.colors.overlay_background);
    root.style.setProperty('--brand-overlay-text', brand.colors.overlay_text);
  }, [brand]);

  // Load/Create client record and decide whether to play intro.
  useEffect(() => {
    const run = async () => {
      if (!user) {
        setClientLoaded(false);
        setClient(null);
        setWiki(null);
        setFirstMoment('grid');
        setIsAdminUser(false);
        return;
      }
      const client = await getOrCreateClient(user.uid, {
        email: user.email,
        displayName: user.displayName,
      });
      setClient(client);
      setClientLoaded(true);
      fetchClientWiki()
        .then((nextWiki) => setWiki(nextWiki))
        .catch(() => {});
      fetchClientMemory()
        .then((nextMemory) => setMemory(nextMemory))
        .catch(() => {});
      if (!client.intro_seen_at) setFirstMoment('prologue');
      const adminAccess = await canAccessAdminConfig();
      setIsAdminUser(adminAccess);
    };
    run();
  }, [user]);

  const intakeComplete = useMemo(() => {
    return Boolean(client?.intake?.completed_at);
  }, [client?.intake?.completed_at]);

  const clientTier = useMemo(
    () => String(client?.demo_profile?.tier || client?.account?.tier || '').toLowerCase(),
    [client]
  );
  const isFreeTier = clientTier === 'free_foundation_access';

  const visibleModules = useMemo(
    () =>
      SUITE_MODULES.filter((m) => {
        if (!publicConfig.ui.episodes_enabled && m.id === 'episodes') return false;
        if (!publicConfig.operations.cjs_enabled && m.id === 'cjs_execution') return false;
        if (m.id === 'roadmap' && !isAdminUser) return false;
        if (isFreeTier && !['intake', 'episodes', 'tv', 'readiness', 'team'].includes(m.id)) return false;
        return true;
      }).sort((a, b) => Number(a.index) - Number(b.index)),
    [publicConfig.ui.episodes_enabled, publicConfig.operations.cjs_enabled, isAdminUser, isFreeTier]
  );

  const openModule = useMemo(
    () => (openModuleId ? visibleModules.find((m) => m.id === openModuleId) ?? null : null),
    [openModuleId, visibleModules]
  );
  const displayedOpenModule = useMemo(
    () => (openModule ? getBrandModuleCopy(brand, openModule.id) : null),
    [brand, openModule]
  );
  const accountLabel = useMemo(() => getAccountLabel(client, user), [client, user]);
  const shellHeaderDimmed = openModuleId !== null || shellScrollDepth > 56;

  const isLocked = (m: SuiteModule) => {
    if (m.id === 'intake') return true;
    if (m.id === 'roadmap') return false;
    if (isFreeTier && m.id === 'readiness') return !intakeComplete;
    return !intakeComplete;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !authReady || !clientLoaded || launchQueryHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const requestedModule = params.get('module') as SuiteModuleId | null;
    if (!requestedModule) return;
    launchQueryHandledRef.current = true;
    const moduleExists = visibleModules.some((module) => module.id === requestedModule);
    if (moduleExists) {
      setOpenModuleId(requestedModule);
    }
    params.delete('module');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [authReady, clientLoaded, visibleModules]);

  // Load artifacts on module open.
  useEffect(() => {
    const run = async () => {
      setArtifact(null);
      setArtifactError(null);
      setArtifactLoading(false);
      if (!user || !openModule) return;

      if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;

      if (openModule.id === 'intake') return;
      if (isLocked(openModule)) {
        // We still allow open; content will show a lock message.
        return;
      }

      const loadArtifactType =
        openModule.id === 'flash_cards'
          ? 'plan'
          : openModule.id === 'brief' ||
              openModule.id === 'suite_distilled' ||
              openModule.id === 'plan' ||
              openModule.id === 'profile' ||
              openModule.id === 'ai_profile' ||
              openModule.id === 'gaps' ||
              openModule.id === 'readiness' ||
              openModule.id === 'cjs_execution'
            ? openModule.id
            : null;
      if (!loadArtifactType) return;

      setArtifactLoading(true);
      try {
        const a = await getArtifact(user.uid, loadArtifactType as any);
        setArtifact(a);
      } catch (e: any) {
        setArtifactError(e?.message ?? 'Unable to load.');
      } finally {
        setArtifactLoading(false);
      }
    };
    run();
  }, [user, openModuleId]);

  const handleIntroComplete = async () => {
    if (user) {
      try {
        await markIntroSeen(user.uid);
      } catch {
        // Non-blocking; intro is UX sugar.
      }
    }
    setFirstMoment('grid');
  };

  const handleModuleClick = (e: React.MouseEvent, module: SuiteModule) => {
    e.stopPropagation();

    // Mobile: 1st tap focuses, 2nd tap opens.
    if (isMobile) {
      if (hoveredModuleId === module.id) {
        setArtifact(null);
        setArtifactError(null);
        setArtifactLoading(false);
        setOpenModuleId(module.id);
      } else {
        setHoveredModuleId(module.id);
      }
      return;
    }

    setArtifact(null);
    setArtifactError(null);
    setArtifactLoading(false);
    setOpenModuleId(module.id);
  };

  const handleCloseModal = () => setOpenModuleId(null);

  const openModuleById = (id: SuiteModuleId) => {
    setArtifact(null);
    setArtifactError(null);
    setArtifactLoading(false);
    setOpenModuleId(id);
  };

  const openJourneyGuide = () => {
    setJourneyGuideOpen(true);
    setJourneyGuideVisits((current) => current + 1);
  };

  const closeJourneyGuide = () => {
    setJourneyGuideOpen(false);
    setJourneyGuideDismissed(true);
  };

  if (!authReady || launchBootstrapPending) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center"
        style={{ backgroundColor: brand.colors.overlay_background, color: brand.colors.overlay_text }}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-50 animate-pulse">
          {launchBootstrapPending ? 'Opening sample persona…' : 'Initializing…'}
        </div>
      </div>
    );
  }

  // Prologue overlay (plays once per user; stored in Firestore).
  const showPrologue = publicConfig.ui.show_prologue && firstMoment === 'prologue' && clientLoaded;
  // Relationship highlighting
  const hovered = hoveredModuleId ? visibleModules.find((m) => m.id === hoveredModuleId) ?? null : null;
  const journeyFirstName = getClientFirstName(client, user);
  const journeyTargetRole = getClientTargetRole(client);
  const journeyFocusLabel = getClientFocusLabel(client);
  const journeyGuestLabel = journeyFirstName === 'you' ? 'you' : journeyFirstName;
  const journeyTargetPhrase = journeyTargetRole === 'your next move' ? 'your next move' : journeyTargetRole;
  const journeySeed = Math.abs(toSeed(`${client?.uid || user?.uid || 'guest'}|${journeyTargetPhrase}|${journeyFocusLabel}`));
  const journeyVoiceIndex = (journeySeed + journeyGuideVisits) % 3;
  const journeyOverlayTitle = [
    'Read the suite as a living brief, not a menu.',
    'Your suite, framed before it starts speaking back.',
    'A concierge briefing for how this system is meant to move with you.',
  ][journeyVoiceIndex];
  const journeyInvite = (
    journeyGuideDismissed
      ? [
          'Return to the journey overview.',
          'Pick back up where the concierge left the briefing.',
          'Reopen the suite briefing and reorient the next move.',
        ]
      : [
          `See how this suite is staged for ${journeyTargetPhrase}.`,
          `Understand how the suite is being built around ${journeyTargetPhrase}.`,
          'Let the concierge frame the journey before you dive into modules.',
        ]
  )[journeyVoiceIndex];
  const journeyTopline = intakeComplete
    ? `The dossier already has signal on ${journeyTargetPhrase}. This guide shows how the suite turns that signal into interpretation, movement, and reinforcement.`
    : `This guide shows how the suite uses one strong intake to calibrate your dossier, your ${journeyFocusLabel}, and the story around ${journeyTargetPhrase}.`;
  const journeyMetaLabel = intakeComplete ? 'Dossier in motion' : 'Pre-brief alignment';
  const journeyWarmAccent = '#A07A55';
  const journeyGuideHintMessage = intakeComplete
    ? 'Reopen the suite briefing at any time. It highlights the modules that matter for the current act and keeps the orientation personal to the dossier on file.'
    : 'Open the suite briefing to see the four-act arc, the modules it activates, and the concierge context that shapes the first move.';
  const visibleModuleIds = new Set(visibleModules.map((module) => module.id));
  const journeyGuideVideoProvider = publicConfig.professional_dna.journey_guide_video_provider || 'youtube';
  const journeyGuideVideoId = toText(publicConfig.professional_dna.journey_guide_video_id);
  const journeyGuideVideoUrl =
    toText(publicConfig.professional_dna.journey_guide_video_url) ||
    toText(publicConfig.professional_dna.hero_video_url);
  const journeyGuideVideoTitle =
    toText(publicConfig.professional_dna.journey_guide_video_title) ||
    toText(publicConfig.professional_dna.hero_video_title) ||
    'How the suite works for you';
  const journeyGuideFallbackImage = toText(publicConfig.professional_dna.hero_fallback_image_url);
  const journeyGuideMedia = (() => {
    if (journeyGuideVideoProvider === 'youtube') {
      const id = journeyGuideVideoId || parseYouTubeId(journeyGuideVideoUrl);
      if (id) {
        return {
          kind: 'embed' as const,
          src: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`,
          title: journeyGuideVideoTitle,
          providerLabel: 'YouTube briefing',
        };
      }
    }
    if (journeyGuideVideoProvider === 'vimeo') {
      const id = journeyGuideVideoId || parseVimeoId(journeyGuideVideoUrl);
      if (id) {
        return {
          kind: 'embed' as const,
          src: `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`,
          title: journeyGuideVideoTitle,
          providerLabel: 'Vimeo briefing',
        };
      }
    }
    if (journeyGuideVideoProvider === 'direct' && journeyGuideVideoUrl) {
      return {
        kind: hasPlayableDirectVideo(journeyGuideVideoUrl) ? ('direct' as const) : ('embed' as const),
        src: journeyGuideVideoUrl,
        title: journeyGuideVideoTitle,
        providerLabel: 'Direct briefing',
      };
    }
    const youtubeId = parseYouTubeId(journeyGuideVideoUrl);
    if (youtubeId) {
      return {
        kind: 'embed' as const,
        src: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`,
        title: journeyGuideVideoTitle,
        providerLabel: 'YouTube briefing',
      };
    }
    const vimeoId = parseVimeoId(journeyGuideVideoUrl);
    if (vimeoId) {
      return {
        kind: 'embed' as const,
        src: `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`,
        title: journeyGuideVideoTitle,
        providerLabel: 'Vimeo briefing',
      };
    }
    if (journeyGuideVideoUrl && hasPlayableDirectVideo(journeyGuideVideoUrl)) {
      return {
        kind: 'direct' as const,
        src: journeyGuideVideoUrl,
        title: journeyGuideVideoTitle,
        providerLabel: 'Direct briefing',
      };
    }
    return null;
  })();
  const journeyActs = JOURNEY_ACTS.map((act) => {
    const visibleActModules = act.moduleIds.filter((id) => visibleModuleIds.has(id));
    const activationTitles = visibleActModules.map((id) => ({
      id,
      title: getBrandModuleCopy(brand, id).title,
    }));

    if (act.id === 'act_1') {
      const variants = [
        {
          headline: `Before the suite can move, it needs a clean read on ${journeyGuestLabel}.`,
          body: `Module 01 is the doorway. A short concierge intake calibrates your dossier, your ${journeyFocusLabel}, and how ${journeyTargetPhrase} should be framed before the rest of the suite starts speaking back.`,
        },
        {
          headline: 'The first act is calibration, not administration.',
          body: `This is where the suite stops being generic. Intake turns your context, proof, and ambition into a briefing the rest of the system can actually use around ${journeyTargetPhrase}.`,
        },
        {
          headline: `The suite only becomes intelligent after it understands ${journeyGuestLabel}.`,
          body: `One serious intake gives the Brief, Profile, and Plan the signal they need to interpret your next move with more precision than a static onboarding form ever could.`,
        },
      ];
      const variant = variants[(journeySeed + journeyGuideVisits) % variants.length];
      return {
        ...act,
        headline: variant.headline,
        body: variant.body,
        ctaLabel: intakeComplete ? 'Open The Brief' : 'Begin With Intake',
        ctaModule: intakeComplete ? ('brief' as SuiteModuleId) : ('intake' as SuiteModuleId),
        activationTitles,
      };
    }
    if (act.id === 'act_2') {
      const variants = [
        {
          headline: 'The Brief is your market position, stated cleanly.',
          body: `This act reads the dossier back to you in plain language: what the market is likely to reward, what is suppressing the ask, and where ${journeyTargetPhrase} becomes more or less credible.`,
        },
        {
          headline: 'This is where the suite starts behaving like intelligence.',
          body: `The Brief, Profile, and distilled read turn raw context into a strategic interpretation layer before you make decisions or push for a bigger move.`,
        },
        {
          headline: 'Act II is interpretation before execution.',
          body: `You are not asked to move blind. This layer tells you what the dossier sees, what the market is signaling, and what needs to be true before the next ask lands well.`,
        },
      ];
      const variant = variants[(journeySeed + journeyGuideVisits + 1) % variants.length];
      return {
        ...act,
        headline: variant.headline,
        body: variant.body,
        ctaLabel: 'Next Act',
        ctaModule: 'plan' as SuiteModuleId,
        activationTitles,
      };
    }
    if (act.id === 'act_3') {
      const variants = [
        {
          headline: 'Your Plan is the executable layer. Everything else feeds it.',
          body: `This is where the suite turns interpretation into movement. The Brief gives the strategy; this act turns it into a controlled action path for ${journeyTargetPhrase}.`,
        },
        {
          headline: 'Act III is where signal becomes momentum.',
          body: `Once the suite understands what matters, it starts routing the next actions, concierge guidance, and execution surfaces that move the ask forward.`,
        },
        {
          headline: 'The middle of the suite is built for controlled movement.',
          body: `Plan, concierge execution, and the horizon tools exist to keep ${journeyTargetPhrase} moving with structure instead of spraying effort across too many fronts.`,
        },
      ];
      const variant = variants[(journeySeed + journeyGuideVisits + 2) % variants.length];
      return {
        ...act,
        headline: variant.headline,
        body: variant.body,
        ctaLabel: 'Next Act',
        ctaModule: 'plan' as SuiteModuleId,
        activationTitles,
      };
    }
    const variants = [
      {
        headline: 'The suite learns as you move. Keep it current.',
        body: 'Episodes, TV, flash cards, events, and the team layer are the reinforcement environment. This act keeps the suite current as your profile evolves instead of freezing after one good session.',
      },
      {
        headline: 'Act IV keeps the suite sharp after the first breakthrough.',
        body: `The reinforcement layer prevents drift. It helps the system keep teaching, refreshing, and supporting the version of ${journeyTargetPhrase} you are growing into.`,
      },
      {
        headline: 'The last act is retention, not decoration.',
        body: `Learning rails, flash cards, events, and support keep the dossier alive so the next phase of work compounds instead of fading after the plan is written.`,
      },
    ];
    const variant = variants[(journeySeed + journeyGuideVisits + 3) % variants.length];
    return {
      ...act,
      headline: variant.headline,
      body: variant.body,
      ctaLabel: intakeComplete ? 'Return To The Brief' : 'Begin With Intake',
      ctaModule: intakeComplete ? ('brief' as SuiteModuleId) : ('intake' as SuiteModuleId),
      activationTitles,
    };
  });
  const activeJourney = journeyActs.find((act) => act.id === activeJourneyAct) ?? journeyActs[0];
  const journeyActIndex = Math.max(0, journeyActs.findIndex((act) => act.id === activeJourney.id));
  const journeyModuleToAct = new Map<SuiteModuleId, JourneyActId>();
  journeyActs.forEach((act) => {
    act.moduleIds.forEach((id) => journeyModuleToAct.set(id, act.id));
  });

  const renderSuiteContent = () => {
    if (!user) {
      return (
        <div
          className="min-h-screen overflow-hidden"
          style={{ backgroundColor: brand.colors.page_background, color: brand.colors.ink }}
        >
          <div className="flex min-h-screen items-center justify-center px-6 py-16">
            <div className="max-w-2xl border border-black/10 bg-[#FBF8F2] px-10 py-10 text-center shadow-[0_24px_48px_-36px_rgba(0,0,0,0.22)]">
              <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: brand.colors.accent_dark }}>
                Career Concierge OS
              </div>
              <h2 className="mt-3 text-4xl font-editorial italic leading-tight">
                The suite is here when Donna decides you need it.
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/60">
                The visible operating system stays available, but the primary experience now begins in the guided concierge line.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen overflow-hidden"
        style={{ backgroundColor: brand.colors.page_background, color: brand.colors.ink }}
      >
      {showPrologue && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ backgroundColor: brand.colors.overlay_background, color: brand.colors.overlay_text }}
        >
          <div className="max-w-3xl text-center space-y-10">
            {brand.toggles.show_logo_mark && brand.identity.logo_url && (
              <img src={brand.identity.logo_url} alt={brand.identity.logo_alt} className="mx-auto h-16 w-auto object-contain" />
            )}
            <h1 className={`font-editorial italic leading-tight ${headerScaleClass[brand.hierarchy.header_scale]}`}>
              "{brand.copy.prologue_quote}"
            </h1>
            <p className={`max-w-2xl mx-auto ${bodyDensityClass[brand.hierarchy.body_density]}`} style={{ color: hexToRgba(brand.colors.overlay_text, 0.74) }}>
              {brand.copy.prologue_description}
            </p>
            <div className="inline-block border-t border-b py-4 px-10" style={{ borderColor: hexToRgba(brand.colors.overlay_text, 0.2) }}>
              <div className={`font-bold uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.overlay_text }}>
                {brand.identity.suite_name}
              </div>
            </div>
          </div>

          <div className="fixed bottom-8 right-8">
            <button
              onClick={handleIntroComplete}
              className="text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 group"
              style={{ color: hexToRgba(brand.colors.overlay_text, 0.38) }}
            >
              <span>{brand.copy.prologue_enter_label}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">-&gt;</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className={`fixed top-0 left-0 z-10 flex w-full items-center justify-between px-4 py-4 transition-all duration-500 sm:px-5 sm:py-5 ${
          shellHeaderDimmed ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
        style={{
          backdropFilter: shellHeaderDimmed ? 'blur(0px)' : 'blur(2px)',
        }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {brand.toggles.show_logo_mark && brand.identity.logo_url && (
              <img src={brand.identity.logo_url} alt={brand.identity.logo_alt} className="h-10 w-auto object-contain" />
            )}
            <div>
              <div className={`font-bold uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`}>
                {brand.identity.suite_name}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-45">{brand.identity.header_context}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest opacity-40 hidden sm:inline">{accountLabel}</span>
          <button
            onClick={() => {
              if (!isAdminUser) return;
              setAdminOpen(true);
            }}
            disabled={!isAdminUser}
            title={
              isAdminUser
                ? 'Open admin console'
                : 'Admin access is locked for this account. Access requires admin/staff claims or an allowlisted email.'
            }
            className={`text-[10px] uppercase tracking-widest border px-3 py-2 transition-colors ${
              isAdminUser
                ? 'border-black/15 bg-white/60 hover-border-brand-teal hover-text-brand-teal'
                : 'border-amber-500/35 bg-amber-50 text-amber-700 cursor-not-allowed'
            }`}
          >
            {isAdminUser ? 'Admin' : 'Admin Locked'}
          </button>
          <button
            onClick={() => logout()}
            className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Suite Home */}
      <main
        className={`min-h-screen px-4 pb-14 pt-18 transition-all dur-md ease-standard sm:px-5 sm:pb-18 sm:pt-20 ${
          openModuleId ? 'opacity-20 blur-sm scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
        onClick={() => isMobile && setHoveredModuleId(null)}
        onMouseLeave={() => !isMobile && setHoveredModuleId(null)}
      >
        <div className="relative mx-auto max-w-[1360px]">
          {brand.toggles.show_grid_glow && (
            <>
              <div
                className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full"
                style={{ background: `radial-gradient(circle at center, ${hexToRgba(brand.colors.accent_dark, 0.16)}, transparent 62%)` }}
              />
              <div
                className="pointer-events-none absolute top-20 -left-24 h-48 w-48 rounded-full"
                style={{ background: `radial-gradient(circle at center, ${hexToRgba(brand.colors.accent_dark, 0.09)}, transparent 68%)` }}
              />
            </>
          )}
          <div className="mb-8">
            {isFreeTier && (
              <div
                className="mb-4 px-4 py-3 text-xs text-black/70 max-w-2xl border"
                style={{ borderColor: hexToRgba(brand.colors.accent_dark, 0.28), backgroundColor: hexToRgba(brand.colors.accent, 0.12) }}
              >
                {brand.copy.free_tier_notice}
              </div>
            )}

            {journeyGuideOpen && (
              <section
                className="mt-4 overflow-hidden border shadow-[0_28px_60px_-44px_rgba(0,0,0,0.28)]"
                style={{
                  borderColor: hexToRgba(brand.colors.ink, 0.1),
                  background:
                    'radial-gradient(circle at top right, rgba(99,205,183,0.09), transparent 24%), linear-gradient(180deg, #fcfaf5 0%, #f3eee3 100%)',
                }}
              >
                <div
                  className="flex flex-wrap items-start justify-between gap-4 border-b px-4 py-3.5 md:px-5 md:py-4"
                  style={{ borderColor: hexToRgba(brand.colors.ink, 0.1) }}
                >
                  <div className="max-w-3xl">
                    <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: brand.colors.accent_dark }}>
                      • Your Journey Guide
                    </div>
                    <div className="mt-2 text-xl leading-tight text-[#171412] font-editorial md:text-[28px]">
                      {journeyOverlayTitle}
                    </div>
                    <div className="mt-2 max-w-2xl text-sm leading-6 text-black/62">{journeyTopline}</div>
                  </div>
                  <button
                    type="button"
                    onClick={closeJourneyGuide}
                    className="text-[10px] uppercase tracking-[0.22em] text-black/48 transition-opacity hover:opacity-70"
                  >
                    Close ×
                  </button>
                </div>

                <div className="grid border-b md:grid-cols-[172px_minmax(0,1fr)]" style={{ borderColor: hexToRgba(brand.colors.ink, 0.1) }}>
                  <aside className="border-r px-3 py-4 md:py-5" style={{ borderColor: hexToRgba(brand.colors.ink, 0.1) }}>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-black/36">The Arc</div>
                    <div className="mt-4 space-y-1.5">
                      {journeyActs.map((act) => {
                        const isActive = act.id === activeJourney.id;
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => setActiveJourneyAct(act.id)}
                            className="w-full border-l-[3px] px-3 py-3 text-left transition-colors hover:bg-white/70"
                            style={{
                              borderTopColor: hexToRgba(brand.colors.ink, 0.08),
                              borderRightColor: hexToRgba(brand.colors.ink, 0.08),
                              borderBottomColor: hexToRgba(brand.colors.ink, 0.08),
                              borderLeftColor: isActive ? act.accent : 'transparent',
                              backgroundColor: isActive ? hexToRgba(act.accent, 0.12) : 'rgba(255,255,255,0.28)',
                            }}
                          >
                            <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: isActive ? act.accent : 'rgba(23,20,18,0.42)' }}>
                              {act.label}
                            </div>
                            <div className="mt-1.5 text-[20px] leading-[0.96] text-[#171412] font-editorial md:text-[22px]">
                              {act.title}
                            </div>
                            <div className="mt-2 text-[9px] uppercase tracking-[0.18em]" style={{ color: isActive ? hexToRgba(act.accent, 0.72) : 'rgba(23,20,18,0.24)' }}>
                              {act.activationTitles.map((item) => visibleModules.find((module) => module.id === item.id)?.index).filter(Boolean).join(' ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className="mt-5 border-t pt-5 text-[10px] uppercase tracking-[0.2em] text-black/34"
                      style={{ borderColor: hexToRgba(brand.colors.ink, 0.08) }}
                    >
                      Hover any tile below to see where it belongs in the briefing.
                    </div>
                  </aside>

                  <div className="border-l" style={{ borderColor: hexToRgba(brand.colors.ink, 0.1) }}>
                    <div className="px-5 py-4 md:px-6 md:py-5">
                      <div>
                        <div
                          className="w-full overflow-hidden border bg-white/72 shadow-[0_18px_48px_-40px_rgba(40,33,30,0.24)]"
                          style={{ borderColor: hexToRgba(brand.colors.ink, 0.08) }}
                        >
                          <div className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: hexToRgba(brand.colors.ink, 0.08) }}>
                            <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: brand.colors.accent_dark }}>
                              Journey briefing
                            </div>
                            <div
                              className="text-[10px] uppercase tracking-[0.2em]"
                              style={{ color: hexToRgba(journeyWarmAccent, 0.84) }}
                            >
                              {journeyGuideMedia ? 'Configured briefing' : 'Fallback stage'}
                            </div>
                          </div>
                          <div className="overflow-hidden bg-[#efe8dc]">
                            {journeyGuideMedia ? (
                              <div className="aspect-video bg-[#ece5d8]">
                                {journeyGuideMedia.kind === 'direct' ? (
                                  <video
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-cover"
                                    src={journeyGuideMedia.src}
                                  />
                                ) : (
                                  <iframe
                                    src={journeyGuideMedia.src}
                                    title={journeyGuideMedia.title}
                                    className="h-full w-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                  />
                                )}
                              </div>
                            ) : (
                              <div
                                className="relative aspect-video overflow-hidden"
                                style={
                                  journeyGuideFallbackImage
                                    ? {
                                        backgroundImage: `linear-gradient(180deg, rgba(244,241,232,0.24) 0%, rgba(237,231,219,0.82) 100%), url(${journeyGuideFallbackImage})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                      }
                                    : {
                                        background:
                                          'radial-gradient(circle at top, rgba(99,205,183,0.12), transparent 42%), linear-gradient(180deg, #f6f2e9 0%, #e7dece 100%)',
                                      }
                                }
                              >
                                <div className="absolute right-4 top-4 text-[10px] uppercase tracking-[0.18em] text-black/32">
                                  2:14
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div
                                    className="flex h-16 w-16 items-center justify-center border bg-white/78 text-2xl text-[#171412] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)]"
                                    style={{ borderColor: hexToRgba(brand.colors.ink, 0.12) }}
                                  >
                                    ▶
                                  </div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(239,232,220,0)_0%,rgba(230,221,208,0.72)_45%,rgba(214,203,188,0.96)_100%)] p-6">
                                  <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">
                                    Global default briefing
                                  </div>
                                  <div className="mt-2 text-[38px] font-editorial leading-[0.94] text-[#171412]">
                                    {journeyGuideVideoTitle}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="bg-[#faf7f0] px-4 py-4">
                            <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: brand.colors.accent_dark }}>
                              {journeyGuideVideoTitle}
                            </div>
                            <div className="mt-2 max-w-[620px] text-sm leading-7 text-black/64">
                              This briefing stays globally configured for new clients, then reads differently as the suite learns more about {journeyTargetPhrase}.
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_240px]">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: activeJourney.accent }}>
                              {activeJourney.label} • {journeyMetaLabel}
                            </div>
                            <div className="mt-3 max-w-[760px] text-4xl leading-[0.96] text-[#171412] font-editorial md:text-5xl">
                              {activeJourney.headline}
                            </div>
                            <div className="mt-4 max-w-[700px] text-base leading-8 text-black/66 md:text-lg">{activeJourney.body}</div>
                            <div
                              className="mt-4 max-w-[700px] border-l-[3px] bg-[#efe5d7]/55 px-4 py-3 text-sm italic leading-7"
                              style={{ borderColor: journeyWarmAccent, color: hexToRgba(journeyWarmAccent, 0.92) }}
                            >
                              {intakeComplete
                                ? `The suite is currently shaping this act around ${journeyTargetPhrase} and the signal already present in your dossier.`
                                : `Right now the suite still needs a stronger first read before it can shape the downstream modules around ${journeyTargetPhrase}.`}
                            </div>
                          </div>

                          <aside>
                            <div className="border bg-white/62 px-4 py-4" style={{ borderColor: hexToRgba(brand.colors.ink, 0.08) }}>
                              <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: journeyWarmAccent }}>
                                This Act Activates
                              </div>
                              <div className="mt-3 space-y-2.5">
                                {activeJourney.activationTitles.map((item) => {
                                  const module = visibleModules.find((entry) => entry.id === item.id);
                                  return module ? (
                                    <div key={item.id} className="flex items-center gap-3 text-sm leading-6 text-black/66">
                                      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: activeJourney.accent }}>
                                        {module.index}
                                      </span>
                                      <span className="font-editorial">{item.title}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                              <div className="mt-4 border-t pt-4 text-xs leading-6 text-black/48" style={{ borderColor: hexToRgba(brand.colors.ink, 0.08) }}>
                                The board responds to this act in real time: relevant modules lift, everything else quiets down, and the suite narrates itself.
                              </div>
                            </div>
                          </aside>
                        </div>

                        <div className="mt-4 flex max-w-[760px] flex-wrap gap-2.5">
                          {activeJourney.activationTitles.map((item) => {
                            const module = visibleModules.find((entry) => entry.id === item.id);
                            return module ? (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => openModuleById(item.id)}
                                className="border bg-white/68 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] transition-colors hover:bg-white"
                                style={{ borderColor: hexToRgba(activeJourney.accent, 0.28), color: activeJourney.accent }}
                              >
                                {module.index} • {item.title}
                              </button>
                            ) : null;
                          })}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {journeyActIndex > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveJourneyAct(journeyActs[journeyActIndex - 1].id)}
                              className="border bg-white/62 px-5 py-3 text-[10px] uppercase tracking-[0.24em] text-black/52 transition-colors hover:bg-white"
                              style={{ borderColor: hexToRgba(brand.colors.ink, 0.1) }}
                            >
                              ← Prev Act
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (journeyActIndex < journeyActs.length - 1) {
                                setActiveJourneyAct(journeyActs[journeyActIndex + 1].id);
                                return;
                              }
                              openModuleById(activeJourney.ctaModule);
                            }}
                            className="border px-5 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors hover:opacity-90"
                            style={{
                              borderColor: hexToRgba(activeJourney.accent, 0.28),
                              backgroundColor: hexToRgba(activeJourney.accent, 0.1),
                              color: activeJourney.accent,
                            }}
                          >
                            {journeyActIndex < journeyActs.length - 1 ? 'Next Act →' : `${activeJourney.ctaLabel} →`}
                          </button>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-black/22">
                            {journeyActIndex + 1} / {journeyActs.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.28em] opacity-40" style={{ color: brand.colors.ink }}>
              Your Suite Modules
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-25" style={{ color: brand.colors.ink }}>
              {visibleModules.length} modules
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-px border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            style={{
              backgroundColor: brand.colors.grid_line,
              borderColor: brand.colors.grid_line,
              boxShadow: brand.toggles.show_grid_glow
                ? `0 24px 48px -34px ${hexToRgba(brand.colors.accent_dark, 0.35)}`
                : '0 24px 48px -34px rgba(0,0,0,0.16)',
            }}
          >
            {visibleModules.map((m, idx) => {
              const isHovered = hoveredModuleId === m.id;
              const isRelated = hovered?.relatedIds?.includes(m.id) ?? false;
              const journeyActForModule = journeyModuleToAct.get(m.id);
              const inActiveJourneyAct = journeyGuideOpen && journeyActForModule === activeJourney.id;
              const journeyDimmed = journeyGuideOpen && journeyActForModule !== activeJourney.id;
              const constellationDimmed = journeyGuideOpen ? journeyDimmed : hovered && !isHovered && !isRelated;
              const locked = m.id !== 'intake' && !intakeComplete;
              const display = getBrandModuleCopy(brand, m.id);

              const mobileFocused = isMobile && isHovered;

              return (
                <div
                  key={m.id}
                  className={`cursor-pointer select-none p-4 transition-all dur-md ease-exit md:p-5 ${
                    constellationDimmed ? 'opacity-20' : 'opacity-100'
                  } ${
                    inActiveJourneyAct
                      ? 'bg-white ring-1 ring-black/5 shadow-card-hover border-brand-teal -translate-y-1'
                      : mobileFocused
                        ? 'bg-white ring-1 ring-black/5 shadow-card-hover border-brand-teal'
                        : 'hover:bg-white/95'
                  } ${
                    !locked ? 'relative before:absolute before:left-0 before:top-0 before:h-[2px] before:w-14 before:bg-brand-teal/60' : ''
                  }`}
                  style={{ backgroundColor: brand.colors.surface_background }}
                  onClick={(e) => handleModuleClick(e, m)}
                  onMouseEnter={() => {
                    if (!isMobile) setHoveredModuleId(m.id);
                    if (journeyGuideOpen && journeyActForModule) setActiveJourneyAct(journeyActForModule);
                  }}
                >
                  <div className="flex justify-between items-start gap-4">
                    {brand.toggles.show_module_indices ? (
                      <div className={`font-mono ${tileIndexClass[brand.hierarchy.tile_emphasis]}`}>{m.index}</div>
                    ) : (
                      <span />
                    )}
                    {inActiveJourneyAct ? (
                      <div
                        className="border px-2 py-1 text-[9px] uppercase tracking-[0.18em]"
                        style={{
                          borderColor: hexToRgba(activeJourney.accent, 0.35),
                          backgroundColor: hexToRgba(activeJourney.accent, 0.08),
                          color: activeJourney.accent,
                        }}
                      >
                        In This Act
                      </div>
                    ) : brand.toggles.show_module_status && (
                      <div
                        className={`uppercase tracking-widest ${locked ? 'opacity-40' : ''}`}
                        style={{ fontSize: '9px', color: locked ? undefined : brand.colors.accent_dark }}
                      >
                        {locked ? brand.copy.module_locked_label : brand.copy.module_ready_label}
                      </div>
                    )}
                  </div>
                  <div className="mt-5">
                    <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent_dark }}>
                      {display.eyebrow}
                    </div>
                    <div className={`mt-2 ${tileTitleClass[brand.hierarchy.tile_emphasis]}`}>{display.title}</div>
                    {brand.toggles.show_tile_descriptions && (
                      <p className={`mt-3 text-black/50 ${bodyDensityClass[brand.hierarchy.body_density]}`}>{display.description}</p>
                    )}
                  </div>
                  {isMobile && isHovered && (
                    <div className="mt-4 text-[9px] uppercase tracking-widest opacity-40">
                      {brand.copy.mobile_focus_hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {user && journeyGuideDismissed && !journeyGuideOpen && !openModuleId && (
        <div className="fixed bottom-5 right-5 z-20">
          <AmbientGuide label="Journey guide" message={journeyGuideHintMessage} align="right" delayMs={520}>
            <button
              type="button"
              onClick={openJourneyGuide}
              className="border bg-[#f7f3ea] px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-[#2a3732] shadow-[0_18px_36px_-24px_rgba(0,0,0,0.22)] transition-colors hover:bg-white"
              style={{
                borderColor: hexToRgba(brand.colors.ink, 0.12),
              }}
            >
              • Your Journey Guide
            </button>
          </AmbientGuide>
        </div>
      )}

      {/* Module Modal */}
      {user && openModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ backgroundColor: hexToRgba(brand.colors.page_background, 0.8) }}
            onClick={handleCloseModal}
          />

          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-[1460px] flex-col overflow-y-auto shadow-2xl ring-1 ring-black/5 md:overflow-hidden"
            style={{ backgroundColor: brand.colors.surface_background }}
          >
            <header
              className={`shrink-0 overflow-hidden border-b border-black/10 transition-all duration-500 ${
                openModule.id === 'intake' ? 'px-4 py-2 sm:px-5 sm:py-2.5 md:px-6' : 'px-4 py-2.5 sm:px-5 sm:py-3 md:px-6'
              }`}
              style={{
                background:
                  brand.hierarchy.overlay_style === 'cinematic'
                    ? `linear-gradient(145deg, ${brand.colors.overlay_background} 0%, ${brand.colors.ink} 100%)`
                    : brand.colors.overlay_background,
                color: brand.colors.overlay_text,
              }}
            >
              <div
                className={`flex flex-wrap items-start justify-between gap-3 border-b ${
                  openModule.id === 'intake' ? 'mb-1.5 pb-1.5' : 'mb-3 pb-3'
                }`}
                style={{ borderColor: hexToRgba(brand.colors.overlay_text, 0.12) }}
              >
                <div
                  className={`min-w-0 border text-[10px] uppercase tracking-[0.18em] ${
                    openModule.id === 'intake' ? 'px-2.5 py-1.5' : 'px-3 py-2'
                  }`}
                  style={{
                    borderColor: hexToRgba(brand.colors.overlay_text, 0.12),
                    backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    color: hexToRgba(brand.colors.overlay_text, 0.7),
                  }}
                >
                  <span className="whitespace-nowrap">
                    {openModule.index} / {String(visibleModules.length).padStart(2, '0')}
                  </span>
                  {openModule.id !== 'intake' ? (
                    <>
                      <span className="mx-2 opacity-40">·</span>
                      <span className="inline-block max-w-[16rem] truncate align-bottom sm:max-w-[28rem]">
                        {displayedOpenModule?.detail_title || openModule.title}
                      </span>
                    </>
                  ) : null}
                </div>

                <button
                  onClick={handleCloseModal}
                  className={`text-[10px] uppercase tracking-[0.24em] transition-colors ${
                    openModule.id === 'intake' ? 'px-3 py-2' : 'px-4 py-3'
                  }`}
                  style={{
                    border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                    backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    color: hexToRgba(brand.colors.overlay_text, 0.78),
                  }}
                >
                  Close
                </button>
              </div>

              <div
                className={`flex flex-col border-b xl:flex-row xl:items-start xl:justify-between ${
                  openModule.id === 'intake' ? 'gap-2 pb-2' : 'gap-3 pb-2.5 sm:pb-3'
                }`}
                style={{ borderColor: hexToRgba(brand.colors.overlay_text, 0.12) }}
              >
                <div className="space-y-2">
                  <div
                    className={`hidden flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.24em] sm:flex ${
                      openModule.id === 'intake' ? 'hidden' : ''
                    }`}
                    style={{ color: hexToRgba(brand.colors.overlay_text, 0.48) }}
                  >
                    <span>
                      {openModule.index} / {String(visibleModules.length).padStart(2, '0')}
                    </span>
                    <span>{brand.copy.modal_meta_label}</span>
                    <span>{openModule.kind}</span>
                    <span>{isLocked(openModule) ? 'Locked' : 'Unlocked'}</span>
                  </div>
                  {openModule.id !== 'intake' ? (
                    <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent }}>
                      {displayedOpenModule?.eyebrow}
                    </div>
                  ) : null}
                  <h2
                    className={`font-editorial ${openModule.id === 'intake' ? 'text-[1.65rem] leading-[1] md:text-[2rem]' : `leading-none ${headerScaleClass[brand.hierarchy.header_scale]}`}`}
                  >
                    {displayedOpenModule?.detail_title || openModule.title}
                  </h2>
                  <p
                    className={`text-sm md:max-w-4xl ${openModule.id === 'intake' ? 'max-w-xl leading-5' : 'max-w-3xl leading-6'}`}
                    style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}
                  >
                    {displayedOpenModule?.description || openModule.subtitle}
                  </p>
                </div>

                {openModule.id !== 'intake' ? (
                  <div
                    className="hidden px-3 py-2 text-right xl:block"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(brand.colors.overlay_text, 0.4) }}>
                      {brand.copy.modal_account_label}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}>
                      {accountLabel}
                    </div>
                  </div>
                ) : null}
              </div>

              {openModule.id !== 'intake' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                <AmbientGuide
                  label="Current framing"
                  message={displayedOpenModule?.detail_quote || displayedOpenModule?.description || openModule.subtitle}
                >
                  <span
                    className="inline-flex max-w-[420px] items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                      color: hexToRgba(brand.colors.overlay_text, 0.78),
                    }}
                  >
                    <span style={{ color: brand.colors.accent }}>Framing</span>
                    <span className="truncate normal-case tracking-normal opacity-80">
                      {displayedOpenModule?.detail_quote || displayedOpenModule?.description || openModule.subtitle}
                    </span>
                  </span>
                </AmbientGuide>

                {(openModule.relatedIds || []).slice(0, 3).map((relatedId) => {
                  const relatedModule = visibleModules.find((module) => module.id === relatedId);
                  return relatedModule ? (
                    <AmbientGuide
                      key={relatedId}
                      label={relatedModule.title}
                      message={relatedModule.subtitle}
                    >
                      <button
                        type="button"
                        onClick={() => openModuleById(relatedId)}
                        className="inline-flex px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors"
                        style={{
                          borderBottom: `2px solid ${brand.colors.accent}`,
                          color: hexToRgba(brand.colors.overlay_text, 0.72),
                        }}
                      >
                        {relatedModule.title}
                      </button>
                    </AmbientGuide>
                  ) : null;
                })}

                <AmbientGuide
                  label="Session posture"
                  align="right"
                  message={
                    isLocked(openModule)
                      ? 'This module is visible for context, but the journey remains locked until intake is complete.'
                      : isAdminUser
                        ? 'Operator-safe controls are available where appropriate while the client experience remains the default.'
                        : 'This is the client-safe surface. Behind-the-scenes controls stay hidden from the user.'
                  }
                >
                  <span
                    className="inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                      color: hexToRgba(brand.colors.overlay_text, 0.72),
                    }}
                  >
                    {isAdminUser ? 'Operator-aware view' : 'Client-safe view'}
                  </span>
                </AmbientGuide>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(brand.colors.overlay_text, 0.56) }}>
                  <span>{openModule.kind}</span>
                  <span className="opacity-35">·</span>
                  <span>{isAdminUser ? 'Operator session' : 'Client session'}</span>
                </div>
              )}
            </header>

            <div ref={modalScrollRef} className="px-4 py-4 sm:px-4 sm:py-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-6 md:py-6">
              {openModule.id === 'intake' ? (
                <IntakeFlow
                  uid={user.uid}
                  tier={clientTier}
                  client={client}
                  isAdminUser={isAdminUser}
                  voiceConfig={publicConfig.voice}
                  intakeConfig={publicConfig.professional_dna}
                  onComplete={(nextModuleId, payload) => {
                    // Update local client state so tiles unlock immediately.
                    setClient((prev) =>
                      prev
                        ? {
                            ...prev,
                            intent: payload.intent,
                            preferences: payload.preferences,
                            intake: {
                              ...(prev.intake ?? { answers: {} }),
                              answers: payload.answers,
                              completed_at: new Date(),
                            } as any,
                          }
                        : prev
                    );
                    openModuleById(nextModuleId);
                  }}
                />
              ) : openModule.id === 'episodes' ? (
                <BingeFeedView
                  client={client}
                  isAdminUser={isAdminUser}
                  isFreeTier={isFreeTier}
                  onOpenPlan={() => openModuleById(isFreeTier ? 'readiness' : 'plan')}
                />
              ) : openModule.id === 'tv' ? (
                <SkillSyncTvView client={client} />
              ) : openModule.id === 'flash_cards' ? (
                <FlashCardsView
                  client={client}
                  plan={artifact?.type === 'plan' && artifact.content ? artifact.content : null}
                  planLoading={artifactLoading}
                  isFreeTier={isFreeTier}
                  onOpenModule={openModuleById}
                />
              ) : openModule.id === 'my_concierge' ? (
                <MyConciergeView
                  client={client}
                  onOpenModule={(id) => {
                    if (id !== 'intake') openModuleById(id);
                  }}
                />
              ) : openModule.id === 'events' ? (
                <EventsNetworkingView client={client} onOpenModule={openModuleById} />
              ) : openModule.id === 'telescope' ? (
                <TelescopeView client={client} onOpenModule={openModuleById} />
              ) : openModule.id === 'team' ? (
                <SkillSyncTeamView client={client} onOpenModule={openModuleById} />
              ) : openModule.id === 'roadmap' ? (
                <RoadmapView />
              ) : (
                <>
                  {/* Locked state (until we wire real intakeComplete/artifact checks) */}
                  {isLocked(openModule) && (
                    <div className="border border-black/5 bg-gray-50 p-6">
                      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Locked</div>
                      <div className="text-2xl font-editorial italic">Complete Intake to unlock your suite.</div>
                      <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-xl">
                        Intake produces your Brief, Plan, and supporting documents. It only takes a few minutes.
                      </p>
                      <div className="mt-6">
                          <div className="text-[10px] uppercase tracking-[0.24em] text-black/45">
                            Return to Donna to start Smart Start.
                          </div>
                      </div>
                    </div>
                  )}

                  {/* Unlocked module content */}
                  {artifactLoading && (
                    <div className="py-16 text-center">
                      <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading…</div>
                    </div>
                  )}
                  {artifactError && (
                    <div className="py-10 text-red-600 text-sm">{artifactError}</div>
                  )}
                  {artifact && artifact.type === 'brief' && openModule.id === 'brief' && artifact.content && (
                    <BriefView brief={artifact.content} onOpenPlan={() => openModuleById('plan')} />
                  )}
                  {artifact &&
                    artifact.type === 'suite_distilled' &&
                    openModule.id === 'suite_distilled' &&
                    artifact.content && <SuiteDistilledView doc={artifact.content} />}
                  {artifact && artifact.type === 'plan' && openModule.id === 'plan' && artifact.content && (
                    <PlanView plan={artifact.content} />
                  )}
                  {artifact && artifact.type === 'profile' && openModule.id === 'profile' && artifact.content && (
                    <ProfileView profile={artifact.content} />
                  )}
                  {artifact && artifact.type === 'ai_profile' && openModule.id === 'ai_profile' && artifact.content && (
                    <MissionControlView
                      aiProfile={artifact.content}
                      onAccept={(id) => console.log('mission:accept', id)}
                      onRevise={(id, note) => console.log('mission:revise', id, note)}
                      onDismiss={(id) => console.log('mission:dismiss', id)}
                      onUndo={(id) => console.log('mission:undo', id)}
                      onDispatch={(agent) => console.log('mission:dispatch', agent)}
                      onStanceChange={(stance) => console.log('mission:stance', stance)}
                    />
                  )}
                  {artifact && artifact.type === 'gaps' && openModule.id === 'gaps' && artifact.content && (
                    <GapsView gaps={artifact.content} />
                  )}
                  {artifact && artifact.type === 'readiness' && openModule.id === 'readiness' && artifact.content && (
                    <ReadinessView doc={artifact.content} />
                  )}
                  {artifact &&
                    artifact.type === 'cjs_execution' &&
                    openModule.id === 'cjs_execution' &&
                    artifact.content && <CjsExecutionView client={client} doc={artifact.content} />}
                  {openModule.id === 'assets' && !artifactLoading && !artifactError && (
                    <AssetsView isAdminUser={isAdminUser} />
                  )}
                  {artifact === null &&
                    !isLocked(openModule) &&
                    ['brief', 'suite_distilled', 'plan', 'profile', 'ai_profile', 'gaps', 'readiness', 'cjs_execution'].includes(
                      openModule.id
                    ) &&
                    !artifactLoading &&
                    !artifactError && (
                      <div className="border border-black/5 bg-gray-50 p-6">
                        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Missing</div>
                        <div className="text-2xl font-editorial italic">This module has no artifact yet.</div>
                        <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-xl">
                          Run Intake again to regenerate your suite outputs.
                        </p>
                        <div className="mt-6">
                          <div className="text-[10px] uppercase tracking-[0.24em] text-black/45">
                            Return to Donna to regenerate through Smart Start.
                          </div>
                        </div>
                      </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    );
  };

  return (
    <>
      <DonnaShell
        user={user}
        client={client}
        wiki={wiki}
        memory={memory}
        clientLoaded={clientLoaded}
        publicConfig={publicConfig}
        brand={brand}
        isAdminUser={isAdminUser}
        onOpenModule={openModuleById}
        onOpenAdmin={() => setAdminOpen(true)}
        suiteContent={renderSuiteContent()}
      />
      <AdminConsole open={adminOpen} onClose={() => setAdminOpen(false)} onSaved={refreshPublicConfig} isAdminUser={isAdminUser} />
    </>
  );
};

export default App;

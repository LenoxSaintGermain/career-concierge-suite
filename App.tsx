import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { SUITE_MODULES } from './suite/modules';
import { BrandConfig, ClientDoc, PublicConfig, SuiteModule, SuiteModuleId } from './types';
import { loginWithCustomSessionToken, subscribeToAuth, logout } from './services/authService';
import { getOrCreateClient, markIntroSeen } from './services/clientService';
import { getArtifact } from './services/artifactService';
import { LoginView } from './components/LoginView';
import { IntakeFlow } from './components/IntakeFlow';
import { BriefView } from './components/BriefView';
import { PlanView } from './components/PlanView';
import { JsonDoc } from './components/JsonDoc';
import { ProfileView } from './components/ProfileView';
import { AIProfileView } from './components/AIProfileView';
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
import { canAccessAdminConfig, fetchPublicConfig } from './services/adminApi';
import { cloneBrandConfig, getBrandModuleCopy, hexToRgba } from './config/brandSystem.js';

type IntroPhase = 'prologue' | 'complete';

const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  ui: {
    show_prologue: true,
    episodes_enabled: true,
  },
  brand: cloneBrandConfig(),
  operations: {
    cjs_enabled: true,
  },
};

const headerScaleClass = {
  compact: 'text-2xl md:text-3xl',
  standard: 'text-3xl md:text-4xl',
  hero: 'text-4xl md:text-5xl',
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
  index: 'text-lg md:text-xl font-editorial leading-tight',
  balanced: 'text-xl font-editorial leading-tight',
  title: 'text-2xl font-editorial leading-tight',
};

const tileIndexClass = {
  index: 'text-sm opacity-55',
  balanced: 'text-xs opacity-30',
  title: 'text-[10px] opacity-20',
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [launchBootstrapPending, setLaunchBootstrapPending] = useState(false);
  const [launchBootstrapError, setLaunchBootstrapError] = useState<string | null>(null);

  const [clientLoaded, setClientLoaded] = useState(false);
  const [client, setClient] = useState<ClientDoc | null>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('complete');

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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
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
        setIntroPhase('complete');
        setIsAdminUser(false);
        return;
      }
      const client = await getOrCreateClient(user.uid);
      setClient(client);
      setClientLoaded(true);
      if (!client.intro_seen_at) setIntroPhase('prologue');
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

  const isLocked = (m: SuiteModule) => {
    if (m.id === 'intake' || m.id === 'roadmap') return false;
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

      const isArtifact =
        openModule.id === 'brief' ||
        openModule.id === 'suite_distilled' ||
        openModule.id === 'plan' ||
        openModule.id === 'profile' ||
        openModule.id === 'ai_profile' ||
        openModule.id === 'gaps' ||
        openModule.id === 'readiness' ||
        openModule.id === 'cjs_execution';
      if (!isArtifact) return;

      setArtifactLoading(true);
      try {
        const a = await getArtifact(user.uid, openModule.id as any);
        setArtifact(a);
      } catch (e: any) {
        setArtifactError(e?.message ?? 'Unable to load.');
      } finally {
        setArtifactLoading(false);
      }
    };
    run();
  }, [user, openModuleId]);

  const handleIntroSkip = async () => {
    if (user) {
      try {
        await markIntroSeen(user.uid);
      } catch {
        // Non-blocking; intro is UX sugar.
      }
    }
    setIntroPhase('complete');
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

  if (!user) {
    return (
      <LoginView
        onAuthed={() => { /* auth state will update via listener */ }}
        bootstrapError={launchBootstrapError}
      />
    );
  }

  // Prologue overlay (plays once per user; stored in Firestore).
  const showPrologue = publicConfig.ui.show_prologue && introPhase === 'prologue' && clientLoaded;

  // Relationship highlighting
  const hovered = hoveredModuleId ? visibleModules.find((m) => m.id === hoveredModuleId) ?? null : null;

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
              onClick={handleIntroSkip}
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
      <header className="fixed top-0 left-0 w-full z-10 px-6 py-6 flex justify-between items-center backdrop-blur-[2px]">
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
          <span className="text-[10px] uppercase tracking-widest opacity-40 hidden sm:inline">{user.email ?? user.uid}</span>
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
        className={`pt-24 pb-24 px-6 min-h-screen transition-all dur-md ease-standard ${
          openModuleId ? 'opacity-20 blur-sm scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
        onClick={() => isMobile && setHoveredModuleId(null)}
        onMouseLeave={() => !isMobile && setHoveredModuleId(null)}
      >
        <div className="max-w-6xl mx-auto relative">
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
          <div className="mb-10">
            {brand.toggles.show_suite_kicker && (
              <div className={`uppercase opacity-80 ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent_dark }}>
                {brand.copy.home_kicker}
              </div>
            )}
            <div className={`font-editorial italic mt-3 ${headerScaleClass[brand.hierarchy.header_scale]}`}>{brand.copy.home_title}</div>
            <p className={`text-black/55 mt-4 max-w-2xl ${bodyDensityClass[brand.hierarchy.body_density]}`}>{brand.copy.home_description}</p>
            {brand.toggles.show_home_callout && (
              <div
                className="mt-5 inline-flex items-center gap-4 border px-4 py-2 text-[10px] uppercase tracking-[0.2em]"
                style={{ borderColor: brand.colors.grid_line, backgroundColor: hexToRgba(brand.colors.accent, 0.12) }}
              >
                <span style={{ color: brand.colors.accent_dark }}>{brand.copy.home_callout_label}</span>
                <span className="text-black/45">{brand.copy.home_callout_value}</span>
              </div>
            )}
            {isFreeTier && (
              <div
                className="mt-4 px-4 py-3 text-xs text-black/70 max-w-2xl border"
                style={{ borderColor: hexToRgba(brand.colors.accent_dark, 0.28), backgroundColor: hexToRgba(brand.colors.accent, 0.12) }}
              >
                {brand.copy.free_tier_notice}
              </div>
            )}
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border"
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
              const constellationDimmed = hovered && !isHovered && !isRelated;
              const locked = m.id !== 'intake' && !intakeComplete;
              const display = getBrandModuleCopy(brand, m.id);

              const mobileFocused = isMobile && isHovered;

              return (
                <div
                  key={m.id}
                  className={`p-6 transition-all dur-md ease-exit cursor-pointer select-none ${
                    constellationDimmed ? 'opacity-20' : 'opacity-100'
                  } ${mobileFocused ? 'bg-white ring-1 ring-black/5 shadow-card-hover border-brand-teal' : 'hover:bg-white/95'} ${
                    !locked ? 'relative before:absolute before:left-0 before:top-0 before:h-[2px] before:w-14 before:bg-brand-teal/60' : ''
                  }`}
                  style={{ backgroundColor: brand.colors.surface_background }}
                  onClick={(e) => handleModuleClick(e, m)}
                  onMouseEnter={() => !isMobile && setHoveredModuleId(m.id)}
                >
                  <div className="flex justify-between items-start gap-4">
                    {brand.toggles.show_module_indices ? (
                      <div className={`font-mono ${tileIndexClass[brand.hierarchy.tile_emphasis]}`}>{m.index}</div>
                    ) : (
                      <span />
                    )}
                    {brand.toggles.show_module_status && (
                      <div
                        className={`uppercase tracking-widest ${locked ? 'opacity-40' : ''}`}
                        style={{ fontSize: '9px', color: locked ? undefined : brand.colors.accent_dark }}
                      >
                        {locked ? brand.copy.module_locked_label : brand.copy.module_ready_label}
                      </div>
                    )}
                  </div>
                  <div className="mt-10">
                    <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent_dark }}>
                      {display.eyebrow}
                    </div>
                    <div className={`mt-2 ${tileTitleClass[brand.hierarchy.tile_emphasis]}`}>{display.title}</div>
                    {brand.toggles.show_tile_descriptions && (
                      <p className={`text-black/50 mt-4 ${bodyDensityClass[brand.hierarchy.body_density]}`}>{display.description}</p>
                    )}
                  </div>
                  {isMobile && isHovered && (
                    <div className="mt-6 text-[9px] uppercase tracking-widest opacity-40">
                      {brand.copy.mobile_focus_hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Module Modal */}
      {openModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ backgroundColor: hexToRgba(brand.colors.page_background, 0.8) }}
            onClick={handleCloseModal}
          />

          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-[1520px] flex-col overflow-y-auto shadow-2xl ring-1 ring-black/5 md:overflow-hidden"
            style={{ backgroundColor: brand.colors.surface_background }}
          >
            <header
              className="shrink-0 border-b border-black/10 px-4 py-4 sm:px-5 sm:py-5 md:px-8"
              style={{
                background:
                  brand.hierarchy.overlay_style === 'cinematic'
                    ? `linear-gradient(145deg, ${brand.colors.overlay_background} 0%, ${brand.colors.ink} 100%)`
                    : brand.colors.overlay_background,
                color: brand.colors.overlay_text,
              }}
            >
              <div className="flex flex-col gap-4 border-b pb-4 sm:pb-5 xl:flex-row xl:items-start xl:justify-between" style={{ borderColor: hexToRgba(brand.colors.overlay_text, 0.12) }}>
                <div className="space-y-3">
                  <div className="hidden flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.24em] sm:flex" style={{ color: hexToRgba(brand.colors.overlay_text, 0.48) }}>
                    <span>
                      {openModule.index} / {String(visibleModules.length).padStart(2, '0')}
                    </span>
                    <span>{brand.copy.modal_meta_label}</span>
                    <span>{openModule.kind}</span>
                    <span>{isLocked(openModule) ? 'Locked' : 'Unlocked'}</span>
                  </div>
                  <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent }}>
                    {displayedOpenModule?.eyebrow}
                  </div>
                  <h2 className={`font-editorial leading-none ${headerScaleClass[brand.hierarchy.header_scale]}`}>
                    {displayedOpenModule?.detail_title || openModule.title}
                  </h2>
                  <p
                    className="max-w-4xl text-sm leading-6 md:text-base md:leading-7"
                    style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}
                  >
                    {displayedOpenModule?.description || openModule.subtitle}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="hidden px-4 py-3 text-right lg:block"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(brand.colors.overlay_text, 0.4) }}>
                      {brand.copy.modal_account_label}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}>
                      {user.email ?? user.uid}
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-3 text-[10px] uppercase tracking-[0.24em] transition-colors"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.18)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                      color: hexToRgba(brand.colors.overlay_text, 0.72),
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-4 hidden gap-3 md:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                {brand.toggles.show_detail_quotes ? (
                  <div
                    className="px-5 py-5"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: brand.colors.accent }}>
                      Current framing
                    </div>
                    <p className="mt-4 font-editorial text-2xl italic leading-tight" style={{ color: brand.colors.overlay_text }}>
                      "{displayedOpenModule?.detail_quote || openModule.subtitle}"
                    </p>
                  </div>
                ) : (
                  <div
                    className="px-5 py-5"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: brand.colors.accent }}>
                      Current framing
                    </div>
                    <p className="mt-4 text-sm leading-6" style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}>
                      {displayedOpenModule?.description || openModule.subtitle}
                    </p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div
                    className="px-4 py-4"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(brand.colors.overlay_text, 0.4) }}>
                      Related modules
                    </div>
                    <div className="mt-3 text-sm leading-6" style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}>
                      {(openModule.relatedIds || []).slice(0, 3).map((relatedId) => {
                        const relatedModule = visibleModules.find((module) => module.id === relatedId);
                        return relatedModule ? (
                          <button
                            key={relatedId}
                            type="button"
                            onClick={() => openModuleById(relatedId)}
                            className="mr-2 mt-2 inline-flex px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors"
                            style={{
                              border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                              backgroundColor: hexToRgba(brand.colors.overlay_text, 0.05),
                              color: hexToRgba(brand.colors.overlay_text, 0.72),
                            }}
                          >
                            {relatedModule.title}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div
                    className="px-4 py-4"
                    style={{
                      border: `1px solid ${hexToRgba(brand.colors.overlay_text, 0.12)}`,
                      backgroundColor: hexToRgba(brand.colors.overlay_text, 0.04),
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(brand.colors.overlay_text, 0.4) }}>
                      Session
                    </div>
                    <div className="mt-3 text-sm leading-6" style={{ color: hexToRgba(brand.colors.overlay_text, 0.72) }}>
                      {isAdminUser ? 'Operator controls available where appropriate.' : 'Client-safe view active.'}
                    </div>
                    <div className="mt-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(brand.colors.overlay_text, 0.4) }}>
                      {isLocked(openModule) ? 'Complete intake to unlock artifacts.' : 'Ready for review and demo.'}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div ref={modalScrollRef} className="px-4 py-4 sm:px-5 sm:py-5 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-8 md:py-8">
              {openModule.id === 'intake' ? (
                <IntakeFlow
                  uid={user.uid}
                  tier={clientTier}
                  client={client}
                  isAdminUser={isAdminUser}
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
                <FlashCardsView client={client} />
              ) : openModule.id === 'my_concierge' ? (
                <MyConciergeView client={client} onOpenModule={openModuleById} />
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
                        <button
                          onClick={() => openModuleById('intake')}
                          className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
                        >
                          Start Intake
                        </button>
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
                    <AIProfileView aiProfile={artifact.content} />
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
                          <button
                            onClick={() => openModuleById('intake')}
                            className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors"
                          >
                            Regenerate via Intake
                          </button>
                        </div>
                      </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AdminConsole open={adminOpen} onClose={() => setAdminOpen(false)} onSaved={refreshPublicConfig} />
    </div>
  );
};

export default App;

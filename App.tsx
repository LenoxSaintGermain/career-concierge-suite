import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { SUITE_MODULES } from './suite/modules';
import { ClientDoc, SuiteModule, SuiteModuleId } from './types';
import { subscribeToAuth, logout } from './services/authService';
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
import { BingeFeedView } from './components/BingeFeedView';
import { AdminConsole } from './components/AdminConsole';
import { fetchPublicConfig } from './services/adminApi';
import { PublicConfig } from './types';

type IntroPhase = 'prologue' | 'complete';

const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  ui: {
    show_prologue: true,
    episodes_enabled: true,
  },
};

const BOOT_SEQUENCE_STEPS = [
  { id: 'intake', title: 'Smart Start Intake', detail: 'Concierge conversation to calibrate your profile.' },
  { id: 'brief', title: 'Signal Distillation', detail: 'Generate your executive brief and leverage map.' },
  { id: 'plan', title: 'Execution Sprint', detail: 'Activate a 72-hour plan and two-week cadence.' },
] as const;

const LEGACY_CONTENT_WIDGETS = [
  {
    title: 'Professional DNA',
    summary: 'Mapped from legacy assessment narrative into a live profile artifact.',
    moduleId: 'profile' as SuiteModuleId,
    command: 'open profile',
  },
  {
    title: 'Gap + Insight Report',
    summary: 'Long-form diagnostic content condensed into decision-grade cards.',
    moduleId: 'gaps' as SuiteModuleId,
    command: 'open gaps',
  },
  {
    title: 'Resource + Course Feed',
    summary: 'Legacy training pathways refactored into episodic micro-dramas.',
    moduleId: 'episodes' as SuiteModuleId,
    command: 'open episodes',
  },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [clientLoaded, setClientLoaded] = useState(false);
  const [client, setClient] = useState<ClientDoc | null>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('complete');

  const [openModuleId, setOpenModuleId] = useState<SuiteModuleId | null>(null);
  const [hoveredModuleId, setHoveredModuleId] = useState<SuiteModuleId | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [publicConfig, setPublicConfig] = useState<PublicConfig>(DEFAULT_PUBLIC_CONFIG);

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

  // Load/Create client record and decide whether to play intro.
  useEffect(() => {
    const run = async () => {
      if (!user) {
        setClientLoaded(false);
        setClient(null);
        setIntroPhase('complete');
        return;
      }
      const client = await getOrCreateClient(user.uid);
      setClient(client);
      setClientLoaded(true);
      if (!client.intro_seen_at) setIntroPhase('prologue');
    };
    run();
  }, [user]);

  const intakeComplete = useMemo(() => {
    return Boolean(client?.intake?.completed_at);
  }, [client?.intake?.completed_at]);

  const visibleModules = useMemo(
    () => SUITE_MODULES.filter((m) => publicConfig.ui.episodes_enabled || m.id !== 'episodes'),
    [publicConfig.ui.episodes_enabled]
  );

  const openModule = useMemo(
    () => (openModuleId ? visibleModules.find((m) => m.id === openModuleId) ?? null : null),
    [openModuleId, visibleModules]
  );

  const isLocked = (m: SuiteModule) => {
    if (m.id === 'intake') return false;
    return !intakeComplete;
  };

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
        openModule.id === 'plan' ||
        openModule.id === 'profile' ||
        openModule.id === 'ai_profile' ||
        openModule.id === 'gaps';
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

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-50 animate-pulse">Initializing…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onAuthed={() => { /* auth state will update via listener */ }} />;
  }

  // Prologue overlay (plays once per user; stored in Firestore).
  const showPrologue = publicConfig.ui.show_prologue && introPhase === 'prologue' && clientLoaded;

  // Relationship highlighting
  const hovered = hoveredModuleId ? visibleModules.find((m) => m.id === hoveredModuleId) ?? null : null;

  return (
    <div className="min-h-screen overflow-hidden bg-os-shell text-[#e7edf3]">
      {showPrologue && (
        <div className="fixed inset-0 z-[60] bg-[#050b13] text-white flex items-center justify-center p-6">
          <div className="max-w-3xl text-center space-y-10">
            <div className="inline-flex items-center gap-3 border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.32em]">
              <span className="teal-dot ai-thinking" />
              Boot sequence
            </div>
            <h1 className="text-2xl md:text-4xl font-editorial italic leading-tight">
              “Most careers don’t collapse.
              <br />
              They quietly stall.”
            </h1>
            <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              This suite is designed to keep you moving with premium pacing and clear next actions.
              <br />
              No tests. No chaos. Just a calibrated plan.
            </p>
            <div className="inline-block border-t border-b border-white/20 py-4 px-10">
              <div className="text-white text-[10px] font-bold tracking-[0.3em] uppercase">SkillSync AI Concierge OS</div>
            </div>
          </div>

          <div className="fixed bottom-8 right-8">
            <button
              onClick={handleIntroSkip}
              className="text-white/40 text-[10px] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 group"
            >
              <span>Enter</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">-&gt;</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-20 px-4 sm:px-6 lg:px-10 py-5 flex justify-between items-center border-b border-white/10 bg-[#070d14]/85 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="teal-dot ai-thinking hidden sm:block" />
          <h1 className="text-xs font-bold tracking-widest uppercase">
            SkillSync AI
            <span className="opacity-50 ml-2 font-normal hidden md:inline">Career Concierge OS</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest opacity-50 hidden sm:inline">{user.email ?? user.uid}</span>
          <button
            onClick={() => setAdminOpen(true)}
            className="text-[10px] uppercase tracking-widest border border-white/20 px-3 py-2 hover:border-[var(--ss-teal-500)] hover:text-[var(--ss-teal-400)] transition-colors"
          >
            Admin
          </button>
          <button
            onClick={() => logout()}
            className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Suite Home */}
      <main
        className={`pt-28 pb-20 px-4 sm:px-6 lg:px-10 min-h-screen transition-all dur-md ease-standard ${
          openModuleId ? 'opacity-30 blur-[2px] scale-[0.99] pointer-events-none' : 'opacity-100 scale-100'
        }`}
        onClick={() => isMobile && setHoveredModuleId(null)}
        onMouseLeave={() => !isMobile && setHoveredModuleId(null)}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-60">Workspace</div>
            <div className="text-3xl md:text-4xl font-editorial italic mt-2">Brand-integrated operating system.</div>
            <p className="text-sm text-[#aebcca] leading-relaxed mt-4 max-w-3xl">
              Smart Start Intake is your boot sequence. Teal marks where to act or what is complete. Slate is environment.
              White is decision-critical signal.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-6">
            <section className="xl:col-span-7 bg-os-panel ring-os p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] opacity-60">Boot Sequence</div>
                  <h2 className="text-3xl font-editorial italic mt-2">Smart Start Intake</h2>
                </div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#5ce3d7]">
                  {intakeComplete ? 'Calibrated' : 'Awaiting calibration'}
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-3">
                {BOOT_SEQUENCE_STEPS.map((step, idx) => {
                  const complete = intakeComplete && idx <= 1;
                  const active = !intakeComplete && step.id === 'intake';
                  return (
                    <div
                      key={step.id}
                      className={`p-4 border border-white/10 bg-[#101c2b] ${active || complete ? 'ring-os-active' : 'ring-os'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">{String(idx + 1).padStart(2, '0')}</div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[#5ce3d7]">
                          {complete ? 'Complete' : active ? 'Active' : 'Queued'}
                        </div>
                      </div>
                      <div className="mt-3 text-lg font-editorial italic">{step.title}</div>
                      <p className="mt-2 text-xs text-[#aebcca] leading-relaxed">{step.detail}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => openModuleById('intake')}
                  className="btn-os-primary px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors"
                >
                  {intakeComplete ? 'Recalibrate Intake' : 'Run Boot Sequence'}
                </button>
                <button
                  onClick={() => openModuleById('brief')}
                  disabled={!intakeComplete}
                  className="px-5 py-3 text-[11px] uppercase tracking-[0.25em] border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[var(--ss-teal-500)] transition-colors"
                >
                  Open Brief
                </button>
              </div>
            </section>

            <section className="xl:col-span-5 bg-os-panel ring-os p-6 sm:p-8">
              <div className="text-[10px] uppercase tracking-[0.28em] opacity-60">Live Orchestration</div>
              <h3 className="text-2xl font-editorial italic mt-2">SkillSync Command Deck</h3>
              <div className="mt-5 space-y-3">
                <div className="bg-[#101c2b] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">Semantic coloring</div>
                  <div className="space-y-2 text-xs text-[#dce5ed]">
                    <div className="flex items-center gap-3"><span className="teal-dot" /> Teal: act now or completed.</div>
                    <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-[#6c8198]" /> Slate: environment and context.</div>
                    <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-[#f3f6f9]" /> White: critical outputs.</div>
                  </div>
                </div>
                <div className="bg-[#101c2b] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-2">Fast actions</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Open Episodes', id: 'episodes' as SuiteModuleId },
                      { label: 'Open Plan', id: 'plan' as SuiteModuleId },
                      { label: 'Open Profile', id: 'profile' as SuiteModuleId },
                      { label: 'Open Assets', id: 'assets' as SuiteModuleId },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => openModuleById(item.id)}
                        className="text-left border border-white/10 px-3 py-2 hover:border-[var(--ss-teal-500)] transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border border-[#26c8bc33] bg-[#26c8bc12] p-4 text-xs text-[#b8f0eb] leading-relaxed">
                  AI feedback state uses teal pulse while generation is active inside Intake and Episodes modules.
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {LEGACY_CONTENT_WIDGETS.map((widget) => (
              <button
                key={widget.title}
                onClick={() => openModuleById(widget.moduleId)}
                className="text-left bg-os-panel ring-os p-5 hover:ring-os-active transition-all"
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#5ce3d7]">Legacy to OS</div>
                <div className="text-xl font-editorial italic mt-2">{widget.title}</div>
                <p className="text-sm text-[#aebcca] leading-relaxed mt-3">{widget.summary}</p>
                <div className="mt-4 text-[11px] font-signal-mono text-[#b8f0eb]">$ {widget.command}</div>
              </button>
            ))}
          </div>

          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-60">Utility Modules</div>
            <div className="text-2xl font-editorial italic mt-2">Your operating surface.</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleModules.map((m, idx) => {
              const isHovered = hoveredModuleId === m.id;
              const isRelated = hovered?.relatedIds?.includes(m.id) ?? false;
              const constellationDimmed = hovered && !isHovered && !isRelated;
              const locked = m.id !== 'intake' && !intakeComplete;
              const status = m.id === 'intake' ? (intakeComplete ? 'Complete' : 'Boot') : locked ? 'Queued' : 'Ready';
              const accent = status === 'Complete' || status === 'Ready';

              const mobileFocused = isMobile && isHovered;

              return (
                <div
                  key={m.id}
                  className={`bg-os-panel ring-os p-6 transition-all dur-md ease-exit cursor-pointer select-none ${
                    constellationDimmed ? 'opacity-35' : 'opacity-100'
                  } ${mobileFocused ? 'ring-os-active shadow-card-hover' : 'hover:ring-os-active'}`}
                  onClick={(e) => handleModuleClick(e, m)}
                  onMouseEnter={() => !isMobile && setHoveredModuleId(m.id)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-xs font-signal-mono opacity-45">{m.index}</div>
                    <div className={`text-[9px] uppercase tracking-widest ${accent ? 'text-[#5ce3d7]' : 'opacity-45'}`}>
                      {status}
                    </div>
                  </div>
                  <div className="mt-8">
                    <div className="text-xl font-editorial leading-tight">{m.title}</div>
                    <div className="text-xs uppercase tracking-widest opacity-40 mt-3">
                      {m.kind.toUpperCase()}
                    </div>
                    <p className="text-sm text-[#aebcca] leading-relaxed mt-4">{m.subtitle}</p>
                  </div>
                  {isMobile && isHovered && (
                    <div className="mt-6 text-[9px] uppercase tracking-widest opacity-55">
                      Tap again to open
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
          <div className="absolute inset-0 bg-[#070d14]/78 backdrop-blur-md" onClick={handleCloseModal} />

          <div className="bg-[#0f1824] w-full max-w-6xl h-full max-h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-y-auto md:overflow-hidden ring-os">
            <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
              <button
                onClick={handleCloseModal}
                className="p-2 opacity-60 hover:opacity-100 transition-opacity dur-xs rounded-full text-white/90 hover:text-white"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Left column */}
            <div className="w-full md:w-1/3 bg-os-panel text-white p-8 md:p-12 flex flex-col justify-between shrink-0 ring-os">
              <div>
                <div className="text-xs font-signal-mono opacity-60 mb-8 flex justify-between">
                  <span>{openModule.index} / {String(visibleModules.length).padStart(2, '0')}</span>
                  <span className="opacity-50">MODULE</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-editorial leading-none mb-8">{openModule.title}</h2>
                <p className="text-sm md:text-base font-light opacity-80 leading-relaxed font-editorial italic border-l border-[#26c8bc80] pl-6 py-1">
                  “{openModule.subtitle}”
                </p>
              </div>

              <div className="mt-10 space-y-6">
                <div className="text-[10px] uppercase tracking-widest opacity-40">Account</div>
                <div className="text-xs opacity-70">{user.email ?? user.uid}</div>
              </div>
            </div>

            {/* Right column */}
            <div ref={modalScrollRef} className="w-full md:w-2/3 p-8 md:p-16 bg-os-paper md:overflow-y-auto">
              {openModule.id === 'intake' ? (
                <IntakeFlow
                  uid={user.uid}
                  onComplete={() => {
                    // Update local client state so tiles unlock immediately.
                    setClient((prev) =>
                      prev
                        ? { ...prev, intake: { ...(prev.intake ?? { answers: {} }), completed_at: new Date() } as any }
                        : prev
                    );
                    // Close intake and open brief next.
                    openModuleById('brief');
                  }}
                />
              ) : openModule.id === 'episodes' ? (
                <BingeFeedView onOpenPlan={() => openModuleById('plan')} />
              ) : (
                <>
                  {/* Locked state (until we wire real intakeComplete/artifact checks) */}
                  {isLocked(openModule) && (
                    <div className="border border-[#0e9f9630] bg-[#26c8bc10] p-6">
                      <div className="text-[10px] uppercase tracking-widest text-[#0e9f96] mb-4">Queued</div>
                      <div className="text-2xl font-editorial italic">Complete Intake to unlock your suite.</div>
                      <p className="text-sm text-[#33485c] leading-relaxed mt-4 max-w-xl">
                        Intake produces your Brief, Plan, and supporting documents. It only takes a few minutes.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={() => openModuleById('intake')}
                          className="btn-os-primary px-5 py-3 text-xs uppercase tracking-[0.25em] transition-colors"
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
                  {artifact === null &&
                    !isLocked(openModule) &&
                    ['brief', 'plan', 'profile', 'ai_profile', 'gaps'].includes(openModule.id) &&
                    !artifactLoading &&
                    !artifactError && (
                      <div className="border border-[#0e9f9630] bg-[#26c8bc10] p-6">
                        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Missing</div>
                        <div className="text-2xl font-editorial italic">This module has no artifact yet.</div>
                        <p className="text-sm text-[#33485c] leading-relaxed mt-4 max-w-xl">
                          Run Intake again to regenerate your suite outputs.
                        </p>
                        <div className="mt-6">
                          <button
                            onClick={() => openModuleById('intake')}
                            className="btn-os-primary px-5 py-3 text-xs uppercase tracking-[0.25em] transition-colors"
                          >
                            Regenerate via Intake
                          </button>
                        </div>
                      </div>
                    )}
                  {openModule.id === 'assets' && !artifactLoading && !artifactError && (
                    <div className="border border-[#0e9f9630] bg-[#26c8bc10] p-6">
                      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Assets</div>
                      <div className="text-2xl font-editorial italic">Your workspace will live here.</div>
                      <p className="text-sm text-[#33485c] leading-relaxed mt-4 max-w-xl">
                        Resume versions, outreach drafts, scripts, and links. In Phase 1 we’ll connect this to real generation and versioning.
                      </p>
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

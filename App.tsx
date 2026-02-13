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

type IntroPhase = 'prologue' | 'complete';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [clientLoaded, setClientLoaded] = useState(false);
  const [client, setClient] = useState<ClientDoc | null>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('complete');

  const [openModuleId, setOpenModuleId] = useState<SuiteModuleId | null>(null);
  const [hoveredModuleId, setHoveredModuleId] = useState<SuiteModuleId | null>(null);

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

  const openModule = useMemo(
    () => (openModuleId ? SUITE_MODULES.find((m) => m.id === openModuleId) ?? null : null),
    [openModuleId]
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
        setOpenModuleId(module.id);
      } else {
        setHoveredModuleId(module.id);
      }
      return;
    }

    setOpenModuleId(module.id);
  };

  const handleCloseModal = () => setOpenModuleId(null);

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
  const showPrologue = introPhase === 'prologue' && clientLoaded;

  // Relationship highlighting
  const hovered = hoveredModuleId ? SUITE_MODULES.find((m) => m.id === hoveredModuleId) ?? null : null;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f5f5] text-[#1a1a1a]">
      {showPrologue && (
        <div className="fixed inset-0 z-[60] bg-[#050505] text-white flex items-center justify-center p-6">
          <div className="max-w-3xl text-center space-y-10">
            <h1 className="text-2xl md:text-4xl font-editorial italic leading-tight">
              “Most careers don’t collapse.
              <br />
              They quietly stall.”
            </h1>
            <p className="text-white/70 text-sm md:text-base leading-relaxed">
              This suite is designed to keep you moving with premium pacing and clear next actions.
              <br />
              No tests. No chaos. Just a calibrated plan.
            </p>
            <div className="inline-block border-t border-b border-white/20 py-4 px-10">
              <div className="text-white text-[10px] font-bold tracking-[0.3em] uppercase">Career Concierge Suite</div>
            </div>
          </div>

          <div className="fixed bottom-8 right-8">
            <button
              onClick={handleIntroSkip}
              className="text-white/30 text-[10px] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 group"
            >
              <span>Enter</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">-&gt;</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-10 px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xs font-bold tracking-widest uppercase">
            Third Signal <span className="opacity-40 ml-2 font-normal hidden sm:inline">Career Concierge</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest opacity-40 hidden sm:inline">{user.email ?? user.uid}</span>
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-40">Suite Home</div>
            <div className="text-3xl md:text-4xl font-editorial italic mt-3">Your modules.</div>
            <p className="text-sm text-black/50 leading-relaxed mt-4 max-w-2xl">
              Start with Intake. Everything else unlocks as soon as we calibrate your profile and generate your Brief.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
            {SUITE_MODULES.map((m, idx) => {
              const isHovered = hoveredModuleId === m.id;
              const isRelated = hovered?.relatedIds?.includes(m.id) ?? false;
              const constellationDimmed = hovered && !isHovered && !isRelated;
              const locked = m.id !== 'intake' && !intakeComplete;

              const mobileFocused = isMobile && isHovered;

              return (
                <div
                  key={m.id}
                  className={`bg-[#f5f5f5] p-6 transition-all dur-md ease-exit cursor-pointer select-none ${
                    constellationDimmed ? 'opacity-20' : 'opacity-100'
                  } ${mobileFocused ? 'bg-white ring-1 ring-black/5 shadow-card-hover' : ''}`}
                  onClick={(e) => handleModuleClick(e, m)}
                  onMouseEnter={() => !isMobile && setHoveredModuleId(m.id)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-xs font-mono opacity-30">{m.index}</div>
                    <div className="text-[9px] uppercase tracking-widest opacity-40">
                      {locked ? 'Locked' : 'Ready'}
                    </div>
                  </div>
                  <div className="mt-10">
                    <div className="text-xl font-editorial leading-tight">{m.title}</div>
                    <div className="text-xs uppercase tracking-widest opacity-30 mt-3">
                      {m.kind.toUpperCase()}
                    </div>
                    <p className="text-sm text-black/50 leading-relaxed mt-4">{m.subtitle}</p>
                  </div>
                  {isMobile && isHovered && (
                    <div className="mt-6 text-[9px] uppercase tracking-widest opacity-40">
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
          <div className="absolute inset-0 bg-[#e5e5e5]/80 backdrop-blur-md" onClick={handleCloseModal} />

          <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-y-auto md:overflow-hidden ring-1 ring-black/5">
            <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
              <button
                onClick={handleCloseModal}
                className="p-2 opacity-50 hover:opacity-100 transition-opacity dur-xs rounded-full mix-blend-difference text-white/80 hover:text-white"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Left column */}
            <div className="w-full md:w-1/3 bg-[#111] text-white p-8 md:p-12 flex flex-col justify-between shrink-0">
              <div>
                <div className="text-xs font-mono opacity-50 mb-8 flex justify-between">
                  <span>{openModule.index} / 07</span>
                  <span className="opacity-50">MODULE</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-editorial leading-none mb-8">{openModule.title}</h2>
                <p className="text-sm md:text-base font-light opacity-80 leading-relaxed font-editorial italic border-l border-white/20 pl-6 py-1">
                  “{openModule.subtitle}”
                </p>
              </div>

              <div className="mt-10 space-y-6">
                <div className="text-[10px] uppercase tracking-widest opacity-40">Account</div>
                <div className="text-xs opacity-70">{user.email ?? user.uid}</div>
              </div>
            </div>

            {/* Right column */}
            <div ref={modalScrollRef} className="w-full md:w-2/3 p-8 md:p-16 bg-white md:overflow-y-auto">
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
                    setOpenModuleId('brief');
                  }}
                />
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
                          onClick={() => setOpenModuleId('intake')}
                          className="px-5 py-3 bg-black text-white text-xs uppercase tracking-[0.25em] hover:bg-black/90 transition-colors"
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
                  {artifact && openModule.id === 'brief' && artifact.content && (
                    <BriefView brief={artifact.content} onOpenPlan={() => setOpenModuleId('plan')} />
                  )}
                  {artifact && openModule.id === 'plan' && artifact.content && <PlanView plan={artifact.content} />}
                  {artifact && !['brief', 'plan'].includes(openModule.id) && <JsonDoc value={artifact.content} />}
                  {openModule.id === 'assets' && !artifactLoading && !artifactError && (
                    <div className="border border-black/5 bg-gray-50 p-6">
                      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Assets</div>
                      <div className="text-2xl font-editorial italic">Your workspace will live here.</div>
                      <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-xl">
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
    </div>
  );
};

export default App;

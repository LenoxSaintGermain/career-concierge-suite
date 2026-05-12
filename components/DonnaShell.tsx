import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrandConfig,
  ClientDoc,
  ClientIntent,
  ClientMemory,
  ClientPreferences,
  ClientWiki,
  IntakeAnswers,
  PublicConfig,
  SuiteModuleId,
} from '../types';
import { GeminiLivePanel, type GeminiLiveDiagnosticEvent, type GeminiLiveDiagnosticLevel } from './GeminiLivePanel';
import { ElevenLabsConvaiPanel } from './ElevenLabsConvaiPanel';
import { AuthCard } from './AuthCard';
import { DonnaChatLane, type DonnaCanvasCommand, type DonnaCanvasState } from './DonnaChatLane';
import { SceneRail, type DonnaScene } from './SceneRail';
import { WikiDrawer } from './WikiDrawer';
import type { GhostCallbacks } from '../hooks/useGhostVoice';
import { DEFAULT_DONNA_CONFIG } from '../config/donnaDefaults';

interface DonnaShellProps {
  user: User | null;
  client: ClientDoc | null;
  wiki: ClientWiki | null;
  memory?: ClientMemory | null;
  clientLoaded: boolean;
  publicConfig: PublicConfig;
  brand: BrandConfig;
  isAdminUser: boolean;
  onOpenModule: (id: SuiteModuleId) => void;
  onOpenAdmin?: () => void;
  suiteContent?: React.ReactNode;
}

const overlaySpring = { type: 'spring', stiffness: 280, damping: 32 } as const;

const getFirstName = (client: ClientDoc | null, wiki: ClientWiki | null, user: User | null) =>
  wiki?.first_name ||
  client?.display_name?.split(/\s+/)[0] ||
  client?.demo_profile?.name?.split(/\s+/)[0] ||
  user?.displayName?.split(/\s+/)[0] ||
  'Client';

export function DonnaShell({
  user,
  client,
  wiki,
  memory = null,
  clientLoaded,
  publicConfig,
  brand,
  isAdminUser,
  onOpenModule,
  onOpenAdmin,
  suiteContent,
}: DonnaShellProps) {
  const [authCardMode, setAuthCardMode] = useState<'login' | 'register' | null>(null);
  const [wikiDrawerOpen, setWikiDrawerOpen] = useState(false);
  const [wikiFocusedKey, setWikiFocusedKey] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceLaunchPending, setVoiceLaunchPending] = useState(false);
  const [liveLaunchId, setLiveLaunchId] = useState<number | null>(null);
  const [initialLiveMicStream, setInitialLiveMicStream] = useState<MediaStream | null>(null);
  const [liveDiagnostics, setLiveDiagnostics] = useState<GeminiLiveDiagnosticEvent[]>([]);
  const [osOpen, setOsOpen] = useState(false);
  const [scene, setScene] = useState<DonnaScene>(user ? 'calibration' : 'arrival');
  const [canvasCommand, setCanvasCommand] = useState<DonnaCanvasCommand | null>(null);
  const [prePurchaseIntakeSeed, setPrePurchaseIntakeSeed] = useState<{
    intent: ClientIntent;
    preferences: ClientPreferences;
    answers: IntakeAnswers;
  } | null>(null);

  const firstName = getFirstName(client, wiki, user);
  const activePanel = publicConfig.voice.active_panel;
  const elevenlabsAgentId = publicConfig.voice.elevenlabs_agent_id || '';
  const donnaConfig = publicConfig.donna ?? DEFAULT_DONNA_CONFIG;
  const liveDiagnosticsVisible =
    isAdminUser && donnaConfig.operator_diagnostics_visible && donnaConfig.live_dock_detail_level !== 'minimal';

  useEffect(() => {
    setScene(user ? 'calibration' : 'arrival');
  }, [user]);

  const openSuiteModule = (id: SuiteModuleId) => {
    setOsOpen(true);
    onOpenModule(id);
  };

  const appendLiveDiagnostic = (event: GeminiLiveDiagnosticEvent) => {
    setLiveDiagnostics((prev) => [event, ...prev].slice(0, 40));
  };

  const recordShellDiagnostic = (
    type: string,
    detail: string,
    level: GeminiLiveDiagnosticLevel = 'info'
  ) => {
    appendLiveDiagnostic({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      type,
      detail,
      level,
      state: voiceOpen ? 'connected' : voiceLaunchPending ? 'connecting' : 'idle',
      launchId: liveLaunchId ?? undefined,
    });
  };

  const startLiveSessionFromDonna = async () => {
    if (!user) {
      setAuthCardMode('login');
      return;
    }

    setOsOpen(false);
    setVoiceLaunchPending(true);
    setLiveDiagnostics([]);
    recordShellDiagnostic('donna_live_launch', 'Donna requested one-click microphone and Live start.');
    issueCanvasCommand('concierge_sync', {
      userText: 'Start voice.',
      donnaText: 'Opening the live line now.',
      notice: 'Donna is requesting microphone access.',
    });

    try {
      recordShellDiagnostic('mic_permission_prompt', 'Browser microphone permission prompt requested.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setInitialLiveMicStream(stream);
      setVoiceOpen(true);
      setLiveLaunchId(Date.now());
      setVoiceLaunchPending(false);
      recordShellDiagnostic('mic_permission_granted', 'Microphone permission granted; Live runtime mounting.');
    } catch (error: any) {
      setInitialLiveMicStream(null);
      setVoiceOpen(false);
      setVoiceLaunchPending(false);
      recordShellDiagnostic('mic_permission_error', error?.message || 'Microphone permission did not complete.', 'error');
      issueCanvasCommand('concierge_sync', {
        donnaText: error?.message
          ? `I could not reach the microphone: ${error.message}`
          : 'I could not reach the microphone. Check browser permissions, then try again.',
        notice: 'Microphone permission did not complete.',
      });
    }
  };

  const issueCanvasCommand = (
    state: DonnaCanvasState,
    options: Omit<DonnaCanvasCommand, 'id' | 'state'> = {}
  ) => {
    setCanvasCommand({ id: Date.now(), state, ...options });
  };

  const sessionContext = useMemo(() => {
    const parts: string[] = [];
    const seededAnswers = prePurchaseIntakeSeed?.answers ?? {};
    const intakeAnswers = client?.intake?.answers ?? seededAnswers;
    if (clientLoaded) parts.push(`Client loaded: yes`);
    if (firstName) parts.push(`Client name: ${firstName}`);
    const targetRole =
      wiki?.target_role ||
      (typeof intakeAnswers.current_or_target_job_title === 'string'
        ? intakeAnswers.current_or_target_job_title
        : typeof intakeAnswers.target_title === 'string'
          ? intakeAnswers.target_title
          : '');
    if (targetRole) parts.push(`Target role: ${targetRole}`);
    if (typeof intakeAnswers.target_sector === 'string') {
      parts.push(`Target sector: ${intakeAnswers.target_sector}`);
    }
    if (typeof intakeAnswers.comp_range === 'string') {
      parts.push(`Compensation range: ${intakeAnswers.comp_range}`);
    }
    if (typeof intakeAnswers.desired_outcome === 'string') {
      parts.push(`Desired outcome: ${intakeAnswers.desired_outcome}`);
    }
    if (typeof intakeAnswers.selected_package === 'string') {
      parts.push(`Selected package: ${intakeAnswers.selected_package}`);
    }
    if (typeof intakeAnswers.selected_offerings === 'string') {
      parts.push(`Selected offerings: ${intakeAnswers.selected_offerings}`);
    }
    if (typeof intakeAnswers.one_time_total === 'string') {
      parts.push(`One-time total: ${intakeAnswers.one_time_total}`);
    }
    if (typeof intakeAnswers.monthly_total === 'string') {
      parts.push(`Monthly total: ${intakeAnswers.monthly_total}`);
    }
    if (intakeAnswers.add_concierge_upgrade === true) {
      parts.push('MyConcierge upgrade: selected');
    }
    if (typeof intakeAnswers.linkedin_profile === 'string') {
      parts.push(`LinkedIn profile supplied: yes`);
    }
    if (wiki?.focus_label) parts.push(`Focus: ${wiki.focus_label}`);
    if (wiki?.sections.length) {
      parts.push(`Compiled wiki sections: ${wiki.sections.map((section) => section.key).join(', ')}`);
    }
    parts.push(wiki?.intake_complete || client?.intake?.completed_at ? 'Intake status: complete' : 'Intake status: not yet complete');
    if (isAdminUser) parts.push('Session type: operator');
    return parts.join('\n');
  }, [client?.intake?.answers, client?.intake?.completed_at, clientLoaded, firstName, isAdminUser, prePurchaseIntakeSeed, wiki]);

  const shellGhostCallbacks: GhostCallbacks = useMemo(
    () => ({
      onNavigateModule: (target) => {
        if (target === 'brief') {
          issueCanvasCommand('dna_reveal', {
            donnaText: "Here's where you stand.",
            notice: 'Donna opened the brief inline.',
          });
          return 'Brief opened inline in Donna.';
        }
        if (target === 'plan') {
          issueCanvasCommand('plan_active', {
            donnaText: "Here's the sequence.",
            notice: 'Donna opened the plan inline.',
          });
          return 'Plan opened inline in Donna.';
        }
        if (target === 'intake') {
          issueCanvasCommand('intake_inline', {
            donnaText: "Good choice. Let's get you calibrated.",
            notice: 'Smart Start is active in Donna.',
          });
          return 'Smart Start opened inline in Donna.';
        }
        return `The ${target} module is available from Open full view when needed.`;
      },
      onCloseModule: () => {
        setVoiceOpen(false);
        return 'Closing live session.';
      },
      onToggleAdmin: () => {
        onOpenAdmin?.();
        return 'Opening admin.';
      },
      onDispatchAgent: (codename) => `Dispatch requested for ${codename}.`,
      onUpdateStance: (stance) => `Stance update requested: ${stance}.`,
      onAddressGap: (gapId) => `Gap update requested for ${gapId}.`,
      onFocusIntakeField: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna focused Smart Start inline.' });
        return 'Smart Start is active in Donna.';
      },
      onJumpIntakeScreen: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna moved Smart Start to the requested act.' });
        return 'Smart Start is active in Donna.';
      },
      onSetIntakeTextField: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna staged a Smart Start text update.' });
        return 'Smart Start update staged in Donna.';
      },
      onSetIntakeChoiceField: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna staged a Smart Start choice update.' });
        return 'Smart Start update staged in Donna.';
      },
      onSetIntakeMultiField: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna staged a Smart Start multi-choice update.' });
        return 'Smart Start update staged in Donna.';
      },
      onSetIntakeBooleanField: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna staged a Smart Start boolean update.' });
        return 'Smart Start update staged in Donna.';
      },
      onClearIntakeField: () => 'Field clear requested.',
      onSetIntentRoute: () => {
        issueCanvasCommand('intake_inline', { notice: 'Donna updated the Smart Start route.' });
        return 'Smart Start route staged in Donna.';
      },
      onSetSupportPreference: () => 'Preference update requested.',
      onSummarizeIntakeState: () =>
        wiki?.intake_complete || client?.intake?.completed_at
          ? 'Intake is already complete.'
          : 'Smart Start is ready to begin.',
    }),
    [client?.intake?.completed_at, onOpenAdmin, wiki?.intake_complete]
  );

  const liveSessionPanel =
    voiceOpen && user ? (
      activePanel === 'elevenlabs' ? (
        <ElevenLabsConvaiPanel
          agentId={elevenlabsAgentId}
          userUid={user.uid}
          sessionContext={sessionContext}
          ghostCallbacks={shellGhostCallbacks}
        />
      ) : (
        <GeminiLivePanel
          layout="compact"
          sessionContext={sessionContext}
          surfaceHint="shell"
          ghostCallbacks={shellGhostCallbacks}
          transcriptVisible={publicConfig.professional_dna.voice_transcription_visible}
          autoStart={Boolean(liveLaunchId)}
          launchId={liveLaunchId ?? undefined}
          initialMicStream={initialLiveMicStream}
          onInitialMicStreamConsumed={() => setInitialLiveMicStream(null)}
          openingTurnText={donnaConfig.opening_turn_text}
          diagnosticsVisible={liveDiagnosticsVisible && donnaConfig.live_dock_detail_level === 'diagnostic'}
          onDiagnosticEvent={appendLiveDiagnostic}
        />
      )
    ) : null;

  const suiteFallback = (
    <div className="flex min-h-screen items-center justify-center px-6 py-16 text-[#28211E]">
      <div className="max-w-xl border border-black/10 bg-[#FBF8F2] px-8 py-8 text-center shadow-[0_24px_48px_-36px_rgba(0,0,0,0.22)]">
        <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#5FAF95]">
          Career Concierge OS
        </div>
        <div className="mt-3 text-3xl font-editorial italic">
          The suite is staged behind Donna.
        </div>
        <div className="mt-4 text-sm leading-7 text-black/60">
          Stay in the guided line until you need the full operating surface.
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07161A]">
      <SceneRail scene={scene} />
      <div className="flex h-screen flex-col">
        <div className="flex h-8 items-center justify-between border-b border-[#22424A] px-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8DD9BF]" />
            <span className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
              DONNA
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceOpen) {
                      setVoiceOpen(false);
                      setVoiceLaunchPending(false);
                      initialLiveMicStream?.getTracks().forEach((track) => track.stop());
                      setInitialLiveMicStream(null);
                      return;
                    }
                    void startLiveSessionFromDonna();
                  }}
                  className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7] transition-colors hover:text-[#DCE7E8]"
                >
                  {voiceOpen ? 'Close Live Session' : voiceLaunchPending ? 'Opening Voice' : 'Talk to Donna'}
                </button>
                {isAdminUser ? (
                  <button
                    type="button"
                    onClick={() => onOpenAdmin?.()}
                    className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7] transition-colors hover:text-[#DCE7E8]"
                  >
                    Admin
                  </button>
                ) : null}
                {donnaConfig.suite_escape_visible || isAdminUser ? (
                  <button
                    type="button"
                    onClick={() => setOsOpen(true)}
                    className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7]/60 transition-opacity hover:text-[#8EA3A7]"
                  >
                    Open Suite ↗
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-h-0">
            <DonnaChatLane
              user={user}
              client={client}
              wiki={wiki}
              memory={memory}
              publicConfig={publicConfig}
              brand={brand}
              isAdminUser={isAdminUser}
              onOpenModule={openSuiteModule}
              onAuthRequest={setAuthCardMode}
              onShowSuite={() => setOsOpen(true)}
              onOpenWiki={(focusedKey) => {
                setWikiFocusedKey(focusedKey ?? null);
                setWikiDrawerOpen(true);
              }}
              onSceneChange={setScene}
              onStartLiveSession={() => void startLiveSessionFromDonna()}
              onEndLiveSession={() => {
                setVoiceOpen(false);
                setVoiceLaunchPending(false);
                initialLiveMicStream?.getTracks().forEach((track) => track.stop());
                setInitialLiveMicStream(null);
              }}
              onPrePurchaseIntakeSeed={setPrePurchaseIntakeSeed}
              canvasCommand={canvasCommand}
              liveSessionActive={voiceOpen}
              liveSessionLaunching={voiceLaunchPending}
              liveSessionContent={liveSessionPanel}
              liveDiagnostics={liveDiagnostics}
              liveDiagnosticsVisible={liveDiagnosticsVisible}
            >
              {authCardMode ? (
                <AuthCard
                  mode={authCardMode}
                  registrationSeed={authCardMode === 'register' ? prePurchaseIntakeSeed : null}
                  onSuccess={() => {
                    const selectedPackage = prePurchaseIntakeSeed?.answers.selected_package;
                    const selectedOfferings = prePurchaseIntakeSeed?.answers.selected_offerings;
                    setAuthCardMode(null);
                    issueCanvasCommand('concierge_sync', {
                      donnaText: selectedOfferings
                        ? `Your ${selectedPackage || 'Career Concierge'} suite is secured. I have the selected offerings and will keep the next step here.`
                        : 'Your Career Concierge suite is secured. I will keep the next step here.',
                      notice: 'Donna saved the pre-purchase context.',
                    });
                    setPrePurchaseIntakeSeed(null);
                  }}
                  onDismiss={() => setAuthCardMode(null)}
                  onToggleMode={() =>
                    setAuthCardMode((current) => (current === 'login' ? 'register' : 'login'))
                  }
                />
              ) : null}
              <WikiDrawer
                sections={wiki?.sections ?? []}
                focusedKey={wikiFocusedKey}
                open={wikiDrawerOpen}
                onClose={() => setWikiDrawerOpen(false)}
              />
            </DonnaChatLane>
        </div>
      </div>

      <AnimatePresence>
        {osOpen ? (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={overlaySpring}
            className="fixed inset-0 z-40 overflow-y-auto bg-[#F4F1EB]"
          >
            <button
              type="button"
              onClick={() => setOsOpen(false)}
              className="fixed left-4 top-4 z-[70] border border-black/10 bg-white/75 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#28211E] shadow-[0_14px_32px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm"
            >
              ← Donna
            </button>
            {suiteContent ?? suiteFallback}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

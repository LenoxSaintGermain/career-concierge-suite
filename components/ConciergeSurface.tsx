import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandConfig, ClientDoc, ClientWiki, PublicConfig, SuiteModuleId } from '../types';
import { GeminiLivePanel } from './GeminiLivePanel';
import { ElevenLabsConvaiPanel } from './ElevenLabsConvaiPanel';
import { AmbientGuide } from './AmbientGuide';
import { A2UICard } from './A2UICard';
import type { GhostCallbacks } from '../hooks/useGhostVoice';
import { hexToRgba } from '../config/brandSystem.js';

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const toText = (value: unknown) => String(value ?? '').trim();

const getFirstName = (client: ClientDoc | null, user: User | null) => {
  const display = toText(client?.display_name) || toText(client?.demo_profile?.name);
  if (display) return display.split(/\s+/)[0];
  const intakeName = toText(client?.intake?.answers?.name as string | undefined);
  if (intakeName) return intakeName.split(/\s+/)[0];
  return null;
};

const getTargetRole = (client: ClientDoc | null) => {
  const answers = (client?.intake?.answers ?? {}) as Record<string, unknown>;
  return (
    toText(answers.current_or_target_job_title) ||
    toText(answers.target_title) ||
    toText(answers.current_title) ||
    ''
  );
};

interface ConciergeSurfaceProps {
  client: ClientDoc | null;
  wiki?: ClientWiki | null;
  user: User | null;
  intakeComplete: boolean;
  publicConfig: PublicConfig;
  brand: BrandConfig;
  isAdminUser: boolean;
  onOpenModule: (id: SuiteModuleId) => void;
  // Journey Guide passthrough
  journeyGuideOpen: boolean;
  journeyGuideDismissed: boolean;
  journeyGuideHintMessage: string;
  onToggleJourneyGuide: () => void;
}

export function ConciergeSurface({
  client,
  wiki = null,
  user,
  intakeComplete,
  publicConfig,
  brand,
  isAdminUser,
  onOpenModule,
  journeyGuideOpen,
  journeyGuideDismissed,
  journeyGuideHintMessage,
  onToggleJourneyGuide,
}: ConciergeSurfaceProps) {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<'brief' | 'plan' | null>(null);

  const firstName = useMemo(() => getFirstName(client, user), [client, user]);
  const targetRole = useMemo(() => getTargetRole(client), [client]);
  const timeOfDay = getTimeOfDay();

  const greeting = firstName
    ? `Good ${timeOfDay}, ${firstName}.`
    : `Good ${timeOfDay}.`;

  const statusLine = useMemo(() => {
    if (!intakeComplete) return 'Your suite is ready for calibration.';
    if (targetRole) return `Your brief is current. Optimizing for ${targetRole}.`;
    return 'Your suite is active.';
  }, [intakeComplete, targetRole]);

  const bestNextStepLabel = useMemo(() => {
    if (!intakeComplete) return 'Begin Smart Start';
    return 'Open Your Brief';
  }, [intakeComplete]);

  const wikiCards = useMemo(() => {
    const preferred = ['positioning', 'evidence', 'artifacts'];
    const sections = wiki?.sections ?? [];
    const sorted = [
      ...preferred
        .map((key) => sections.find((section) => section.key.toLowerCase().includes(key)))
        .filter(Boolean),
      ...sections.filter(
        (section) => !preferred.some((key) => section.key.toLowerCase().includes(key))
      ),
    ] as NonNullable<ClientWiki['sections']>;
    return sorted.slice(0, 3);
  }, [wiki?.sections]);

  const secondaryChips = useMemo(() => {
    if (!intakeComplete) return [];
    return ['Start a live session', "What's in my brief"].slice(0, 2);
  }, [intakeComplete]);

  const activePanel = publicConfig.voice.active_panel;
  const elevenlabsAgentId = publicConfig.voice.elevenlabs_agent_id || '';

  // Legacy surface guard: if this filing-cabinet surface is ever reintroduced,
  // Smart Start still belongs inside Donna's guided canvas, not a suite module.
  const shellGhostCallbacks: GhostCallbacks = useMemo(() => ({
    onNavigateModule: (target) => {
      if (target === 'intake') return 'Smart Start is available inline from Donna.';
      onOpenModule(target as SuiteModuleId);
      return `${target} opened from the suite.`;
    },
    onCloseModule: () => { setVoiceOpen(false); },
    onToggleAdmin: () => {},
    onDispatchAgent: () => {},
    onUpdateStance: () => {},
    onAddressGap: () => {},
    onFocusIntakeField: () => 'Smart Start is available inline from Donna.',
    onJumpIntakeScreen: () => 'Smart Start is available inline from Donna.',
    onSetIntakeTextField: () => 'Smart Start is available inline from Donna.',
    onSetIntakeChoiceField: () => 'Smart Start is available inline from Donna.',
    onSetIntakeMultiField: () => 'Smart Start is available inline from Donna.',
    onSetIntakeBooleanField: () => 'Smart Start is available inline from Donna.',
    onClearIntakeField: () => {},
    onSetIntentRoute: () => 'Smart Start route changes are handled inline from Donna.',
    onSetSupportPreference: () => {},
    onSummarizeIntakeState: () => 'The client is currently in the suite home view.',
  }), [onOpenModule]);

  const sessionContext = useMemo(() => {
    const parts: string[] = [];
    if (firstName) parts.push(`Client name: ${firstName}`);
    if (targetRole) parts.push(`Target role: ${targetRole}`);
    parts.push(intakeComplete ? 'Intake status: complete' : 'Intake status: not yet started');
    if (isAdminUser) parts.push('Session type: operator');
    return parts.join('\n');
  }, [firstName, targetRole, intakeComplete, isAdminUser]);

  return (
    <div className="mb-8">
      {/* Greeting strip */}
      <div
        className="border p-5 sm:p-6 mb-4"
        style={{
          borderColor: hexToRgba(brand.colors.ink, 0.08),
          background: `linear-gradient(160deg, ${hexToRgba(brand.colors.accent, 0.04)}, transparent 60%)`,
          backgroundColor: brand.colors.surface_background,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] uppercase tracking-[0.28em] mb-2"
              style={{ color: brand.colors.accent_dark }}
            >
              Career Concierge
            </div>
            <div className="text-2xl font-editorial leading-tight md:text-3xl" style={{ color: brand.colors.ink }}>
              {greeting}
            </div>
            <div className="mt-1.5 text-sm leading-6 opacity-55" style={{ color: brand.colors.ink }}>
              {statusLine}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap sm:items-start">
            {/* One best next step */}
            <button
              type="button"
              onClick={() => {
                if (!intakeComplete) return;
                setActiveArtifact('brief');
              }}
              className="border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] transition-colors hover:opacity-90"
              style={{
                borderColor: hexToRgba(brand.colors.accent, 0.4),
                backgroundColor: hexToRgba(brand.colors.accent, 0.1),
                color: brand.colors.accent_dark,
              }}
            >
              {bestNextStepLabel} &rarr;
            </button>

            {/* Voice activation */}
            {publicConfig.professional_dna.voice_agent_enabled && (
              <button
                type="button"
                onClick={() => setVoiceOpen((v) => !v)}
                className="border px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] transition-colors"
                style={{
                  borderColor: voiceOpen
                    ? hexToRgba(brand.colors.accent, 0.5)
                    : hexToRgba(brand.colors.ink, 0.12),
                  backgroundColor: voiceOpen
                    ? hexToRgba(brand.colors.accent, 0.08)
                    : 'transparent',
                  color: voiceOpen ? brand.colors.accent_dark : hexToRgba(brand.colors.ink, 0.55),
                }}
              >
                {voiceOpen ? 'Close Session' : 'Start a Live Session'}
              </button>
            )}
          </div>
        </div>

        {/* Inline voice panel */}
        {voiceOpen && (
          <div
            className="mt-4 border-t pt-4"
            style={{ borderColor: hexToRgba(brand.colors.ink, 0.08) }}
          >
            {activePanel === 'elevenlabs' ? (
              <ElevenLabsConvaiPanel
                agentId={elevenlabsAgentId}
                userUid={user?.uid}
                sessionContext={sessionContext}
                ghostCallbacks={shellGhostCallbacks}
                onStateChange={(state) => {
                  if (state === 'idle') setVoiceOpen(false);
                }}
              />
            ) : (
              <GeminiLivePanel
                layout="compact"
                sessionContext={sessionContext}
                surfaceHint="shell"
                ghostCallbacks={shellGhostCallbacks}
                transcriptVisible={publicConfig.professional_dna.voice_transcription_visible}
                onStateChange={(state) => {
                  if (state === 'idle') setVoiceOpen(false);
                }}
              />
            )}
          </div>
        )}
      </div>

      {wikiCards.length ? (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {wikiCards.map((section, index) => (
            <A2UICard key={section.key} delay={index * 80}>
              <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8DD9BF]">
                {section.heading}
              </div>
              <p className="mt-3 font-body text-sm leading-6 text-[#DCE7E8]/85">
                {section.body.slice(0, 220)}
                {section.body.length > 220 ? '...' : ''}
              </p>
              <button
                type="button"
                onClick={() => setActiveArtifact('brief')}
                className="mt-4 font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
              >
                Donna, update this
              </button>
            </A2UICard>
          ))}
        </div>
      ) : null}

      {secondaryChips.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {secondaryChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (/live/i.test(chip)) {
                  setVoiceOpen(true);
                } else {
                  setActiveArtifact('brief');
                }
              }}
              className="font-data text-[10px] uppercase tracking-[0.22em] opacity-30 transition-opacity hover:opacity-70"
              style={{ color: brand.colors.ink }}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {activeArtifact ? (
          <motion.div
            key={activeArtifact}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.9 }}
            className="mb-4"
          >
            <A2UICard>
              <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
                {activeArtifact === 'brief' ? 'Brief artifact' : 'Plan artifact'}
              </div>
              <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
                {activeArtifact === 'brief' ? "Here's where you stand." : "Here's the sequence."}
              </h3>
              <p className="mt-3 font-body text-sm leading-7 text-[#8EA3A7]">
                {activeArtifact === 'brief'
                  ? statusLine
                  : 'Start with the highest-signal move, update the proof artifact, then use the live concierge layer to pressure-test the next step.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onOpenModule(activeArtifact)}
                  className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
                >
                  Open full view ↗
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArtifact(null)}
                  className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/50 transition-colors hover:text-[#DCE7E8]"
                >
                  Dismiss
                </button>
              </div>
            </A2UICard>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Journey Guide toggle — passes through to App.tsx state */}
      <div>
        <AmbientGuide
          label="Journey guide"
          message={journeyGuideHintMessage}
          align="right"
          delayMs={520}
        >
          <button
            type="button"
            onClick={onToggleJourneyGuide}
            className="w-full border px-4 py-3 text-left transition-colors hover:bg-[#fbf8f0] sm:px-5"
            style={{
              borderColor: hexToRgba(brand.colors.ink, 0.1),
              backgroundColor: '#f7f3ea',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10px] uppercase tracking-[0.24em]"
                  style={{ color: brand.colors.accent_dark }}
                >
                  • Your Journey Guide
                </div>
                <div className="mt-1 text-sm opacity-60" style={{ color: brand.colors.ink }}>
                  {journeyGuideDismissed
                    ? 'Return to the journey overview.'
                    : 'See how your suite is staged for your next move.'}
                </div>
              </div>
              <div
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: hexToRgba(brand.colors.ink, 0.36) }}
              >
                {journeyGuideOpen ? 'Close ×' : 'Reveal →'}
              </div>
            </div>
          </button>
        </AmbientGuide>
      </div>
    </div>
  );
}

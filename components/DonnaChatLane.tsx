import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User } from 'firebase/auth';
import {
  BrandConfig,
  ClientDoc,
  ClientIntent,
  ClientMemory,
  ClientPreferences,
  ClientWiki,
  IntakeAnswers,
  MessageRecord,
  PublicConfig,
  SuiteModuleId,
} from '../types';
import { writeSessionMessage, endSession } from '../services/memoryService';
import { A2UICard } from './A2UICard';
import { IntakeFlow } from './IntakeFlow';
import { PackageSelectCards } from './PackageSelectCards';
import type { DonnaScene } from './SceneRail';

// ─── Motion constants ─────────────────────────────────────────────────────────
const SPRING = { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 } as const;
const A2UI_ENTER = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -8 },
  transition: { type: 'spring', stiffness: 240, damping: 24, mass: 0.9 },
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
type DonnaState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type DonnaCanvasState =
  | 'landing'
  | 'package_selection'
  | 'intake_inline'
  | 'dna_processing'
  | 'dna_reveal'
  | 'plan_active'
  | 'concierge_sync';

export interface DonnaCanvasCommand {
  id: number;
  state: DonnaCanvasState;
  userText?: string;
  donnaText?: string;
  notice?: string;
}

type DonnaMessage = {
  id: string;
  role: 'donna' | 'user';
  text: string;
};

const STATUS_DOT: Record<DonnaState, string> = {
  idle: 'bg-[#8DD9BF]/30',
  listening: 'bg-[#8DD9BF] animate-[pulse_1.8s_ease-in-out_infinite]',
  thinking: 'bg-[#8DD9BF]/60 animate-[pulse_0.9s_ease-in-out_infinite]',
  speaking: 'bg-[#8DD9BF] animate-[pulse_1.2s_ease-in-out_infinite]',
};

const STATUS_LABEL: Record<DonnaState, string> = {
  idle: 'Standby',
  listening: 'Listening',
  thinking: 'Composing',
  speaking: 'Speaking',
};

const ORB_ANIMATION: Record<DonnaState, string> = {
  idle: 'donnaBreathe 4s ease-in-out infinite',
  listening: 'donnaListen 1.8s ease-in-out infinite',
  thinking: 'donnaThink 0.9s ease-in-out infinite',
  speaking: 'donnaBreathe 2s ease-in-out infinite',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function DonnaWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-[10px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-[#8DD9BF] rounded-sm"
          animate={
            active
              ? {
                  height: ['3px', '10px', '3px'],
                  transition: {
                    duration: 0.6,
                    delay: i * 0.1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }
              : { height: '3px' }
          }
        />
      ))}
    </div>
  );
}

// Splits Donna text on sentence boundaries and staggers each sentence
// primary = first visible message — renders at editorial scale
function DonnaSentences({ text, primary = false }: { text: string; primary?: boolean }) {
  const sentences = text
    .split(/(?<=\.|\?|!)\s+|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const baseCls = primary
    ? 'font-editorial italic text-[22px] md:text-[26px] leading-[1.45] text-[#DCE7E8]'
    : 'font-editorial italic text-[17px] leading-[1.7] text-[#DCE7E8]';

  if (sentences.length <= 1) {
    return <p className={baseCls}>{text}</p>;
  }

  return (
    <div className="space-y-1.5">
      {sentences.map((sentence, i) => (
        <motion.p
          key={i}
          className={baseCls}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: i * 0.14 }}
        >
          {sentence}
        </motion.p>
      ))}
    </div>
  );
}

// Full-width waveform bar field — used in the concierge sync card
function DonnaBarfield({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-[20px] w-full overflow-hidden my-5 px-0.5">
      {Array.from({ length: 38 }, (_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-[1px]"
          style={{ background: '#8DD9BF', minWidth: '2px' }}
          animate={
            active
              ? {
                  height: ['3px', `${4 + Math.abs(Math.sin(i * 0.52 + 0.3)) * 14 + 2}px`, '3px'],
                  opacity: [0.18, 0.55, 0.18],
                }
              : { height: '2px', opacity: 0.14 }
          }
          transition={
            active
              ? { duration: 1.6, delay: (i % 10) * 0.072, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const getFirstName = (
  client: ClientDoc | null,
  wiki: ClientWiki | null,
  user: User | null
) =>
  wiki?.first_name ||
  client?.display_name?.split(/\s+/)[0] ||
  client?.demo_profile?.name?.split(/\s+/)[0] ||
  user?.displayName?.split(/\s+/)[0] ||
  null;

function buildOpeningMessage(
  user: User | null,
  client: ClientDoc | null,
  wiki: ClientWiki | null,
  memory: ClientMemory | null
): string {
  const firstName = getFirstName(client, wiki, user);
  const timeOfDay = getTimeOfDay();
  const name = firstName ? `, ${firstName}` : '';

  if (!user) {
    return `Good ${timeOfDay}. I'm Donna — your career concierge. Tell me where you are right now, and I'll take it from there.`;
  }

  if (memory && memory.session_count >= 2 && memory.arc_summary) {
    const lastHigh = memory.entries.find((e) => e.weight === 'high');
    return `Good ${timeOfDay}${name}. ${memory.arc_summary}\n${lastHigh ? `Last time: ${lastHigh.body}.` : ''}\nWhat's the priority today?`;
  }

  if (!wiki?.intake_complete) {
    return `Good ${timeOfDay}${name}. Your suite is staged.\nOne conversation calibrates everything.\nReady when you are.`;
  }

  return `Good ${timeOfDay}${name}.\nOpen the line when you are ready.\nI will pull what I need while we talk.`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface DonnaChatLaneProps {
  user: User | null;
  client: ClientDoc | null;
  wiki: ClientWiki | null;
  memory?: ClientMemory | null;
  publicConfig: PublicConfig;
  brand: BrandConfig;
  isAdminUser: boolean;
  onOpenModule: (id: SuiteModuleId) => void;
  onAuthRequest: (mode: 'login' | 'register') => void;
  onShowSuite?: () => void;
  onOpenWiki?: (focusedKey?: string | null) => void;
  onSceneChange?: (scene: DonnaScene) => void;
  onStartLiveSession?: () => void;
  onEndLiveSession?: () => void;
  onPrePurchaseIntakeSeed?: (
    payload: { intent: ClientIntent; preferences: ClientPreferences; answers: IntakeAnswers } | null
  ) => void;
  canvasCommand?: DonnaCanvasCommand | null;
  liveSessionActive?: boolean;
  liveSessionLaunching?: boolean;
  liveSessionContent?: React.ReactNode;
  children?: React.ReactNode;
}

const JOURNEY_A_COPY = {
  exploring:
    "Most people who say they're exploring already know what needs to change. They're just looking for a frame where that's not a gamble. That's what the suite is for.\n\nWhat's the thing that's not moving the way it should?",
  explain:
    'Career Concierge is a private intelligence layer for your career. Not a job board. Not a coaching platform. A concierge — which means we do the thinking, the structuring, and the sequencing so you can focus on the execution.\n\nSmart Start is a 10-minute session that calibrates the system to you. Everything else unlocks from there.',
  ready: "Good. Let me show you what's available.",
};

const getTargetRole = (client: ClientDoc | null, wiki: ClientWiki | null) => {
  const answers = client?.intake?.answers ?? {};
  const answerRole =
    typeof answers.current_or_target_job_title === 'string'
      ? answers.current_or_target_job_title
      : typeof answers.target_title === 'string'
        ? answers.target_title
        : '';
  return wiki?.target_role || answerRole || 'your next role';
};

const getBriefExcerpt = (client: ClientDoc | null, wiki: ClientWiki | null) => {
  const positioning =
    wiki?.sections.find((section) => /position/i.test(section.key) || /position/i.test(section.heading))
      ?.body ||
    client?.demo_profile?.archetype ||
    'You are building a clearer career signal around the work that already has momentum.';
  const evidence =
    wiki?.sections.find((section) => /evidence|strength|artifact/i.test(`${section.key} ${section.heading}`))
      ?.body || 'Your current evidence points to pattern recognition, execution discipline, and sharper positioning.';

  return {
    positioning: positioning.slice(0, 260),
    strengths: evidence
      .split(/\.|\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 2),
  };
};

// ─── Component ────────────────────────────────────────────────────────────────
export function DonnaChatLane({
  user,
  client,
  wiki,
  memory = null,
  publicConfig,
  brand,
  isAdminUser,
  onOpenModule,
  onAuthRequest,
  onShowSuite,
  onOpenWiki,
  onSceneChange,
  onStartLiveSession,
  onEndLiveSession,
  onPrePurchaseIntakeSeed,
  canvasCommand = null,
  liveSessionActive = false,
  liveSessionLaunching = false,
  liveSessionContent,
  children,
}: DonnaChatLaneProps) {
  const [messages, setMessages] = useState<DonnaMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [donnaState, setDonnaState] = useState<DonnaState>('idle');
  const [donnaThinking, setDonnaThinking] = useState(false);
  const [blooming, setBlooming] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [canvasState, setCanvasState] = useState<DonnaCanvasState>('landing');
  const [canvasSlotVisible, setCanvasSlotVisible] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState<'smart_start' | 'premier' | 'cjs' | null>(null);
  const [inlineAuthVisible, setInlineAuthVisible] = useState(false);
  const [toolNotice, setToolNotice] = useState<string | null>(null);
  const [prePurchaseAnswers, setPrePurchaseAnswers] = useState({
    targetRole: '',
    pressure: '',
    proof: '',
    supportPace: 'standard',
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intakeComplete = Boolean(client?.intake?.completed_at || wiki?.intake_complete);

  const quickActions = useMemo(() => {
    if (!user) {
      return [
        { label: "I'm exploring", action: 'exploring' as const },
        { label: "I'm ready to begin", action: 'ready' as const },
        { label: 'Tell me what this is', action: 'explain' as const },
      ];
    }
    if (!intakeComplete) {
      return [
        { label: 'Begin Smart Start →', action: 'intake' as const },
      ];
    }
    return [
      { label: 'Talk to Donna now', action: 'live' as const },
      { label: 'Open Your Brief →', action: 'brief' as const },
      { label: 'Open Your Plan →', action: 'plan' as const },
    ];
  }, [intakeComplete, user]);

  const openingMessage = useMemo(
    () => buildOpeningMessage(user, client, wiki, memory),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.uid, wiki?.compiled_at, memory?.compiled_at]
  );

  // Seed opening message
  useEffect(() => {
    const msg: DonnaMessage = { id: buildId(), role: 'donna', text: openingMessage };
    setMessages([msg]);
    // Authenticated + intake complete → concierge_sync is the primary surface (no wiki cards)
    if (user && intakeComplete) {
      setCanvasState('concierge_sync');
      setShowQuickActions(false);
    } else {
      setCanvasState('landing');
      setShowQuickActions(true);
    }
    setCanvasSlotVisible(true);
    if (user) {
      writeSessionMessage(sessionIdRef.current, {
        id: msg.id,
        role: 'donna',
        body: msg.text,
        timestamp: Date.now(),
        kind: 'text',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openingMessage, user, intakeComplete]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // End session on unmount
  useEffect(() => {
    const sid = sessionIdRef.current;
    return () => {
      if (canvasTimerRef.current) clearTimeout(canvasTimerRef.current);
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
      if (user) endSession(sid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCanvasTransition = useCallback(
    (next: DonnaCanvasState) => {
      if (canvasTimerRef.current) clearTimeout(canvasTimerRef.current);
      setCanvasSlotVisible(false);
      canvasTimerRef.current = setTimeout(() => {
        setCanvasState(next);
        setCanvasSlotVisible(true);
        if (next !== 'dna_reveal') setInlineAuthVisible(false);
        if (next !== 'landing') onSceneChange?.('co_design');
      }, 300);
    },
    [onSceneChange]
  );

  useEffect(() => {
    if (!user || !liveSessionActive || canvasState === 'concierge_sync') return;
    handleCanvasTransition('concierge_sync');
  }, [canvasState, handleCanvasTransition, liveSessionActive, user]);

  const deliverDonnaResponse = useCallback(
    (userText: string, donnaText: string, kind: MessageRecord['kind'] = 'text') => {
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
      setDonnaThinking(true);
      setDonnaState('thinking');

      thinkTimerRef.current = setTimeout(() => {
        setDonnaThinking(false);
        const donnaMsg: DonnaMessage = { id: buildId(), role: 'donna', text: donnaText };
        setMessages((prev) => [...prev, donnaMsg]);
        setDonnaState('speaking');

        if (user) {
          writeSessionMessage(sessionIdRef.current, {
            id: donnaMsg.id,
            role: 'donna',
            body: donnaText,
            timestamp: Date.now(),
            kind,
          });
        }

        setTimeout(() => setDonnaState('idle'), 1500);
      }, 420);
    },
    [user]
  );

  const pushExchange = useCallback(
    (
      userText: string,
      donnaText: string,
      kind: MessageRecord['kind'] = 'chip_action',
      options: { keepQuickActions?: boolean } = {}
    ) => {
      const userMsg: DonnaMessage = { id: buildId(), role: 'user', text: userText };
      setMessages((prev) => [...prev, userMsg]);
      setShowQuickActions(Boolean(options.keepQuickActions));

      if (user) {
        writeSessionMessage(sessionIdRef.current, {
          id: userMsg.id,
          role: 'user',
          body: userText,
          timestamp: Date.now(),
          kind,
        });
      }

      deliverDonnaResponse(userText, donnaText, kind);
    },
    [deliverDonnaResponse, user]
  );

  useEffect(() => {
    if (canvasState !== 'dna_processing' || !canvasSlotVisible) return;
    deliverDonnaResponse('', "Here's what I have on you.", 'a2ui_trigger');
    const timer = setTimeout(() => handleCanvasTransition('dna_reveal'), 3000);
    return () => clearTimeout(timer);
  }, [canvasSlotVisible, canvasState, deliverDonnaResponse, handleCanvasTransition]);

  useEffect(() => {
    if (!canvasCommand) return;
    setToolNotice(canvasCommand.notice ?? null);
    if (canvasCommand.userText && canvasCommand.donnaText) {
      pushExchange(canvasCommand.userText, canvasCommand.donnaText, 'a2ui_trigger');
    } else if (canvasCommand.donnaText) {
      deliverDonnaResponse('', canvasCommand.donnaText, 'a2ui_trigger');
    }
    handleCanvasTransition(canvasCommand.state);
  }, [canvasCommand, deliverDonnaResponse, handleCanvasTransition, pushExchange]);

  const handleQuickAction = (
    action: (typeof quickActions)[number]['action'],
    label: string
  ) => {
    if (action === 'exploring') {
      pushExchange("I'm exploring.", JOURNEY_A_COPY.exploring, 'chip_action', {
        keepQuickActions: true,
      });
      onSceneChange?.('calibration');
      return;
    }
    if (action === 'explain') {
      pushExchange('Tell me what this is.', JOURNEY_A_COPY.explain, 'chip_action', {
        keepQuickActions: true,
      });
      onSceneChange?.('calibration');
      return;
    }
    if (action === 'ready') {
      pushExchange("I'm ready to begin.", JOURNEY_A_COPY.ready);
      handleCanvasTransition('package_selection');
      return;
    }
    if (action === 'live') {
      if (!user) {
        pushExchange(label, 'I can open the live lane as soon as you sign in. I have your access card ready.');
        onAuthRequest('login');
      } else {
        pushExchange(label, 'Opening the live line now.');
        handleCanvasTransition('concierge_sync');
        onStartLiveSession?.();
      }
      return;
    }
    if (action === 'intake') {
      pushExchange(label, "Good choice. Let's get you calibrated.");
      handleCanvasTransition('intake_inline');
      return;
    }
    if (action === 'brief') {
      pushExchange(label, "Here's where you stand.");
      handleCanvasTransition('dna_reveal');
      return;
    }
    pushExchange(label, "Here's the sequence.");
    handleCanvasTransition('plan_active');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    const lowered = text.toLowerCase();
    setInputValue('');
    setComposerExpanded(false);

    // Bloom effect
    setBlooming(true);
    setTimeout(() => setBlooming(false), 680);

    // Add user message immediately
    const userMsg: DonnaMessage = { id: buildId(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setShowQuickActions(false);
    setDonnaState('thinking');

    if (user) {
      writeSessionMessage(sessionIdRef.current, {
        id: userMsg.id,
        role: 'user',
        body: text,
        timestamp: Date.now(),
        kind: 'text',
      });
    }

    // Route and respond
    let donnaReply = '';

    if (!user) {
      if (/exploring|looking around|not sure/.test(lowered)) {
        donnaReply = JOURNEY_A_COPY.exploring;
        setShowQuickActions(true);
        setTimeout(() => onSceneChange?.('calibration'), 500);
      } else if (/(what is this|tell me what this is|what this is|explain)/.test(lowered)) {
        donnaReply = JOURNEY_A_COPY.explain;
        setShowQuickActions(true);
        setTimeout(() => onSceneChange?.('calibration'), 500);
      } else if (/(ready|begin|smart start|start)/.test(lowered)) {
        donnaReply = JOURNEY_A_COPY.ready;
        setTimeout(() => handleCanvasTransition('package_selection'), 500);
      } else if (/(voice|live|talk|mic|microphone|session)/.test(lowered)) {
        donnaReply = 'I can open the live lane as soon as you sign in. I have your access card ready.';
        setTimeout(() => onAuthRequest('login'), 500);
      } else if (/(account|login|log in|sign in)/.test(lowered)) {
        donnaReply = 'I have your sign-in card ready.';
        setTimeout(() => onAuthRequest('login'), 500);
      } else {
        donnaReply = "Tell me where things are stuck, or say you're ready to begin and I will stage the right path here.";
      }
    } else if (!intakeComplete) {
      if (/(suite|show me the suite|open suite)/.test(lowered)) {
        donnaReply = 'The suite is the filing cabinet. Stay here and I will stage Smart Start first.';
      } else if (/(start|begin|intake|smart start|calibrate)/.test(lowered)) {
        donnaReply = "Good choice. Let's get you calibrated.";
        setTimeout(() => handleCanvasTransition('intake_inline'), 500);
      } else {
        donnaReply = 'One Smart Start calibrates everything. Say begin when you want me to open it, or ask to see the suite first.';
      }
    } else if (/(brief)/.test(lowered)) {
      donnaReply = "Here's where you stand.";
      setTimeout(() => handleCanvasTransition('dna_reveal'), 500);
    } else if (/(plan|today|next|what should i do)/.test(lowered)) {
      donnaReply = "Here's the sequence.";
      setTimeout(() => handleCanvasTransition('plan_active'), 500);
    } else if (/(wiki|know about me|what do you know|context|knowledge)/.test(lowered)) {
      const focusedSection =
        wiki?.sections.find(
          (s) =>
            lowered.includes(s.key.toLowerCase()) ||
            lowered.includes(s.heading.toLowerCase())
        )?.key ?? null;
      donnaReply = 'Showing the compiled client knowledge I am working from.';
      setTimeout(() => onOpenWiki?.(focusedSection), 500);
    } else if (/(suite|show me the suite|open suite)/.test(lowered)) {
      donnaReply = 'The suite is available from the header when you want the filing cabinet. I can keep the work here in Donna.';
    } else {
      donnaReply = 'I can open your brief, your plan, or the suite. Ask me to show the knowledge I am working from if you want to see what I know.';
    }

    deliverDonnaResponse(text, donnaReply, 'text');
  };

  const handleInputFocus = () => {
    setComposerExpanded(true);
    if (!inputValue.trim() && donnaState === 'idle') setDonnaState('idle');
  };
  const handleInputBlur = () => {
    if (!inputValue.trim()) setComposerExpanded(false);
    if (donnaState === 'listening') setDonnaState('idle');
  };

  const handleVoicePress = () => {
    setBlooming(true);
    setTimeout(() => setBlooming(false), 680);

    // If live session is active, the orb is the END control
    if (liveSessionActive) {
      onEndLiveSession?.();
      return;
    }

    if (!user) {
      pushExchange('Talk to Donna.', 'Sign in first, then I can open the live line.');
      onAuthRequest('login');
      return;
    }

    setDonnaState('listening');
    // Only announce if we're transitioning — don't add noise if already on concierge_sync
    if (canvasState !== 'concierge_sync') {
      pushExchange('Talk to Donna.', 'Opening the live line now.');
    }
    handleCanvasTransition('concierge_sync');
    onStartLiveSession?.();
  };

  const startInlineIntake = () => {
    pushExchange('Begin Smart Start.', "Good choice. Let's get you calibrated.");
    handleCanvasTransition('intake_inline');
  };

  const briefExcerpt = getBriefExcerpt(client, wiki);
  const targetRole = getTargetRole(client, wiki);
  const selectedPackageLabel =
    selectedPackageId === 'premier'
      ? 'SkillSync Ai Premier'
      : selectedPackageId === 'cjs'
        ? 'Concierge Job Search'
        : 'Smart Start';

  const buildPrePurchaseSeed = useCallback(() => {
    const target = prePurchaseAnswers.targetRole.trim();
    const pressure = prePurchaseAnswers.pressure.trim();
    const proof = prePurchaseAnswers.proof.trim();
    const pace =
      prePurchaseAnswers.supportPace === 'straight' || prePurchaseAnswers.supportPace === 'story'
        ? prePurchaseAnswers.supportPace
        : 'standard';
    const focus = selectedPackageId === 'cjs' ? 'job_search' : selectedPackageId === 'premier' ? 'leadership' : 'skills';
    const answers: IntakeAnswers = {
      current_or_target_job_title: target,
      target_title: target,
      target: target || selectedPackageLabel,
      pressure_breaks: pressure,
      work_style: proof,
      constraints: `Selected package: ${selectedPackageLabel}`,
      pace,
      focus,
      pre_purchase_source: 'donna_a2ui_front_door',
      selected_package: selectedPackageId ?? 'smart_start',
    };

    return {
      intent: target ? ('target_role' as ClientIntent) : ('not_sure' as ClientIntent),
      preferences: {
        pace: pace as ClientPreferences['pace'],
        focus: focus as ClientPreferences['focus'],
      },
      answers,
    };
  }, [prePurchaseAnswers, selectedPackageId, selectedPackageLabel]);

  const renderA2UISlot = () => {
    if (!canvasSlotVisible) return null;

    if (canvasState === 'landing') {
      if (!user) return null;

      if (!intakeComplete) {
        return (
          <A2UICard>
            <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
              Your Journey Guide
            </div>
            <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
              Your suite is ready for calibration.
            </h3>
            <p className="mt-3 max-w-2xl font-body text-sm leading-7 text-[#8EA3A7]">
              Stay here with Donna. Smart Start will map the signal first, then the OS will file the
              brief, plan, and working context behind the scenes.
            </p>
            <button
              type="button"
              onClick={() => {
                pushExchange('Begin Smart Start.', "Good choice. Let's get you calibrated.");
                handleCanvasTransition('intake_inline');
              }}
              className="mt-5 border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
              style={{ borderRadius: 0 }}
            >
              Begin Smart Start →
            </button>
          </A2UICard>
        );
      }

      const preferredKeys = ['positioning', 'evidence', 'artifacts'];
      const wikiSections = wiki?.sections ?? [];
      const orderedSections = [
        ...preferredKeys
          .map((key) => wikiSections.find((section) => section.key.toLowerCase().includes(key)))
          .filter(Boolean),
        ...wikiSections.filter(
          (section) => !preferredKeys.some((key) => section.key.toLowerCase().includes(key))
        ),
      ].slice(0, 3);
      const fallbackSections =
        orderedSections.length > 0
          ? orderedSections
          : [
              {
                key: 'positioning',
                heading: 'Positioning',
                body: briefExcerpt.positioning,
              },
              {
                key: 'evidence',
                heading: 'Evidence',
                body:
                  briefExcerpt.strengths.join('. ') ||
                  'Your brief is current. The strongest signal is already filed in your suite.',
              },
              {
                key: 'next_step',
                heading: 'Next Step',
                body: memory?.arc_summary || `Optimizing for ${targetRole}. Start with the highest-signal move.`,
              },
            ];

      return (
        <div className="space-y-3">
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            Your Journey Guide
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {fallbackSections.map((section, index) => (
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
                  onClick={() =>
                    pushExchange(
                      'Donna, update this.',
                      'Tell me what changed, and I will treat it as new context for the next pass.'
                    )
                  }
                  className="mt-4 font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
                >
                  Donna, update this
                </button>
              </A2UICard>
            ))}
          </div>
        </div>
      );
    }

    if (canvasState === 'package_selection') {
      return (
        <PackageSelectCards
          onSelect={(packageId) => {
            setSelectedPackageId(packageId);
            startInlineIntake();
          }}
          onAskDonna={() =>
            pushExchange(
              'Help me choose',
              'Start with Smart Start. It gives us the signal map first; Premier and Concierge Job Search make more sense once the system knows what you are optimizing for.'
            )
          }
        />
      );
    }

    if (canvasState === 'intake_inline') {
      if (user) {
        return (
          <A2UICard className="max-h-[52vh] overflow-y-auto">
            <div className="mb-4 font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
              ACT 01: THE BASELINE
            </div>
            <IntakeFlow
              uid={user.uid}
              tier={client?.account?.tier ?? client?.demo_profile?.tier}
              client={client}
              isAdminUser={isAdminUser}
              voiceConfig={publicConfig.voice}
              intakeConfig={publicConfig.professional_dna}
              onComplete={() => {
                pushExchange('Smart Start is complete.', 'Give me a moment.', 'a2ui_trigger');
                handleCanvasTransition('dna_processing');
              }}
            />
          </A2UICard>
        );
      }

      return (
        <A2UICard>
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            ACT 01: THE BASELINE
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            Smart Start calibration
          </h3>
          <p className="mt-3 max-w-2xl font-body text-sm leading-7 text-[#8EA3A7]">
            You selected {selectedPackageLabel}. I will map the target role, pressure points,
            evidence, constraints, and pace of support in one guided pass. This will seed your suite
            if you create an account after the brief preview.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 01: TARGET
              </div>
              <input
                value={prePurchaseAnswers.targetRole}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, targetRole: event.target.value }))
                }
                placeholder="Target role or career direction"
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
              />
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 02: PRESSURE
              </div>
              <input
                value={prePurchaseAnswers.pressure}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, pressure: event.target.value }))
                }
                placeholder="What is not moving?"
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
              />
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 03: EVIDENCE
              </div>
              <input
                value={prePurchaseAnswers.proof}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, proof: event.target.value }))
                }
                placeholder="A proof point Donna should know"
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
              />
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 04: PACE
              </div>
              <select
                value={prePurchaseAnswers.supportPace}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, supportPace: event.target.value }))
                }
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none"
              >
                <option value="straight">Straight to the point</option>
                <option value="standard">Standard guidance</option>
                <option value="story">More context and story</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              onPrePurchaseIntakeSeed?.(buildPrePurchaseSeed());
              pushExchange('Finish Smart Start.', 'Give me a moment.', 'a2ui_trigger');
              handleCanvasTransition('dna_processing');
            }}
            className="mt-5 border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
            style={{ borderRadius: 0 }}
          >
            Map my Professional DNA →
          </button>
        </A2UICard>
      );
    }

    if (canvasState === 'dna_processing') {
      return (
        <A2UICard>
          <div className="font-data text-[9px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            ACT: MAPPING PROFESSIONAL DNA
          </div>
          <p className="mt-3 font-body text-sm text-[#8EA3A7]">
            Analyzing target: {targetRole}
          </p>
          <div className="mt-6 h-[3px] overflow-hidden bg-[#22424A]">
            <motion.div
              className="h-full bg-[#8DD9BF]"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </A2UICard>
      );
    }

    if (canvasState === 'dna_reveal') {
      return (
        <A2UICard>
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            Professional DNA brief
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            Here's what I have on you.
          </h3>
          <p className="mt-3 font-body text-sm leading-7 text-[#DCE7E8]/85">
            {briefExcerpt.positioning}
          </p>
          <div className="mt-5 space-y-2">
            {(briefExcerpt.strengths.length ? briefExcerpt.strengths : ['Your signal is strongest where experience, pattern recognition, and execution evidence overlap.']).map((strength) => (
              <div key={strength} className="border-l border-[#8DD9BF]/70 pl-3 font-body text-sm text-[#8EA3A7]">
                {strength}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (user) {
                  pushExchange('Continue the sequence.', "Here's the sequence.", 'a2ui_trigger');
                  handleCanvasTransition('plan_active');
                  return;
                }
                onPrePurchaseIntakeSeed?.(buildPrePurchaseSeed());
                setInlineAuthVisible(true);
                onAuthRequest('register');
                pushExchange('Create my suite.', 'One step. Then your suite is ready.', 'a2ui_trigger');
              }}
              className="border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
              style={{ borderRadius: 0 }}
            >
              {user ? 'Continue the sequence →' : 'Create my suite →'}
            </button>
            <button
              type="button"
              onClick={() =>
                pushExchange(
                  'Tell me more about this.',
                  'This is the short read. The full brief keeps the same signal but expands the evidence, target role logic, and next-step sequence.'
                )
              }
              className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
            >
              Tell me more about this
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => onOpenModule('brief')}
                className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
              >
                Open full view ↗
              </button>
            ) : null}
          </div>
          {!user && inlineAuthVisible ? (
            <div className="mt-6 border-t border-[#22424A] pt-5">
              <div className="mb-3 font-body text-sm leading-6 text-[#8EA3A7]">
                To save this and unlock your full suite, create your account.
              </div>
              {children}
            </div>
          ) : null}
        </A2UICard>
      );
    }

    if (canvasState === 'plan_active') {
      return (
        <A2UICard>
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            Active plan
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            Here's the sequence.
          </h3>
          <p className="mt-3 font-body text-sm leading-7 text-[#8EA3A7]">
            Start with the highest-signal move: clarify the target, update the proof artifact, then
            use the live concierge layer to pressure-test the next outreach or interview step.
          </p>
          <button
            type="button"
            onClick={() => onOpenModule('plan')}
            className="mt-5 font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
          >
            Open full view ↗
          </button>
        </A2UICard>
      );
    }

    if (canvasState === 'concierge_sync') {
      return (
        <A2UICard>
          <div className="flex items-center justify-between">
            <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
              Concierge Sync
            </div>
            <div className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/50">
              {liveSessionActive ? 'Connected' : 'Ready'}
            </div>
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            {liveSessionActive ? 'Listening.' : 'Start a live session here.'}
          </h3>
          <p className="mt-3 font-body text-sm leading-7 text-[#8EA3A7]">
            I will pull from the Career Concierge OS, your brief, plan, wiki, and saved context while
            we talk.
          </p>
          <DonnaBarfield active={liveSessionActive} />
          {liveSessionActive ? (
            <div className="border border-[#22424A]/60 bg-[#07161A]/50 px-4 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8EA3A7]">
                Live line open · pulling context
              </div>
            </div>
          ) : liveSessionLaunching ? (
            <div className="border border-[#22424A] bg-[#07161A]/60 px-4 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8DD9BF]">
                Requesting microphone access
              </div>
              <p className="mt-1.5 font-body text-xs leading-5 text-[#8EA3A7]">
                Approve the browser prompt. The line opens without another click.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartLiveSession}
              className="inline-flex items-center gap-2 border border-[#8DD9BF]/70 px-5 py-2.5 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
              style={{ borderRadius: 0 }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#8DD9BF]" />
              Open Microphone →
            </button>
          )}
        </A2UICard>
      );
    }

    return null;
  };
  const a2uiSlot = renderA2UISlot();
  const composerActive = composerExpanded || Boolean(inputValue.trim()) || liveSessionActive || liveSessionLaunching;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#07161A]">

      {/* ── Ambient field layers ── */}
      {/* Layer 2: radial glow driven by DonnaState */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(45,197,194,0.11) 0%, transparent 70%), radial-gradient(circle at 18% 18%, rgba(141,217,191,0.08), transparent 30%), linear-gradient(180deg, rgba(2,8,12,0.62), transparent 38%, rgba(1,5,8,0.78))',
          animation: ORB_ANIMATION[donnaState],
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(110deg,transparent_0%,rgba(141,217,191,0.08)_42%,transparent_62%)] opacity-70" />
      <div className="pointer-events-none absolute -left-24 bottom-20 h-72 w-72 rounded-full bg-[#8DD9BF]/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-28 h-96 w-96 rounded-full bg-[#2DC5C2]/[0.06] blur-3xl" />
      {/* Layer 3: film grain */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />
      {/* Layer 4: Interaction bloom */}
      <AnimatePresence>
        {blooming && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 90%, rgba(45,197,194,0.08), transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Signal orb (bottom center presence) ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: '60%',
          height: '40%',
          background:
            'radial-gradient(ellipse 60% 40% at 50% 85%, rgba(45,197,194,0.07) 0%, transparent 70%)',
          animation: ORB_ANIMATION[donnaState],
        }}
      />

      {!user ? (
        <button
          type="button"
          onClick={() => onAuthRequest('login')}
          className="absolute right-4 top-12 z-20 font-data text-[9px] uppercase tracking-[0.24em] text-[#8EA3A7]/30 transition-colors hover:text-[#DCE7E8]/70"
        >
          RETURNING CLIENT ↗
        </button>
      ) : null}

      {/* ── Message thread ── */}
      <div
        ref={scrollRef}
        className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto flex max-w-[720px] flex-col gap-5">
          <AnimatePresence initial={false}>
            {messages.map((message, index) =>
              message.role === 'donna' ? (
                <motion.div
                  key={message.id}
                  className="max-w-[640px] py-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                >
                  <div className="mb-2 font-data text-[10px] uppercase tracking-[0.28em] text-[#5FAF95]">
                    Donna
                  </div>
                  <DonnaSentences text={message.text} primary={index === 0} />
                  {/* Quick action chips — only on first message before user types */}
                  {index === 0 && showQuickActions ? (
                    <motion.div
                      className="mt-5 flex flex-wrap gap-2.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <AnimatePresence>
                        {quickActions.map((qa, qi) => (
                          <motion.button
                            key={qa.label}
                            type="button"
                            onClick={() => handleQuickAction(qa.action, qa.label)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
                            transition={{ ...SPRING, delay: qi * 0.08 }}
                            className="px-4 py-2.5 font-data text-[10px] uppercase tracking-[0.22em] transition-none"
                            style={{
                              border: '1px solid rgba(49,79,86,0.7)',
                              background: 'transparent',
                              color: '#8EA3A7',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#8DD9BF';
                              e.currentTarget.style.color = '#DCE7E8';
                              e.currentTarget.style.background = 'rgba(45,197,194,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(49,79,86,0.7)';
                              e.currentTarget.style.color = '#8EA3A7';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            {qa.label}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : (
                <motion.div
                  key={message.id}
                  className="self-end max-w-[480px]"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={SPRING}
                >
                  <div
                    className="px-4 py-3 text-sm leading-6 text-[#DCE7E8]/80 font-body"
                    style={{
                      border: '1px solid rgba(49,79,86,0.6)',
                      background: 'rgba(13,35,41,0.8)',
                    }}
                  >
                    {message.text}
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── A2UI slot — renders inline cards, intake, artifacts ── */}
      {a2uiSlot || children ? (
        <div className="relative z-10 px-4 pb-3">
          <div className="mx-auto max-w-[960px] space-y-3">
            {isAdminUser && toolNotice ? (
              <div className="border border-[#22424A] bg-[#07161A]/60 px-3 py-2 font-data text-[9px] uppercase tracking-[0.2em] text-[#8EA3A7]/60">
                {toolNotice}
              </div>
            ) : null}
            <AnimatePresence mode="wait">{a2uiSlot}</AnimatePresence>
            {children && !(canvasState === 'dna_reveal' && inlineAuthVisible) ? (
              <motion.div {...A2UI_ENTER}>{children}</motion.div>
            ) : null}
          </div>
        </div>
      ) : null}

      {liveSessionContent ? (
        <div className="relative z-20 px-4 pb-3">
          <div className="mx-auto max-w-[960px]">{liveSessionContent}</div>
        </div>
      ) : null}

      {/* ── Thinking indicator ── */}
      <AnimatePresence>
        {donnaThinking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="relative z-10 flex items-center gap-[5px] px-4 py-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-[5px] w-[5px] rounded-full bg-[#8DD9BF]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            <span className="ml-2 font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7]">
              Donna is composing
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input stage ── */}
      <motion.form
        onSubmit={handleSubmit}
        className="relative z-10 border-t px-4 py-3"
        animate={{
          paddingTop: composerActive ? 14 : 10,
          paddingBottom: composerActive ? 14 : 10,
        }}
        transition={SPRING}
        style={{
          borderColor: composerActive ? 'rgba(141,217,191,0.34)' : '#22424A',
          background:
            'linear-gradient(180deg, rgba(13,35,41,0.78), rgba(5,17,21,0.96))',
          boxShadow: composerActive
            ? '0 -24px 80px rgba(20, 71, 77, 0.28)'
            : '0 -10px 40px rgba(1, 8, 12, 0.22)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {/* Status bar row — matches DonnaShell header callsign */}
        <motion.div
          className="mx-auto mb-2 flex max-w-[720px] items-center gap-2"
          animate={{ opacity: composerActive ? 1 : 0.72, y: composerActive ? 0 : 2 }}
          transition={SPRING}
        >
          <DonnaWaveform active={donnaState === 'speaking' || donnaState === 'thinking'} />
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${STATUS_DOT[donnaState]}`}
          />
          <span className="font-data text-[10px] uppercase tracking-[0.18em] text-[#8EA3A7]">
            {liveSessionLaunching ? 'Requesting microphone' : liveSessionActive ? 'Live line open · tap ◼ to end' : STATUS_LABEL[donnaState]}
          </span>
        </motion.div>
        <motion.div
          className="mx-auto flex max-w-[720px] items-center gap-2 border"
          animate={{
            borderColor: composerActive ? 'rgba(141,217,191,0.58)' : 'rgba(34,66,74,0.78)',
            backgroundColor: composerActive ? 'rgba(7,22,26,0.86)' : 'rgba(7,22,26,0.48)',
            borderRadius: composerActive ? 28 : 999,
            minHeight: composerActive ? 58 : 48,
          }}
          transition={SPRING}
        >
          <button
            type="button"
            onClick={handleVoicePress}
            disabled={liveSessionLaunching}
            aria-label={liveSessionActive ? 'End Donna live session' : liveSessionLaunching ? 'Donna is requesting microphone access' : 'Start Donna voice'}
            className={`relative ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-70 ${
              liveSessionActive
                ? 'border-[#8DD9BF]/80 bg-[#8DD9BF]/20 hover:bg-red-900/30 hover:border-red-400/60'
                : 'border-[#8DD9BF]/50 bg-[#8DD9BF]/10 hover:bg-[#8DD9BF]/18'
            }`}
          >
            {liveSessionActive && (
              <span className="absolute inset-0 rounded-full border border-[#8DD9BF]/30 animate-[pulse_1.8s_ease-in-out_infinite]" />
            )}
            <span className="font-data text-[14px] leading-none text-[#DCE7E8]">
              {liveSessionActive ? '◼' : liveSessionLaunching ? '◌' : '◉'}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={liveSessionLaunching ? 'Approve mic permission…' : liveSessionActive ? 'Donna is listening. Type if you need to.' : 'Speak first, or type to Donna…'}
              className="w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
            />
            <AnimatePresence>
              {composerActive ? (
                <motion.div
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  className="mt-1 font-data text-[8px] uppercase tracking-[0.2em] text-[#8EA3A7]/55"
                >
                  {liveSessionLaunching ? 'Browser permission prompt is active' : liveSessionActive ? 'Voice-first mode active' : 'One tap opens microphone + live session'}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {inputValue.trim() ? (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="mr-2 shrink-0 border border-[#8DD9BF]/70 bg-[#8DD9BF]/10 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/18"
                style={{ borderRadius: 20 }}
              >
                Send
              </motion.button>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.form>
    </div>
  );
}

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
import type { GeminiLiveDiagnosticEvent } from './GeminiLivePanel';

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
  | 'donna_reads_you'
  | 'gap_reveal'
  | 'package_selection'
  | 'intake_inline'
  | 'dna_processing'
  | 'dna_reveal'
  | 'offerings_menu'
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

type PackagePath = 'smart_start' | 'premier' | 'cjs' | 'concierge';

type PrePurchaseAnswers = {
  name: string;
  targetRole: string;
  targetIndustry: string;
  salaryRange: string;
  desiredOutcome: string;
  otherOutcome: string;
  pressure: string;
  proof: string;
  supportPace: string;
  linkedinUrl: string;
};

type BespokeOffering = {
  id: string;
  title: string;
  price: number;
  isSubscription: boolean;
  description: string;
  preview: string;
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
function DonnaWaveform({ active, accentColor = '#8DD9BF' }: { active: boolean; accentColor?: string }) {
  return (
    <div className="flex items-center gap-[2px] h-[10px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-sm"
          style={{ backgroundColor: accentColor }}
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
function DonnaBarfield({ active, accentColor = '#8DD9BF' }: { active: boolean; accentColor?: string }) {
  return (
    <div className="flex items-center gap-[2px] h-[20px] w-full overflow-hidden my-5 px-0.5">
      {Array.from({ length: 38 }, (_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-[1px]"
          style={{ background: accentColor, minWidth: '2px' }}
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
  liveDiagnostics?: GeminiLiveDiagnosticEvent[];
  liveDiagnosticsVisible?: boolean;
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

const INDUSTRIES = [
  'All Industries', 'Accounting & Auditing', 'Advertising', 'Aerospace & Defense', 'Agribusiness',
  'Agriculture', 'Air Transportation', 'Airlines', 'Apparel & Fashion', 'Architecture', 'Arts & Culture',
  'Asset Management', 'Assisted Living', 'Automotive', 'Banking', 'Beauty & Personal Care', 'Biotechnology',
  'Blockchain & Web3', 'Bookkeeping', 'Business Consulting', 'Business Process Outsourcing (BPO)',
  'Cannabis Industry', 'Charitable Organizations', 'Chemical Manufacturing', 'Child & Family Services',
  'Cloud Computing', 'Coaching & Training', 'Commercial Construction', 'Commercial Real Estate',
  'Communications & Public Relations', 'Community & Social Services', 'Computer Hardware',
  'Consumer Electronics', 'Consumer Goods', 'Courier & Delivery Services', 'Cruise Lines', 'Cybersecurity',
  'Data Centers & Hosting Services', 'Defense & Military', 'Digital Marketing', 'Drone Services',
  'E-Commerce', 'Education (Higher)', 'Education (K-12)', 'EdTech', 'Electrical & Specialty Trades',
  'Emergency Services', 'Engineering', 'Environmental Science', 'Environmental Services', 'Esports',
  'Event Planning', 'Fashion', 'Federal Government', 'Film & Television', 'FinTech', 'Fishing',
  'Fitness & Wellness', 'Food & Beverage Manufacturing', 'Forestry', 'Foundations & Philanthropy',
  'Freight & Logistics', 'Game Development', 'Gig Economy', 'Graphic Design', 'Grocery & Supermarkets',
  'Health Insurance', 'Healthcare (Clinical)', 'HealthTech', 'Heavy & Civil Engineering', 'Higher Education',
  'Home Furnishings', 'Hospitals & Clinics', 'Hotel & Resort Management', 'Human Resources & Staffing',
  'Humanitarian Aid', 'Industrial Machinery', 'Influencer Marketing', 'Information Technology (IT)',
  'Infrastructure', 'Insurance', 'Interior Design', 'International Development', 'Investment Management',
  'IT Services & Consulting', 'Journalism & News Media', 'Laboratories', 'Landscaping & Groundskeeping',
  'Legal Services', 'Life Sciences', 'Local Government', 'Machine Learning & AI', 'Management Consulting',
  'Manufacturing (General)', 'Market Research', 'Maritime/Shipping', 'Marketing', 'Mechanical Trades',
  'Medical Devices', 'Mental Health Services', 'Metaverse & XR (AR/VR)', 'Mining', 'Mortgage & Lending',
  'Motion Pictures & Video', 'Museums & Cultural Institutions', 'Music Industry', 'Natural Gas',
  'NGO / Nonprofit', 'Nuclear Energy', 'Nursing', 'Oil & Gas Extraction', 'Online Learning',
  'Outdoor Recreation', 'Packaging & Printing', 'Performing Arts', 'Personal Services',
  'Pharmaceutical Production', 'Philanthropy', 'Photography', 'Physical Therapy', 'Plastics & Rubber',
  'Political Organizations', 'Primary Education', 'Private Equity', 'Private Practice (Healthcare)',
  'Professional Sports', 'Property Management', 'Public Health', 'Public Sector', 'Publishing',
  'Rail Transportation', 'Real Estate (Residential)', 'Real Estate Development', 'Recreation Management',
  'Renewable Energy', 'Residential Building Construction', 'Restaurant & Food Services', 'Retail',
  'Ride-Share & Gig Platforms', 'Scientific Research', 'Secondary Education', 'Security Services',
  'Social Media & Influencer Marketing', 'Social Services', 'Software Development', 'Solar Energy',
  'Space Exploration & Technology', 'Specialty Contractors', 'Sports Coaching', 'Sports Medicine',
  'Staffing & Recruiting', 'State Government', 'Streaming Services', 'Supply Chain Management',
  'Talent Management', 'Technology', 'Technical Training', 'Telecommunications',
  'Textile & Apparel Manufacturing', 'Tourism', 'Tour Operators', 'Town & City Planning',
  'Trade & Vocational Training', 'Transportation', 'Travel Agencies', 'Trucking', 'Urban Planning',
  'Utilities (General)', 'Venture Capital', 'Video Game Development', 'Visual Arts', 'Vocational Education',
  'Warehousing & Storage', 'Waste Management & Recycling', 'Water & Wastewater Services', 'Web Development',
  'Wellness Coaching', 'Wind Energy',
];

const SALARY_RANGES = [
  '$100k-$120k', '$120k-$140k', '$140k-$160k', '$160k-$180k', '$180k-$200k', '$200k-$250k',
  '$250k-$300k', '$300k-$350k', '$350k-$400k', '$400k-$450k', '$450k-$500k', '$500K+',
];

const DESIRED_OUTCOMES = [
  'New position / clients',
  'Professional Stability',
  'Professional Advancement',
  'Increased Compensation',
  'Increased Visibility',
  'Other',
];

const DNA_PHASES = ['Analyzing', 'Defining', 'Creating'];
const INTELLIGENCE_CATEGORIES = [
  'Recruiter Visibility',
  'AI Readiness',
  'Leadership Positioning',
  'Market Competitiveness',
  'Career Momentum',
  'Compensation Opportunity',
];

const BESPOKE_OFFERINGS: Record<PackagePath, BespokeOffering[]> = {
  smart_start: [],
  cjs: [
    { id: 'resume', title: 'Resume & LinkedIn Optimization', price: 149, isSubscription: false, description: 'AI-optimized resume and LinkedIn profile engineered for ATS dominance and executive hiring manager visibility.', preview: 'Finalized: 42 Keyword Optimizations, 12 Structural Enhancements applied...' },
    { id: 'brand-positioning', title: 'Executive Brand Positioning Suite', price: 249, isSubscription: false, description: 'Your professional narrative engineered for executive visibility - bio, brand narrative, and leadership positioning statement.', preview: 'Narrative Sync: Leadership Tone Calibrated, Executive Bio Drafted...' },
    { id: 'strategy', title: 'Search Strategy', price: 99, isSubscription: false, description: 'Multi-channel search strategy across Online Job Platforms, Recruiter Platforms, and Fortune 500 Career Portals.', preview: 'Strategy Map: 3 Core Channels, 15 Target Platforms Identified...' },
    { id: 'apply', title: 'Search and Apply Support', price: 199, isSubscription: false, description: '30-day intensive search and apply campaign across your personalized platform mix.', preview: 'Campaign Ready: 30-Day Intensive Schedule, 45+ Application Targets...' },
    { id: 'ats-audit', title: 'ATS Dominance Audit', price: 99, isSubscription: false, description: 'ATS compatibility score, keyword density analysis, and competitor benchmark comparison.', preview: 'Audit Results: 14 Critical Gaps found, Industry Benchmark: Top 5%...' },
    { id: 'research', title: 'Employer Research', price: 79, isSubscription: false, description: 'Deep-dive employer intelligence beyond the job description - culture, financials, fit scoring.', preview: 'Insights: Culture Deep-Dive, Salary Benchmarking, Financial Health...' },
    { id: 'interview', title: 'Interview Preparation', price: 129, isSubscription: false, description: 'Personalized question sets, talking points, and follow-up strategy for your target role.', preview: 'Prep Suite: 12 High-Probability Questions, Custom Follow-up templates...' },
    { id: 'negotiation', title: 'Salary Negotiation', price: 149, isSubscription: false, description: 'Market-data compensation analysis and negotiation playbook calibrated to your value prop.', preview: 'Playbook: Target range $XXXk, 3 Strategic Leverage Points...' },
    { id: 'linkedin-search', title: 'LinkedIn Target Intelligence', price: 99, isSubscription: false, description: 'Stakeholder search queries and decision-maker targeting across your industry.', preview: 'Search Ready: 12 Stakeholder Queries, 5 Connection Templates generated...' },
  ],
  premier: [
    { id: 'assessment', title: 'AI Assessment', price: 149, isSubscription: false, description: 'AI Readiness Assessment decoding how AI aligns with your professional journey and immediate technical advantages.', preview: 'Score: 88/100 Readiness. Priority: Agentic Workflows & Multi-modal logic...' },
    { id: 'gap', title: 'AI Gap Analysis', price: 129, isSubscription: false, description: 'Distance mapping between your current capabilities and the AI-driven future of your specific industry role.', preview: 'Gap Metrics: 4 Critical Skill Deficits identified, 3 Transition paths...' },
    { id: 'acceleration-blueprint', title: 'AI Career Acceleration Blueprint', price: 199, isSubscription: false, description: 'Practical roadmap for becoming AI-competitive with industry-specific opportunities and productivity implementation.', preview: 'Blueprint: 90-Day Implementation Cycle, 5 High-Value AI Use-cases...' },
    { id: 'insights', title: 'AI Insights Report', price: 149, isSubscription: false, description: 'Strategic AI Insights translated into practical, role-specific priorities for professional visibility.', preview: 'Strategic Brief: Top 3 Productivity Hacks, 1 Disruptive Risk Mitigated...' },
    { id: 'resource', title: 'AI Resource Guide', price: 79, isSubscription: false, description: 'Curated free and premium learning assets selected to expand AI knowledge based on your DNA.', preview: 'Curated Stack: 5 Core Courses, 12 Specialized Toolkits, 3 Communities...' },
    { id: 'training', title: 'AI Training Guide', price: 179, isSubscription: false, description: 'Holistic AI Training Plan aligning professional goals with the AI capabilities that matter most for your advancement.', preview: 'Roadmap: 90-Day Implementation Cycle, Weekly Milestone structure...' },
    { id: 'productivity-stack', title: 'AI Productivity Stack Setup', price: 249, isSubscription: false, description: 'Personalized AI operating system - tool recommendations, automation suggestions, and prompt systems.', preview: 'Stack Configured: 4 Primary Agents, 12 Workflow Automations...' },
    { id: 'course', title: 'Bespoke AI Course', price: 299, isSubscription: false, description: 'Fully customized learning journey designed around your specific areas of interest and career path.', preview: 'Syllabus: 6 Modules, 14 Lab Sessions, 1 Capstone Project Framework...' },
  ],
  concierge: [
    { id: 'essential', title: 'MyConcierge Essential', price: 99, isSubscription: true, description: 'Dedicated human career partner with onboarding, answers, navigation, and accountability support.', preview: 'Support Level: Essential. Priority response < 4hrs...' },
    { id: 'pro', title: 'MyConcierge Pro', price: 249, isSubscription: true, description: 'Strategic career orchestration - monthly strategy sessions, AI optimization, quarterly reviews.', preview: 'Support Level: Pro (Strategic). Priority Response < 2hrs...' },
    { id: 'executive', title: 'MyConcierge Executive', price: 499, isSubscription: true, description: 'Dedicated strategic partner - leadership positioning, salary negotiation, white-glove service.', preview: 'Support Level: Executive. Priority Queue + Direct Concierge Access...' },
    { id: 'elite', title: 'MyConcierge Elite', price: 999, isSubscription: true, description: 'Full-spectrum professional orchestration - weekly strategy sessions, dedicated concierge lead.', preview: 'Support Level: Elite. Weekly Execution Check-ins + Executive Sourcing...' },
  ],
};

const MY_CONCIERGE_UPGRADE_ID = 'concierge_essential';

const parseCompFloor = (range: string) => Number(range.match(/\d+/)?.[0] ?? 0);

function deriveIndicatorScores(
  answers: PrePurchaseAnswers,
  resumeFile?: File | null,
  linkedinUrl?: string
) {
  const compHigh = parseCompFloor(answers.salaryRange) >= 200;
  return [
    { key: 'recruiter_visibility', label: 'Recruiter Visibility', value: 55 + (resumeFile ? 7 : 0) + (linkedinUrl ? 5 : 0) },
    { key: 'ai_readiness', label: 'AI Readiness', value: 81 },
    { key: 'leadership_strength', label: 'Leadership Strength', value: compHigh ? 'High' : 'Developing' },
    { key: 'market_competitive', label: 'Market Competitiveness', value: answers.targetIndustry ? 74 : 68 },
    { key: 'career_momentum', label: 'Career Momentum', value: 89 },
    { key: 'comp_opportunity', label: 'Comp Opportunity', value: '+12%' },
  ];
}

function buildOfferingBriefSections(item: BespokeOffering, answers: PrePurchaseAnswers) {
  const target = answers.targetRole.trim() || 'your target role';
  const sector = answers.targetIndustry || 'your market';
  const range = answers.salaryRange || 'your target compensation range';
  const outcome =
    answers.desiredOutcome === 'Other'
      ? answers.otherOutcome.trim() || 'your stated outcome'
      : answers.desiredOutcome || 'your stated outcome';

  return [
    {
      label: 'Executive Summary',
      body: `${item.title} is recommended because it directly supports ${outcome.toLowerCase()} for ${target}.`,
    },
    {
      label: 'Intelligence Findings',
      body: `Current signal points to ${sector} positioning with compensation pressure around ${range}.`,
    },
    {
      label: 'Strategic Insights',
      body: 'The strongest move is to compress the gap between visible proof, market language, and next-step execution.',
    },
    {
      label: 'Personalized Recommendations',
      body: `Use this service to turn the ${target} narrative into a sharper artifact, workflow, or support lane.`,
    },
    {
      label: 'Preview Snippet',
      body: item.preview,
    },
    {
      label: 'Hidden Premium Recommendations',
      body: 'Full recommendations unlock after account creation so Donna can preserve the sequence and keep the OS context consistent.',
    },
    {
      label: 'Conversion CTA',
      body: 'Select this item to add it to your suite and carry the recommendation into checkout/account creation.',
    },
  ];
}

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
  liveDiagnostics = [],
  liveDiagnosticsVisible = false,
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
  const [selectedPackageId, setSelectedPackageId] = useState<PackagePath | null>(null);
  const [inlineAuthVisible, setInlineAuthVisible] = useState(false);
  const [toolNotice, setToolNotice] = useState<string | null>(null);
  const [calibrationInput, setCalibrationInput] = useState('');
  const [calibrationAnswer, setCalibrationAnswer] = useState('');
  const [prePurchaseAnswers, setPrePurchaseAnswers] = useState<PrePurchaseAnswers>({
    name: '',
    targetRole: '',
    targetIndustry: '',
    salaryRange: '',
    desiredOutcome: '',
    otherOutcome: '',
    pressure: '',
    proof: '',
    supportPace: 'standard',
    linkedinUrl: '',
  });
  const [selectedOfferings, setSelectedOfferings] = useState<string[]>([]);
  const [addConciergeUpgrade, setAddConciergeUpgrade] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [dnaPhaseIndex, setDnaPhaseIndex] = useState(0);
  const [dnaCategoryIndex, setDnaCategoryIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const donnaConfig = publicConfig.donna;
  const voiceFirstComposer = donnaConfig.voice_first_default && donnaConfig.composer_mode !== 'text_first';
  const quietVisuals = donnaConfig.visual_theme_intensity === 'quiet';
  const cinematicVisuals = donnaConfig.visual_theme_intensity === 'cinematic';
  const accentColor = quietVisuals ? '#C4A86F' : '#8DD9BF';
  const accentRgb = quietVisuals ? '196,168,111' : '141,217,191';
  const secondaryAccent = quietVisuals ? '#A89D8D' : '#8EA3A7';
  const fieldBackground = quietVisuals
    ? 'linear-gradient(180deg, rgba(28,31,30,0.82), rgba(13,18,19,0.96))'
    : 'linear-gradient(180deg, rgba(13,35,41,0.78), rgba(5,17,21,0.96))';
  const rootBackground = quietVisuals
    ? 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(196,168,111,0.08) 0%, transparent 68%), #071316'
    : cinematicVisuals
      ? 'radial-gradient(ellipse 88% 66% at 50% 100%, rgba(45,197,194,0.13) 0%, transparent 70%), #07161A'
    : '#07161A';
  const donnaThemeStyle = {
    '--donna-accent': accentColor,
    '--donna-accent-rgb': accentRgb,
    '--donna-secondary': secondaryAccent,
  } as React.CSSProperties;

  const intakeComplete = Boolean(client?.intake?.completed_at || wiki?.intake_complete);
  const mappedTargetRole = prePurchaseAnswers.targetRole.trim() || getTargetRole(client, wiki);
  const normalizedLinkedInUrl = prePurchaseAnswers.linkedinUrl.trim();
  const isPrePurchaseReady = Boolean(
    prePurchaseAnswers.targetRole.trim() &&
      prePurchaseAnswers.targetIndustry &&
      prePurchaseAnswers.salaryRange &&
      prePurchaseAnswers.desiredOutcome &&
      (prePurchaseAnswers.desiredOutcome !== 'Other' || prePurchaseAnswers.otherOutcome.trim())
  );
  const allOfferings = useMemo(() => Object.values(BESPOKE_OFFERINGS).flat(), []);
  const oneTimeTotal = useMemo(
    () =>
      selectedOfferings
        .map((id) => allOfferings.find((item) => item.id === id))
        .filter((item): item is BespokeOffering => Boolean(item && !item.isSubscription))
        .reduce((sum, item) => sum + item.price, 0),
    [allOfferings, selectedOfferings]
  );
  const monthlyTotal = useMemo(
    () =>
      selectedOfferings
        .map((id) => allOfferings.find((item) => item.id === id))
        .filter((item): item is BespokeOffering => Boolean(item && item.isSubscription))
        .reduce((sum, item) => sum + item.price, 0) + (addConciergeUpgrade ? 99 : 0),
    [addConciergeUpgrade, allOfferings, selectedOfferings]
  );
  const indicators = useMemo(
    () => deriveIndicatorScores(prePurchaseAnswers, resumeFile, normalizedLinkedInUrl),
    [normalizedLinkedInUrl, prePurchaseAnswers, resumeFile]
  );
  const suiteRoutingCopy =
    donnaConfig.workflow_routing_posture === 'module_first'
      ? 'I can open the suite when you ask, but Donna will keep the current thread active.'
      : 'The suite is the filing cabinet. Stay here and I will stage the next best step first.';

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
      { label: voiceFirstComposer ? 'Talk to Donna now' : 'Ask Donna now', action: 'live' as const },
      { label: 'Open Your Brief →', action: 'brief' as const },
      { label: 'Open Your Plan →', action: 'plan' as const },
    ];
  }, [intakeComplete, user, voiceFirstComposer]);

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
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
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
    deliverDonnaResponse('', "I'm mapping the professional signal now.", 'a2ui_trigger');
    setDnaPhaseIndex(0);
    setDnaCategoryIndex(0);
    const phaseTimer = setInterval(
      () => setDnaPhaseIndex((current) => Math.min(current + 1, DNA_PHASES.length - 1)),
      3000
    );
    const categoryTimer = setInterval(
      () => setDnaCategoryIndex((current) => (current + 1) % INTELLIGENCE_CATEGORIES.length),
      1000
    );
    const revealTimer = setTimeout(() => handleCanvasTransition('dna_reveal'), 9000);
    return () => {
      clearInterval(phaseTimer);
      clearInterval(categoryTimer);
      clearTimeout(revealTimer);
    };
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
      handleCanvasTransition('donna_reads_you');
      return;
    }
    if (action === 'live') {
      if (!user) {
        pushExchange(label, 'I can open the live lane as soon as you sign in. I have your access card ready.');
        onAuthRequest('login');
      } else {
        handleCanvasTransition('concierge_sync');
        if (donnaConfig.auto_start_live) {
          pushExchange(label, 'Opening the live line now.');
          onStartLiveSession?.();
        } else {
          pushExchange(label, 'The live card is staged. Tap Open Microphone when you are ready.');
        }
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
        setTimeout(() => handleCanvasTransition('donna_reads_you'), 500);
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
        donnaReply = suiteRoutingCopy;
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
      donnaReply =
        donnaConfig.workflow_routing_posture === 'module_first'
          ? 'Opening the suite is available from the header. I will keep the live thread here when you return.'
          : 'The suite is available from the header when you want the filing cabinet. I can keep the work here in Donna.';
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
      pushExchange(
        'Talk to Donna.',
        donnaConfig.auto_start_live
          ? 'Opening the live line now.'
          : 'The live card is staged. Tap Open Microphone when you are ready.'
      );
    }
    handleCanvasTransition('concierge_sync');
    if (donnaConfig.auto_start_live) onStartLiveSession?.();
  };

  const startInlineIntake = () => {
    pushExchange('Begin Smart Start.', "Good choice. Let's get you calibrated.");
    handleCanvasTransition('intake_inline');
  };

  const handleResumeUpload = (file: File | null) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setResumeFile(file);
    if (!file) {
      setResumeUploading(false);
      return;
    }
    setResumeUploading(true);
    resumeTimerRef.current = setTimeout(() => setResumeUploading(false), 1500);
  };

  const toggleOffering = (id: string) => {
    setSelectedOfferings((current) => {
      if (selectedPackageId === 'concierge') return current.includes(id) ? [] : [id];
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const briefExcerpt = getBriefExcerpt(client, wiki);
  const targetRole = getTargetRole(client, wiki);
  const selectedPackageLabel =
    selectedPackageId === 'concierge'
      ? 'MyConcierge'
      : selectedPackageId === 'premier'
      ? 'SkillSync Ai Premier'
      : selectedPackageId === 'cjs'
        ? 'Concierge Job Search'
        : 'Smart Start';

  const buildPrePurchaseSeed = useCallback(() => {
    const name = prePurchaseAnswers.name.trim();
    const target = prePurchaseAnswers.targetRole.trim();
    // If they answered the calibration question, use it as primary pressure context
    const pressure = prePurchaseAnswers.pressure.trim() || calibrationAnswer;
    const proof = prePurchaseAnswers.proof.trim();
    const desiredOutcome =
      prePurchaseAnswers.desiredOutcome === 'Other'
        ? prePurchaseAnswers.otherOutcome.trim()
        : prePurchaseAnswers.desiredOutcome;
    const pace =
      prePurchaseAnswers.supportPace === 'straight' || prePurchaseAnswers.supportPace === 'story'
        ? prePurchaseAnswers.supportPace
        : 'standard';
    const focus =
      selectedPackageId === 'cjs'
        ? 'job_search'
        : selectedPackageId === 'premier' || selectedPackageId === 'concierge'
          ? 'leadership'
          : 'skills';
    const answers: IntakeAnswers = {
      preferred_name: name || undefined,
      current_or_target_job_title: target,
      target_title: target,
      target: target || selectedPackageLabel,
      target_sector: prePurchaseAnswers.targetIndustry || undefined,
      comp_range: prePurchaseAnswers.salaryRange || undefined,
      desired_outcome: desiredOutcome || undefined,
      pressure_breaks: pressure,
      work_style: proof,
      constraints: `Selected package: ${selectedPackageLabel}`,
      pace,
      focus,
      pre_purchase_source: 'donna_a2ui_front_door',
      selected_package: selectedPackageId ?? 'smart_start',
      resume_file_name: resumeFile?.name,
      linkedin_profile: normalizedLinkedInUrl || undefined,
      selected_offerings: selectedOfferings.length ? selectedOfferings.join(', ') : undefined,
      one_time_total: oneTimeTotal ? `$${oneTimeTotal.toFixed(2)}` : undefined,
      monthly_total: monthlyTotal ? `$${monthlyTotal.toFixed(2)}` : undefined,
      add_concierge_upgrade: addConciergeUpgrade ? true : undefined,
    };

    return {
      intent: target ? ('target_role' as ClientIntent) : ('not_sure' as ClientIntent),
      preferences: {
        pace: pace as ClientPreferences['pace'],
        focus: focus as ClientPreferences['focus'],
      },
      answers,
    };
  }, [
    addConciergeUpgrade,
    calibrationAnswer,
    monthlyTotal,
    normalizedLinkedInUrl,
    oneTimeTotal,
    prePurchaseAnswers,
    resumeFile,
    selectedOfferings,
    selectedPackageId,
    selectedPackageLabel,
  ]);

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
              <React.Fragment key={section.key}>
                <A2UICard delay={index * 80}>
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
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }

    if (canvasState === 'donna_reads_you') {
      return (
        <A2UICard>
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            SC. 01 · CALIBRATION
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            What's the gap you're trying to close?
          </h3>
          <p className="mt-3 font-body text-sm leading-7 text-[#8EA3A7]">
            One sentence is enough. I will read the signal.
          </p>
          <div className="mt-5">
            <input
              autoFocus
              value={calibrationInput}
              onChange={(e) => setCalibrationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && calibrationInput.trim()) {
                  const answer = calibrationInput.trim();
                  setCalibrationAnswer(answer);
                  setCalibrationInput('');
                  pushExchange(answer, 'Understood. Here is where one session puts you.', 'chip_action');
                  handleCanvasTransition('gap_reveal');
                }
              }}
              placeholder="e.g. I am stuck at director and can't get to VP."
              className="w-full border-b border-[#22424A] bg-transparent py-3 font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40 focus:border-[#8DD9BF]/60"
            />
          </div>
          <button
            type="button"
            disabled={!calibrationInput.trim()}
            onClick={() => {
              const answer = calibrationInput.trim();
              setCalibrationAnswer(answer);
              setCalibrationInput('');
              pushExchange(answer, 'Understood. Here is where one session puts you.', 'chip_action');
              handleCanvasTransition('gap_reveal');
            }}
            className="mt-5 border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10 disabled:opacity-30 disabled:cursor-default"
            style={{ borderRadius: 0 }}
          >
            CONTINUE →
          </button>
        </A2UICard>
      );
    }

    if (canvasState === 'gap_reveal') {
      return (
        <A2UICard>
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            SC. 02 · THE DELTA
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            One session closes that gap.
          </h3>
          {calibrationAnswer ? (
            <p className="mt-3 font-body text-sm leading-7 text-[#8EA3A7]/70 italic">
              "{calibrationAnswer}"
            </p>
          ) : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="border border-[#22424A] bg-[#07161A]/40 px-4 py-4">
              <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8EA3A7]/60">
                NOW
              </div>
              <p className="mt-2 font-body text-sm leading-6 text-[#DCE7E8]/70">
                Signal is there. The frame and the file are not. That's what slows the move.
              </p>
            </div>
            <div className="border border-[#8DD9BF]/30 bg-[#8DD9BF]/[0.04] px-4 py-4">
              <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8DD9BF]">
                AFTER ONE SESSION
              </div>
              <p className="mt-2 font-body text-sm leading-6 text-[#DCE7E8]/85">
                Calibrated brief. Clear positioning. The next move sequenced. Built from what you already have.
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-[#22424A]/60 pt-4">
            <div className="font-data text-[10px] uppercase tracking-[0.2em] text-[#8EA3A7]/50">
              ONE SESSION FROM $2.4K · FULL SUITE FROM $6K
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                pushExchange('Show me how.', "First I need the target. Then I'll recommend the right path.", 'chip_action');
                handleCanvasTransition('intake_inline');
              }}
              className="border border-[#8DD9BF]/70 px-5 py-2.5 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
              style={{ borderRadius: 0 }}
            >
              SHOW ME HOW →
            </button>
            <button
              type="button"
              onClick={() =>
                pushExchange(
                  'Not yet.',
                  'That is fine. I will be here when the timing is right. Say you are ready to begin when you want to move.'
                )
              }
              className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/60 transition-colors hover:text-[#DCE7E8]"
            >
              NOT YET
            </button>
          </div>
        </A2UICard>
      );
    }

    if (canvasState === 'package_selection') {
      return (
        <PackageSelectCards
          onSelect={(packageId) => {
            setSelectedPackageId(packageId as PackagePath);
            if (packageId === 'smart_start') {
              setSelectedOfferings(['smart_start']);
            } else {
              setSelectedOfferings([]);
            }
            pushExchange('Path selected.', 'Good. I am mapping the professional signal now.', 'a2ui_trigger');
            handleCanvasTransition('dna_processing');
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
            I will map the target, market, compensation, desired outcome, pressure points, proof,
            and professional source material first. Then I will recommend the right Career Concierge
            path before you create an account.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3 md:col-span-2">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 00: YOUR NAME
              </div>
              <input
                value={prePurchaseAnswers.name}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="First name"
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
              />
            </label>
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
                ACT 02: INDUSTRY
              </div>
              <select
                value={prePurchaseAnswers.targetIndustry}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, targetIndustry: event.target.value }))
                }
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 03: COMPENSATION
              </div>
              <select
                value={prePurchaseAnswers.salaryRange}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, salaryRange: event.target.value }))
                }
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none"
              >
                <option value="">Select range</option>
                {SALARY_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3 md:col-span-2">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 04: OUTCOME
              </div>
              <select
                value={prePurchaseAnswers.desiredOutcome}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({
                    ...current,
                    desiredOutcome: event.target.value,
                    otherOutcome: event.target.value === 'Other' ? current.otherOutcome : '',
                  }))
                }
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none"
              >
                <option value="">Select outcome</option>
                {DESIRED_OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {outcome}
                  </option>
                ))}
              </select>
              {prePurchaseAnswers.desiredOutcome === 'Other' ? (
                <input
                  value={prePurchaseAnswers.otherOutcome}
                  onChange={(event) =>
                    setPrePurchaseAnswers((current) => ({ ...current, otherOutcome: event.target.value }))
                  }
                  placeholder="Describe the outcome"
                  className="mt-3 w-full border-t border-[#22424A] bg-transparent pt-3 font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
                />
              ) : null}
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 05: PRESSURE
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
                ACT 06: EVIDENCE
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
                ACT 07: PACE
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
            <label className="block border border-dashed border-[#22424A] bg-[#07161A]/40 px-3 py-3">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 08: PROFESSIONAL BRIEF
              </div>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => handleResumeUpload(event.target.files?.[0] ?? null)}
                className="mt-2 w-full font-data text-[10px] uppercase tracking-[0.18em] text-[#8EA3A7] file:mr-3 file:border file:border-[#22424A] file:bg-transparent file:px-3 file:py-2 file:font-data file:text-[9px] file:uppercase file:tracking-[0.2em] file:text-[#DCE7E8]"
              />
              {resumeUploading ? (
                <div className="mt-3 flex items-center gap-2">
                  {[0, 1, 2].map((bar) => (
                    <motion.span
                      key={bar}
                      className="h-5 w-1 bg-[#8DD9BF]"
                      animate={{ scaleY: [0.35, 1, 0.35], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.7, delay: bar * 0.12, repeat: Infinity }}
                    />
                  ))}
                  <span className="font-data text-[9px] uppercase tracking-[0.2em] text-[#8DD9BF]">
                    Scanning file signal
                  </span>
                </div>
              ) : (
                <p className="mt-2 font-body text-xs text-[#8EA3A7]/60">
                  {resumeFile
                    ? `Brief synchronized: ${resumeFile.name}`
                    : 'Optional PDF only. Adds signal to the Professional DNA preview.'}
                </p>
              )}
            </label>
            <label className="block border border-[#22424A] bg-[#07161A]/40 px-3 py-3 md:col-span-2">
              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8EA3A7]/60">
                ACT 09: LINKEDIN PROFILE
              </div>
              <input
                value={prePurchaseAnswers.linkedinUrl}
                onChange={(event) =>
                  setPrePurchaseAnswers((current) => ({ ...current, linkedinUrl: event.target.value }))
                }
                placeholder="https://www.linkedin.com/in/..."
                className="mt-2 w-full bg-transparent font-body text-sm text-[#DCE7E8] outline-none placeholder:text-[#8EA3A7]/40"
              />
              <p className="mt-2 font-body text-xs text-[#8EA3A7]/60">
                Donna will use this as profile context only inside Career Concierge.
              </p>
            </label>
          </div>
          <button
            type="button"
            disabled={!isPrePurchaseReady}
            onClick={() => {
              onPrePurchaseIntakeSeed?.(buildPrePurchaseSeed());
              pushExchange('Map my Professional DNA.', "Good. Choose the path Donna should price around.", 'a2ui_trigger');
              handleCanvasTransition('package_selection');
            }}
            className="mt-5 border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10 disabled:cursor-not-allowed disabled:border-[#22424A] disabled:text-[#8EA3A7]/30 disabled:hover:bg-transparent"
            style={{ borderRadius: 0 }}
          >
            Map my Professional DNA →
          </button>
        </A2UICard>
      );
    }

    if (canvasState === 'dna_processing') {
      return (
        <A2UICard className="overflow-hidden">
          <div className="flex flex-col items-center py-8 text-center">
            <motion.div
              className="relative flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-[#8DD9BF]/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            >
              <motion.div
                className="h-20 w-20 rounded-[20%] border border-[#8DD9BF]/20 bg-[#07161A]"
                animate={{
                  scale: [1, 1.15, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(141,217,191,0)',
                    '0 0 40px 10px rgba(141,217,191,0.2)',
                    '0 0 0 0 rgba(141,217,191,0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            <h3 className="mt-7 font-editorial text-[28px] italic text-[#DCE7E8]">
              Mapping Professional DNA
            </h3>
            <p className="mt-2 font-data text-[10px] uppercase tracking-[0.28em] text-[#8EA3A7]/50">
              Target: {mappedTargetRole}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${dnaPhaseIndex}-${dnaCategoryIndex}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-6 font-data text-[11px] uppercase tracking-[0.3em] text-[#8DD9BF]"
              >
                ◆ {DNA_PHASES[dnaPhaseIndex]} {INTELLIGENCE_CATEGORIES[dnaCategoryIndex]}...
              </motion.div>
            </AnimatePresence>
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
          <div className="mt-6">
            <p className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8EA3A7]/50">
              Professional DNA Indicators
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {indicators.map((indicator, index) => (
                <motion.div
                  key={indicator.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="border border-[#22424A]/70 bg-[#07161A]/50 p-3"
                >
                  <p className="font-data text-[9px] uppercase tracking-widest text-[#8EA3A7]/40">
                    {indicator.label}
                  </p>
                  <p className="mt-2 font-editorial text-2xl italic text-[#8DD9BF]">
                    {indicator.value}
                  </p>
                  {typeof indicator.value === 'number' ? (
                    <div className="mt-2 h-[2px] rounded-full bg-[#22424A]">
                      <motion.div
                        className="h-full rounded-full bg-[#8DD9BF]/50"
                        initial={{ width: 0 }}
                        animate={{ width: `${indicator.value}%` }}
                        transition={{ duration: 1.5, delay: index * 0.06 + 0.3 }}
                      />
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </div>
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
                  pushExchange('Review recommendations.', "Here's the suite Donna recommends from this signal.", 'a2ui_trigger');
                  handleCanvasTransition('offerings_menu');
                  return;
                }
                pushExchange('Review recommendations.', "Here's the suite Donna recommends from this signal.", 'a2ui_trigger');
                handleCanvasTransition('offerings_menu');
              }}
              className="border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10"
              style={{ borderRadius: 0 }}
            >
              Review recommendations →
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

    if (canvasState === 'offerings_menu') {
      const packageKey = selectedPackageId ?? 'smart_start';
      const items = BESPOKE_OFFERINGS[packageKey] ?? [];
      const hasSelection = selectedOfferings.length > 0 || packageKey === 'smart_start';

      return (
        <A2UICard className="max-h-[62vh] overflow-y-auto">
          <div className="font-data text-[10px] uppercase tracking-[0.28em] text-[#8DD9BF]">
            Recommended Suite
          </div>
          <h3 className="mt-3 font-editorial text-3xl italic text-[#DCE7E8]">
            {selectedPackageLabel}
          </h3>
          <p className="mt-3 max-w-2xl font-body text-sm leading-7 text-[#8EA3A7]">
            Donna is pricing the next best path from your target, market, compensation range, and
            Professional DNA indicators. Select only the pieces you want active.
          </p>

          <div className="mt-6 flex items-center justify-between border-b border-[#22424A]/40 pb-4">
            <div>
              <p className="font-data text-[8px] uppercase tracking-widest text-[#8EA3A7]/30">
                One-Time Fee
              </p>
              <p className="font-editorial text-2xl italic text-[#8DD9BF]">
                ${oneTimeTotal.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-data text-[8px] uppercase tracking-widest text-[#8EA3A7]/30">
                Monthly Service
              </p>
              <p className="font-editorial text-2xl italic text-[#8DD9BF]">
                ${monthlyTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {packageKey === 'cjs' || packageKey === 'premier' ? (
            <button
              type="button"
              onClick={() => {
                setAddConciergeUpgrade((current) => !current);
                setSelectedOfferings((current) =>
                  addConciergeUpgrade
                    ? current.filter((id) => id !== MY_CONCIERGE_UPGRADE_ID)
                    : [...new Set([...current, MY_CONCIERGE_UPGRADE_ID])]
                );
              }}
              className={`mt-5 w-full border px-4 py-4 text-left transition-colors ${
                addConciergeUpgrade
                  ? 'border-[#8DD9BF]/40 bg-[#8DD9BF]/[0.04]'
                  : 'border-[#22424A]/60 bg-[#07161A]/40 hover:border-[#8DD9BF]/30'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8DD9BF]">
                    MyConcierge Add-On
                  </div>
                  <p className="mt-2 font-body text-sm leading-6 text-[#DCE7E8]/80">
                    Add human navigation, answer support, and accountability for $99/month.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      'Priority Support',
                      'Strategic Launch Session',
                      'Done-With-You Execution',
                      'Accountability & Momentum Syncs',
                      'Advanced AI Tool Optimization',
                      'Direct Concierge Messaging',
                    ].map((valueProp) => (
                      <span
                        key={valueProp}
                        className="font-data text-[8px] uppercase tracking-[0.18em] text-[#8EA3A7]/60"
                      >
                        ◆ {valueProp}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="font-editorial text-2xl italic text-[#8DD9BF]">
                  {addConciergeUpgrade ? 'Added' : '+$99/mo'}
                </span>
              </div>
            </button>
          ) : null}

          {packageKey === 'smart_start' ? (
            <div className="mt-5 border border-[#8DD9BF]/30 bg-[#8DD9BF]/[0.04] px-4 py-4">
              <div className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8DD9BF]">
                ◆ Strategic Match
              </div>
              <h4 className="mt-2 font-editorial text-2xl italic text-[#DCE7E8]">
                Smart Start Calibration
              </h4>
              <p className="mt-2 font-body text-sm leading-6 text-[#8EA3A7]">
                Begin with the single guided pass that creates the operating brief and gives Donna
                the context needed to route your next move.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {items.map((item, index) => {
                const selected = selectedOfferings.includes(item.id);
                const briefSections = buildOfferingBriefSections(item, prePurchaseAnswers);
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => toggleOffering(item.id)}
                    className={`relative border px-4 py-4 text-left transition-colors ${
                      selected
                        ? 'border-[#8DD9BF]/40 bg-[#8DD9BF]/[0.04] shadow-[0_0_24px_rgba(141,217,191,0.06)]'
                        : 'border-[#22424A]/60 bg-[#07161A]/40 hover:border-[#8DD9BF]/30'
                    }`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    {index === 0 ? (
                      <span className="absolute right-3 top-3 font-data text-[9px] uppercase tracking-widest text-[#8DD9BF]">
                        ◆ Strategic Match
                      </span>
                    ) : null}
                    <div className="pr-24">
                      <h4 className="font-editorial text-xl italic text-[#DCE7E8]">
                        {item.title}
                      </h4>
                      <p className="mt-1 font-data text-[10px] uppercase tracking-[0.22em] text-[#8DD9BF]">
                        ${item.price}
                        {item.isSubscription ? '/mo' : ''}
                      </p>
                    </div>
                    <p className="mt-3 font-body text-sm leading-6 text-[#8EA3A7]">
                      {item.description}
                    </p>
                    <AnimatePresence>
                      {selected ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden border border-[#8DD9BF]/20 bg-[#8DD9BF]/[0.04] px-3 py-3"
                        >
                          <p className="font-data text-[9px] uppercase tracking-[0.24em] text-[#8DD9BF]">
                            Strategic Intelligence Brief
                          </p>
                          <div className="mt-3 grid gap-3">
                            {briefSections.map((section) => (
                              <div key={section.label} className="border-t border-[#22424A]/60 pt-3">
                                <div className="font-data text-[8px] uppercase tracking-[0.22em] text-[#8EA3A7]/50">
                                  {section.label}
                                </div>
                                <p className="mt-1 font-body text-xs leading-5 text-[#DCE7E8]/75">
                                  {section.body}
                                </p>
                              </div>
                            ))}
                          </div>
                          {item.id === 'linkedin-search' && normalizedLinkedInUrl ? (
                            <div className="mt-3 border-t border-[#22424A]/70 pt-3">
                              <div className="font-data text-[9px] uppercase tracking-[0.22em] text-[#8DD9BF]">
                                LinkedIn Intelligence Terminal
                              </div>
                              <p className="mt-2 font-data text-[10px] uppercase tracking-[0.18em] text-[#8EA3A7]/70">
                                Query: {mappedTargetRole} recruiter {prePurchaseAnswers.targetIndustry || 'target market'}
                              </p>
                              <p className="mt-1 break-all font-body text-xs text-[#8EA3A7]/60">
                                Profile context: {normalizedLinkedInUrl}
                              </p>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.open(
                                    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                                      `${mappedTargetRole} recruiter ${prePurchaseAnswers.targetIndustry || ''}`.trim()
                                    )}`,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                                onKeyDown={(event) => {
                                  if (event.key !== 'Enter' && event.key !== ' ') return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  window.open(
                                    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                                      `${mappedTargetRole} recruiter ${prePurchaseAnswers.targetIndustry || ''}`.trim()
                                    )}`,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                                className="mt-3 inline-flex border border-[#8DD9BF]/50 px-3 py-2 font-data text-[9px] uppercase tracking-[0.2em] text-[#DCE7E8]"
                              >
                                Run Search ↗
                              </span>
                            </div>
                          ) : null}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#22424A]/60 pt-5">
            <button
              type="button"
              disabled={!hasSelection}
              onClick={() => {
                onPrePurchaseIntakeSeed?.(buildPrePurchaseSeed());
                if (!user) {
                  setInlineAuthVisible(true);
                  onAuthRequest('register');
                  pushExchange('Secure my suite.', 'One step. Then your suite is ready.', 'a2ui_trigger');
                  handleCanvasTransition('dna_reveal');
                  return;
                }
                pushExchange('Secure my suite.', 'I have saved this suite path. Here is the sequence.', 'a2ui_trigger');
                handleCanvasTransition('plan_active');
              }}
              className="border border-[#8DD9BF]/70 px-4 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-[#DCE7E8] transition-colors hover:bg-[#8DD9BF]/10 disabled:cursor-not-allowed disabled:border-[#22424A] disabled:text-[#8EA3A7]/30 disabled:hover:bg-transparent"
              style={{ borderRadius: 0 }}
            >
              Secure Your Suite →
            </button>
            <button
              type="button"
              onClick={() => {
                pushExchange('Adjust inputs.', "Let's tune the inputs before locking the suite.", 'a2ui_trigger');
                handleCanvasTransition('intake_inline');
              }}
              className="font-data text-[10px] uppercase tracking-[0.22em] text-[#8EA3A7]/70 transition-colors hover:text-[#DCE7E8]"
            >
              ← Adjust inputs
            </button>
          </div>
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
          <DonnaBarfield active={liveSessionActive} accentColor={accentColor} />
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
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#07161A]"
      style={{ ...donnaThemeStyle, background: rootBackground }}
    >

      {/* ── Ambient field layers ── */}
      {/* Layer 2: radial glow driven by DonnaState */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            quietVisuals
              ? 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(196,168,111,0.10) 0%, transparent 70%), radial-gradient(circle at 18% 18%, rgba(244,241,235,0.045), transparent 30%), linear-gradient(180deg, rgba(2,8,12,0.62), transparent 38%, rgba(1,5,8,0.78))'
              : 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(45,197,194,0.11) 0%, transparent 70%), radial-gradient(circle at 18% 18%, rgba(141,217,191,0.08), transparent 30%), linear-gradient(180deg, rgba(2,8,12,0.62), transparent 38%, rgba(1,5,8,0.78))',
          animation: ORB_ANIMATION[donnaState],
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-70"
        style={{
          background: quietVisuals
            ? 'linear-gradient(110deg,transparent 0%,rgba(196,168,111,0.065) 42%,transparent 62%)'
            : 'linear-gradient(110deg,transparent 0%,rgba(141,217,191,0.08) 42%,transparent 62%)',
        }}
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-20 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `rgba(${accentRgb},${quietVisuals ? 0.045 : 0.07})` }}
      />
      <div
        className="pointer-events-none absolute -right-28 top-28 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: `rgba(${quietVisuals ? '196,168,111' : '45,197,194'},${quietVisuals ? 0.035 : 0.06})` }}
      />
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
                quietVisuals
                  ? 'radial-gradient(ellipse 80% 60% at 50% 90%, rgba(196,168,111,0.08), transparent)'
                  : 'radial-gradient(ellipse 80% 60% at 50% 90%, rgba(45,197,194,0.08), transparent)',
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
            quietVisuals
              ? 'radial-gradient(ellipse 60% 40% at 50% 85%, rgba(196,168,111,0.06) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 60% 40% at 50% 85%, rgba(45,197,194,0.07) 0%, transparent 70%)',
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

      {liveDiagnosticsVisible && liveDiagnostics.length ? (
        <div className="relative z-20 px-4 pb-3">
          <div className="mx-auto max-w-[960px] border border-[#4A4338]/80 bg-[#101719]/90 p-3 shadow-[0_16px_42px_rgba(1,8,12,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div className="font-data text-[9px] uppercase tracking-[0.24em]" style={{ color: accentColor }}>
                Live diagnostics
              </div>
              <div className="font-data text-[9px] uppercase tracking-[0.18em] text-[#8EA3A7]/55">
                {liveDiagnostics.length} events
              </div>
            </div>
            <div className="mt-2 grid max-h-[118px] gap-1 overflow-y-auto pr-1 md:grid-cols-2">
              {liveDiagnostics.slice(0, donnaConfig.live_dock_detail_level === 'diagnostic' ? 10 : 4).map((event) => (
                <div key={event.id} className="border-l pl-2 text-[10px] leading-4 text-[#DCE7E8]/70" style={{ borderColor: `rgba(${accentRgb},0.44)` }}>
                  <span className="font-data uppercase tracking-[0.14em] text-[#8EA3A7]/60">
                    {event.type}
                  </span>
                  {' '}
                  {event.detail}
                </div>
              ))}
            </div>
          </div>
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
          borderColor: composerActive ? `rgba(${accentRgb},0.34)` : '#22424A',
          background: fieldBackground,
          boxShadow: composerActive
            ? quietVisuals
              ? '0 -24px 80px rgba(71, 58, 34, 0.20)'
              : '0 -24px 80px rgba(20, 71, 77, 0.28)'
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
          <DonnaWaveform
            active={donnaState === 'speaking' || donnaState === 'thinking'}
            accentColor={accentColor}
          />
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              donnaState === 'idle' ? '' : STATUS_DOT[donnaState].replace(/bg-\[[^\]]+\](?:\/\d+)?/g, '')
            }`}
            style={{
              backgroundColor:
                donnaState === 'idle'
                  ? `rgba(${accentRgb},0.28)`
                  : donnaState === 'thinking'
                    ? `rgba(${accentRgb},0.62)`
                    : accentColor,
            }}
          />
          <span className="font-data text-[10px] uppercase tracking-[0.18em] text-[#8EA3A7]">
            {liveSessionLaunching ? 'Requesting microphone' : liveSessionActive ? 'Live line open · tap ◼ to end' : STATUS_LABEL[donnaState]}
          </span>
        </motion.div>
        <motion.div
          className="mx-auto flex max-w-[720px] items-center gap-2 border"
          animate={{
            borderColor: composerActive ? `rgba(${accentRgb},0.58)` : 'rgba(34,66,74,0.78)',
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
            className="relative ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-70 hover:bg-red-900/20"
            style={{
              borderColor: liveSessionActive ? `rgba(${accentRgb},0.8)` : `rgba(${accentRgb},0.5)`,
              backgroundColor: liveSessionActive ? `rgba(${accentRgb},0.18)` : `rgba(${accentRgb},0.09)`,
            }}
          >
            {liveSessionActive && (
              <span
                className="absolute inset-0 rounded-full border animate-[pulse_1.8s_ease-in-out_infinite]"
                style={{ borderColor: `rgba(${accentRgb},0.3)` }}
              />
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
              placeholder={
                liveSessionLaunching
                  ? 'Approve mic permission...'
                  : liveSessionActive
                    ? 'Donna is listening. Type if you need to.'
                    : voiceFirstComposer
                      ? 'Speak first, or type to Donna...'
                      : 'Type to Donna, or tap the voice orb...'
              }
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
                  {liveSessionLaunching
                    ? 'Browser permission prompt is active'
                    : liveSessionActive
                      ? 'Voice-first mode active'
                      : voiceFirstComposer
                        ? 'One tap opens microphone + live session'
                        : 'Text-first mode with voice available'}
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

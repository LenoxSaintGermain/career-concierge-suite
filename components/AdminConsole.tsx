import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CLIENT_INTENTS, FOCUS_PREFS, PACE_PREFS } from '../constants';
import {
  AdminMediaPipelineOverview,
  AdminOrchestrationOverview,
  AdminSystemOverview,
  AppConfig,
  CuratedMediaItem,
  MediaAudience,
  MediaJourneySurface,
  MediaPlatform,
  MediaSourceKind,
} from '../types';
import {
  fetchAdminConfig,
  fetchAdminMediaPipelineOverview,
  fetchAdminOrchestrationOverview,
  fetchAdminSystemOverview,
  getAdminApiOrigin,
  processAdminMediaJob,
  processAdminMediaQueue,
  requestAdminMediaRetry,
  reviewAdminOrchestrationRun,
  reviewAdminMediaManifest,
  saveAdminConfig,
  updateAdminConciergeRequestStatus,
} from '../services/adminApi';
import {
  GEMINI_IMAGE_MODEL_OPTIONS,
  GEMINI_ROUTE_PRESETS,
  GEMINI_TEXT_MODEL_OPTIONS,
  GEMINI_VIDEO_MODEL_OPTIONS,
} from '../config/geminiModels.js';
import { MEDIA_LIBRARY_TAXONOMY_GROUPS, mergeMediaTags } from '../config/mediaLibraryTaxonomy';
import { STARTER_MEDIA_LIBRARY_PACK } from '../config/starterMediaLibrary';
import {
  GEMINI_LIVE_MODEL_OPTIONS,
  GEMINI_LIVE_VOICE_OPTIONS,
  VOICE_RUNTIME_LANES,
} from '../config/voiceRuntime.js';
import { BrandStudioSection } from './admin/BrandStudioSection';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type VoicePreset = {
  id: 'fast' | 'balanced' | 'cinematic';
  label: string;
  summary: string;
  temperature: number;
  live_vad_silence_ms: number;
  live_vad_prefix_padding_ms: number;
  live_vad_start_sensitivity: 'high' | 'low';
  live_vad_end_sensitivity: 'high' | 'low';
  narration_style: string;
};

type AdminSectionId =
  | 'summary'
  | 'experience'
  | 'media'
  | 'brand'
  | 'voice'
  | 'governance';

type SelectOption = {
  value: string;
  label?: string;
  description?: string;
};

const normalizeDnaVoiceModel = (value: AppConfig['professional_dna']['voice_model'] | string | undefined) =>
  value === 'elevenlabs_ghost' || value === 'elevenlabs_conversational' ? 'elevenlabs_ghost' : 'gemini_live';

const cloneConfig = (config: AppConfig): AppConfig => JSON.parse(JSON.stringify(config));

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'fast',
    label: 'Fast & Crisp',
    summary: 'Lowest pause window for tighter turn-taking.',
    temperature: 0.7,
    live_vad_silence_ms: 240,
    live_vad_prefix_padding_ms: 70,
    live_vad_start_sensitivity: 'high',
    live_vad_end_sensitivity: 'high',
    narration_style: 'Confident, concise, direct concierge guidance with minimal ornamentation.',
  },
  {
    id: 'balanced',
    label: 'Balanced Concierge',
    summary: 'Natural rhythm for most live conversations.',
    temperature: 0.82,
    live_vad_silence_ms: 360,
    live_vad_prefix_padding_ms: 120,
    live_vad_start_sensitivity: 'high',
    live_vad_end_sensitivity: 'high',
    narration_style: 'Calm concierge narration with subtle warmth, precision, and steady pacing.',
  },
  {
    id: 'cinematic',
    label: 'Cinematic Warmth',
    summary: 'Softer cadence with elevated storytelling feel.',
    temperature: 0.95,
    live_vad_silence_ms: 520,
    live_vad_prefix_padding_ms: 180,
    live_vad_start_sensitivity: 'low',
    live_vad_end_sensitivity: 'low',
    narration_style: 'Editorial, textured, human cadence with reflective pauses and premium tone.',
  },
];

const JOURNEY_SURFACES: MediaJourneySurface[] = [
  'pre_intake',
  'post_intake',
  'suite_home',
  'intake',
  'episodes',
  'brief',
  'suite_distilled',
  'profile',
  'ai_profile',
  'gaps',
  'readiness',
  'cjs_execution',
  'plan',
  'assets',
];

const EXTERNAL_PLATFORMS: MediaPlatform[] = [
  'auto',
  'youtube',
  'vimeo',
  'tiktok',
  'instagram',
  'linkedin',
  'x',
  'loom',
  'direct',
  'other',
];

const SOURCE_KINDS: MediaSourceKind[] = ['single', 'playlist'];
const AUDIENCES: MediaAudience[] = ['all', 'new_clients', 'active_clients', 'admins', 'non_admins'];
const GEMINI_VOICE_NAMES = GEMINI_LIVE_VOICE_OPTIONS.map((voice) => voice.name);

const createMediaItem = (): CuratedMediaItem => ({
  id: `media-${Date.now().toString(36)}`,
  enabled: true,
  title: '',
  subtitle: '',
  source_url: '',
  source_kind: 'single',
  platform: 'auto',
  thumbnail_url: '',
  tags: [],
  priority: 100,
  surfaces: ['episodes'],
  rule: {
    audience: 'all',
    intents: [],
    focuses: [],
    paces: [],
    required_module_unlocks: [],
  },
});

const appendStarterMediaPack = (library: CuratedMediaItem[]) => {
  const existingIds = new Set(library.map((item) => item.id));
  const additions = STARTER_MEDIA_LIBRARY_PACK.filter((item) => !existingIds.has(item.id));
  return [...library, ...additions];
};

const labelize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const describeOptionalAdminError = (error: unknown, surfaceLabel: string) => {
  const message =
    error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  if (/404|Cannot GET|<!DOCTYPE html/i.test(message)) {
    return `${surfaceLabel} is not available on the current API revision yet. Core admin controls are still available.`;
  }
  return message || `Unable to load ${surfaceLabel.toLowerCase()}.`;
};

const shortScope = (scope: string) =>
  scope
    .replace('clients/{uid}/', '')
    .replace('clients/{uid}', 'profile')
    .replace('/artifacts/', ' ')
    .replace('/interactions/', ' ');

const statusTone = (status: string) => {
  if (status === 'pending_approval') return 'border-amber-500/25 bg-amber-50 text-amber-800';
  if (status === 'approved') return 'border-emerald-500/25 bg-emerald-50 text-emerald-800';
  if (status === 'rejected') return 'border-red-500/25 bg-red-50 text-red-800';
  return 'border-black/10 bg-white text-black/65';
};

const signalTone = (active: boolean) =>
  active
    ? 'border-brand-teal/25 bg-brand-soft text-brand-teal'
    : 'border-black/10 bg-white text-black/45';

const describeAdminMutationError = (error: unknown, fallback: string) => {
  const message =
    error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  if (/401|invalid_token|missing_bearer_token/i.test(message)) {
    return 'Admin session expired. Refresh the app and sign in again before saving.';
  }
  if (/403|admin_required/i.test(message)) {
    return 'This account is authenticated but is not allowed to write admin configuration.';
  }
  if (/permission_denied|PERMISSION_DENIED|Missing or insufficient permissions/i.test(message)) {
    return 'The API can read the admin console, but the current runtime still lacks write permission for this action.';
  }
  if (/503|Failed to fetch|Load failed|NetworkError/i.test(message)) {
    return 'The admin action could not reach the API cleanly. Retry after the live service settles or refresh the session.';
  }
  return message || fallback;
};

const mediaPipelineTone = (status: string) => {
  if (status === 'completed' || status === 'approved' || status === 'scheduled') return 'border-emerald-500/25 bg-emerald-50 text-emerald-800';
  if (status === 'reviewed') return 'border-brand-teal/25 bg-brand-soft text-brand-teal';
  if (status === 'queued' || status === 'needs_review') return 'border-amber-500/25 bg-amber-50 text-amber-800';
  if (status === 'degraded' || status === 'rejected') return 'border-red-500/25 bg-red-50 text-red-800';
  return 'border-black/10 bg-white text-black/60';
};

const EXPERIENCE_GUIDE_CARDS = [
  {
    eyebrow: 'How it works',
    title: 'Change the lane, then save once.',
    description:
      'Edits in this rail change model routing, prompt overlays, and client-visible posture. Nothing publishes until Save Config is used.',
  },
  {
    eyebrow: 'Safe default',
    title: 'Adjust switches before prompts.',
    description:
      'Use preset routing, toggles, and dossier section controls first. Reach for appendices only when the default system behavior needs a deliberate operator override.',
  },
  {
    eyebrow: 'Operator note',
    title: 'Professional DNA updates downstream.',
    description:
      'The DNA lane enriches Brief and Profile after intake. Section choices affect both report depth and the order the dossier renders in the client UI.',
  },
];

const PROMPT_OVERLAY_FIELDS = [
  {
    key: 'suite_appendix',
    eyebrow: 'Suite generation',
    label: 'Suite prompt appendix',
    description: 'Use for additional system guidance that should affect suite-wide artifact generation.',
    minHeight: 'min-h-20',
  },
  {
    key: 'binge_appendix',
    eyebrow: 'Episodes',
    label: 'Binge prompt appendix',
    description: 'Steers the episode rail and learning-session tone without changing the rest of the suite.',
    minHeight: 'min-h-20',
  },
  {
    key: 'rom_appendix',
    eyebrow: 'Core ROM',
    label: 'Core ROM overlay',
    description: 'Appends operator posture to the core counselor model when the base ROM needs stronger instruction.',
    minHeight: 'min-h-20',
  },
  {
    key: 'live_appendix',
    eyebrow: 'Live voice and video',
    label: 'Live voice / video overlay',
    description: 'Applies only to the Gemini fallback audio lane and operator-facing voice behaviors.',
    minHeight: 'min-h-20',
  },
  {
    key: 'art_director_appendix',
    eyebrow: 'Art direction',
    label: 'Art director overlay',
    description: 'Controls higher-touch creative framing for visuals, cinematic assets, and experiential scenes.',
    minHeight: 'min-h-20',
  },
] as const;

const PROMPT_PACKS: Record<string, Record<string, string>> = {
  editorial: {
    suite_appendix: 'Favor long-form editorial prose over bullet lists. Lean into narrative structure and professional storytelling.',
    binge_appendix: 'Episodes should feel cinematic. Use scene-setting openings and cliffhanger transitions between beats.',
    rom_appendix: 'Maintain a warm but authoritative counselor voice. Never sound robotic or overly formal.',
    live_appendix: 'In live sessions, keep responses conversational and grounded. Mirror the user\'s energy level.',
    art_director_appendix: 'Visuals should evoke premium editorial magazines. Muted palettes, strong typography, minimal stock-photo energy.',
  },
  precision: {
    suite_appendix: 'Prioritize data-backed claims and structured formatting. Every assertion needs supporting evidence.',
    binge_appendix: 'Keep episodes tight and actionable. Each beat should deliver a concrete takeaway within 90 seconds.',
    rom_appendix: 'Be direct and efficient. The user values speed and accuracy over warmth.',
    live_appendix: 'In live sessions, get to the point quickly. Confirm understanding before expanding.',
    art_director_appendix: 'Clean, minimal visuals. Data visualization over illustration. White space is a feature.',
  },
  warmth: {
    suite_appendix: 'Lead with empathy. Acknowledge the emotional weight of career transitions before diving into strategy.',
    binge_appendix: 'Episodes should feel like a trusted mentor sharing wisdom. Personal anecdotes welcome.',
    rom_appendix: 'Be genuinely encouraging without being patronizing. Celebrate small wins.',
    live_appendix: 'In live sessions, actively listen. Reflect back what you hear before responding.',
    art_director_appendix: 'Warm tones, organic textures, human photography. Avoid corporate sterility.',
  },
};

const DNA_SECTION_OPTIONS: SelectOption[] = [
  { value: 'case_summary', label: 'Case Summary', description: 'Opening thesis and core framing for the dossier.' },
  { value: 'genome_markers', label: 'Genome Markers', description: 'Primary career traits, signal markers, and durable strengths.' },
  { value: 'behavioral_propensities', label: 'Behavioral Propensities', description: 'Observed and inferred ways this client tends to operate.' },
  { value: 'pressure_response', label: 'Pressure Response', description: 'How the client reacts under ambiguity, urgency, or stress.' },
  { value: 'environmental_fit', label: 'Environmental Fit', description: 'Where this person is likely to perform best or degrade fastest.' },
  { value: 'market_climate', label: 'Market Climate', description: 'Demand context, hiring temperature, and market conditions.' },
  { value: 'compensation_position', label: 'Compensation Position', description: 'Current pricing posture, ceiling, and ask justification.' },
  { value: 'extinction_risks', label: 'Extinction Risks', description: 'Behaviors or gaps the market is most likely to punish.' },
  { value: 'adaptive_assets', label: 'Adaptive Assets', description: 'Portable strengths that increase resilience and transition power.' },
  { value: 'lean_into', label: 'Lean Into', description: 'Patterns the client should amplify right now.' },
  { value: 'let_go', label: 'Let Go', description: 'Narratives, habits, or role assumptions that now cost them value.' },
  { value: 'build_next', label: 'Build Next', description: 'Assets or proof the client should develop next.' },
  { value: 'evolution_path_90_days', label: '90-Day Evolution Path', description: 'Short-horizon adaptation plan for the next quarter.' },
];

const DNA_RESEARCH_DOMAIN_OPTIONS: SelectOption[] = [
  { value: 'labor_market', label: 'Labor Market', description: 'BLS, JOLTS, and top-line labor health indicators.' },
  { value: 'occupation_outlook', label: 'Occupation Outlook', description: 'Role-family demand and employment-projection posture.' },
  { value: 'geography', label: 'Geography', description: 'Regional demand, relocation logic, and market concentration.' },
  { value: 'compensation', label: 'Compensation', description: 'Market-rate signals, pay bands, and ask-receipt posture.' },
  { value: 'company_posture', label: 'Company Posture', description: 'Directional notes on employer behavior, churn, and pay style.' },
  { value: 'supply_shifts', label: 'Supply Shifts', description: 'Layoffs, talent gluts, and role-level supply pressure.' },
  { value: 'regulatory_demand', label: 'Regulatory Demand', description: 'Demand created by compliance, policy, or new regulation.' },
];

const normalizeList = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const toggleListValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

const moveListValue = (values: string[], index: number, direction: 'up' | 'down') => {
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= values.length) return values;
  const next = [...values];
  const [moved] = next.splice(index, 1);
  next.splice(nextIndex, 0, moved);
  return next;
};

const humanizePipelineAssetNote = (note: string | undefined, kind: 'image' | 'video') => {
  const value = String(note ?? '').trim();
  if (!value) return '';
  if (/enhanceprompt parameter is not supported/i.test(value)) {
    return kind === 'image'
      ? 'Image generation hit an API-option mismatch. The job was preserved and the route now needs a config-safe retry.'
      : 'Media generation hit an API-option mismatch. The job was preserved and the route now needs a config-safe retry.';
  }
  if (/queued\. use refresh to poll operation status/i.test(value)) {
    return 'Render queued successfully. Use refresh after a short delay to pull the finished asset.';
  }
  return value.replace(/^Image generation unavailable:\s*/i, '').replace(/^Video generation unavailable:\s*/i, '');
};

const sectionCopy: Record<
  AdminSectionId,
  { eyebrow: string; title: string; description: string; shortLabel: string }
> = {
  summary: {
    eyebrow: 'Overview',
    title: 'Control tower.',
    description: 'A compact read on runtime, approval pressure, routing posture, and the staff policy layer.',
    shortLabel: 'Tower',
  },
  experience: {
    eyebrow: 'Experience Rails',
    title: 'Models, prompts, and client-facing switches.',
    description: 'Tune the suite generation stack, prompt overlays, and end-user feature posture without wading through the rest of the system.',
    shortLabel: 'Rails',
  },
  media: {
    eyebrow: 'Media Pipeline',
    title: 'Library-first routing and bespoke media rules.',
    description: 'Control image/video models, narrative direction, and the curated library that feeds the cinematic episodes system.',
    shortLabel: 'Media',
  },
  brand: {
    eyebrow: 'Brand Studio',
    title: 'Editorial hierarchy and identity controls.',
    description: 'Refine typography, labels, hierarchy, and logo propagation with a live preview of the shell language.',
    shortLabel: 'Brand',
  },
  voice: {
    eyebrow: 'Live Voice',
    title: 'Conversation cadence and narration posture.',
    description: 'Select the voice operating mode, then open studio tuning only when a sharper adjustment is required.',
    shortLabel: 'Voice',
  },
  governance: {
    eyebrow: 'Governance',
    title: 'Approvals, entitlements, and staff policy.',
    description: 'Review the agent registry, approval rail, and admin-facing access settings in one operator surface.',
    shortLabel: 'Policy',
  },
};

function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <header className="flex items-baseline gap-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-brand-teal">{eyebrow}</span>
        <h3 className="admin-display text-sm leading-tight text-[#08161a]">{title}</h3>
        <span className="hidden admin-body text-[10px] leading-tight text-black/45 sm:inline">{description}</span>
      </header>
      {children}
    </section>
  );
}

function Panel({
  title,
  eyebrow,
  meta,
  children,
  dense = false,
}: {
  title: string;
  eyebrow?: string;
  meta?: string;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <section className="overflow-hidden border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,247,241,0.98))]">
      <div className="flex items-center justify-between gap-2 border-b border-black/10 px-3 py-1.5">
        <div className="flex items-baseline gap-2">
          {eyebrow ? <span className="text-[9px] uppercase tracking-[0.18em] text-brand-teal">{eyebrow}</span> : null}
          <h4 className="admin-display text-xs leading-tight text-[#09161a]">{title}</h4>
        </div>
        {meta ? <span className="text-[9px] uppercase tracking-[0.16em] text-black/40">{meta}</span> : null}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

function MetricCard({
  eyebrow,
  title,
  body,
  meta,
  inverted = false,
}: {
  key?: React.Key;
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
  inverted?: boolean;
}) {
  return (
    <article
      className={`border px-2.5 py-1.5 ${
        inverted
          ? 'border-white/12 bg-white/6 text-white'
          : 'border-black/10 bg-[#fbf8f1] text-[#09161a]'
      }`}
    >
      <div className={`text-[9px] uppercase tracking-[0.18em] ${inverted ? 'text-brand-teal' : 'text-brand-teal'}`}>
        {eyebrow}
      </div>
      <div className="mt-0.5 text-sm admin-display leading-tight">{title}</div>
      <p className={`mt-0.5 text-[11px] leading-snug ${inverted ? 'text-white/70' : 'text-black/60'}`}>{body}</p>
      <div className={`mt-0.5 text-[9px] uppercase tracking-[0.16em] ${inverted ? 'text-white/50' : 'text-black/40'}`}>
        {meta}
      </div>
    </article>
  );
}

function AdminStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="border border-black/8 bg-white/62 px-2 py-1">
      <div className="text-[9px] uppercase tracking-[0.16em] text-black/40">{label}</div>
      <div className="text-sm admin-mono leading-none text-[#09161a]">{value}</div>
      {detail ? <div className="text-[9px] uppercase tracking-[0.14em] text-black/35">{detail}</div> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
  step,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="space-y-0.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-b border-black/10 bg-transparent py-1 text-xs outline-none transition-colors focus:border-brand-teal"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  minHeight = 'min-h-16',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
}) {
  return (
    <label className="space-y-0.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${minHeight} border border-black/10 bg-[#fcfcfb] p-1.5 text-xs outline-none transition-colors focus:border-brand-teal`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[] | SelectOption[];
  onChange: (value: string) => void;
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string'
      ? { value: option, label: labelize(option) }
      : { value: option.value, label: option.label || labelize(option.value) }
  );
  return (
    <label className="space-y-0.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-black/10 bg-transparent py-1 text-xs outline-none transition-colors focus:border-brand-teal"
      >
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-center gap-2 border border-black/10 bg-[#fcfbf7] px-2.5 py-1.5 text-xs">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-[#09161a]">{label}</span>
      {hint ? <span className="text-[10px] text-black/45">{hint}</span> : null}
    </label>
  );
}

function GuideCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <article className="border border-black/10 bg-[#fcfbf7] px-2.5 py-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] uppercase tracking-[0.18em] text-brand-teal">{eyebrow}</span>
        <span className="text-xs admin-display leading-tight text-[#09161a]">{title}</span>
      </div>
      <p className="admin-body text-[11px] leading-snug text-black/50">{description}</p>
    </article>
  );
}

function FieldCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-black/10 bg-[#fcfbf7] p-2">
      <div className="flex items-baseline gap-2">
        {eyebrow ? <span className="text-[9px] uppercase tracking-[0.16em] text-brand-teal">{eyebrow}</span> : null}
        <span className="text-xs admin-display leading-tight text-[#09161a]">{title}</span>
        {description ? <span className="hidden admin-body text-[10px] text-black/45 lg:inline" title={description}>{description}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ChipToggleGroup({
  label,
  description,
  options,
  selected,
  onToggle,
}: {
  label: string;
  description?: string;
  options: SelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-gray-600">{label}</span>
        {description ? <span className="text-[9px] text-black/40">{description}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`border px-2 py-1 text-left transition-colors ${
                active
                  ? 'border-brand-teal bg-brand-soft text-brand-teal'
                  : 'border-black/10 bg-white text-[#09161a] hover:border-brand-teal'
              }`}
            >
              <div className="text-[9px] uppercase tracking-[0.14em]">{option.label || labelize(option.value)}</div>
              {option.description ? <div className="text-[10px] leading-snug opacity-70">{option.description}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepperField({
  label,
  value,
  onChange,
  min = 1,
  max = 90,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="admin-mono text-[10px] text-black/50">{label}</span>
      <div className="admin-stepper inline-flex items-center gap-0.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} aria-label={`Decrease ${label}`}>−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          aria-label={label}
        />
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} aria-label={`Increase ${label}`}>+</button>
      </div>
      {unit ? <span className="admin-mono text-[9px] text-black/35">{unit}</span> : null}
    </div>
  );
}

function OrderedListField({
  label,
  description,
  values,
  options,
  onMove,
}: {
  label: string;
  description?: string;
  values: string[];
  options: SelectOption[];
  onMove: (index: number, direction: 'up' | 'down') => void;
}) {
  const optionMap = new Map(options.map((option) => [option.value, option]));
  return (
    <div className="space-y-0.5">
      {description ? <div className="admin-body text-[11px] italic text-black/45 mb-1">{description}</div> : null}
      {values.length === 0 ? (
        <div className="admin-body italic text-[11px] text-black/35 py-2">No enabled sections.</div>
      ) : (
        values.map((value, index) => {
          const option = optionMap.get(value);
          return (
            <div key={`${value}-${index}`} className="group flex h-8 items-center gap-2 border border-black/8 bg-white px-2 hover:border-brand-teal transition-colors cursor-grab">
              <span className="admin-mono text-[10px] text-black/25 cursor-grab" title="Drag to reorder">⠿</span>
              <span className="admin-mono text-[10px] text-black/30 w-5">{index + 1}</span>
              <span className="admin-body text-[12px] text-[#09161a] min-w-0 flex-1 truncate">{option?.label || labelize(value)}</span>
              <button
                type="button"
                onClick={() => onMove(index, 'up')}
                disabled={index === 0}
                aria-label={`Move ${option?.label || value} up`}
                className="admin-mono text-[10px] text-black/30 hover:text-brand-teal disabled:opacity-20 transition-colors px-1"
              >↑</button>
              <button
                type="button"
                onClick={() => onMove(index, 'down')}
                disabled={index === values.length - 1}
                aria-label={`Move ${option?.label || value} down`}
                className="admin-mono text-[10px] text-black/30 hover:text-brand-teal disabled:opacity-20 transition-colors px-1"
              >↓</button>
            </div>
          );
        })
      )}
    </div>
  );
}

export function AdminConsole({ open, onClose, onSaved }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [overview, setOverview] = useState<AdminSystemOverview | null>(null);
  const [mediaPipeline, setMediaPipeline] = useState<AdminMediaPipelineOverview | null>(null);
  const [mediaPipelineError, setMediaPipelineError] = useState<string | null>(null);
  const [mediaPipelineBusyKey, setMediaPipelineBusyKey] = useState<string | null>(null);
  const [bookingBusyKey, setBookingBusyKey] = useState<string | null>(null);
  const [orchestrationOverview, setOrchestrationOverview] = useState<AdminOrchestrationOverview | null>(null);
  const [orchestrationError, setOrchestrationError] = useState<string | null>(null);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSectionId>('summary');
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);
  const [baselineFingerprint, setBaselineFingerprint] = useState('');

  const isReady = useMemo(() => !!config && !loading, [config, loading]);
  const currentFingerprint = useMemo(() => (config ? JSON.stringify(config) : ''), [config]);
  const hasUnsavedChanges = !!config && !!baselineFingerprint && currentFingerprint !== baselineFingerprint;

  const loadOptionalOverviews = async () => {
    const [pipelineResult, orchestrationResult] = await Promise.allSettled([
      fetchAdminMediaPipelineOverview(),
      fetchAdminOrchestrationOverview(),
    ]);

    if (pipelineResult.status === 'fulfilled') {
      setMediaPipeline(pipelineResult.value);
      setMediaPipelineError(null);
    } else {
      setMediaPipeline(null);
      setMediaPipelineError(describeOptionalAdminError(pipelineResult.reason, 'Media pipeline'));
    }

    if (orchestrationResult.status === 'fulfilled') {
      setOrchestrationOverview(orchestrationResult.value);
      setOrchestrationError(null);
    } else {
      setOrchestrationOverview(null);
      setOrchestrationError(describeOptionalAdminError(orchestrationResult.reason, 'Orchestration control plane'));
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setMediaPipelineError(null);
    setOrchestrationError(null);
    setShowAdvancedVoice(false);
    try {
      const [cfg, nextOverview] = await Promise.all([
        fetchAdminConfig(),
        fetchAdminSystemOverview(),
      ]);
      setConfig(cfg);
      setOverview(nextOverview);
      setBaselineFingerprint(JSON.stringify(cfg));
      setExpandedMediaId(cfg.media.curated_library[0]?.id ?? null);
      await loadOptionalOverviews();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load admin config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setActiveSection('summary');
    load();
  }, [open]);

  if (!open) return null;

  const setNumber = (path: 'suite_temperature' | 'binge_temperature', value: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        generation: {
          ...prev.generation,
          [path]: value,
        },
      };
    });
  };

  const applyVoicePreset = (preset: VoicePreset) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        voice: {
          ...prev.voice,
          temperature: preset.temperature,
          live_vad_silence_ms: preset.live_vad_silence_ms,
          live_vad_prefix_padding_ms: preset.live_vad_prefix_padding_ms,
          live_vad_start_sensitivity: preset.live_vad_start_sensitivity,
          live_vad_end_sensitivity: preset.live_vad_end_sensitivity,
          narration_style: preset.narration_style,
        },
      };
    });
  };

  const applyModelPreset = (presetId: string) => {
    const preset = GEMINI_ROUTE_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        generation: {
          ...prev.generation,
          suite_model: preset.suite_model,
          binge_model: preset.binge_model,
        },
        media: {
          ...prev.media,
          image_model: preset.image_model,
          video_model: preset.video_model,
        },
      };
    });
    setSuccess(`Routing preset applied: ${preset.label}. Save config to publish it.`);
    setError(null);
  };

  const updateMediaItem = (index: number, updater: (item: CuratedMediaItem) => CuratedMediaItem) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = [...prev.media.curated_library];
      const current = next[index];
      if (!current) return prev;
      next[index] = updater(current);
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: next,
        },
      };
    });
  };

  const addMediaItem = () => {
    const newItem = createMediaItem();
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: [...prev.media.curated_library, newItem],
        },
      };
    });
    setExpandedMediaId(newItem.id);
  };

  const removeMediaItem = (index: number) => {
    const nextExpandedId =
      config?.media.curated_library.filter((_, i) => i !== index)[0]?.id ?? null;
    setConfig((prev) => {
      if (!prev) return prev;
      const nextLibrary = prev.media.curated_library.filter((_, i) => i !== index);
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: nextLibrary,
        },
      };
    });
    setExpandedMediaId(nextExpandedId);
  };

  const seedStarterMediaPack = () => {
    setConfig((prev) => {
      if (!prev) return prev;
      const nextLibrary = appendStarterMediaPack(prev.media.curated_library);
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: nextLibrary,
        },
      };
    });
    setExpandedMediaId((prev) => prev ?? STARTER_MEDIA_LIBRARY_PACK[0]?.id ?? null);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveAdminConfig(config);
      const nextConfig = cloneConfig(saved);
      setConfig(nextConfig);
      setBaselineFingerprint(JSON.stringify(nextConfig));
      const [nextOverview] = await Promise.all([fetchAdminSystemOverview()]);
      setOverview(nextOverview);
      await loadOptionalOverviews();
      setSuccess('Configuration saved.');
      onSaved?.();
    } catch (e: any) {
      setError(describeAdminMutationError(e, 'Unable to save config.'));
    } finally {
      setSaving(false);
    }
  };

  const refreshMediaPipeline = async () => {
    setMediaPipelineError(null);
    try {
      const next = await fetchAdminMediaPipelineOverview();
      setMediaPipeline(next);
    } catch (e: any) {
      setMediaPipeline(null);
      setMediaPipelineError(describeOptionalAdminError(e, 'Media pipeline'));
    }
  };

  const refreshOrchestrationOverview = async () => {
    setOrchestrationError(null);
    try {
      const next = await fetchAdminOrchestrationOverview();
      setOrchestrationOverview(next);
    } catch (e: any) {
      setOrchestrationOverview(null);
      setOrchestrationError(describeOptionalAdminError(e, 'Orchestration control plane'));
    }
  };

  const retryMediaJob = async (clientUid: string, jobId: string) => {
    const key = `retry:${clientUid}:${jobId}`;
    setMediaPipelineBusyKey(key);
    setMediaPipelineError(null);
    setSuccess(null);
    try {
      await requestAdminMediaRetry(clientUid, jobId);
      await refreshMediaPipeline();
      setSuccess('Retry request recorded.');
    } catch (e: any) {
      setMediaPipelineError(e?.message ?? 'Unable to request retry.');
    } finally {
      setMediaPipelineBusyKey(null);
    }
  };

  const processMediaJob = async (clientUid: string, jobId: string) => {
    const key = `process:${clientUid}:${jobId}`;
    setMediaPipelineBusyKey(key);
    setMediaPipelineError(null);
    setSuccess(null);
    try {
      await processAdminMediaJob(clientUid, jobId);
      await refreshMediaPipeline();
      setSuccess('Media job processed.');
    } catch (e: any) {
      setMediaPipelineError(e?.message ?? 'Unable to process media job.');
    } finally {
      setMediaPipelineBusyKey(null);
    }
  };

  const processMediaQueueNow = async () => {
    const key = 'process:queue';
    setMediaPipelineBusyKey(key);
    setMediaPipelineError(null);
    setSuccess(null);
    try {
      await processAdminMediaQueue(2);
      await refreshMediaPipeline();
      setSuccess('Pending media queue processed.');
    } catch (e: any) {
      setMediaPipelineError(e?.message ?? 'Unable to process pending media queue.');
    } finally {
      setMediaPipelineBusyKey(null);
    }
  };

  const reviewManifest = async (
    clientUid: string,
    manifestId: string,
    decision: 'approved' | 'needs_review' | 'rejected'
  ) => {
    const key = `review:${clientUid}:${manifestId}:${decision}`;
    setMediaPipelineBusyKey(key);
    setMediaPipelineError(null);
    setSuccess(null);
    try {
      await reviewAdminMediaManifest(clientUid, manifestId, decision);
      await refreshMediaPipeline();
      setSuccess(`Manifest marked ${decision.replace(/_/g, ' ')}.`);
    } catch (e: any) {
      setMediaPipelineError(e?.message ?? 'Unable to update manifest review state.');
    } finally {
      setMediaPipelineBusyKey(null);
    }
  };

  const requestReload = () => {
    if (loading || saving) return;
    if (
      hasUnsavedChanges &&
      typeof window !== 'undefined' &&
      !window.confirm('Reloading admin config will discard your unsaved changes. Continue?')
    ) {
      return;
    }
    load();
  };

  const updateConciergeRequestStatus = async (
    requestId: string,
    status: 'new' | 'reviewed' | 'scheduled'
  ) => {
    setBookingBusyKey(`${requestId}:${status}`);
    setError(null);
    setSuccess(null);
    try {
      await updateAdminConciergeRequestStatus(requestId, status);
      const nextOverview = await fetchAdminSystemOverview();
      setOverview(nextOverview);
      setSuccess(`Concierge request marked ${status}.`);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update concierge request.');
    } finally {
      setBookingBusyKey(null);
    }
  };

  const reviewOrchestrationRun = async (
    clientUid: string,
    runId: string,
    decision: 'approved' | 'needs_review' | 'request_human_followup'
  ) => {
    const key = `orchestration:${clientUid}:${runId}:${decision}`;
    setBookingBusyKey(key);
    setOrchestrationError(null);
    setSuccess(null);
    try {
      await reviewAdminOrchestrationRun(clientUid, runId, decision);
      const [nextOverview] = await Promise.all([fetchAdminSystemOverview(), refreshOrchestrationOverview()]);
      setOverview(nextOverview);
      setSuccess(
        decision === 'request_human_followup'
          ? 'Human follow-up requested from orchestration control plane.'
          : `Run marked ${decision.replace(/_/g, ' ')}.`
      );
    } catch (e: any) {
      setOrchestrationError(e?.message ?? 'Unable to review orchestration run.');
    } finally {
      setBookingBusyKey(null);
    }
  };

  const runtime = overview?.runtime ?? {
    project_id: 'unknown',
    region: 'unknown',
    service_name: 'career-concierge-api',
    revision: 'unknown',
    firestore_database_id: 'default',
    storage_bucket: '',
    gemini_configured: false,
    sesame_configured: false,
    elevenlabs_api_configured: false,
    elevenlabs_agent_configured: false,
    manus_configured: false,
    admin_email_mode: 'open',
    admin_email_count: 0,
    rom_version: 'unknown',
  };
  const queue = overview?.queue ?? { pending_count: 0, client_count: 0, hydrated_account_count: 0, items: [], warning: '' };
  const bookings = overview?.bookings ?? { pending_count: 0, items: [] };
  const agents = overview?.agents ?? { count: 0, approval_required_count: 0, write_scope_count: 0, items: [] };
  const configSummary = overview?.config_summary ?? {
    external_media_enabled: false,
    curated_library_count: 0,
    curated_library_enabled_count: 0,
    voice_enabled: false,
    voice_provider: 'gemini_live',
    live_model: 'unknown',
    episodes_enabled: false,
    cjs_enabled: false,
    tone_guard_enabled: false,
    onboarding_email_enabled: false,
    auto_generate_on_episode: false,
    suite_overlay_configured: false,
    binge_overlay_configured: false,
    rom_overlay_configured: false,
    live_overlay_configured: false,
    art_director_overlay_configured: false,
  };

  const overviewCards = overview
    ? [
        {
          eyebrow: 'Runtime',
          title: `${runtime.project_id} / ${runtime.region}`,
          body: `${runtime.service_name} on ${runtime.firestore_database_id}`,
          meta: `rev ${runtime.revision}`,
        },
        {
          eyebrow: 'Approvals',
          title: `${queue.pending_count} pending / ${queue.client_count} clients`,
          body: 'Global admin queue across client ledgers.',
          meta: queue.pending_count > 0 ? 'attention required' : 'clear',
        },
        {
          eyebrow: 'Concierge',
          title: `${bookings.pending_count} new / ${bookings.items.length} visible`,
          body: 'Public AI Concierge and Smart Start intake requests.',
          meta: bookings.pending_count > 0 ? 'follow up needed' : 'quiet',
        },
        {
          eyebrow: 'Agents',
          title: `${agents.count} live roles / ${agents.write_scope_count} write scopes`,
          body: `${agents.approval_required_count} roles require approval before execution leaves the rail.`,
          meta: `${runtime.admin_email_count} admin emails`,
        },
        {
          eyebrow: 'Routing',
          title: `${configSummary.voice_provider} / ${configSummary.live_model}`,
          body: `${configSummary.curated_library_enabled_count} enabled media routes, ${configSummary.curated_library_count} total entries.`,
          meta: configSummary.external_media_enabled ? 'external media on' : 'external media off',
        },
      ]
    : [];

  const apiOrigin = getAdminApiOrigin();
  const serviceStates = overview
    ? [
        { label: 'Episodes rail', active: configSummary.episodes_enabled },
        { label: 'CJS execution', active: configSummary.cjs_enabled },
        { label: 'Voice rail', active: configSummary.voice_enabled },
        { label: 'External media', active: configSummary.external_media_enabled },
        { label: 'Episode autogen', active: configSummary.auto_generate_on_episode },
        { label: 'Tone guard', active: configSummary.tone_guard_enabled },
        { label: 'Onboarding email', active: configSummary.onboarding_email_enabled },
      ]
    : [];

  const promptStates = overview
    ? [
        { label: 'Suite overlay', active: configSummary.suite_overlay_configured },
        { label: 'Binge overlay', active: configSummary.binge_overlay_configured },
        { label: 'ROM overlay', active: configSummary.rom_overlay_configured },
        { label: 'Live overlay', active: configSummary.live_overlay_configured },
        { label: 'Art director', active: configSummary.art_director_overlay_configured },
      ]
    : [];

  const navSections = (
    Object.keys(sectionCopy) as AdminSectionId[]
  ).map((id) => ({
    id,
    ...sectionCopy[id],
  }));

  const renderSummary = () => {
    if (!overview) return null;
    return (
      <SectionShell {...sectionCopy.summary}>
        <section className="border border-[#08242a] bg-[linear-gradient(145deg,#041117_0%,#08242a_56%,#07181d_100%)] px-3 py-2 text-white">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.16em] text-white/65">
            <span className="text-brand-teal admin-display text-xs">Operating Surface</span>
            {[
              { label: 'Gemini', ok: runtime.gemini_configured },
              { label: 'Sesame', ok: runtime.sesame_configured },
              { label: 'ElevenLabs Ghost', ok: runtime.elevenlabs_api_configured || runtime.elevenlabs_agent_configured },
              { label: 'Manus', ok: runtime.manus_configured },
              { label: 'Storage', ok: !!runtime.storage_bucket },
              { label: 'Voice', ok: configSummary.voice_enabled },
            ].map((svc) => (
              <span key={svc.label} className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${svc.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {svc.label}
              </span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-1.5">
            {overviewCards.map((card) => (
              <MetricCard
                key={card.eyebrow}
                eyebrow={card.eyebrow}
                title={card.title}
                body={card.body}
                meta={card.meta}
                inverted
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-2">
          <details className="border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,247,241,0.98))]">
            <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs">
              <span className="flex items-baseline gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-brand-teal">Env</span>
                <span className="admin-display text-[#09161a]">Runtime identity</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-black/40">ROM {runtime.rom_version}</span>
            </summary>
            <div className="grid grid-cols-2 gap-1 border-t border-black/8 p-2 text-[11px] text-gray-700">
              {[
                { label: 'API', value: apiOrigin, full: true },
                { label: 'Service', value: runtime.service_name },
                { label: 'Project', value: runtime.project_id },
                { label: 'Region', value: runtime.region },
                { label: 'Revision', value: runtime.revision },
                { label: 'Firestore', value: runtime.firestore_database_id },
                { label: 'Bucket', value: runtime.storage_bucket || 'not set' },
                { label: 'Admin', value: runtime.admin_email_mode === 'allowlist' ? `${runtime.admin_email_count} emails` : 'open' },
              ].map((item) => (
                <div key={item.label} className={`border border-black/6 bg-[#f8faf8] px-2 py-1 ${(item as any).full ? 'col-span-2' : ''}`}>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-black/40">{item.label}</span>{' '}
                  <span className="break-all font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </details>

          <Panel title="Live posture" eyebrow="Signals" meta={`${queue.pending_count} pending`}>
            <div className="space-y-2">
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-[0.14em] text-black/40">Services</div>
                <div className="flex flex-wrap gap-1">
                  {serviceStates.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${signalTone(
                        item.active
                      )}`}
                    >
                      {item.label}: {item.active ? 'on' : 'off'}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-[0.14em] text-black/40">Prompts</div>
                <div className="flex flex-wrap gap-1">
                  {promptStates.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${signalTone(
                        item.active
                      )}`}
                    >
                      {item.label}: {item.active ? 'set' : 'empty'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-2">
          <Panel title="Approval rail" eyebrow="Queue" meta={`${queue.items.length} items`}>
            <div className="max-h-[240px] space-y-1 overflow-y-auto">
              {queue.warning ? (
                <div className="border border-amber-500/30 bg-amber-500/8 px-2.5 py-1.5 text-[11px] text-amber-800">
                  {queue.warning}
                </div>
              ) : null}
              {queue.items.length === 0 ? (
                <div className="border border-black/10 bg-[#f8faf8] px-2.5 py-1.5 text-[11px] text-gray-600">
                  No pending approvals.
                </div>
              ) : (
                queue.items.map((item) => (
                  <div
                    key={`${item.client_uid || 'client'}-${item.id}`}
                    title={item.summary}
                    className="flex items-center gap-2 border border-black/10 bg-[#fbfcfa] px-2 py-1"
                  >
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-black/40">
                      {item.client_name || item.client_uid || '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] admin-body leading-tight text-[#09161a]">
                      {item.title}
                    </span>
                    <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] ${statusTone(item.status)}`}>
                      {labelize(item.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Staff registry" eyebrow="Policy" meta={`${agents.count} roles`}>
            <div className="max-h-[240px] space-y-0.5 overflow-y-auto">
              {agents.items.map((agent) => (
                <div
                  key={agent.role_id}
                  title={agent.objective}
                  className="flex h-10 items-center gap-2 border border-black/10 bg-[#fbfcfa] px-2"
                >
                  <span className="w-24 shrink-0 truncate text-[9px] uppercase tracking-[0.14em] text-black/40">
                    {agent.role_id}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] admin-body leading-tight text-[#09161a]">
                    {agent.title}
                  </span>
                  <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                    agent.approval_required
                      ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                      : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
                  }`}>
                    {agent.approval_required ? 'approval' : 'direct'}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </SectionShell>
    );
  };

  const renderExperience = () => {
    if (!config) return null;
    const knownDnaSectionIds = DNA_SECTION_OPTIONS.map((option) => option.value);
    const customEnabledSections = normalizeList(
      config.professional_dna.enabled_sections.filter((section) => !knownDnaSectionIds.includes(section))
    );
    const knownEnabledSections = normalizeList(
      config.professional_dna.enabled_sections.filter((section) => knownDnaSectionIds.includes(section))
    );
    const effectiveSectionOrder = normalizeList([
      ...config.professional_dna.section_order.filter((section) =>
        [...knownEnabledSections, ...customEnabledSections].includes(section)
      ),
      ...knownEnabledSections,
      ...customEnabledSections,
    ]);
    const knownResearchDomains = DNA_RESEARCH_DOMAIN_OPTIONS.map((option) => option.value);
    const customResearchDomains = normalizeList(
      config.professional_dna.research_domains.filter((domain) => !knownResearchDomains.includes(domain))
    );
    const selectedResearchDomains = normalizeList([
      ...config.professional_dna.research_domains.filter((domain) => knownResearchDomains.includes(domain)),
      ...customResearchDomains,
    ]);

    return (
      <SectionShell {...sectionCopy.experience}>
        <div className="mx-auto grid max-w-[1120px] gap-2">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Panel title="Generation routing" eyebrow="Models" meta="Primary rails">
              {/* ── Subway-diagram route presets ── */}
              <div className="mb-2">
                <div className="flex items-center gap-3">
                  {GEMINI_ROUTE_PRESETS.map((preset, i) => {
                    const isActive =
                      config.generation.suite_model === preset.suite_model &&
                      config.generation.binge_model === preset.binge_model;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyModelPreset(preset.id)}
                        className="group/route flex items-center gap-2"
                      >
                        {/* Station dot */}
                        <span className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                          isActive
                            ? 'border-brand-teal bg-brand-teal'
                            : 'border-black/20 bg-white group-hover/route:border-brand-teal'
                        }`}>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        {/* Route label */}
                        <span className={`text-[10px] uppercase tracking-[0.14em] transition-colors ${
                          isActive ? 'text-brand-teal font-medium' : 'text-black/45 group-hover/route:text-black/70'
                        }`}>
                          {preset.label}
                        </span>
                        {/* Connecting line to next stop */}
                        {i < GEMINI_ROUTE_PRESETS.length - 1 && (
                          <span className="h-px w-6 bg-black/12" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="ml-6 mt-0.5 text-[9px] text-black/40">
                  {GEMINI_ROUTE_PRESETS.find(
                    (p) => config.generation.suite_model === p.suite_model && config.generation.binge_model === p.binge_model
                  )?.summary || 'Custom route — fine-tuned below'}
                </div>
              </div>

              {/* ── Compact 2x2 model + temperature grid ── */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <SelectField
                  label="Suite model"
                  value={config.generation.suite_model}
                  options={GEMINI_TEXT_MODEL_OPTIONS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, generation: { ...prev.generation, suite_model: value } } : prev
                    )
                  }
                />
                <SelectField
                  label="Episodes model"
                  value={config.generation.binge_model}
                  options={GEMINI_TEXT_MODEL_OPTIONS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, generation: { ...prev.generation, binge_model: value } } : prev
                    )
                  }
                />
                <TextField
                  label="Suite temp"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.generation.suite_temperature}
                  onChange={(value) => setNumber('suite_temperature', Number(value))}
                />
                <TextField
                  label="Episodes temp"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.generation.binge_temperature}
                  onChange={(value) => setNumber('binge_temperature', Number(value))}
                />
              </div>
            </Panel>

            <Panel title="Surface posture" eyebrow="Switches" meta="Client-facing">
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Prologue', checked: config.ui.show_prologue, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, ui: { ...prev.ui, show_prologue: v } } : prev) },
                  { label: 'Episodes', checked: config.ui.episodes_enabled, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, ui: { ...prev.ui, episodes_enabled: v } } : prev) },
                  { label: 'CJS', checked: config.operations.cjs_enabled, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, operations: { ...prev.operations, cjs_enabled: v } } : prev) },
                  { label: 'Tone guard', checked: config.safety.tone_guard_enabled, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, safety: { ...prev.safety, tone_guard_enabled: v } } : prev) },
                ].map((sw) => (
                  <button
                    key={sw.label}
                    type="button"
                    onClick={() => sw.onChange(!sw.checked)}
                    className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                      sw.checked
                        ? 'border-brand-teal bg-brand-soft text-brand-teal'
                        : 'border-black/12 bg-white text-black/40 hover:border-black/25'
                    }`}
                  >
                    {sw.label}
                    <span className="ml-1.5 text-[8px]">{sw.checked ? 'on' : 'off'}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <Panel title="Prompt overlays" eyebrow="Prompt stack" meta="Appendices">
              {/* Prompt packs quick-load */}
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-[0.12em] text-black/40">Pack:</span>
                {Object.keys(PROMPT_PACKS).map((packId) => (
                  <button
                    key={packId}
                    type="button"
                    onClick={() => setConfig((prev) => prev ? {
                      ...prev,
                      prompts: { ...prev.prompts, ...PROMPT_PACKS[packId] },
                    } : prev)}
                    className="border border-black/10 bg-white px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-black/50 transition-colors hover:border-brand-teal hover:text-brand-teal"
                  >
                    {packId}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setConfig((prev) => prev ? {
                    ...prev,
                    prompts: Object.fromEntries(
                      PROMPT_OVERLAY_FIELDS.map((f) => [f.key, ''])
                    ) as typeof prev.prompts,
                  } : prev)}
                  className="border border-black/10 bg-white px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-red-400/70 transition-colors hover:border-red-300 hover:text-red-500"
                >
                  clear
                </button>
              </div>
              {/* Collapsible overlay rows */}
              <div className="space-y-0.5">
                {PROMPT_OVERLAY_FIELDS.map((field) => {
                  const hasContent = !!config.prompts[field.key]?.trim();
                  return (
                    <details key={field.key} open={hasContent} className="border border-black/10 bg-[#fcfbf7]">
                      <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                        <span className="text-[9px] text-black/30">&#9656;</span>
                        <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">{field.eyebrow}</span>
                        <span className="admin-body text-[#09161a]">{field.label}</span>
                        {hasContent && <span className="ml-auto text-[8px] uppercase tracking-[0.1em] text-brand-teal">set</span>}
                      </summary>
                      <div className="border-t border-black/6 p-1.5">
                        <div className="admin-prompt-block">
                          <textarea
                            value={config.prompts[field.key]}
                            onChange={(event) =>
                              setConfig((prev) =>
                                prev
                                  ? { ...prev, prompts: { ...prev.prompts, [field.key]: event.target.value } }
                                  : prev
                              )
                            }
                            placeholder={field.description}
                            className="admin-body w-full min-h-14 border border-black/8 bg-white p-1.5 text-xs leading-relaxed outline-none transition-colors focus:border-brand-teal"
                          />
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Professional DNA" eyebrow="Research lane" meta="Configurable dossier">
              {/* ── Activation row: inline toggles + model routing ── */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {[
                  { label: 'DNA research', checked: config.professional_dna.enabled, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, enabled: v } } : prev) },
                  { label: 'Company notes', checked: config.professional_dna.company_posture_notes_enabled, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, company_posture_notes_enabled: v } } : prev) },
                ].map((sw) => (
                  <button key={sw.label} type="button" onClick={() => sw.onChange(!sw.checked)} className={`border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] transition-colors ${sw.checked ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/12 bg-white text-black/40 hover:border-black/25'}`}>
                    {sw.label} <span className="text-[8px]">{sw.checked ? 'on' : 'off'}</span>
                  </button>
                ))}
                <span className="mx-1 h-3 w-px bg-black/10" />
                <span className="text-[9px] text-black/35">Refresh: {config.professional_dna.refresh_window_days}d</span>
              </div>

              {/* Model routing inline */}
              <div className="grid grid-cols-3 gap-x-2 gap-y-1 mb-2">
                <SelectField label="Base model" value={config.professional_dna.base_model} options={GEMINI_TEXT_MODEL_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, base_model: v } } : prev)} />
                <SelectField label="Research model" value={config.professional_dna.research_model} options={GEMINI_TEXT_MODEL_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, research_model: v } } : prev)} />
                <StepperField label="Refresh" value={config.professional_dna.refresh_window_days} min={1} max={90} step={1} unit="days" onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, refresh_window_days: v } } : prev)} />
              </div>

              {/* Collapsible sub-sections */}
              <div className="space-y-0.5">
                {/* Hero media */}
                <details className="border border-black/10 bg-[#fcfbf7]">
                  <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">Hero</span>
                    <span className="admin-body text-[#09161a]">Intake hero media</span>
                    <span className="ml-auto text-[8px] uppercase tracking-[0.1em] text-black/35">{config.professional_dna.hero_visible ? 'visible' : 'hidden'}</span>
                  </summary>
                  <div className="border-t border-black/6 p-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="col-span-2 flex gap-1.5">
                      {[
                        { label: 'Show hero', checked: config.professional_dna.hero_visible ?? false, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, hero_visible: v } } : prev) },
                        { label: 'Autoplay muted', checked: config.professional_dna.hero_autoplay_muted ?? true, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, hero_autoplay_muted: v } } : prev) },
                        { label: 'Loop', checked: config.professional_dna.hero_loop ?? true, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, hero_loop: v } } : prev) },
                      ].map((sw) => (
                        <button key={sw.label} type="button" onClick={() => sw.onChange(!sw.checked)} className={`border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${sw.checked ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 bg-white text-black/40'}`}>
                          {sw.label} <span className="text-[8px]">{sw.checked ? 'on' : 'off'}</span>
                        </button>
                      ))}
                    </div>
                    <TextField label="Video URL" value={config.professional_dna.hero_video_url ?? ''} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, hero_video_url: v } } : prev)} />
                    <TextField label="Hero title" value={config.professional_dna.hero_video_title ?? ''} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, hero_video_title: v } } : prev)} />
                    <TextField label="Fallback image" value={config.professional_dna.hero_fallback_image_url ?? ''} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, hero_fallback_image_url: v } } : prev)} />
                  </div>
                </details>

                {/* Journey guide media */}
                <details className="border border-black/10 bg-[#fcfbf7]">
                  <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">Guide</span>
                    <span className="admin-body text-[#09161a]">Journey guide video</span>
                  </summary>
                  <div className="border-t border-black/6 p-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    <SelectField label="Provider" value={config.professional_dna.journey_guide_video_provider ?? 'youtube'} options={[{ value: 'youtube', label: 'YouTube' }, { value: 'vimeo', label: 'Vimeo' }, { value: 'direct', label: 'Direct' }]} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, journey_guide_video_provider: v === 'vimeo' ? 'vimeo' : v === 'direct' ? 'direct' : 'youtube' } } : prev)} />
                    <TextField label="Video ID" value={config.professional_dna.journey_guide_video_id ?? ''} placeholder="YouTube/Vimeo ID" onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, journey_guide_video_id: v } } : prev)} />
                    <TextField label="Fallback URL" value={config.professional_dna.journey_guide_video_url ?? ''} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, journey_guide_video_url: v } } : prev)} />
                    <TextField label="Title" value={config.professional_dna.journey_guide_video_title ?? ''} placeholder="How the suite works for you" onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, journey_guide_video_title: v } } : prev)} />
                  </div>
                </details>

                {/* Voice agent */}
                <details className="border border-black/10 bg-[#fcfbf7]">
                  <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">Voice</span>
                    <span className="admin-body text-[#09161a]">Smart Start voice lane</span>
                    <span className="ml-auto text-[8px] uppercase tracking-[0.1em] text-black/35">{(config.professional_dna.voice_agent_enabled ?? true) ? 'active' : 'off'}</span>
                  </summary>
                  <div className="border-t border-black/6 p-2 space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: 'Voice agent', checked: config.professional_dna.voice_agent_enabled ?? true, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, voice_agent_enabled: v } } : prev) },
                        { label: 'Transcript', checked: config.professional_dna.voice_transcription_visible ?? false, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, voice_transcription_visible: v } } : prev) },
                        { label: 'Autofill', checked: config.professional_dna.voice_to_form_autofill ?? true, onChange: (v: boolean) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, voice_to_form_autofill: v } } : prev) },
                      ].map((sw) => (
                        <button key={sw.label} type="button" onClick={() => sw.onChange(!sw.checked)} className={`border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${sw.checked ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 bg-white text-black/40'}`}>
                          {sw.label} <span className="text-[8px]">{sw.checked ? 'on' : 'off'}</span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <SelectField
                        label="Voice model"
                        value={normalizeDnaVoiceModel(config.professional_dna.voice_model)}
                        options={[
                          { value: 'gemini_live', label: 'Gemini Audio Intake (fallback)' },
                          { value: 'elevenlabs_ghost', label: 'ElevenLabs Ghost Agent' },
                        ]}
                        onChange={(v) =>
                          setConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  professional_dna: {
                                    ...prev.professional_dna,
                                    voice_model: v === 'elevenlabs_ghost' ? 'elevenlabs_ghost' : 'gemini_live',
                                  },
                                  voice: {
                                    ...prev.voice,
                                    public_panel_provider: v === 'elevenlabs_ghost' ? 'elevenlabs' : 'gemini_live',
                                  },
                                }
                              : prev
                          )
                        }
                      />
                      <TextField label="Voice ID" value={config.professional_dna.voice_agent_voice_id ?? ''} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, voice_agent_voice_id: v } } : prev)} />
                    </div>
                    <TextAreaField label="Voice arc sections (one per line)" value={(config.professional_dna.voice_arc_sections ?? []).join('\n')} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, voice_arc_sections: v.split('\n').map((e) => e.trim().toLowerCase()).filter(Boolean) } } : prev)} minHeight="min-h-12" />
                    <TextAreaField label="Voice persona appendix" value={config.professional_dna.voice_agent_persona ?? ''} onChange={(v) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, voice_agent_persona: v } } : prev)} minHeight="min-h-12" />
                  </div>
                </details>

                {/* Prompt appendix */}
                <details className="border border-black/10 bg-[#fcfbf7]">
                  <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">Prompt</span>
                    <span className="admin-body text-[#09161a]">DNA operator notes</span>
                    {config.professional_dna.prompt_appendix?.trim() && <span className="ml-auto text-[8px] uppercase tracking-[0.1em] text-brand-teal">set</span>}
                  </summary>
                  <div className="border-t border-black/6 p-1.5">
                    <div className="admin-prompt-block">
                      <textarea
                        value={config.professional_dna.prompt_appendix}
                        onChange={(event) => setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, prompt_appendix: event.target.value } } : prev)}
                        placeholder="Extra research posture, client-type instructions, or sector-specific criteria"
                        className="admin-body min-h-14 w-full border border-black/8 bg-white p-1.5 text-xs leading-relaxed outline-none transition-colors focus:border-brand-teal"
                      />
                    </div>
                  </div>
                </details>

                {/* Dossier sections */}
                <details className="border border-black/10 bg-[#fcfbf7]">
                  <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">Sections</span>
                    <span className="admin-body text-[#09161a]">Dossier sections + order</span>
                    <span className="ml-auto text-[8px] uppercase tracking-[0.1em] text-black/35">{knownEnabledSections.length} active</span>
                  </summary>
                  <div className="border-t border-black/6 p-2 space-y-2">
                    <ChipToggleGroup
                      label="Enabled sections"
                      options={DNA_SECTION_OPTIONS}
                      selected={knownEnabledSections}
                      onToggle={(value) =>
                        setConfig((prev) => {
                          if (!prev) return prev;
                          const nextKnownEnabled = normalizeList(toggleListValue(knownEnabledSections, value));
                          const nextEnabledSections = normalizeList([...nextKnownEnabled, ...customEnabledSections]);
                          const nextSectionOrder = normalizeList([
                            ...effectiveSectionOrder.filter((section) => nextEnabledSections.includes(section)),
                            ...nextEnabledSections,
                          ]);
                          return { ...prev, professional_dna: { ...prev.professional_dna, enabled_sections: nextEnabledSections, section_order: nextSectionOrder } };
                        })
                      }
                    />
                    {customEnabledSections.length ? (
                      <div className="text-[9px] text-black/40">Custom keys: {customEnabledSections.join(', ')}</div>
                    ) : null}
                    <OrderedListField
                      label="Section order"
                      description="Controls dossier render order."
                      values={effectiveSectionOrder}
                      options={DNA_SECTION_OPTIONS}
                      onMove={(index, direction) =>
                        setConfig((prev) => prev ? { ...prev, professional_dna: { ...prev.professional_dna, section_order: moveListValue(effectiveSectionOrder, index, direction) } } : prev)
                      }
                    />
                  </div>
                </details>

                {/* Research domains */}
                <details className="border border-black/10 bg-[#fcfbf7]">
                  <summary className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-brand-teal">Domains</span>
                    <span className="admin-body text-[#09161a]">Research coverage</span>
                    <span className="ml-auto text-[8px] uppercase tracking-[0.1em] text-black/35">{selectedResearchDomains.filter((d) => knownResearchDomains.includes(d)).length} active</span>
                  </summary>
                  <div className="border-t border-black/6 p-2">
                    <ChipToggleGroup
                      label="Research domains"
                      options={DNA_RESEARCH_DOMAIN_OPTIONS}
                      selected={selectedResearchDomains.filter((domain) => knownResearchDomains.includes(domain))}
                      onToggle={(value) =>
                        setConfig((prev) =>
                          prev
                            ? { ...prev, professional_dna: { ...prev.professional_dna, research_domains: normalizeList([...toggleListValue(selectedResearchDomains.filter((d) => knownResearchDomains.includes(d)), value), ...customResearchDomains]) } }
                            : prev
                        )
                      }
                    />
                    {customResearchDomains.length ? (
                      <div className="mt-1 text-[9px] text-black/40">Custom domains: {customResearchDomains.join(', ')}</div>
                    ) : null}
                  </div>
                </details>
              </div>
            </Panel>
          </div>
        </div>
      </SectionShell>
    );
  };

  const renderMedia = () => {
    if (!config) return null;
    const pipelineSummary = mediaPipeline?.summary;
    const activeLibraryCount = config.media.curated_library.filter((i) => i.enabled).length;

    /* ── filter chip helper (used across all taxonomy groups in sidebar) ── */
    const mediaFilterChip = (
      itemIndex: number,
      item: CuratedMediaItem,
      value: string,
      active: boolean,
      toggle: () => void,
    ) => (
      <button
        key={value}
        type="button"
        onClick={toggle}
        className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] border transition-colors ${
          active
            ? 'border-brand-teal bg-brand-soft text-brand-teal'
            : 'border-black/10 hover:border-brand-teal'
        }`}
      >
        {labelize(value)}
      </button>
    );

    return (
      <SectionShell {...sectionCopy.media}>
        {/* ── Operator boundary bar + metric cards ── */}
        <div className="flex items-center justify-between gap-2 border border-black/10 bg-[#f8faf8] px-2.5 py-1">
          <div className="flex items-center gap-3">
            <span className="admin-mono text-[9px] uppercase tracking-[0.16em] text-brand-teal">Pipeline Monitor</span>
            <span className="admin-body text-[10px] italic text-black/45">Queue state, prompts, retries stay here.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="admin-mono text-[9px] text-black/35">Lineage stays operator-only</span>
            <button
              type="button"
              onClick={refreshMediaPipeline}
              disabled={mediaPipelineBusyKey !== null}
              className="border border-black/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {mediaPipelineError ? (
          <div className="border border-red-500/20 bg-red-50 px-3 py-1.5 text-xs text-red-700">{mediaPipelineError}</div>
        ) : null}

        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'Total jobs', value: pipelineSummary?.total_jobs ?? 0, meta: `${pipelineSummary?.completed_jobs ?? 0} completed` },
            { label: 'Needs review', value: pipelineSummary?.manifests_needing_review ?? 0, meta: `${pipelineSummary?.retry_requested_jobs ?? 0} retries` },
            { label: 'Reusable gaps', value: pipelineSummary?.reusable_gap_count ?? 0, meta: `${pipelineSummary?.bespoke_gap_count ?? 0} bespoke` },
            { label: 'Queue health', value: pipelineSummary?.queued_jobs ?? 0, meta: `${pipelineSummary?.worker_ready_jobs ?? 0} worker ready` },
          ].map((card) => (
            <div key={card.label} className="border border-black/10 bg-[#fbfcfa] px-2 py-1">
              <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40">{card.label}</div>
              <div className="admin-display text-lg leading-none text-[#09161a]">{card.value}</div>
              <div className="admin-body text-[10px] italic text-black/45">{card.meta}</div>
            </div>
          ))}
        </div>

        {/* ── Collapsible config rows ── */}
        <div className="space-y-0.5">
          {/* Routing */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Routing</span>
              <span className="admin-body text-[11px] text-[#09161a]">Media routing stack</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-2">
              <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                <SelectField
                  label="Image model"
                  value={config.media.image_model}
                  options={GEMINI_IMAGE_MODEL_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  onChange={(value) => setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, image_model: value } } : prev))}
                />
                <SelectField
                  label="Video model"
                  value={config.media.video_model}
                  options={GEMINI_VIDEO_MODEL_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  onChange={(value) => setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, video_model: value } } : prev))}
                />
                <TextField
                  label="Narrative lens"
                  value={config.media.narrative_lens}
                  onChange={(value) => setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, narrative_lens: value } } : prev))}
                />
                <TextField label="Image ratio" value={config.media.image_aspect_ratio}
                  onChange={(value) => setConfig((prev) => prev ? { ...prev, media: { ...prev.media, image_aspect_ratio: value } } : prev)} />
                <TextField label="Video ratio" value={config.media.video_aspect_ratio}
                  onChange={(value) => setConfig((prev) => prev ? { ...prev, media: { ...prev.media, video_aspect_ratio: value } } : prev)} />
                <StepperField label="Duration" value={Number(config.media.video_duration_seconds) || 6} min={4} max={12} unit="sec"
                  onChange={(value) => setConfig((prev) => prev ? { ...prev, media: { ...prev.media, video_duration_seconds: value } } : prev)} />
              </div>
            </div>
          </details>

          {/* Posture */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Posture</span>
              <span className="admin-body text-[11px] text-[#09161a]">Operator switches</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{config.media.enabled ? 'ON' : 'OFF'}</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5 grid gap-1">
              <ToggleField checked={config.media.enabled} label="Agentic media enabled" hint="Global kill switch."
                onChange={(checked) => setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, enabled: checked } } : prev))} />
              <ToggleField checked={config.media.external_media_enabled} label="External media library" hint="Curated routes from YouTube, Vimeo, partners."
                onChange={(checked) => setConfig((prev) => prev ? { ...prev, media: { ...prev.media, external_media_enabled: checked } } : prev)} />
              <ToggleField checked={config.media.video_generate_audio} label="Generate video audio" hint="Narration or ambient audio."
                onChange={(checked) => setConfig((prev) => prev ? { ...prev, media: { ...prev.media, video_generate_audio: checked } } : prev)} />
              <ToggleField checked={config.media.auto_generate_on_episode} label="Auto-generate on episode" hint="Triggers jobs when episode rail loads."
                onChange={(checked) => setConfig((prev) => prev ? { ...prev, media: { ...prev.media, auto_generate_on_episode: checked } } : prev)} />
            </div>
          </details>

          {/* Style */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Style</span>
              <span className="admin-body text-[11px] text-[#09161a]">Art direction</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-2 grid grid-cols-2 gap-2">
              <TextAreaField label="Image style direction" value={config.media.image_style} minHeight="min-h-16"
                onChange={(value) => setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, image_style: value } } : prev))} />
              <TextAreaField label="Video style direction" value={config.media.video_style} minHeight="min-h-16"
                onChange={(value) => setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, video_style: value } } : prev))} />
            </div>
          </details>

          {/* Pipeline jobs */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Jobs</span>
              <span className="admin-body text-[11px] text-[#09161a]">Recent pipeline jobs</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{mediaPipeline?.jobs.length ?? 0} jobs</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5 space-y-1">
              <div className="flex gap-1.5">
                <button type="button" onClick={processMediaQueueNow} disabled={mediaPipelineBusyKey === 'process:queue'}
                  className="border border-black/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[#09161a] hover:border-brand-teal disabled:opacity-50">
                  {mediaPipelineBusyKey === 'process:queue' ? 'Processing…' : 'Run queue now'}
                </button>
              </div>
              {mediaPipeline?.jobs?.length ? mediaPipeline.jobs.map((job) => {
                const retryKey = `retry:${job.client_uid}:${job.job_id}`;
                const processKey = `process:${job.client_uid}:${job.job_id}`;
                return (
                  <div key={`${job.client_uid}-${job.job_id}`} className="flex items-center gap-2 border border-black/8 bg-white px-2 py-1">
                    <span className="admin-mono text-[10px] text-[#09161a] min-w-0 flex-1 truncate">
                      {job.client_name || 'Client'} · {job.episode_id || 'ep'} · {job.asset_count} assets
                    </span>
                    <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] ${mediaPipelineTone(job.status)}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                    <button type="button" onClick={() => processMediaJob(job.client_uid, job.job_id)}
                      disabled={mediaPipelineBusyKey === processKey || !job.worker_ready}
                      className="admin-mono text-[8px] text-brand-teal hover:underline disabled:opacity-40">run</button>
                    <button type="button" onClick={() => retryMediaJob(job.client_uid, job.job_id)}
                      disabled={mediaPipelineBusyKey === retryKey}
                      className="admin-mono text-[8px] text-black/40 hover:underline disabled:opacity-40">retry</button>
                  </div>
                );
              }) : (
                <div className="admin-body text-[10px] italic text-black/40 py-1">No media jobs captured yet.</div>
              )}
            </div>
          </details>

          {/* Manifests */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Manifests</span>
              <span className="admin-body text-[11px] text-[#09161a]">Client-safe output</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{mediaPipeline?.manifests.length ?? 0}</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5 space-y-1">
              {mediaPipeline?.manifests?.length ? mediaPipeline.manifests.map((manifest) => (
                <div key={`${manifest.client_uid}-${manifest.manifest_id}`} className="flex items-center gap-2 border border-black/8 bg-white px-2 py-1">
                  <span className="admin-mono text-[10px] text-[#09161a] min-w-0 flex-1 truncate">
                    {manifest.client_name || 'Client'} · {manifest.client_payload_asset_count} assets
                  </span>
                  <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] ${mediaPipelineTone(manifest.review_state)}`}>
                    {manifest.review_state.replace(/_/g, ' ')}
                  </span>
                  {(['approved', 'needs_review', 'rejected'] as const).map((d) => {
                    const k = `review:${manifest.client_uid}:${manifest.manifest_id}:${d}`;
                    return (
                      <button key={d} type="button" onClick={() => reviewManifest(manifest.client_uid, manifest.manifest_id, d)}
                        disabled={mediaPipelineBusyKey === k}
                        className="admin-mono text-[8px] text-black/40 hover:text-brand-teal hover:underline disabled:opacity-40">
                        {d === 'needs_review' ? 'review' : d}
                      </button>
                    );
                  })}
                </div>
              )) : (
                <div className="admin-body text-[10px] italic text-black/40 py-1">No manifests persisted yet.</div>
              )}
            </div>
          </details>
        </div>

        {/* ── Two-column: filter sidebar + media table ── */}
        <div className="flex gap-2 min-h-0">
          {/* Left filter sidebar — only visible when editing a media item */}
          {expandedMediaId ? (() => {
            const idx = config.media.curated_library.findIndex((i) => i.id === expandedMediaId);
            const item = config.media.curated_library[idx];
            if (!item) return null;
            const filterGroups = [
              { id: 'reusability_scope', label: 'Reuse Scope', values: ['global', 'industry_pack', 'persona_pack', 'client_specific'] },
              { id: 'status', label: 'Status', values: ['draft', 'approved', 'retired'] },
              { id: 'usage_rights', label: 'Usage Rights', values: ['owned', 'licensed', 'partner', 'external_embed'] },
            ];
            return (
              <div className="w-56 shrink-0 space-y-2 overflow-y-auto border-r border-black/8 pr-2">
                {filterGroups.map((group) => (
                  <div key={group.id}>
                    <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40 mb-0.5">{group.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {group.values.map((v) => {
                        const active = item.tags.includes(v);
                        return mediaFilterChip(idx, item, v, active, () =>
                          updateMediaItem(idx, (prev) => ({
                            ...prev,
                            tags: active ? prev.tags.filter((t) => t !== v) : mergeMediaTags(prev.tags, v),
                          }))
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div>
                  <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40 mb-0.5">Journey Surfaces</div>
                  <div className="flex flex-wrap gap-1">
                    {JOURNEY_SURFACES.map((s) => {
                      const active = item.surfaces.includes(s);
                      return (
                        <button key={s} type="button"
                          onClick={() => updateMediaItem(idx, (prev) => ({
                            ...prev,
                            surfaces: active ? prev.surfaces.filter((x) => x !== s) : [...prev.surfaces, s],
                          }))}
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] border transition-colors ${
                            active ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 hover:border-brand-teal'
                          }`}>{s}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40 mb-0.5">Intent</div>
                  <div className="flex flex-wrap gap-1">
                    {CLIENT_INTENTS.map((v) => {
                      const active = item.rule.intents.includes(v);
                      return (
                        <button key={v} type="button"
                          onClick={() => updateMediaItem(idx, (prev) => ({
                            ...prev,
                            rule: { ...prev.rule, intents: active ? prev.rule.intents.filter((x) => x !== v) : [...prev.rule.intents, v] },
                          }))}
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] border transition-colors ${
                            active ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 hover:border-brand-teal'
                          }`}>{labelize(v)}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40 mb-0.5">Focus</div>
                  <div className="flex flex-wrap gap-1">
                    {FOCUS_PREFS.map((v) => {
                      const active = item.rule.focuses.includes(v);
                      return (
                        <button key={v} type="button"
                          onClick={() => updateMediaItem(idx, (prev) => ({
                            ...prev,
                            rule: { ...prev.rule, focuses: active ? prev.rule.focuses.filter((x) => x !== v) : [...prev.rule.focuses, v] },
                          }))}
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] border transition-colors ${
                            active ? 'border-brand-teal bg-brand-soft text-brand-teal' : 'border-black/10 hover:border-brand-teal'
                          }`}>{labelize(v)}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Inline edit fields for selected item */}
                <div className="space-y-1 pt-1 border-t border-black/8">
                  <TextField label="Title" value={item.title}
                    onChange={(value) => updateMediaItem(idx, (prev) => ({ ...prev, title: value }))} />
                  <TextField label="URL" value={item.source_url}
                    onChange={(value) => updateMediaItem(idx, (prev) => ({ ...prev, source_url: value }))} />
                  <div className="grid grid-cols-2 gap-1">
                    <SelectField label="Platform" value={item.platform} options={EXTERNAL_PLATFORMS}
                      onChange={(value) => updateMediaItem(idx, (prev) => ({ ...prev, platform: (value as MediaPlatform) || 'auto' }))} />
                    <SelectField label="Audience" value={item.rule.audience} options={AUDIENCES}
                      onChange={(value) => updateMediaItem(idx, (prev) => ({ ...prev, rule: { ...prev.rule, audience: (value as MediaAudience) || 'all' } }))} />
                  </div>
                  <ToggleField checked={item.enabled} label="Enabled"
                    onChange={(checked) => updateMediaItem(idx, (prev) => ({ ...prev, enabled: checked }))} />
                  <button type="button" onClick={() => removeMediaItem(idx)}
                    className="admin-mono text-[9px] uppercase tracking-[0.16em] text-red-600/80 hover:text-red-700">Remove</button>
                </div>
              </div>
            );
          })() : null}

          {/* Right: media items table */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="admin-mono text-[10px] text-black/50">
                {config.media.curated_library.length} media items matching filters
              </span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { if (expandedMediaId) setExpandedMediaId(null); else if (config.media.curated_library.length) setExpandedMediaId(config.media.curated_library[0].id); }}
                  className="admin-mono border border-black/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#09161a] hover:border-brand-teal">
                  {expandedMediaId ? 'Close filters' : 'Select all'}
                </button>
                <button type="button" onClick={seedStarterMediaPack}
                  className="admin-mono border border-black/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#09161a] hover:border-brand-teal">
                  Load starter pack
                </button>
                <button type="button" onClick={addMediaItem}
                  className="admin-mono border border-brand-teal/40 bg-brand-soft px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-brand-teal hover:border-brand-teal">
                  + Add media
                </button>
              </div>
            </div>

            {/* Table header */}
            <div className="flex items-center gap-2 border-b border-black/15 px-2 py-1">
              <span className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/35 w-8">#</span>
              <span className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/35 flex-1">Title</span>
              <span className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/35 w-40 hidden sm:block">URL</span>
              <span className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/35 w-16 text-right">Status</span>
            </div>

            {config.media.curated_library.length === 0 ? (
              <div className="border border-dashed border-black/15 bg-[#fbfcfa] p-4 text-center admin-body text-[11px] text-black/45 mt-1">
                No curated items yet. Add media or load starter pack.
              </div>
            ) : (
              <div className="space-y-0">
                {config.media.curated_library.map((item, index) => {
                  const isSelected = expandedMediaId === item.id;
                  const tags = item.tags.slice(0, 3).map(labelize).join(' · ');
                  return (
                    <button
                      key={item.id || `media-${index}`}
                      type="button"
                      onClick={() => setExpandedMediaId(isSelected ? null : item.id)}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left border-b border-black/6 transition-colors hover:bg-black/[0.015] ${
                        isSelected ? 'bg-brand-soft/30 border-l-2 border-l-brand-teal' : ''
                      }`}
                    >
                      <span className="text-[9px] text-black/25 w-3">&#9656;</span>
                      <span className="admin-mono text-[10px] text-black/30 w-5">{String(index + 1).padStart(2, '0')}</span>
                      <div className="flex-1 min-w-0">
                        <div className="admin-body text-[12px] text-[#09161a] truncate">{item.title || 'Untitled'}</div>
                        <div className="admin-mono text-[9px] text-black/35 truncate">
                          {[item.rule.audience !== 'all' ? labelize(item.rule.audience) : null, item.platform !== 'auto' ? labelize(item.platform) : null, tags].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span className="admin-mono text-[9px] text-black/35 w-40 hidden sm:block truncate">{item.source_url || ''}</span>
                      <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] ${
                        item.enabled
                          ? 'border-brand-teal/25 bg-brand-soft text-brand-teal'
                          : 'border-black/10 bg-white text-black/45'
                      }`}>
                        {item.enabled ? 'live' : 'off'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky footer (echoes mockup) ── */}
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-black/15 bg-[#f4f1eb] px-3 py-1.5 -mx-2 -mb-2">
          <span className="admin-mono text-[10px] text-black/50">
            Media Pipeline · {config.media.curated_library.length} items · {activeLibraryCount} active
          </span>
        </div>
      </SectionShell>
    );
  };

  const renderBrand = () => {
    if (!config) return null;
    return (
      <SectionShell {...sectionCopy.brand}>
        <BrandStudioSection config={config} setConfig={setConfig} />
      </SectionShell>
    );
  };

  const renderVoice = () => {
    if (!config) return null;
    const selectedVoiceMeta =
      GEMINI_LIVE_VOICE_OPTIONS.find((voice) => voice.name === config.voice.gemini_voice_name) ??
      GEMINI_LIVE_VOICE_OPTIONS.find((voice) => voice.name === 'Aoede');
    return (
      <SectionShell {...sectionCopy.voice}>
        <Panel title="Voice posture" eyebrow="Presets" meta="Primary operating modes">
          <div className="grid gap-1.5 md:grid-cols-3">
            {VOICE_PRESETS.map((preset) => {
              const active =
                config.voice.temperature === preset.temperature &&
                config.voice.live_vad_silence_ms === preset.live_vad_silence_ms &&
                config.voice.live_vad_prefix_padding_ms === preset.live_vad_prefix_padding_ms &&
                config.voice.live_vad_start_sensitivity === preset.live_vad_start_sensitivity &&
                config.voice.live_vad_end_sensitivity === preset.live_vad_end_sensitivity;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyVoicePreset(preset)}
                  className={`border px-2.5 py-1.5 text-left transition-all ${
                    active
                      ? 'border-brand-teal bg-brand-soft'
                      : 'border-black/10 bg-[#fcfcfb] hover:border-brand-teal'
                  }`}
                >
                  <div className="text-xs admin-body leading-tight">{preset.label}</div>
                  <div className="text-[10px] leading-snug text-gray-500">{preset.summary}</div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Voice lane readiness" eyebrow="Runtime map" meta="Ghost primary + Gemini fallback">
          <div className="grid gap-1.5">
            {VOICE_RUNTIME_LANES.map((lane) => {
              const isSelected = lane.id === config.voice.provider;
              const stateLabel =
                lane.id === 'elevenlabs'
                  ? overview?.runtime.elevenlabs_agent_configured
                    ? 'ghost ready'
                    : 'missing'
                  : lane.id === 'sesame'
                  ? config.voice.sesame_enabled
                    ? 'flagged on'
                    : 'flagged off'
                  : lane.state;
              return (
                <article
                  key={lane.id}
                  className={`border px-2.5 py-1.5 ${
                    isSelected
                      ? 'border-brand-teal bg-brand-soft'
                      : 'border-black/10 bg-[#fcfcfb]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? 'bg-brand-teal' : 'bg-black/15'}`} />
                      <span className="text-xs admin-body leading-tight truncate">{lane.label}</span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-black/40">{stateLabel}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-black/35 shrink-0">
                      {isSelected ? 'active' : ''}
                    </span>
                  </div>
                  <div className="ml-3.5 text-[10px] leading-snug text-gray-500">{lane.summary}</div>
                  {lane.id === 'sesame' ? (
                    <div className="mt-4">
                      <ToggleField
                        checked={config.voice.sesame_enabled}
                        onChange={(checked) =>
                          setConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  voice: {
                                    ...prev.voice,
                                    sesame_enabled: checked,
                                    provider:
                                      prev.voice.provider === 'sesame' && !checked ? 'gemini_live' : prev.voice.provider,
                                  },
                                }
                              : prev
                          )
                        }
                        label="Enable Sesame lane"
                        hint="Leave off until the dedicated Sesame Cloud Run service is deployed."
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-2">
          <Panel title="Provider and transport" eyebrow="Runtime" meta={config.voice.provider}>
            <div className="grid gap-2">
              <ToggleField
                checked={config.voice.enabled}
                onChange={(checked) =>
                  setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, enabled: checked } } : prev))
                }
                label="Voice synthesis enabled"
                hint="Global toggle for the live voice rail."
              />
              <SelectField
                label="Provider"
                value={config.voice.provider}
                options={[
                  ...(overview?.runtime.elevenlabs_agent_configured
                    ? [{ value: 'elevenlabs', label: 'ElevenLabs Ghost' }]
                    : []),
                  { value: 'gemini_live', label: 'Gemini Audio Intake (fallback)' },
                  ...(config.voice.sesame_enabled ? [{ value: 'sesame', label: 'Sesame' }] : []),
                ]}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          voice: {
                            ...prev.voice,
                            provider:
                              value === 'elevenlabs'
                                ? 'elevenlabs'
                                : value === 'sesame' && prev.voice.sesame_enabled
                                  ? 'sesame'
                                  : 'gemini_live',
                            public_panel_provider:
                              value === 'sesame'
                                ? prev.voice.public_panel_provider
                                : value === 'elevenlabs'
                                  ? 'elevenlabs'
                                  : 'gemini_live',
                          },
                          professional_dna:
                            value === 'sesame'
                              ? prev.professional_dna
                              : {
                                  ...prev.professional_dna,
                                  voice_model: value === 'elevenlabs' ? 'elevenlabs_ghost' : 'gemini_live',
                                },
                        }
                      : prev
                  )
                }
              />
              <SelectField
                label="Public intake lane"
                value={config.voice.public_panel_provider}
                options={[
                  ...(overview?.runtime.elevenlabs_agent_configured
                    ? [{ value: 'elevenlabs', label: 'ElevenLabs Ghost' }]
                    : []),
                  { value: 'gemini_live', label: 'Gemini Audio Intake (fallback)' },
                ]}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          voice: {
                            ...prev.voice,
                            provider: value === 'elevenlabs' ? 'elevenlabs' : 'gemini_live',
                            public_panel_provider: value === 'elevenlabs' ? 'elevenlabs' : 'gemini_live',
                          },
                          professional_dna: {
                            ...prev.professional_dna,
                            voice_model: value === 'elevenlabs' ? 'elevenlabs_ghost' : 'gemini_live',
                          },
                        }
                      : prev
                  )
                }
              />
              <div className="md:col-span-2">
                <TextField
                  label={
                    config.voice.provider === 'sesame'
                      ? 'Sesame API URL (Cerebrium endpoint)'
                      : config.voice.provider === 'elevenlabs'
                        ? 'ElevenLabs Ghost route notes'
                      : 'Gemini fallback route notes'
                  }
                  value={config.voice.api_url}
                  onChange={(value) =>
                    setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, api_url: value } } : prev))
                  }
                  placeholder={
                    config.voice.provider === 'sesame'
                      ? 'https://api.cortex.cerebrium.ai/v4/PROJECT/APP/generate_audio'
                      : config.voice.provider === 'elevenlabs'
                        ? 'Ghost session is resolved from ELEVENLABS_AGENT_ID and the ElevenLabs briefing routes.'
                        : 'Optional operator note. Gemini stays available as the fallback audio intake lane.'
                  }
                />
              </div>
            </div>
          </Panel>

          <Panel title="Voice identity" eyebrow="Gemini fallback" meta={config.voice.gemini_live_model}>
            <div className="grid gap-2">
              <TextField
                label="Speaker"
                value={config.voice.speaker}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, speaker: value } } : prev))
                }
                placeholder="Maya"
              />
              <SelectField
                label="Gemini fallback model"
                value={config.voice.gemini_live_model}
                options={GEMINI_LIVE_MODEL_OPTIONS.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, gemini_live_model: value } } : prev))
                }
              />
              <SelectField
                label="Gemini fallback voice name"
                value={config.voice.gemini_voice_name}
                options={GEMINI_VOICE_NAMES}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, gemini_voice_name: value } } : prev
                  )
                }
              />
              <div className="border border-black/10 bg-[#fbfcfa] p-4 text-xs leading-5 text-black/65">
                <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Selected voice</div>
                <div className="mt-2 text-lg admin-display text-[#08161a]">
                  {selectedVoiceMeta?.name ?? config.voice.gemini_voice_name}
                </div>
                <div className="mt-1">Tone: {selectedVoiceMeta?.tone ?? 'Custom'}</div>
              </div>
              <TextField
                label="Max audio length (ms)"
                type="number"
                min={3000}
                max={30000}
                value={config.voice.max_audio_length_ms}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, max_audio_length_ms: Number(value) } } : prev
                  )
                }
              />
            </div>
          </Panel>
        </div>

        <Panel
          title="Studio tuning"
          eyebrow="Advanced"
          meta={showAdvancedVoice ? 'expanded' : 'collapsed'}
          dense
        >
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowAdvancedVoice((prev) => !prev)}
              className="text-[10px] uppercase tracking-[0.22em] text-black/50 transition-colors hover:text-brand-teal"
            >
              {showAdvancedVoice ? 'Hide studio tuning' : 'Show studio tuning'}
            </button>

            {showAdvancedVoice ? (
              <div className="grid gap-2">
                <ToggleField
                  checked={config.voice.gemini_input_audio_transcription_enabled}
                  onChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: { ...prev.voice, gemini_input_audio_transcription_enabled: checked },
                          }
                        : prev
                    )
                  }
                  label="Capture input transcription"
                  hint="Turns live user speech into structured transcript events for the interview rail."
                />
                <ToggleField
                  checked={config.voice.gemini_output_audio_transcription_enabled}
                  onChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: { ...prev.voice, gemini_output_audio_transcription_enabled: checked },
                          }
                        : prev
                    )
                  }
                  label="Capture output transcription"
                  hint="Improves transcript visibility while audio remains the primary response modality."
                />
                <ToggleField
                  checked={config.voice.gemini_affective_dialog_enabled}
                  onChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: { ...prev.voice, gemini_affective_dialog_enabled: checked },
                          }
                        : prev
                    )
                  }
                  label="Affective dialog"
                  hint="Optional native-audio emotional response tuning. Leave off for maximum predictability."
                />
                <ToggleField
                  checked={config.voice.gemini_proactive_audio_enabled}
                  onChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: { ...prev.voice, gemini_proactive_audio_enabled: checked },
                          }
                        : prev
                    )
                  }
                  label="Proactive audio"
                  hint="Lets Gemini hold silence until it decides a response is warranted."
                />
                <ToggleField
                  checked={config.voice.gemini_thinking_enabled}
                  onChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: {
                              ...prev.voice,
                              gemini_thinking_enabled: checked,
                              gemini_thinking_budget: checked ? Math.max(prev.voice.gemini_thinking_budget, 256) : 0,
                            },
                          }
                        : prev
                    )
                  }
                  label="Thinking mode"
                  hint="Adds deliberate reasoning time. Keep off when lowest latency matters most."
                />
                <SelectField
                  label="Activity handling"
                  value={config.voice.gemini_activity_handling}
                  options={['interrupt', 'wait']}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: {
                              ...prev.voice,
                              gemini_activity_handling: value === 'wait' ? 'wait' : 'interrupt',
                            },
                          }
                        : prev
                    )
                  }
                />
                <TextField
                  label="Thinking budget"
                  type="number"
                  min={0}
                  max={1024}
                  step={32}
                  value={config.voice.gemini_thinking_budget}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, voice: { ...prev.voice, gemini_thinking_budget: Number(value) } } : prev
                    )
                  }
                />
                <TextField
                  label="Voice temperature"
                  type="number"
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={config.voice.temperature}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, voice: { ...prev.voice, temperature: Number(value) } } : prev
                    )
                  }
                />
                <TextField
                  label="VAD silence window (ms)"
                  type="number"
                  min={180}
                  max={2000}
                  value={config.voice.live_vad_silence_ms}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, voice: { ...prev.voice, live_vad_silence_ms: Number(value) } } : prev
                    )
                  }
                />
                <TextField
                  label="VAD prefix padding (ms)"
                  type="number"
                  min={0}
                  max={600}
                  value={config.voice.live_vad_prefix_padding_ms}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev
                        ? { ...prev, voice: { ...prev.voice, live_vad_prefix_padding_ms: Number(value) } }
                        : prev
                    )
                  }
                />
                <SelectField
                  label="Start-of-speech sensitivity"
                  value={config.voice.live_vad_start_sensitivity}
                  options={['high', 'low']}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: {
                              ...prev.voice,
                              live_vad_start_sensitivity: value === 'low' ? 'low' : 'high',
                            },
                          }
                        : prev
                    )
                  }
                />
                <SelectField
                  label="End-of-speech sensitivity"
                  value={config.voice.live_vad_end_sensitivity}
                  options={['high', 'low']}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            voice: {
                              ...prev.voice,
                              live_vad_end_sensitivity: value === 'low' ? 'low' : 'high',
                            },
                          }
                        : prev
                    )
                  }
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Narration style hint"
                    value={config.voice.narration_style}
                    onChange={(value) =>
                      setConfig((prev) =>
                        prev ? { ...prev, voice: { ...prev.voice, narration_style: value } } : prev
                      )
                    }
                    minHeight="min-h-24"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      </SectionShell>
    );
  };

  const renderGovernance = () => {
    if (!config || !overview) return null;
    return (
      <SectionShell {...sectionCopy.governance}>
        {/* Operator bar */}
        <div className="flex items-center justify-between gap-2 border border-black/10 bg-[#f8faf8] px-2.5 py-1">
          <div className="flex items-center gap-3">
            <span className="admin-mono text-[9px] uppercase tracking-[0.16em] text-brand-teal">Staff Policy</span>
            <span className="admin-body text-[10px] italic text-black/45">Approvals, entitlements, and orchestration governance.</span>
          </div>
          <button type="button" onClick={refreshOrchestrationOverview}
            className="border border-black/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#09161a] hover:border-brand-teal">
            Refresh
          </button>
        </div>

        {orchestrationError ? (
          <div className="border border-red-500/20 bg-red-50 px-3 py-1.5 text-xs text-red-700">{orchestrationError}</div>
        ) : null}

        {/* 4 metric cards */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'Active roles', value: orchestrationOverview?.summary.role_count ?? agents.count, meta: `${agents.approval_required_count} need approval` },
            { label: 'Tracked runs', value: orchestrationOverview?.summary.run_count ?? 0, meta: `${orchestrationOverview?.summary.flagged_runs ?? 0} flagged` },
            { label: 'Avg confidence', value: `${Math.round((orchestrationOverview?.summary.average_confidence ?? 0) * 100)}%`, meta: `${orchestrationOverview?.summary.low_confidence_runs ?? 0} low` },
            { label: 'Pending', value: queue.pending_count + bookings.pending_count, meta: `${queue.pending_count} approvals · ${bookings.pending_count} requests` },
          ].map((card) => (
            <div key={card.label} className="border border-black/10 bg-[#fbfcfa] px-2 py-1">
              <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40">{card.label}</div>
              <div className="admin-display text-lg leading-none text-[#09161a]">{card.value}</div>
              <div className="admin-body text-[10px] italic text-black/45">{card.meta}</div>
            </div>
          ))}
        </div>

        {/* Collapsible rows */}
        <div className="space-y-0.5">
          {/* Row 1 — ACCESS */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Access</span>
              <span className="admin-body text-[11px] text-[#09161a]">Entitlements + onboarding</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{config.operations.onboarding_email_enabled ? 'ON' : 'OFF'}</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5">
              <div className="grid grid-cols-3 gap-2">
                <ToggleField
                  checked={config.operations.onboarding_email_enabled}
                  onChange={(checked) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            operations: { ...prev.operations, onboarding_email_enabled: checked },
                          }
                        : prev
                    )
                  }
                  label="Onboarding email workflow enabled"
                  hint="Keeps post-intake course and follow-up automation live."
                />
                <TextField
                  label="Intro course offer label"
                  value={config.operations.intro_course_offer}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, operations: { ...prev.operations, intro_course_offer: value } } : prev
                    )
                  }
                />
                <TextField
                  label="Curriculum code"
                  value={config.operations.curriculum_code}
                  onChange={(value) =>
                    setConfig((prev) =>
                      prev ? { ...prev, operations: { ...prev.operations, curriculum_code: value } } : prev
                    )
                  }
                />
              </div>
            </div>
          </details>

          {/* Row 2 — REQUESTS */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Requests</span>
              <span className="admin-body text-[11px] text-[#09161a]">Concierge + Smart Start</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{bookings.pending_count} new</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5">
              {bookings.items.length === 0 ? (
                <div className="admin-body text-[10px] italic text-black/40 py-1">No requests yet.</div>
              ) : (
                <div className="space-y-0.5">
                  {bookings.items.map((request) => (
                    <div key={request.id} className="flex items-center gap-2 border border-black/8 bg-white px-2 py-1">
                      <span className="admin-mono text-[10px] text-[#09161a] min-w-0 flex-1 truncate">
                        {request.name} · {request.email}{request.company ? ` · ${request.company}` : ''}
                      </span>
                      <span className="admin-body text-[9px] text-black/40 truncate max-w-[120px]">
                        {request.request_kind.replace(/_/g, ' ')}
                      </span>
                      <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] ${mediaPipelineTone(request.status)}`}>
                        {request.status.replace(/_/g, ' ')}
                      </span>
                      {(['reviewed', 'scheduled'] as const).map((status) => (
                        <button key={status} type="button" onClick={() => updateConciergeRequestStatus(request.id, status)}
                          disabled={Boolean(bookingBusyKey)}
                          className="admin-mono text-[8px] text-black/40 hover:text-brand-teal hover:underline disabled:opacity-40">
                          {status}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* Row 3 — CONTROL */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Control</span>
              <span className="admin-body text-[11px] text-[#09161a]">Orchestration policy</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{(orchestrationOverview?.policy.current_stack ?? []).length} stack · {(orchestrationOverview?.policy.approval_triggers ?? []).length} triggers</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40">Approval triggers</div>
                  <div className="flex flex-wrap gap-1">
                    {(orchestrationOverview?.policy.approval_triggers ?? []).map((trigger) => (
                      <span key={trigger} className="border border-amber-500/20 bg-amber-50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-amber-800">
                        {labelize(trigger)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="admin-mono text-[8px] uppercase tracking-[0.14em] text-black/40">Current stack</div>
                  <div className="flex flex-wrap gap-1">
                    {(orchestrationOverview?.policy.current_stack ?? []).map((entry) => (
                      <span key={entry} className="border border-brand-teal/25 bg-brand-soft px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-brand-teal">
                        {labelize(entry)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-1 admin-body text-[10px] text-black/45">
                Free tier: {(orchestrationOverview?.policy.free_roles ?? []).map(labelize).join(', ') || 'none'}
              </div>
            </div>
          </details>

          {/* Row 4 — RUNS */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Runs</span>
              <span className="admin-body text-[11px] text-[#09161a]">Orchestration history</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{orchestrationOverview?.runs.length ?? 0} runs</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5">
              {(orchestrationOverview?.runs ?? []).length === 0 ? (
                <div className="admin-body text-[10px] italic text-black/40 py-1">No runs recorded yet.</div>
              ) : (
                <div className="space-y-0.5">
                  {(orchestrationOverview?.runs ?? []).map((run) => (
                    <div key={`${run.client_uid}-${run.run_id}`} className="flex items-center gap-2 border border-black/8 bg-white px-2 py-1">
                      <span className="admin-mono text-[10px] text-[#09161a] min-w-0 flex-1 truncate">
                        {run.client_name || 'Client'} · {run.started_by_role || 'staff'} · {Math.round((run.confidence || 0) * 100)}%
                      </span>
                      <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] ${mediaPipelineTone(run.status)}`}>
                        {run.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] ${mediaPipelineTone(run.approval_state)}`}>
                        {run.approval_state.replace(/_/g, ' ')}
                      </span>
                      <button type="button" onClick={() => reviewOrchestrationRun(run.client_uid, run.run_id, 'approved')}
                        disabled={bookingBusyKey === `orchestration:${run.client_uid}:${run.run_id}:approved`}
                        className="admin-mono text-[8px] text-brand-teal hover:underline disabled:opacity-40">approve</button>
                      <button type="button" onClick={() => reviewOrchestrationRun(run.client_uid, run.run_id, 'request_human_followup')}
                        disabled={bookingBusyKey === `orchestration:${run.client_uid}:${run.run_id}:request_human_followup`}
                        className="admin-mono text-[8px] text-black/40 hover:underline disabled:opacity-40">follow-up</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* Row 5 — APPROVALS */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Approvals</span>
              <span className="admin-body text-[11px] text-[#09161a]">Approval rail</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{queue.pending_count} pending</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5 space-y-1">
              {queue.warning ? (
                <div className="border border-amber-500/30 bg-amber-500/8 px-2.5 py-1.5 text-[11px] text-amber-800">
                  {queue.warning}
                </div>
              ) : null}
              {queue.items.length === 0 ? (
                <div className="border border-black/10 bg-[#f8faf8] px-2.5 py-1.5 text-[11px] text-gray-600">
                  No pending approvals.
                </div>
              ) : (
                queue.items.map((item) => (
                  <details
                    key={`${item.client_uid || 'client'}-${item.id}`}
                    className="border border-black/10 bg-[#fbfcfa]"
                  >
                    <summary className="flex h-10 cursor-pointer items-center gap-2 px-2 text-[11px]">
                      <span className="text-[9px] text-black/30">&#9656;</span>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-black/40">
                        {item.client_name || item.client_uid || '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate admin-body text-[#09161a]">{item.title}</span>
                      <span className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${statusTone(item.status)}`}>
                        {labelize(item.status)}
                      </span>
                    </summary>
                    <div className="border-t border-black/6 px-2 py-1.5 text-[11px] space-y-1">
                      <div className="text-[9px] uppercase tracking-[0.1em] text-black/35">{labelize(item.source || item.type)}</div>
                      <p className="text-black/65 leading-snug">{item.summary}</p>
                      {item.next_actions.length > 0 ? (
                        <div className="space-y-0.5">
                          {item.next_actions.slice(0, 2).map((action) => (
                            <div key={action} className="border border-black/6 bg-white px-2 py-1 text-[10px] text-gray-700">
                              {action}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                ))
              )}
            </div>
          </details>

          {/* Row 6 — AGENTS */}
          <details className="group border border-black/8">
            <summary className="flex h-8 cursor-pointer items-center gap-2 px-2.5 text-left hover:bg-black/[0.015]">
              <span className="text-[9px] text-black/30 transition-transform group-open:rotate-90">&#9656;</span>
              <span className="admin-mono text-[9px] uppercase tracking-[0.14em] text-brand-teal">Agents</span>
              <span className="admin-body text-[11px] text-[#09161a]">Staff registry</span>
              <span className="ml-auto admin-mono text-[9px] text-black/35">{agents.count} roles · {agents.write_scope_count} writes</span>
            </summary>
            <div className="border-t border-black/8 px-2.5 py-1.5 space-y-0.5">
              {agents.items.map((agent) => (
                <details key={agent.role_id} className="border border-black/10 bg-[#fbfcfa]">
                  <summary className="flex h-10 cursor-pointer items-center gap-2 px-2 text-[11px]">
                    <span className="text-[9px] text-black/30">&#9656;</span>
                    <span className="w-28 shrink-0 truncate text-[9px] uppercase tracking-[0.14em] text-black/45">{agent.role_id}</span>
                    <span className="min-w-0 flex-1 truncate admin-body text-[#09161a]">{agent.title}</span>
                    <span
                      className={`shrink-0 inline-flex border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                        agent.approval_required
                          ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                          : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {agent.approval_required ? 'approval' : 'direct'}
                    </span>
                  </summary>
                  <div className="border-t border-black/6 px-2 py-1.5 text-[11px] space-y-1.5">
                    <p className="text-black/65 leading-snug">{agent.objective}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] uppercase tracking-[0.12em] text-black/40">R:</span>
                      {agent.reads.map((scope) => (
                        <span key={scope} className="border border-black/10 bg-white px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-black/60">
                          {shortScope(scope)}
                        </span>
                      ))}
                      <span className="ml-2 text-[9px] uppercase tracking-[0.12em] text-black/40">W:</span>
                      {agent.writes.map((scope) => (
                        <span key={scope} className="border border-brand-teal/25 bg-brand-soft px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-brand-teal">
                          {shortScope(scope)}
                        </span>
                      ))}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-black/40">
                      {agent.policy_version} · {labelize(agent.access_model)}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </details>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-black/15 bg-[#f4f1eb] px-3 py-1.5 -mx-2 -mb-2">
          <span className="admin-mono text-[10px] text-black/50">
            Governance · {agents.count} agents · {queue.pending_count} pending · {orchestrationOverview?.summary.run_count ?? 0} runs
          </span>
        </div>
      </SectionShell>
    );
  };

  const renderActiveSection = () => {
    if (!config || loading) return null;
    switch (activeSection) {
      case 'summary':
        return renderSummary();
      case 'experience':
        return renderExperience();
      case 'media':
        return renderMedia();
      case 'brand':
        return renderBrand();
      case 'voice':
        return renderVoice();
      case 'governance':
        return renderGovernance();
      default:
        return null;
    }
  };

  const sectionMeta = sectionCopy[activeSection];
  const shellStats = [
    { label: 'Pending', value: overview?.queue.pending_count ?? '—', detail: 'approval rail' },
    { label: 'Agents', value: overview?.agents.count ?? '—', detail: 'registry' },
    { label: 'Media', value: overview?.config_summary.curated_library_enabled_count ?? '—', detail: 'enabled routes' },
    { label: 'Revision', value: overview?.runtime.revision ?? '—', detail: 'active Cloud Run' },
  ];
  const sectionIndex = navSections.findIndex((section) => section.id === activeSection);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-3">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative grid h-[94vh] w-full max-w-[1440px] grid-cols-1 overflow-hidden border border-black/10 bg-[#f3efe6] shadow-[0_40px_120px_-56px_rgba(0,0,0,0.58)] xl:grid-cols-[56px_minmax(0,1fr)]">
        <aside className="group/rail hidden min-h-0 border-r border-black/10 bg-[linear-gradient(180deg,rgba(244,240,231,0.98),rgba(239,233,223,0.98))] transition-all duration-200 xl:flex xl:w-14 xl:flex-col xl:hover:absolute xl:hover:z-30 xl:hover:h-full xl:hover:w-44 xl:hover:shadow-[4px_0_16px_-6px_rgba(0,0,0,0.18)]">
          <div className="border-b border-black/10 px-2 py-2">
            <div className="text-[9px] uppercase tracking-[0.2em] text-brand-teal">OS</div>
            <span
              className={`mt-1 inline-flex border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] ${
                hasUnsavedChanges
                  ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                  : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
              }`}
            >
              {hasUnsavedChanges ? '!' : ''}
            </span>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
            <div className="space-y-1">
              {navSections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  disabled={saving}
                  aria-label={section.title}
                  className={`flex w-full items-center gap-2 border px-2 py-1.5 text-left transition-all ${
                    activeSection === section.id
                      ? 'border-[#08242a] bg-[#08242a] text-white'
                      : 'border-transparent bg-transparent text-[#09161a] hover:border-black/10 hover:bg-white/60'
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <span
                    className={`shrink-0 text-[10px] font-mono ${
                      activeSection === section.id ? 'text-brand-teal' : 'text-black/35'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="hidden truncate text-[11px] admin-body leading-tight group-hover/rail:inline">
                    {section.shortLabel}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-black/10 px-1.5 py-2 space-y-1">
            <button
              onClick={requestReload}
              disabled={loading || saving}
              aria-label="Reload"
              className="w-full border border-black/10 bg-white px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-black/60 transition-colors hover:border-black/20 disabled:opacity-30"
            >
              <span className="group-hover/rail:hidden">R</span>
              <span className="hidden group-hover/rail:inline">Reload</span>
            </button>
            <button
              onClick={save}
              disabled={!isReady || saving || !hasUnsavedChanges}
              aria-label="Save"
              className="btn-brand w-full px-2 py-1 text-[9px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
            >
              <span className="group-hover/rail:hidden">{saving ? '…' : 'S'}</span>
              <span className="hidden group-hover/rail:inline">{saving ? 'Saving…' : 'Save'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-full border border-black/10 bg-white px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-black/60 transition-colors hover:border-black/20"
            >
              <span className="group-hover/rail:hidden">X</span>
              <span className="hidden group-hover/rail:inline">Close</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex min-h-0 flex-col">
          <header className="border-b border-black/10 bg-[rgba(245,242,233,0.94)] px-3 py-1.5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[9px] uppercase tracking-[0.18em] text-brand-teal shrink-0">
                  {String(sectionIndex + 1).padStart(2, '0')}
                </span>
                <h2 className="truncate text-sm admin-display leading-tight text-[#08161a]">
                  {sectionMeta.title}
                </h2>
                <div className="hidden items-baseline gap-3 lg:flex">
                  {shellStats.map((card) => (
                    <span key={card.label} className="inline-flex items-baseline gap-1 whitespace-nowrap">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-black/40">{card.label}</span>
                      <span className="text-xs admin-mono text-[#09161a]">{card.value}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`inline-flex border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                    hasUnsavedChanges
                      ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                      : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {hasUnsavedChanges ? 'unsaved' : 'saved'}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close admin"
                  className="border border-black/10 bg-white px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-black/60 transition-colors hover:border-black/20 hover:text-black xl:hidden"
                >
                  Close
                </button>
              </div>
            </div>

            <nav className="mt-1 flex gap-1 overflow-x-auto xl:hidden">
              {navSections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  disabled={saving}
                  className={`whitespace-nowrap border px-2 py-0.5 text-left transition-all ${
                    activeSection === section.id
                      ? 'border-[#08242a] bg-[#08242a] text-white'
                      : 'border-black/10 bg-white text-[#09161a] hover:border-black/20'
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <span className={`text-[9px] uppercase tracking-[0.16em] ${activeSection === section.id ? 'text-brand-teal' : 'text-black/40'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>{' '}
                  <span className="text-[10px] admin-body">{section.shortLabel}</span>
                </button>
              ))}
            </nav>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 pb-4">
          {loading ? (
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading…</div>
          ) : null}
          {error ? (
            <div className="mb-5 border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="mb-5 border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700">
              {success}
            </div>
          ) : null}
          {isReady && config ? (
            <fieldset disabled={saving} className={saving ? 'opacity-70 transition-opacity' : undefined}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  {renderActiveSection()}
                </motion.div>
              </AnimatePresence>
            </fieldset>
          ) : null}
          </div>

          <footer className="sticky bottom-0 z-10 border-t border-black/10 bg-[rgba(255,255,255,0.86)] px-3 py-1 backdrop-blur xl:hidden">
            <div className="flex items-center justify-end gap-2">
                <button
                  onClick={requestReload}
                  disabled={loading || saving}
                  className="border border-black/10 bg-white px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-black/60 transition-colors hover:border-black/20 hover:text-black disabled:opacity-30"
                >
                  Reload
                </button>
                <button
                  onClick={save}
                  disabled={!isReady || saving || !hasUnsavedChanges}
                  className="btn-brand px-4 py-1 text-[9px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

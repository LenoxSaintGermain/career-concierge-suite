import React, { useEffect, useMemo, useState } from 'react';
import { CLIENT_INTENTS, FOCUS_PREFS, PACE_PREFS } from '../constants';
import {
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
  fetchAdminSystemOverview,
  getAdminApiOrigin,
  saveAdminConfig,
} from '../services/adminApi';
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

const labelize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

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
    <section className="space-y-5">
      <header className="space-y-2 border-b border-black/10 pb-4">
        <div className="text-[10px] uppercase tracking-[0.26em] text-brand-teal">{eyebrow}</div>
        <h3 className="text-[28px] font-editorial italic leading-none text-[#08161a]">{title}</h3>
        <p className="max-w-3xl text-sm leading-6 text-black/60">{description}</p>
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
    <section className="border border-black/10 bg-white/95 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.32)]">
      <div className={`border-b border-black/10 ${dense ? 'px-4 py-3' : 'px-5 py-4 md:px-6'}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            {eyebrow ? <div className="text-[10px] uppercase tracking-[0.2em] text-brand-teal">{eyebrow}</div> : null}
            <h4 className="text-xl font-editorial leading-tight text-[#09161a]">{title}</h4>
          </div>
          {meta ? <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">{meta}</div> : null}
        </div>
      </div>
      <div className={dense ? 'p-4' : 'p-5 md:p-6'}>{children}</div>
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
      className={`border p-4 ${
        inverted
          ? 'border-white/12 bg-white/6 text-white'
          : 'border-black/10 bg-[#fbf8f1] text-[#09161a]'
      }`}
    >
      <div className={`text-[10px] uppercase tracking-[0.24em] ${inverted ? 'text-brand-teal' : 'text-brand-teal'}`}>
        {eyebrow}
      </div>
      <div className="mt-3 text-2xl font-editorial leading-tight">{title}</div>
      <p className={`mt-2 text-sm leading-relaxed ${inverted ? 'text-white/70' : 'text-black/60'}`}>{body}</p>
      <div className={`mt-4 text-[10px] uppercase tracking-[0.22em] ${inverted ? 'text-white/50' : 'text-black/40'}`}>
        {meta}
      </div>
    </article>
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
    <label className="space-y-2">
      <div className="text-xs text-gray-700">{label}</div>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-b border-black/10 bg-transparent py-2 text-sm outline-none transition-colors focus:border-brand-teal"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  minHeight = 'min-h-24',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
}) {
  return (
    <label className="space-y-2">
      <div className="text-xs text-gray-700">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${minHeight} border border-black/10 bg-[#fcfcfb] p-3 text-sm outline-none transition-colors focus:border-brand-teal`}
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
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <div className="text-xs text-gray-700">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-black/10 bg-transparent py-2 text-sm outline-none transition-colors focus:border-brand-teal"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelize(option)}
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
    <label className="flex items-start gap-3 border border-black/10 bg-[#fcfbf7] px-4 py-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span className="space-y-1">
        <span className="block text-[#09161a]">{label}</span>
        {hint ? <span className="block text-xs leading-5 text-black/55">{hint}</span> : null}
      </span>
    </label>
  );
}

export function AdminConsole({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [overview, setOverview] = useState<AdminSystemOverview | null>(null);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSectionId>('summary');
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);
  const [baselineFingerprint, setBaselineFingerprint] = useState('');

  const isReady = useMemo(() => !!config && !loading, [config, loading]);
  const currentFingerprint = useMemo(() => (config ? JSON.stringify(config) : ''), [config]);
  const hasUnsavedChanges = !!config && !!baselineFingerprint && currentFingerprint !== baselineFingerprint;

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowAdvancedVoice(false);
    try {
      const [cfg, nextOverview] = await Promise.all([fetchAdminConfig(), fetchAdminSystemOverview()]);
      setConfig(cfg);
      setOverview(nextOverview);
      setBaselineFingerprint(JSON.stringify(cfg));
      setExpandedMediaId(cfg.media.curated_library[0]?.id ?? null);
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
      const nextOverview = await fetchAdminSystemOverview();
      setOverview(nextOverview);
      setSuccess('Configuration saved.');
      onSaved?.();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save config.');
    } finally {
      setSaving(false);
    }
  };

  const overviewCards = overview
    ? [
        {
          eyebrow: 'Runtime',
          title: `${overview.runtime.project_id} / ${overview.runtime.region}`,
          body: `${overview.runtime.service_name} on ${overview.runtime.firestore_database_id}`,
          meta: `rev ${overview.runtime.revision}`,
        },
        {
          eyebrow: 'Approvals',
          title: `${overview.queue.pending_count} pending / ${overview.queue.client_count} clients`,
          body: 'Global admin queue across client ledgers.',
          meta: overview.queue.pending_count > 0 ? 'attention required' : 'clear',
        },
        {
          eyebrow: 'Agents',
          title: `${overview.agents.count} live roles / ${overview.agents.write_scope_count} write scopes`,
          body: `${overview.agents.approval_required_count} roles require approval before execution leaves the rail.`,
          meta: `${overview.runtime.admin_email_count} admin emails`,
        },
        {
          eyebrow: 'Routing',
          title: `${overview.config_summary.voice_provider} / ${overview.config_summary.live_model}`,
          body: `${overview.config_summary.curated_library_enabled_count} enabled media routes, ${overview.config_summary.curated_library_count} total entries.`,
          meta: overview.config_summary.external_media_enabled ? 'external media on' : 'external media off',
        },
      ]
    : [];

  const apiOrigin = getAdminApiOrigin();
  const serviceStates = overview
    ? [
        { label: 'Episodes rail', active: overview.config_summary.episodes_enabled },
        { label: 'CJS execution', active: overview.config_summary.cjs_enabled },
        { label: 'Voice rail', active: overview.config_summary.voice_enabled },
        { label: 'External media', active: overview.config_summary.external_media_enabled },
        { label: 'Episode autogen', active: overview.config_summary.auto_generate_on_episode },
        { label: 'Tone guard', active: overview.config_summary.tone_guard_enabled },
        { label: 'Onboarding email', active: overview.config_summary.onboarding_email_enabled },
      ]
    : [];

  const promptStates = overview
    ? [
        { label: 'Suite overlay', active: overview.config_summary.suite_overlay_configured },
        { label: 'Binge overlay', active: overview.config_summary.binge_overlay_configured },
        { label: 'ROM overlay', active: overview.config_summary.rom_overlay_configured },
        { label: 'Live overlay', active: overview.config_summary.live_overlay_configured },
        { label: 'Art director', active: overview.config_summary.art_director_overlay_configured },
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
        <section className="relative overflow-hidden border border-[#08242a] bg-[radial-gradient(circle_at_top,_rgba(27,208,191,0.16),_transparent_36%),linear-gradient(145deg,#041117_0%,#08242a_56%,#07181d_100%)] p-5 text-white shadow-[0_32px_80px_-52px_rgba(0,0,0,0.52)] md:p-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <div className="text-[10px] uppercase tracking-[0.26em] text-brand-teal">Operating Surface</div>
                <h3 className="text-3xl font-editorial italic leading-none md:text-[42px]">
                  Premium operator visibility without the clutter.
                </h3>
                <p className="text-sm leading-6 text-white/72">
                  Runtime target, approval load, library posture, and agent policy are kept here as a compact control
                  layer so the actual editing surfaces stay focused.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.18em] text-white/70 sm:min-w-[18rem]">
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Gemini {overview.runtime.gemini_configured ? 'configured' : 'missing'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Sesame {overview.runtime.sesame_configured ? 'configured' : 'missing'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Storage {overview.runtime.storage_bucket ? 'wired' : 'unset'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Voice {overview.config_summary.voice_enabled ? 'enabled' : 'disabled'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Runtime identity" eyebrow="Environment" meta={`ROM ${overview.runtime.rom_version}`}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 border border-black/10 bg-[#f8faf8] p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">API origin</div>
                <div className="break-all font-mono text-xs text-gray-700">{apiOrigin}</div>
              </div>
              <div className="space-y-2 border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-700">
                <div>{overview.runtime.service_name}</div>
                <div>{overview.runtime.project_id}</div>
                <div>{overview.runtime.region}</div>
              </div>
              <div className="space-y-2 border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-700">
                <div>Firestore: {overview.runtime.firestore_database_id}</div>
                <div>Bucket: {overview.runtime.storage_bucket || 'not configured'}</div>
                <div>Revision: {overview.runtime.revision}</div>
              </div>
              <div className="space-y-2 border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-700">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Admin access</div>
                <div>
                  {overview.runtime.admin_email_mode === 'allowlist'
                    ? `${overview.runtime.admin_email_count} allowlisted admin emails control access.`
                    : 'Open admin mode is active because no ADMIN_EMAILS allowlist is configured.'}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Live posture" eyebrow="Signals" meta={`${overview.queue.pending_count} pending`}>
            <div className="space-y-4">
              <div>
                <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-black/45">Service toggles</div>
                <div className="flex flex-wrap gap-2">
                  {serviceStates.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${signalTone(
                        item.active
                      )}`}
                    >
                      {item.label}: {item.active ? 'on' : 'off'}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-black/45">Prompt layers</div>
                <div className="flex flex-wrap gap-2">
                  {promptStates.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${signalTone(
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

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Approval rail preview" eyebrow="Admin Queue" meta={`${overview.queue.items.length} visible items`}>
            <div className="space-y-3">
              {overview.queue.warning ? (
                <div className="border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-800">
                  Queue visibility is partially unavailable: {overview.queue.warning}
                </div>
              ) : null}
              {overview.queue.items.length === 0 ? (
                <div className="border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-600">
                  No pending approvals across client ledgers.
                </div>
              ) : (
                overview.queue.items.slice(0, 3).map((item) => (
                  <article
                    key={`${item.client_uid || 'client'}-${item.id}`}
                    className="space-y-3 border border-black/10 bg-[#fbfcfa] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">
                          {item.client_name || item.client_email || item.client_uid || 'Unknown client'}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">
                          {labelize(item.source || item.type)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${statusTone(
                          item.status
                        )}`}
                      >
                        {labelize(item.status)}
                      </span>
                    </div>
                    <h5 className="text-lg font-editorial leading-tight">{item.title}</h5>
                    <p className="text-sm leading-6 text-gray-700">{item.summary}</p>
                  </article>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Active staff registry" eyebrow="Policy" meta={`${overview.agents.count} roles`}>
            <div className="space-y-3">
              {overview.agents.items.slice(0, 4).map((agent) => (
                <article key={agent.role_id} className="space-y-3 border border-black/10 bg-[#fbfcfa] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">{agent.role_id}</div>
                      <h5 className="mt-2 text-lg font-editorial leading-tight">{agent.title}</h5>
                    </div>
                    <span
                      className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                        agent.approval_required
                          ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                          : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {agent.approval_required ? 'approval required' : 'direct execution'}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">{agent.objective}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </SectionShell>
    );
  };

  const renderExperience = () => {
    if (!config) return null;
    return (
      <SectionShell {...sectionCopy.experience}>
        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <Panel title="Generation routing" eyebrow="Models" meta="Primary rails">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Suite model"
                value={config.generation.suite_model}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, generation: { ...prev.generation, suite_model: value } } : prev
                  )
                }
              />
              <TextField
                label="Binge model"
                value={config.generation.binge_model}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, generation: { ...prev.generation, binge_model: value } } : prev
                  )
                }
              />
              <TextField
                label="Suite temperature"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={config.generation.suite_temperature}
                onChange={(value) => setNumber('suite_temperature', Number(value))}
              />
              <TextField
                label="Binge temperature"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={config.generation.binge_temperature}
                onChange={(value) => setNumber('binge_temperature', Number(value))}
              />
            </div>
          </Panel>

          <Panel title="Client-facing toggles" eyebrow="Surface posture" meta="Immediate switches">
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                checked={config.ui.show_prologue}
                onChange={(checked) =>
                  setConfig((prev) => (prev ? { ...prev, ui: { ...prev.ui, show_prologue: checked } } : prev))
                }
                label="Show prologue"
                hint="Controls the introductory editorial entry sequence."
              />
              <ToggleField
                checked={config.ui.episodes_enabled}
                onChange={(checked) =>
                  setConfig((prev) =>
                    prev ? { ...prev, ui: { ...prev.ui, episodes_enabled: checked } } : prev
                  )
                }
                label="Episodes module enabled"
                hint="Hides or reveals the cinematic learning rail."
              />
              <ToggleField
                checked={config.operations.cjs_enabled}
                onChange={(checked) =>
                  setConfig((prev) =>
                    prev ? { ...prev, operations: { ...prev.operations, cjs_enabled: checked } } : prev
                  )
                }
                label="ConciergeJobSearch enabled"
                hint="Keeps the operator search execution surface active."
              />
              <ToggleField
                checked={config.safety.tone_guard_enabled}
                onChange={(checked) =>
                  setConfig((prev) =>
                    prev ? { ...prev, safety: { ...prev.safety, tone_guard_enabled: checked } } : prev
                  )
                }
                label="Tone guard enabled"
                hint="Applies brand and policy checks before content leaves the rail."
              />
            </div>
          </Panel>
        </div>

        <Panel title="Prompt overlays" eyebrow="Prompt stack" meta="Appendices">
          <div className="grid gap-5 xl:grid-cols-2">
            <TextAreaField
              label="Suite prompt appendix"
              value={config.prompts.suite_appendix}
              onChange={(value) =>
                setConfig((prev) =>
                  prev ? { ...prev, prompts: { ...prev.prompts, suite_appendix: value } } : prev
                )
              }
            />
            <TextAreaField
              label="Binge prompt appendix"
              value={config.prompts.binge_appendix}
              onChange={(value) =>
                setConfig((prev) =>
                  prev ? { ...prev, prompts: { ...prev.prompts, binge_appendix: value } } : prev
                )
              }
            />
            <TextAreaField
              label="Core ROM overlay"
              value={config.prompts.rom_appendix}
              onChange={(value) =>
                setConfig((prev) => (prev ? { ...prev, prompts: { ...prev.prompts, rom_appendix: value } } : prev))
              }
            />
            <TextAreaField
              label="Live voice / video overlay"
              value={config.prompts.live_appendix}
              onChange={(value) =>
                setConfig((prev) =>
                  prev ? { ...prev, prompts: { ...prev.prompts, live_appendix: value } } : prev
                )
              }
            />
            <div className="xl:col-span-2">
              <TextAreaField
                label="Art director overlay"
                value={config.prompts.art_director_appendix}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, prompts: { ...prev.prompts, art_director_appendix: value } } : prev
                  )
                }
                minHeight="min-h-28"
              />
            </div>
          </div>
        </Panel>
      </SectionShell>
    );
  };

  const renderMedia = () => {
    if (!config) return null;
    return (
      <SectionShell {...sectionCopy.media}>
        <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <Panel title="Media routing stack" eyebrow="Generation" meta="Primary configuration">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Image model"
                value={config.media.image_model}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, image_model: value } } : prev))
                }
              />
              <TextField
                label="Video model"
                value={config.media.video_model}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, video_model: value } } : prev))
                }
              />
              <TextField
                label="Image aspect ratio"
                value={config.media.image_aspect_ratio}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, media: { ...prev.media, image_aspect_ratio: value } } : prev
                  )
                }
              />
              <TextField
                label="Video aspect ratio"
                value={config.media.video_aspect_ratio}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, media: { ...prev.media, video_aspect_ratio: value } } : prev
                  )
                }
              />
              <TextField
                label="Video duration (seconds)"
                type="number"
                min={4}
                max={12}
                value={config.media.video_duration_seconds}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev
                      ? { ...prev, media: { ...prev.media, video_duration_seconds: Number(value) } }
                      : prev
                  )
                }
              />
              <TextField
                label="Narrative lens"
                value={config.media.narrative_lens}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, narrative_lens: value } } : prev))
                }
              />
            </div>
          </Panel>

          <Panel title="Media posture" eyebrow="Operator switches" meta={`${config.media.curated_library.length} library items`}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                checked={config.media.enabled}
                onChange={(checked) =>
                  setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, enabled: checked } } : prev))
                }
                label="Agentic media enabled"
                hint="Global kill switch for generated media."
              />
              <ToggleField
                checked={config.media.external_media_enabled}
                onChange={(checked) =>
                  setConfig((prev) =>
                    prev ? { ...prev, media: { ...prev.media, external_media_enabled: checked } } : prev
                  )
                }
                label="External media library enabled"
                hint="Allows curated video routes from YouTube, Vimeo, and partner channels."
              />
              <ToggleField
                checked={config.media.video_generate_audio}
                onChange={(checked) =>
                  setConfig((prev) =>
                    prev ? { ...prev, media: { ...prev.media, video_generate_audio: checked } } : prev
                  )
                }
                label="Generate video audio"
                hint="Includes narration or ambient audio in bespoke video jobs."
              />
              <ToggleField
                checked={config.media.auto_generate_on_episode}
                onChange={(checked) =>
                  setConfig((prev) =>
                    prev ? { ...prev, media: { ...prev.media, auto_generate_on_episode: checked } } : prev
                  )
                }
                label="Auto-generate on episode load"
                hint="Triggers new media jobs as soon as the episode rail needs them."
              />
            </div>
          </Panel>
        </div>

        <Panel title="Style direction" eyebrow="Art direction" meta="Narrative language">
          <div className="grid gap-5 xl:grid-cols-2">
            <TextAreaField
              label="Image style direction"
              value={config.media.image_style}
              onChange={(value) =>
                setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, image_style: value } } : prev))
              }
              minHeight="min-h-28"
            />
            <TextAreaField
              label="Video style direction"
              value={config.media.video_style}
              onChange={(value) =>
                setConfig((prev) => (prev ? { ...prev, media: { ...prev.media, video_style: value } } : prev))
              }
              minHeight="min-h-28"
            />
          </div>
        </Panel>

        <Panel
          title="Curated media library"
          eyebrow="External library"
          meta={config.media.external_media_enabled ? 'enabled' : 'disabled'}
        >
          <div className="mb-5 flex flex-col gap-3 border border-black/10 bg-[#f8faf8] p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Editorial library strategy</div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
                Keep canonical visuals, channels, and recurring concept assets here so the player reuses premium
                material before generating bespoke media.
              </p>
            </div>
            <button
              type="button"
              onClick={addMediaItem}
              className="border border-black/15 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal"
            >
              Add media item
            </button>
          </div>

          <div className="space-y-3">
            {config.media.curated_library.length === 0 ? (
              <div className="border border-dashed border-black/15 bg-[#fbfcfa] p-6 text-sm text-black/55">
                No curated items yet. Add the first reusable concept asset, scene, or reference route here.
              </div>
            ) : (
              config.media.curated_library.map((item, index) => {
                const expanded = expandedMediaId === item.id;
                return (
                  <article key={item.id || `media-${index}`} className="border border-black/10 bg-[#fbfcfa]">
                    <button
                      type="button"
                      onClick={() => setExpandedMediaId(expanded ? null : item.id)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-black/[0.015]"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                          Media item {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="truncate text-lg font-editorial leading-tight text-[#09161a]">
                          {item.title || 'Untitled library route'}
                        </div>
                        <div className="truncate text-xs text-black/50">
                          {item.source_url || 'No source URL'} • {labelize(item.rule.audience)} • {item.enabled ? 'enabled' : 'disabled'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                            item.enabled
                              ? 'border-brand-teal/25 bg-brand-soft text-brand-teal'
                              : 'border-black/10 bg-white text-black/45'
                          }`}
                        >
                          {item.enabled ? 'live' : 'off'}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                          {expanded ? 'collapse' : 'expand'}
                        </span>
                      </div>
                    </button>

                    {expanded ? (
                      <div className="border-t border-black/10 px-4 py-4 md:px-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Item controls</div>
                          <button
                            type="button"
                            onClick={() => removeMediaItem(index)}
                            className="text-[10px] uppercase tracking-[0.2em] text-red-600/80 transition-colors hover:text-red-700"
                          >
                            Remove item
                          </button>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <div className="space-y-5">
                            <ToggleField
                              checked={item.enabled}
                              onChange={(checked) => updateMediaItem(index, (prev) => ({ ...prev, enabled: checked }))}
                              label="Enabled"
                              hint="Keeps this route available to the resolver."
                            />
                            <TextField
                              label="Title"
                              value={item.title}
                              onChange={(value) => updateMediaItem(index, (prev) => ({ ...prev, title: value }))}
                            />
                            <TextField
                              label="Subtitle"
                              value={item.subtitle}
                              onChange={(value) => updateMediaItem(index, (prev) => ({ ...prev, subtitle: value }))}
                            />
                            <TextField
                              label="Video or playlist URL"
                              value={item.source_url}
                              onChange={(value) => updateMediaItem(index, (prev) => ({ ...prev, source_url: value }))}
                              placeholder="https://www.youtube.com/watch?v=... or playlist URL"
                            />
                            <div className="grid gap-5 md:grid-cols-2">
                              <SelectField
                                label="Platform"
                                value={item.platform}
                                options={EXTERNAL_PLATFORMS}
                                onChange={(value) =>
                                  updateMediaItem(index, (prev) => ({
                                    ...prev,
                                    platform: (value as MediaPlatform) || 'auto',
                                  }))
                                }
                              />
                              <SelectField
                                label="Source type"
                                value={item.source_kind}
                                options={SOURCE_KINDS}
                                onChange={(value) =>
                                  updateMediaItem(index, (prev) => ({
                                    ...prev,
                                    source_kind: (value as MediaSourceKind) || 'single',
                                  }))
                                }
                              />
                              <TextField
                                label="Priority"
                                type="number"
                                min={1}
                                max={999}
                                value={item.priority}
                                onChange={(value) =>
                                  updateMediaItem(index, (prev) => ({
                                    ...prev,
                                    priority: Number(value || 100),
                                  }))
                                }
                              />
                              <SelectField
                                label="Audience"
                                value={item.rule.audience}
                                options={AUDIENCES}
                                onChange={(value) =>
                                  updateMediaItem(index, (prev) => ({
                                    ...prev,
                                    rule: {
                                      ...prev.rule,
                                      audience: (value as MediaAudience) || 'all',
                                    },
                                  }))
                                }
                              />
                            </div>
                            <TextField
                              label="Thumbnail URL"
                              value={item.thumbnail_url}
                              onChange={(value) =>
                                updateMediaItem(index, (prev) => ({ ...prev, thumbnail_url: value }))
                              }
                            />
                            <TextField
                              label="Tags (comma separated)"
                              value={item.tags.join(', ')}
                              onChange={(value) =>
                                updateMediaItem(index, (prev) => ({
                                  ...prev,
                                  tags: value
                                    .split(',')
                                    .map((entry) => entry.trim())
                                    .filter(Boolean),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-5">
                            <div className="space-y-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Journey surfaces</div>
                              <div className="flex flex-wrap gap-2">
                                {JOURNEY_SURFACES.map((surface) => {
                                  const active = item.surfaces.includes(surface);
                                  return (
                                    <button
                                      key={surface}
                                      type="button"
                                      onClick={() =>
                                        updateMediaItem(index, (prev) => ({
                                          ...prev,
                                          surfaces: active
                                            ? prev.surfaces.filter((entry) => entry !== surface)
                                            : [...prev.surfaces, surface],
                                        }))
                                      }
                                      className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                        active
                                          ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                          : 'border-black/10 hover:border-brand-teal'
                                      }`}
                                    >
                                      {surface}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Intent filters</div>
                              <div className="flex flex-wrap gap-2">
                                {CLIENT_INTENTS.map((intent) => {
                                  const active = item.rule.intents.includes(intent);
                                  return (
                                    <button
                                      key={intent}
                                      type="button"
                                      onClick={() =>
                                        updateMediaItem(index, (prev) => ({
                                          ...prev,
                                          rule: {
                                            ...prev.rule,
                                            intents: active
                                              ? prev.rule.intents.filter((entry) => entry !== intent)
                                              : [...prev.rule.intents, intent],
                                          },
                                        }))
                                      }
                                      className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                        active
                                          ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                          : 'border-black/10 hover:border-brand-teal'
                                      }`}
                                    >
                                      {intent}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Focus filters</div>
                              <div className="flex flex-wrap gap-2">
                                {FOCUS_PREFS.map((focus) => {
                                  const active = item.rule.focuses.includes(focus);
                                  return (
                                    <button
                                      key={focus}
                                      type="button"
                                      onClick={() =>
                                        updateMediaItem(index, (prev) => ({
                                          ...prev,
                                          rule: {
                                            ...prev.rule,
                                            focuses: active
                                              ? prev.rule.focuses.filter((entry) => entry !== focus)
                                              : [...prev.rule.focuses, focus],
                                          },
                                        }))
                                      }
                                      className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                        active
                                          ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                          : 'border-black/10 hover:border-brand-teal'
                                      }`}
                                    >
                                      {focus}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Pace filters</div>
                              <div className="flex flex-wrap gap-2">
                                {PACE_PREFS.map((pace) => {
                                  const active = item.rule.paces.includes(pace);
                                  return (
                                    <button
                                      key={pace}
                                      type="button"
                                      onClick={() =>
                                        updateMediaItem(index, (prev) => ({
                                          ...prev,
                                          rule: {
                                            ...prev.rule,
                                            paces: active
                                              ? prev.rule.paces.filter((entry) => entry !== pace)
                                              : [...prev.rule.paces, pace],
                                          },
                                        }))
                                      }
                                      className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                        active
                                          ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                          : 'border-black/10 hover:border-brand-teal'
                                      }`}
                                    >
                                      {pace}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </Panel>
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
    return (
      <SectionShell {...sectionCopy.voice}>
        <Panel title="Voice posture" eyebrow="Presets" meta="Primary operating modes">
          <div className="grid gap-3 md:grid-cols-3">
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
                  className={`border p-4 text-left transition-all ${
                    active
                      ? 'border-brand-teal bg-brand-soft shadow-[0_16px_32px_-24px_rgba(0,0,0,0.32)]'
                      : 'border-black/10 bg-[#fcfcfb] hover:border-brand-teal'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Voice preset</div>
                  <div className="mt-2 text-xl font-editorial italic leading-tight">{preset.label}</div>
                  <div className="mt-2 text-xs leading-5 text-gray-600">{preset.summary}</div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <Panel title="Provider and transport" eyebrow="Runtime" meta={config.voice.provider}>
            <div className="grid gap-5 md:grid-cols-2">
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
                options={['sesame', 'gemini_live']}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          voice: {
                            ...prev.voice,
                            provider: value === 'gemini_live' ? 'gemini_live' : 'sesame',
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
                      : 'Gemini Live model route override'
                  }
                  value={config.voice.api_url}
                  onChange={(value) =>
                    setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, api_url: value } } : prev))
                  }
                  placeholder={
                    config.voice.provider === 'sesame'
                      ? 'https://api.cortex.cerebrium.ai/v4/PROJECT/APP/generate_audio'
                      : 'optional override'
                  }
                />
              </div>
            </div>
          </Panel>

          <Panel title="Voice identity" eyebrow="Narration" meta={config.voice.gemini_live_model}>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Speaker"
                value={config.voice.speaker}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, speaker: value } } : prev))
                }
                placeholder="Maya"
              />
              <TextField
                label="Gemini Live model"
                value={config.voice.gemini_live_model}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, gemini_live_model: value } } : prev
                  )
                }
              />
              <TextField
                label="Gemini voice name"
                value={config.voice.gemini_voice_name}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, gemini_voice_name: value } } : prev
                  )
                }
                placeholder="Aoede"
              />
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
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvancedVoice((prev) => !prev)}
              className="text-[10px] uppercase tracking-[0.22em] text-black/50 transition-colors hover:text-brand-teal"
            >
              {showAdvancedVoice ? 'Hide studio tuning' : 'Show studio tuning'}
            </button>

            {showAdvancedVoice ? (
              <div className="grid gap-5 md:grid-cols-2">
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
        <Panel title="Access and entitlements" eyebrow="Operator policy" meta="Commercial posture">
          <div className="grid gap-5 md:grid-cols-2">
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
        </Panel>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Approval rail" eyebrow="Queue" meta={`${overview.queue.pending_count} pending`}>
            <div className="space-y-3">
              {overview.queue.warning ? (
                <div className="border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-800">
                  Queue visibility is partially unavailable: {overview.queue.warning}
                </div>
              ) : null}
              {overview.queue.items.length === 0 ? (
                <div className="border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-600">
                  No pending approvals across client ledgers.
                </div>
              ) : (
                overview.queue.items.map((item) => (
                  <article
                    key={`${item.client_uid || 'client'}-${item.id}`}
                    className="space-y-3 border border-black/10 bg-[#fbfcfa] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">
                          {item.client_name || item.client_email || item.client_uid || 'Unknown client'}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-black/35">
                          {labelize(item.source || item.type)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${statusTone(
                          item.status
                        )}`}
                      >
                        {labelize(item.status)}
                      </span>
                    </div>
                    <h5 className="text-xl font-editorial leading-tight">{item.title}</h5>
                    <p className="text-sm leading-6 text-gray-700">{item.summary}</p>
                    {item.next_actions.length > 0 ? (
                      <div className="grid gap-2">
                        {item.next_actions.slice(0, 2).map((action) => (
                          <div key={action} className="border border-black/8 bg-white px-3 py-2 text-sm text-gray-700">
                            {action}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Agent registry" eyebrow="Staff" meta={`${overview.agents.write_scope_count} write scopes`}>
            <div className="space-y-3">
              {overview.agents.items.map((agent) => (
                <article key={agent.role_id} className="space-y-4 border border-black/10 bg-[#fbfcfa] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-black/45">{agent.role_id}</div>
                      <h5 className="mt-2 text-xl font-editorial leading-tight">{agent.title}</h5>
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">{agent.policy_version}</div>
                      <span
                        className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                          agent.approval_required
                            ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                            : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {agent.approval_required ? 'approval required' : 'direct execution'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">{agent.objective}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Read scope</div>
                      <div className="flex flex-wrap gap-2">
                        {agent.reads.map((scope) => (
                          <span
                            key={scope}
                            className="border border-black/12 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-black/65"
                          >
                            {shortScope(scope)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Write scope</div>
                      <div className="flex flex-wrap gap-2">
                        {agent.writes.map((scope) => (
                          <span
                            key={scope}
                            className="border border-brand-teal/25 bg-brand-soft px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-brand-teal"
                          >
                            {shortScope(scope)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">
                    Access model: {labelize(agent.access_model)}
                  </div>
                </article>
              ))}
            </div>
          </Panel>
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[94vh] w-full max-w-[1280px] overflow-hidden border border-black/10 bg-[#f3efe6] shadow-[0_40px_120px_-56px_rgba(0,0,0,0.58)]">
        <aside className="hidden w-[290px] shrink-0 border-r border-black/10 bg-[linear-gradient(180deg,#f9f5ec_0%,#f1ede3_100%)] lg:flex lg:flex-col">
          <div className="border-b border-black/10 px-6 py-6">
            <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Admin OS</div>
            <h2 className="mt-3 text-[34px] font-editorial italic leading-none text-[#08161a]">Operator console.</h2>
            <p className="mt-3 text-sm leading-6 text-black/60">
              A compact control plane for policy, presentation, media routing, and runtime posture.
            </p>
          </div>

          <div className="border-b border-black/10 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-black/10 bg-white/80 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Pending</div>
                <div className="mt-2 text-2xl font-editorial text-[#09161a]">{overview?.queue.pending_count ?? '—'}</div>
              </div>
              <div className="border border-black/10 bg-white/80 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Agents</div>
                <div className="mt-2 text-2xl font-editorial text-[#09161a]">{overview?.agents.count ?? '—'}</div>
              </div>
              <div className="border border-black/10 bg-white/80 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Media</div>
                <div className="mt-2 text-2xl font-editorial text-[#09161a]">
                  {overview?.config_summary.curated_library_enabled_count ?? '—'}
                </div>
              </div>
              <div className="border border-black/10 bg-white/80 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Revision</div>
                <div className="mt-2 truncate text-xs uppercase tracking-[0.18em] text-[#09161a]">
                  {overview?.runtime.revision ?? '—'}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-2">
              {navSections.map((section, index) => {
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full border px-4 py-4 text-left transition-all ${
                      active
                        ? 'border-[#08242a] bg-[#08242a] text-white shadow-[0_20px_40px_-30px_rgba(0,0,0,0.45)]'
                        : 'border-transparent bg-transparent text-[#09161a] hover:border-black/10 hover:bg-white/70'
                    }`}
                  >
                    <div
                      className={`text-[10px] uppercase tracking-[0.24em] ${
                        active ? 'text-brand-teal' : 'text-black/40'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')} {section.eyebrow}
                    </div>
                    <div className="mt-2 text-lg font-editorial leading-tight">{section.title}</div>
                    <div className={`mt-2 text-xs leading-5 ${active ? 'text-white/70' : 'text-black/55'}`}>
                      {section.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,#f4f1e7_0%,#f6f4ee_42%,#f5f4ef_100%)]">
          <header className="border-b border-black/10 bg-[rgba(245,242,233,0.92)] px-5 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">{sectionMeta.eyebrow}</div>
                <h2 className="text-[30px] font-editorial italic leading-none text-[#08161a] md:text-[38px]">
                  {sectionMeta.title}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-black/60">{sectionMeta.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex border border-black/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-black/55">
                  {loading ? 'Loading' : 'Live config'}
                </span>
                <span
                  className={`inline-flex border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${
                    hasUnsavedChanges
                      ? 'border-amber-500/25 bg-amber-50 text-amber-800'
                      : 'border-emerald-500/25 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {hasUnsavedChanges ? 'Unsaved changes' : 'Saved state'}
                </span>
                <button
                  onClick={onClose}
                  className="border border-black/10 bg-white px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-black/60 transition-colors hover:border-black/20 hover:text-black"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`whitespace-nowrap border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${
                    activeSection === section.id
                      ? 'border-[#08242a] bg-[#08242a] text-white'
                      : 'border-black/10 bg-white text-black/55'
                  }`}
                >
                  {section.shortLabel}
                </button>
              ))}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
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
            {isReady && config ? renderActiveSection() : null}
          </div>

          <footer className="border-t border-black/10 bg-[rgba(255,255,255,0.86)] px-5 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Operator save rail</div>
                <div className="text-sm text-black/58">
                  Save only after the current section and the control tower read match the intended operating posture.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={load}
                  disabled={loading || saving}
                  className="border border-black/10 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-black/60 transition-colors hover:border-black/20 hover:text-black disabled:opacity-30"
                >
                  Reload
                </button>
                <button
                  onClick={save}
                  disabled={!isReady || saving || !hasUnsavedChanges}
                  className="btn-brand px-5 py-3 text-[10px] uppercase tracking-[0.25em] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Config'}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

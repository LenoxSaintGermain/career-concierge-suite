import React, { useEffect, useMemo, useState } from 'react';
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

const mediaPipelineTone = (status: string) => {
  if (status === 'completed' || status === 'approved' || status === 'scheduled') return 'border-emerald-500/25 bg-emerald-50 text-emerald-800';
  if (status === 'reviewed') return 'border-brand-teal/25 bg-brand-soft text-brand-teal';
  if (status === 'queued' || status === 'needs_review') return 'border-amber-500/25 bg-amber-50 text-amber-800';
  if (status === 'degraded' || status === 'rejected') return 'border-red-500/25 bg-red-50 text-red-800';
  return 'border-black/10 bg-white text-black/60';
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
      setError(e?.message ?? 'Unable to save config.');
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
              <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.18em] text-white/70 sm:min-w-[18rem] lg:grid-cols-3">
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Gemini {runtime.gemini_configured ? 'configured' : 'missing'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Sesame {runtime.sesame_configured ? 'configured' : 'missing'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  ElevenLabs{' '}
                  {runtime.elevenlabs_api_configured
                    ? 'configured'
                    : runtime.elevenlabs_agent_configured
                      ? 'agent only'
                      : 'missing'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Manus {runtime.manus_configured ? 'configured' : 'missing'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Storage {runtime.storage_bucket ? 'wired' : 'unset'}
                </div>
                <div className="border border-white/10 bg-white/5 px-3 py-3">
                  Voice {configSummary.voice_enabled ? 'enabled' : 'disabled'}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
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

        <div className="grid gap-5">
          <Panel title="Runtime identity" eyebrow="Environment" meta={`ROM ${runtime.rom_version}`}>
            <div className="grid gap-4">
              <div className="space-y-3 border border-black/10 bg-[#f8faf8] p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">API origin</div>
                <div className="break-all font-mono text-xs text-gray-700">{apiOrigin}</div>
              </div>
              <div className="space-y-2 border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-700">
                <div>{runtime.service_name}</div>
                <div>{runtime.project_id}</div>
                <div>{runtime.region}</div>
              </div>
              <div className="space-y-2 border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-700">
                <div>Firestore: {runtime.firestore_database_id}</div>
                <div>Bucket: {runtime.storage_bucket || 'not configured'}</div>
                <div>Revision: {runtime.revision}</div>
              </div>
              <div className="space-y-2 border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-700">
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Admin access</div>
                <div>
                  {runtime.admin_email_mode === 'allowlist'
                    ? `${runtime.admin_email_count} allowlisted admin emails control access.`
                    : 'Open admin mode is active because no ADMIN_EMAILS allowlist is configured.'}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Live posture" eyebrow="Signals" meta={`${queue.pending_count} pending`}>
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

        <div className="grid gap-5">
          <Panel title="Approval rail preview" eyebrow="Admin Queue" meta={`${queue.items.length} visible items`}>
            <div className="space-y-3">
              {queue.warning ? (
                <div className="border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-800">
                  Queue visibility is partially unavailable: {queue.warning}
                </div>
              ) : null}
              {queue.items.length === 0 ? (
                <div className="border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-600">
                  No pending approvals across client ledgers.
                </div>
              ) : (
                queue.items.slice(0, 3).map((item) => (
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

          <Panel title="Active staff registry" eyebrow="Policy" meta={`${agents.count} roles`}>
            <div className="space-y-3">
              {agents.items.slice(0, 4).map((agent) => (
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
        <div className="grid gap-5">
          <Panel title="Generation routing" eyebrow="Models" meta="Primary rails">
            <div className="grid gap-5">
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
            <div className="grid gap-3">
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
          <div className="grid gap-5">
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
    const pipelineSummary = mediaPipeline?.summary;
    return (
      <SectionShell {...sectionCopy.media}>
        <Panel title="Pipeline monitor" eyebrow="Operator boundary" meta="Lineage stays operator-only">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 border border-black/10 bg-[#f8faf8] p-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Monitoring posture</div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
                  Client-facing screens should only render final assembled media. Queue state, prompts, retries, and
                  review decisions stay in this operator surface.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshMediaPipeline}
                disabled={mediaPipelineBusyKey !== null}
                className="border border-black/15 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
              >
                Refresh pipeline
              </button>
            </div>

            {mediaPipelineError ? (
              <div className="border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">{mediaPipelineError}</div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total jobs', value: pipelineSummary?.total_jobs ?? 0, meta: `${pipelineSummary?.completed_jobs ?? 0} completed` },
                { label: 'Needs review', value: pipelineSummary?.manifests_needing_review ?? 0, meta: `${pipelineSummary?.retry_requested_jobs ?? 0} retries requested` },
                { label: 'Reusable gaps', value: pipelineSummary?.reusable_gap_count ?? 0, meta: `${pipelineSummary?.bespoke_gap_count ?? 0} bespoke gaps` },
                { label: 'Queue health', value: pipelineSummary?.queued_jobs ?? 0, meta: `${pipelineSummary?.worker_ready_jobs ?? 0} worker ready` },
              ].map((card) => (
                <div key={card.label} className="border border-black/10 bg-[#fbfcfa] p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">{card.label}</div>
                  <div className="mt-3 text-3xl font-editorial italic leading-none text-[#09161a]">{card.value}</div>
                  <div className="mt-2 text-xs text-black/55">{card.meta}</div>
                </div>
              ))}
            </div>

            {mediaPipeline?.warnings?.length ? (
              <div className="border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {mediaPipeline.warnings.slice(0, 2).join(' | ')}
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel title="Media routing stack" eyebrow="Generation" meta="Primary configuration">
            <div className="grid gap-5">
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
            <div className="grid gap-3">
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

        <Panel title="Recent pipeline jobs" eyebrow="Queue watch" meta={`${mediaPipeline?.jobs.length ?? 0} recent jobs`}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={processMediaQueueNow}
                disabled={mediaPipelineBusyKey === 'process:queue'}
                className="border border-black/15 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
              >
                {mediaPipelineBusyKey === 'process:queue' ? 'Processing…' : 'Run queue now'}
              </button>
            </div>
            {mediaPipeline?.jobs?.length ? (
              mediaPipeline.jobs.map((job) => {
                const retryKey = `retry:${job.client_uid}:${job.job_id}`;
                const processKey = `process:${job.client_uid}:${job.job_id}`;
                return (
                  <article key={`${job.client_uid}-${job.job_id}`} className="border border-black/10 bg-[#fbfcfa] p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                          {job.client_name || 'Client'} · {job.episode_id || 'episode'}
                        </div>
                        <div className="text-lg font-editorial italic leading-tight text-[#09161a]">Job {job.job_id}</div>
                        <div className="text-xs text-black/55">
                          {job.client_email || 'No email'} · {job.runner || 'unknown runner'} · {job.trigger || 'unknown trigger'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(job.status)}`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                        <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(job.review_state)}`}>
                          {job.review_state.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-5 text-xs text-black/60">
                      <div>{job.asset_count} assets</div>
                      <div>{job.queued_asset_count} queued</div>
                      <div>{job.attempt_count} attempts</div>
                      <div>{job.retry_requested_count} retries requested</div>
                      <div>{job.updated_at ? new Date(job.updated_at).toLocaleString() : 'No update time'}</div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {job.assets.map((asset, index) => (
                        <div key={`${job.job_id}-${asset.kind}-${index}`} className="border border-black/10 bg-white px-3 py-3 text-xs text-black/60">
                          <div className="flex items-center justify-between gap-3">
                            <span className="uppercase tracking-[0.18em] text-black/40">{asset.kind}</span>
                            <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(asset.status)}`}>
                              {asset.status}
                            </span>
                          </div>
                          <div className="mt-2 font-mono text-[11px] text-[#09161a]">{asset.model || 'unknown model'}</div>
                          {asset.storage_path ? <div className="mt-1 font-mono text-[10px] text-black/45">{asset.storage_path}</div> : null}
                          {asset.note ? <div className="mt-2 leading-5">{asset.note}</div> : null}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => processMediaJob(job.client_uid, job.job_id)}
                        disabled={mediaPipelineBusyKey === processKey || !job.worker_ready}
                        className="border border-black/15 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
                      >
                        {mediaPipelineBusyKey === processKey ? 'Processing…' : 'Process now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => retryMediaJob(job.client_uid, job.job_id)}
                        disabled={mediaPipelineBusyKey === retryKey}
                        className="border border-black/15 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
                      >
                        {mediaPipelineBusyKey === retryKey ? 'Requesting…' : 'Request retry'}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="border border-dashed border-black/15 bg-[#fbfcfa] p-6 text-sm text-black/55">
                No media jobs have been captured yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Manifest review" eyebrow="Client-safe output" meta={`${mediaPipeline?.manifests.length ?? 0} recent manifests`}>
          <div className="space-y-3">
            {mediaPipeline?.manifests?.length ? (
              mediaPipeline.manifests.map((manifest) => (
                <article key={`${manifest.client_uid}-${manifest.manifest_id}`} className="border border-black/10 bg-[#fbfcfa] p-4 space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                        {manifest.client_name || 'Client'} · {manifest.episode_id || 'episode'}
                      </div>
                      <div className="text-lg font-editorial italic leading-tight text-[#09161a]">
                        Manifest {manifest.manifest_id}
                      </div>
                      <div className="text-xs text-black/55">{manifest.client_email || 'No email'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(manifest.pipeline_status)}`}>
                        {manifest.pipeline_status.replace(/_/g, ' ')}
                      </span>
                      <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(manifest.review_state)}`}>
                        {manifest.review_state.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4 text-xs text-black/60">
                    <div>{manifest.client_payload_asset_count} client-visible assets</div>
                    <div>{manifest.reusable_gap_count} reusable gaps</div>
                    <div>{manifest.bespoke_gap_count} bespoke gaps</div>
                    <div>{manifest.updated_at ? new Date(manifest.updated_at).toLocaleString() : 'No update time'}</div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="border border-black/10 bg-white px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Image prompt lineage</div>
                      <div className="mt-2 text-xs leading-5 text-black/60">{manifest.image_prompt || 'No stored image prompt'}</div>
                    </div>
                    <div className="border border-black/10 bg-white px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Video prompt lineage</div>
                      <div className="mt-2 text-xs leading-5 text-black/60">{manifest.video_prompt || 'No stored video prompt'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['approved', 'needs_review', 'rejected'] as const).map((decision) => {
                      const actionKey = `review:${manifest.client_uid}:${manifest.manifest_id}:${decision}`;
                      return (
                        <button
                          key={decision}
                          type="button"
                          onClick={() => reviewManifest(manifest.client_uid, manifest.manifest_id, decision)}
                          disabled={mediaPipelineBusyKey === actionKey}
                          className="border border-black/15 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
                        >
                          {mediaPipelineBusyKey === actionKey ? 'Saving…' : decision.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))
            ) : (
              <div className="border border-dashed border-black/15 bg-[#fbfcfa] p-6 text-sm text-black/55">
                No manifests have been persisted yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Style direction" eyebrow="Art direction" meta="Narrative language">
          <div className="grid gap-5">
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={seedStarterMediaPack}
                className="border border-black/15 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal"
              >
                Load starter pack
              </button>
              <button
                type="button"
                onClick={addMediaItem}
                className="border border-black/15 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal"
              >
                Add media item
              </button>
            </div>
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

                        <div className="grid gap-5">
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
                            <div className="grid gap-5">
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
                            <div className="space-y-3">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">
                                Taxonomy shortcuts
                              </div>
                              <div className="space-y-3 border border-black/10 bg-white p-3">
                                {MEDIA_LIBRARY_TAXONOMY_GROUPS.map((group) => (
                                  <div key={group.id} className="space-y-2">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">
                                      {group.label}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {group.values.map((value) => {
                                        const active = item.tags.includes(value);
                                        return (
                                          <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                              updateMediaItem(index, (prev) => ({
                                                ...prev,
                                                tags: active
                                                  ? prev.tags.filter((entry) => entry !== value)
                                                  : mergeMediaTags(prev.tags, value),
                                              }))
                                            }
                                            className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                              active
                                                ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                                : 'border-black/10 hover:border-brand-teal'
                                            }`}
                                          >
                                            {labelize(value)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
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
    const providerOptions = config.voice.sesame_enabled ? ['gemini_live', 'sesame'] : ['gemini_live'];
    const selectedVoiceMeta =
      GEMINI_LIVE_VOICE_OPTIONS.find((voice) => voice.name === config.voice.gemini_voice_name) ??
      GEMINI_LIVE_VOICE_OPTIONS.find((voice) => voice.name === 'Aoede');
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

        <Panel title="Voice lane readiness" eyebrow="Runtime map" meta="Gemini live now, others gated">
          <div className="grid gap-3">
            {VOICE_RUNTIME_LANES.map((lane) => {
              const isSelected = lane.id === config.voice.provider;
              const stateLabel =
                lane.id === 'sesame'
                  ? config.voice.sesame_enabled
                    ? 'flagged on'
                    : 'flagged off'
                  : lane.state;
              return (
                <article
                  key={lane.id}
                  className={`border p-4 ${
                    isSelected
                      ? 'border-brand-teal bg-brand-soft shadow-[0_16px_32px_-24px_rgba(0,0,0,0.32)]'
                      : 'border-black/10 bg-[#fcfcfb]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">{stateLabel}</div>
                      <div className="mt-2 text-xl font-editorial italic leading-tight">{lane.label}</div>
                      <div className="mt-2 text-xs leading-5 text-gray-600">{lane.summary}</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">
                      {isSelected ? 'current lane' : 'not selected'}
                    </div>
                  </div>
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

        <div className="grid gap-5">
          <Panel title="Provider and transport" eyebrow="Runtime" meta={config.voice.provider}>
            <div className="grid gap-5">
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
                options={providerOptions}
                onChange={(value) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          voice: {
                            ...prev.voice,
                            provider: value === 'sesame' && prev.voice.sesame_enabled ? 'sesame' : 'gemini_live',
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
                      : 'Gemini Live route notes'
                  }
                  value={config.voice.api_url}
                  onChange={(value) =>
                    setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, api_url: value } } : prev))
                  }
                  placeholder={
                    config.voice.provider === 'sesame'
                      ? 'https://api.cortex.cerebrium.ai/v4/PROJECT/APP/generate_audio'
                      : 'Optional operator note. Live route is handled by Gemini config below.'
                  }
                />
              </div>
            </div>
          </Panel>

          <Panel title="Voice identity" eyebrow="Narration" meta={config.voice.gemini_live_model}>
            <div className="grid gap-5">
              <TextField
                label="Speaker"
                value={config.voice.speaker}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, speaker: value } } : prev))
                }
                placeholder="Maya"
              />
              <SelectField
                label="Gemini Live model"
                value={config.voice.gemini_live_model}
                options={GEMINI_LIVE_MODEL_OPTIONS.map((option) => option.id)}
                onChange={(value) =>
                  setConfig((prev) => (prev ? { ...prev, voice: { ...prev.voice, gemini_live_model: value } } : prev))
                }
              />
              <SelectField
                label="Gemini voice name"
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
                <div className="mt-2 text-lg font-editorial text-[#08161a]">
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
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvancedVoice((prev) => !prev)}
              className="text-[10px] uppercase tracking-[0.22em] text-black/50 transition-colors hover:text-brand-teal"
            >
              {showAdvancedVoice ? 'Hide studio tuning' : 'Show studio tuning'}
            </button>

            {showAdvancedVoice ? (
              <div className="grid gap-5">
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
        <Panel title="Access and entitlements" eyebrow="Operator policy" meta="Commercial posture">
          <div className="grid gap-5">
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

        <Panel title="Concierge requests" eyebrow="Smart Start ops" meta={`${bookings.pending_count} new`}>
          <div className="space-y-3">
            {bookings.items.length === 0 ? (
              <div className="border border-dashed border-black/15 bg-[#fbfcfa] p-5 text-sm text-black/55">
                No public concierge or Smart Start requests yet.
              </div>
            ) : (
              bookings.items.map((request) => (
                <article key={request.id} className="space-y-3 border border-black/10 bg-[#fbfcfa] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">
                        {request.request_kind.replace(/_/g, ' ')}
                      </div>
                      <h5 className="mt-2 text-xl font-editorial leading-tight">{request.name}</h5>
                      <div className="mt-1 text-xs text-black/55">{request.email}{request.company ? ` · ${request.company}` : ''}</div>
                    </div>
                    <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(request.status)}`}>
                      {request.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-black/65">{request.goal || 'No goal captured.'}</p>
                  <div className="grid gap-2 text-xs text-black/55 md:grid-cols-2">
                    <div>Service: {request.service_interest ? request.service_interest.replace(/_/g, ' ') : 'Not provided'}</div>
                    <div>Preferred timing: {request.preferred_timing || 'Not provided'}</div>
                    <div>
                      Structured slot:{' '}
                      {request.preferred_date || request.preferred_time || request.preferred_timezone
                        ? [request.preferred_date, request.preferred_time, request.preferred_timezone].filter(Boolean).join(' · ')
                        : 'Not provided'}
                    </div>
                    <div>{request.updated_at ? new Date(request.updated_at).toLocaleString() : 'No update time'}</div>
                  </div>
                  {request.resume_link ? (
                    <div className="text-xs text-black/55">
                      Resume / portfolio:{' '}
                      <a
                        href={request.resume_link}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-black/20 underline-offset-2"
                      >
                        {request.resume_link}
                      </a>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {(['reviewed', 'scheduled'] as const).map((status) => {
                      const key = `${request.id}:${status}`;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateConciergeRequestStatus(request.id, status)}
                          disabled={Boolean(bookingBusyKey)}
                          className="border border-black/12 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-black/65 transition hover:border-brand-teal disabled:opacity-50"
                        >
                          {bookingBusyKey === key ? 'Updating…' : `Mark ${status}`}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))
            )}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel
            title="Orchestration control plane"
            eyebrow="Staff policy"
            meta={`${orchestrationOverview?.summary.run_count ?? 0} tracked runs`}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border border-black/10 bg-[#f8faf8] p-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/45">Operating posture</div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
                    This is the governed staff layer: policy, routes, recent runs, and confidence signals for the current
                    web OS stack.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshOrchestrationOverview}
                  className="border border-black/15 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal"
                >
                  Refresh control plane
                </button>
              </div>

              {orchestrationError ? (
                <div className="border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">{orchestrationError}</div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'Active roles',
                    value: orchestrationOverview?.summary.role_count ?? 0,
                    meta: `${(orchestrationOverview?.policy.current_stack ?? []).length} stack anchors`,
                  },
                  {
                    label: 'Tracked runs',
                    value: orchestrationOverview?.summary.run_count ?? 0,
                    meta: `${orchestrationOverview?.summary.flagged_runs ?? 0} flagged`,
                  },
                  {
                    label: 'Avg confidence',
                    value: `${Math.round((orchestrationOverview?.summary.average_confidence ?? 0) * 100)}%`,
                    meta: `${orchestrationOverview?.summary.low_confidence_runs ?? 0} low-confidence`,
                  },
                  {
                    label: 'Free-tier guard',
                    value: orchestrationOverview?.policy.free_roles.length ?? 0,
                    meta: `${orchestrationOverview?.summary.human_followup_runs ?? 0} human follow-up candidates`,
                  },
                ].map((card) => (
                  <div key={card.label} className="border border-black/10 bg-[#fbfcfa] p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">{card.label}</div>
                    <div className="mt-3 text-3xl font-editorial italic leading-none text-[#09161a]">{card.value}</div>
                    <div className="mt-2 text-xs text-black/55">{card.meta}</div>
                  </div>
                ))}
              </div>

              {orchestrationOverview ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="border border-black/10 bg-[#fbfcfa] p-4 space-y-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Approval triggers</div>
                      <div className="flex flex-wrap gap-2">
                        {orchestrationOverview.policy.approval_triggers.map((trigger) => (
                          <span
                            key={trigger}
                            className="border border-amber-500/20 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-800"
                          >
                            {labelize(trigger)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="border border-black/10 bg-[#fbfcfa] p-4 space-y-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Current stack</div>
                      <div className="flex flex-wrap gap-2">
                        {orchestrationOverview.policy.current_stack.map((entry) => (
                          <span
                            key={entry}
                            className="border border-brand-teal/25 bg-brand-soft px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-brand-teal"
                          >
                            {labelize(entry)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {orchestrationOverview.runs.length === 0 ? (
                      <div className="border border-dashed border-black/15 bg-[#fbfcfa] p-6 text-sm text-black/55">
                        No orchestration runs recorded yet.
                      </div>
                    ) : (
                      orchestrationOverview.runs.map((run) => (
                        <article key={`${run.client_uid}-${run.run_id}`} className="space-y-3 border border-black/10 bg-[#fbfcfa] p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">
                                {run.client_name || 'Client'} · {run.intent || 'unknown intent'} · {run.tier || 'unknown tier'}
                              </div>
                              <div className="text-lg font-editorial italic leading-tight text-[#09161a]">
                                {run.started_by_role || 'staff'} · {run.run_id}
                              </div>
                              <div className="text-xs text-black/55">{run.summary || 'No summary recorded.'}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(run.status)}`}>
                                {run.status.replace(/_/g, ' ')}
                              </span>
                              <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${mediaPipelineTone(run.approval_state)}`}>
                                {run.approval_state.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-4 text-xs text-black/60">
                            <div>Confidence {Math.round((run.confidence || 0) * 100)}%</div>
                            <div>{run.trigger || 'unknown trigger'}</div>
                            <div>{run.next_roles.length} next roles</div>
                            <div>{run.updated_at ? new Date(run.updated_at).toLocaleString() : 'No update time'}</div>
                          </div>

                          {run.policy_flags.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Policy flags</div>
                              <div className="flex flex-wrap gap-2">
                                {run.policy_flags.map((flag) => (
                                  <span
                                    key={flag}
                                    className="border border-amber-500/20 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-800"
                                  >
                                    {labelize(flag)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Next roles</div>
                            <div className="flex flex-wrap gap-2">
                              {run.next_roles.map((role) => (
                                <span
                                  key={role}
                                  className="border border-brand-teal/25 bg-brand-soft px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-brand-teal"
                                >
                                  {labelize(role)}
                                </span>
                              ))}
                            </div>
                          </div>

                          {run.recommended_actions.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Recommended actions</div>
                              <div className="space-y-1 text-xs leading-5 text-black/60">
                                {run.recommended_actions.map((action) => (
                                  <div key={action}>{action}</div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => reviewOrchestrationRun(run.client_uid, run.run_id, 'approved')}
                              disabled={bookingBusyKey === `orchestration:${run.client_uid}:${run.run_id}:approved`}
                              className="border border-black/15 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
                            >
                              {bookingBusyKey === `orchestration:${run.client_uid}:${run.run_id}:approved` ? 'Updating…' : 'Approve run'}
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewOrchestrationRun(run.client_uid, run.run_id, 'request_human_followup')}
                              disabled={bookingBusyKey === `orchestration:${run.client_uid}:${run.run_id}:request_human_followup`}
                              className="border border-black/15 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#09161a] transition-colors hover:border-brand-teal disabled:opacity-50"
                            >
                              {bookingBusyKey === `orchestration:${run.client_uid}:${run.run_id}:request_human_followup`
                                ? 'Routing…'
                                : run.linked_request_id
                                  ? 'Follow-up linked'
                                  : 'Request human follow-up'}
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </Panel>

          <Panel title="Approval rail" eyebrow="Queue" meta={`${queue.pending_count} pending`}>
            <div className="space-y-3">
              {queue.warning ? (
                <div className="border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-800">
                  Queue visibility is partially unavailable: {queue.warning}
                </div>
              ) : null}
              {queue.items.length === 0 ? (
                <div className="border border-black/10 bg-[#f8faf8] p-4 text-sm text-gray-600">
                  No pending approvals across client ledgers.
                </div>
              ) : (
                queue.items.map((item) => (
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

          <Panel title="Agent registry" eyebrow="Staff" meta={`${agents.write_scope_count} write scopes`}>
            <div className="space-y-3">
              {agents.items.map((agent) => (
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-3">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[94vh] w-full max-w-[1360px] flex-col overflow-hidden border border-black/10 bg-[#f3efe6] shadow-[0_40px_120px_-56px_rgba(0,0,0,0.58)]">
        <header className="border-b border-black/10 bg-[rgba(245,242,233,0.94)] px-3 py-3 backdrop-blur md:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.28em] text-brand-teal">Admin OS · {sectionMeta.eyebrow}</div>
              <h2 className="text-[28px] font-editorial italic leading-none text-[#08161a] md:text-[34px]">
                {sectionMeta.title}
              </h2>
              <p className="max-w-4xl text-sm leading-6 text-black/60">{sectionMeta.description}</p>
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

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border border-black/10 bg-white/80 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Pending</div>
              <div className="mt-2 text-2xl font-editorial text-[#09161a]">{overview?.queue.pending_count ?? '—'}</div>
            </div>
            <div className="border border-black/10 bg-white/80 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Agents</div>
              <div className="mt-2 text-2xl font-editorial text-[#09161a]">{overview?.agents.count ?? '—'}</div>
            </div>
            <div className="border border-black/10 bg-white/80 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Media</div>
              <div className="mt-2 text-2xl font-editorial text-[#09161a]">
                {overview?.config_summary.curated_library_enabled_count ?? '—'}
              </div>
            </div>
            <div className="border border-black/10 bg-white/80 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Revision</div>
              <div className="mt-2 truncate text-xs uppercase tracking-[0.18em] text-[#09161a]">
                {overview?.runtime.revision ?? '—'}
              </div>
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navSections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                disabled={saving}
                className={`whitespace-nowrap border px-3 py-2.5 text-left transition-all ${
                  activeSection === section.id
                    ? 'border-[#08242a] bg-[#08242a] text-white shadow-[0_16px_30px_-24px_rgba(0,0,0,0.45)]'
                    : 'border-black/10 bg-white text-[#09161a] hover:border-black/20'
                } disabled:cursor-not-allowed disabled:opacity-55`}
              >
                <div className={`text-[10px] uppercase tracking-[0.24em] ${activeSection === section.id ? 'text-brand-teal' : 'text-black/40'}`}>
                  {String(index + 1).padStart(2, '0')} {section.shortLabel}
                </div>
                <div className="mt-2 text-sm font-editorial leading-tight">{section.title}</div>
              </button>
            ))}
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 md:px-5 md:py-5 md:pb-10">
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
              {renderActiveSection()}
            </fieldset>
          ) : null}
        </div>

        <footer className="border-t border-black/10 bg-[rgba(255,255,255,0.86)] px-4 py-3 backdrop-blur md:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-black/40">Operator save rail</div>
              <div className="text-sm text-black/58">
                Save only after the current section and the control tower read match the intended operating posture.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={requestReload}
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
  );
}
